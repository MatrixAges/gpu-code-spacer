const std = @import("std");
const Io = std.Io;
const Dir = Io.Dir;
const Sha256 = std.crypto.hash.sha2.Sha256;

pub const Source = struct {
    repository: []const u8,
    branch: []const u8,
    language: []const u8,
    role: []const u8,
    paths: []const []const u8,
    trust: []const u8 = "repository_weak_labels",
    regions: []const struct { path: []const u8, start_line: usize, end_line: usize } = &.{},
};

pub const Record = struct {
    source: Source,
    commit: []const u8,
    archive_url: []const u8,
    archive_path: []const u8,
    raw_path: []const u8,
    archive_sha256: ?[]const u8 = null,
    archive_bytes: u64 = 0,
    extracted_bytes: u64 = 0,
    files: usize = 0,
    skipped_symlinks: usize = 0,
    status: enum { locked, complete } = .locked,
};

const max_archive_bytes = 512 * 1024 * 1024;
const max_extracted_bytes = 2 * 1024 * 1024 * 1024;
const max_files = 200_000;

fn save(io: Io, allocator: std.mem.Allocator, records: []const Record, path: []const u8) !void {
    const json = try std.json.Stringify.valueAlloc(allocator, records, .{ .whitespace = .indent_2 });
    defer allocator.free(json);

    const temporary = try std.fmt.allocPrint(allocator, "{s}.tmp", .{path});
    defer allocator.free(temporary);
    try Dir.cwd().writeFile(io, .{ .sub_path = temporary, .data = json });
    try Dir.cwd().rename(temporary, Dir.cwd(), path, io);
}

fn get(client: *std.http.Client, allocator: std.mem.Allocator, url: []const u8) ![]u8 {
    var request = try client.request(.GET, try std.Uri.parse(url), .{
        .headers = .{
            .user_agent = .{ .override = "gpu-code-spacer-dataset" },
            .accept_encoding = .{ .override = "identity" },
        },
    });
    defer request.deinit();

    try request.sendBodiless();
    var redirect_buffer: [8192]u8 = undefined;
    var response = try request.receiveHead(&redirect_buffer);
    if (response.head.status != .ok) {
        std.log.err("HTTP {d}: {s}", .{ @intFromEnum(response.head.status), url });
        return error.HttpRequestFailed;
    }

    var buffer: [8192]u8 = undefined;
    return response.reader(&buffer).allocRemaining(allocator, .limited(2 * 1024 * 1024));
}

fn lock(client: *std.http.Client, allocator: std.mem.Allocator, io: Io, source_path: []const u8, lock_path: []const u8) ![]Record {
    const existing = Dir.cwd().readFileAlloc(io, lock_path, allocator, .limited(2 * 1024 * 1024)) catch |err| switch (err) {
        error.FileNotFound => null,
        else => return err,
    };
    if (existing) |bytes| {
        return (try std.json.parseFromSlice([]Record, allocator, bytes, .{ .allocate = .alloc_always })).value;
    }

    const source_bytes = try Dir.cwd().readFileAlloc(io, source_path, allocator, .limited(1024 * 1024));
    const sources = try std.json.parseFromSlice([]Source, allocator, source_bytes, .{});
    const records = try allocator.alloc(Record, sources.value.len);

    for (sources.value, records) |source, *record| {
        const url = try std.fmt.allocPrint(allocator, "https://api.github.com/repos/{s}/commits/{s}", .{ source.repository, source.branch });
        const bytes = try get(client, allocator, url);
        const commit = try std.json.parseFromSlice(struct { sha: []const u8 }, allocator, bytes, .{ .ignore_unknown_fields = true });
        if (commit.value.sha.len != 40) return error.InvalidCommit;

        record.* = .{
            .source = source,
            .commit = commit.value.sha,
            .archive_url = try std.fmt.allocPrint(allocator, "https://codeload.github.com/{s}/tar.gz/{s}", .{ source.repository, commit.value.sha }),
            .archive_path = try std.fmt.allocPrint(allocator, "data/archives/{s}/{s}.tar.gz", .{ source.repository, commit.value.sha }),
            .raw_path = try std.fmt.allocPrint(allocator, "data/raw/{s}/{s}", .{ source.repository, commit.value.sha }),
        };
        std.log.info("locked {s} {s}", .{ source.repository, commit.value.sha });
    }

    try save(io, allocator, records, lock_path);
    return records;
}

fn download(client: *std.http.Client, allocator: std.mem.Allocator, record: *Record) !void {
    const io = client.io;
    try Dir.cwd().createDirPath(io, std.fs.path.dirname(record.archive_path).?);
    const temporary = try std.fmt.allocPrint(allocator, "{s}.partial", .{record.archive_path});

    var request = try client.request(.GET, try std.Uri.parse(record.archive_url), .{
        .headers = .{
            .user_agent = .{ .override = "gpu-code-spacer-dataset" },
            .accept_encoding = .{ .override = "identity" },
        },
    });
    defer request.deinit();

    try request.sendBodiless();
    var redirect_buffer: [8192]u8 = undefined;
    var response = try request.receiveHead(&redirect_buffer);
    if (response.head.status != .ok) return error.ArchiveRequestFailed;

    const file = try Dir.cwd().createFile(io, temporary, .{});
    defer file.close(io);
    errdefer Dir.cwd().deleteFile(io, temporary) catch {};

    var transfer_buffer: [64 * 1024]u8 = undefined;
    var buffer: [64 * 1024]u8 = undefined;
    const reader = response.reader(&transfer_buffer);
    var hash = Sha256.init(.{});
    var total: u64 = 0;

    while (true) {
        const count = try reader.readSliceShort(&buffer);
        if (count == 0) break;
        total += count;
        if (total > max_archive_bytes) return error.ArchiveTooLarge;
        if (total == count and (count < 2 or buffer[0] != 0x1f or buffer[1] != 0x8b)) return error.NotGzipArchive;

        hash.update(buffer[0..count]);
        try file.writeStreamingAll(io, buffer[0..count]);
    }
    if (total == 0) return error.EmptyArchive;

    const digest = hash.finalResult();
    record.archive_sha256 = try std.fmt.allocPrint(allocator, "{x}", .{digest});
    record.archive_bytes = total;
    try Dir.cwd().rename(temporary, Dir.cwd(), record.archive_path, io);
}

fn safeRelativePath(name: []const u8) ![]const u8 {
    if (name.len == 0 or name[0] == '/' or std.mem.findScalar(u8, name, '\\') != null) return error.UnsafeArchivePath;
    var parts = std.mem.splitScalar(u8, name, '/');
    while (parts.next()) |part| {
        if (std.mem.eql(u8, part, "..") or std.mem.eql(u8, part, ".")) return error.UnsafeArchivePath;
    }
    const first_slash = std.mem.findScalar(u8, name, '/') orelse return "";
    return name[first_slash + 1 ..];
}

fn extract(io: Io, allocator: std.mem.Allocator, record: *Record) !void {
    const temporary = try std.fmt.allocPrint(allocator, "{s}.partial", .{record.raw_path});
    try Dir.cwd().createDirPath(io, std.fs.path.dirname(temporary).?);
    try Dir.cwd().createDir(io, temporary, .default_dir);
    errdefer Dir.cwd().deleteTree(io, temporary) catch {};

    var destination = try Dir.cwd().openDir(io, temporary, .{});
    defer destination.close(io);
    const archive = try Dir.cwd().openFile(io, record.archive_path, .{});
    defer archive.close(io);

    var file_buffer: [64 * 1024]u8 = undefined;
    var file_reader = archive.reader(io, &file_buffer);
    var window: [std.compress.flate.max_window_len]u8 = undefined;
    var decompressor = std.compress.flate.Decompress.init(&file_reader.interface, .gzip, &window);
    var name_buffer: [4096]u8 = undefined;
    var link_buffer: [4096]u8 = undefined;
    var iterator = std.tar.Iterator.init(&decompressor.reader, .{
        .file_name_buffer = &name_buffer,
        .link_name_buffer = &link_buffer,
    });

    record.files = 0;
    record.extracted_bytes = 0;
    record.skipped_symlinks = 0;
    var entries: usize = 0;

    while (try iterator.next()) |entry| {
        entries += 1;
        if (entries > max_files) return error.TooManyArchiveEntries;
        const path = try safeRelativePath(entry.name);
        if (path.len == 0) continue;

        switch (entry.kind) {
            .directory => try destination.createDirPath(io, path),
            .sym_link => record.skipped_symlinks += 1,
            .file => {
                record.extracted_bytes += entry.size;
                if (record.extracted_bytes > max_extracted_bytes) return error.ExtractedArchiveTooLarge;
                if (std.fs.path.dirname(path)) |parent| try destination.createDirPath(io, parent);

                const file = try destination.createFile(io, path, .{ .exclusive = true });
                defer file.close(io);
                var buffer: [16 * 1024]u8 = undefined;
                var writer = file.writer(io, &buffer);
                try iterator.streamRemaining(entry, &writer.interface);
                try writer.interface.flush();
                record.files += 1;
            },
        }
    }

    // Consume the gzip trailer as well; tar stops at its zero end blocks.
    _ = try decompressor.reader.discardRemaining();
    try Dir.cwd().rename(temporary, Dir.cwd(), record.raw_path, io);
    record.status = .complete;
}

fn verifyArchive(io: Io, record: Record) !void {
    const expected = record.archive_sha256 orelse return error.MissingArchiveChecksum;
    const file = try Dir.cwd().openFile(io, record.archive_path, .{});
    defer file.close(io);
    var buffer: [64 * 1024]u8 = undefined;
    var reader = file.reader(io, &buffer);
    var chunk: [64 * 1024]u8 = undefined;
    var hash = Sha256.init(.{});
    while (true) {
        const count = try reader.interface.readSliceShort(&chunk);
        if (count == 0) break;
        hash.update(chunk[0..count]);
    }
    var encoded: [64]u8 = undefined;
    const actual = try std.fmt.bufPrint(&encoded, "{x}", .{hash.finalResult()});
    if (!std.mem.eql(u8, expected, actual)) return error.ArchiveChecksumMismatch;
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    var lock_only = false;
    var evaluation = false;
    for (args[1..]) |arg| {
        if (std.mem.eql(u8, arg, "--lock-only")) lock_only = true else if (std.mem.eql(u8, arg, "--evaluation")) evaluation = true else return error.UnknownArgument;
    }
    const source_path = if (evaluation) "config/evaluation-sources.json" else "config/sources.json";
    const lock_path = if (evaluation) "config/evaluation-sources.lock.json" else "config/sources.lock.json";

    var client: std.http.Client = .{ .allocator = allocator, .io = init.io };
    defer client.deinit();
    const records = try lock(&client, allocator, init.io, source_path, lock_path);
    if (lock_only) return;

    for (records) |*record| {
        if (record.status == .complete) {
            try verifyArchive(init.io, record.*);
            _ = try Dir.cwd().statFile(init.io, record.raw_path, .{});
            continue;
        }

        std.log.info("collecting {s}", .{record.source.repository});
        var attempt: usize = 0;
        while (true) {
            download(&client, allocator, record) catch |err| {
                attempt += 1;
                if (attempt == 3) return err;
                std.log.warn("download retry {d}/3 for {s}: {s}", .{ attempt, record.source.repository, @errorName(err) });
                continue;
            };
            break;
        }
        try extract(init.io, allocator, record);
        try save(init.io, allocator, records, lock_path);
        std.log.info("collected {s}: {d} files, {d} bytes, {d} symlinks skipped", .{ record.source.repository, record.files, record.extracted_bytes, record.skipped_symlinks });
    }
}
