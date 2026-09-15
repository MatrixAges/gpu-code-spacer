const std = @import("std");
const core = @import("core");
const files = @import("files.zig");
const model_bytes = @embedFile("layout_weights");
const model_config = @import("model_config");

const help =
    \\gcs — 代码如诗，好读，也好看。
    \\
    \\Usage: gcs -p <directory> [-r] [--check]
    \\       gcs -f <file-or-glob>... [--check]
    \\       gcs [--check | --write] [--confidence 0..1] [file]
    \\
    \\Without a file, read UTF-8 source from stdin. By default, write the result
    \\to stdout. Any extension is accepted; language is not a model input.
    \\
    \\  -p           Format code files directly inside a directory in place.
    \\  -r           Recurse with -p; skip hidden, dependency and build directories.
    \\  -f           Format files in place; accepts multiple paths and quoted globs.
    \\               Globs: *, ?, [], ** (recursive segment); no brace expansion.
    \\               Example: gcs -f 'src/**/*.ts'
    \\               No directory symlinks are followed during scanning.
    \\  --check       Exit 1 when the model proposes changes; do not write.
    \\  --write       Replace one regular file atomically, preserving permissions.
    \\  --confidence Minimum confidence for an edit (embedded calibration default).
    \\  --model-info  Print embedded model metadata.
    \\  --stats       Print actual backend and inference counters to stderr.
    \\  --help        Show this help.
    \\
    \\Experimental: this version adjusts blank lines between existing code lines.
    \\It preserves indentation and code text; it does not reflow long lines.
    \\
;

pub fn main(init: std.process.Init) void {
    run(init) catch |err| {
        if (err == error.ChangesNeeded) std.process.exit(1);
        std.log.err("{s}", .{@errorName(err)});
        std.process.exit(2);
    };
}

fn run(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    var path: ?[]const u8 = null;
    var directory: ?[]const u8 = null;
    var patterns: std.ArrayList([]const u8) = .empty;
    var recursive = false;
    var file_mode = false;
    var check = false;
    var write = false;
    var model_info = false;
    var stats = false;
    var confidence: f32 = model_config.confidence;
    var i: usize = 1;

    while (i < args.len) : (i += 1) {
        const arg = args[i];
        if (std.mem.eql(u8, arg, "--help") or std.mem.eql(u8, arg, "-h")) {
            try std.Io.File.stdout().writeStreamingAll(init.io, help);
            return;
        } else if (std.mem.eql(u8, arg, "-p")) {
            i += 1;
            if (i == args.len or std.mem.startsWith(u8, args[i], "-")) return error.MissingDirectory;
            if (directory != null) return error.ExpectedOneDirectory;
            directory = args[i];
        } else if (std.mem.eql(u8, arg, "-r")) {
            recursive = true;
        } else if (std.mem.eql(u8, arg, "-f")) {
            file_mode = true;
            i += 1;
            if (i == args.len or std.mem.startsWith(u8, args[i], "-")) return error.MissingFile;
            try patterns.append(allocator, args[i]);
        } else if (std.mem.eql(u8, arg, "--model-info")) {
            model_info = true;
        } else if (std.mem.eql(u8, arg, "--stats")) {
            stats = true;
        } else if (std.mem.eql(u8, arg, "--check")) {
            check = true;
        } else if (std.mem.eql(u8, arg, "--write")) {
            write = true;
        } else if (std.mem.eql(u8, arg, "--confidence")) {
            i += 1;
            if (i == args.len) return error.MissingConfidence;
            confidence = try std.fmt.parseFloat(f32, args[i]);
        } else if (std.mem.startsWith(u8, arg, "-")) {
            return error.UnknownOption;
        } else {
            if (file_mode) {
                try patterns.append(allocator, arg);
            } else {
                if (path != null) return error.ExpectedOneFile;
                path = arg;
            }
        }
    }
    if (check and write) return error.ConflictingModes;
    const batch = directory != null or file_mode;
    if (directory != null and file_mode or batch and path != null) return error.ConflictingTargets;
    if (recursive and directory == null) return error.RecursionRequiresDirectory;
    if (write and path == null and !batch) return error.WriteRequiresFile;
    if (!std.math.isFinite(confidence) or confidence < 0 or confidence > 1) return error.InvalidConfidence;

    var selection = files.Selection.init(allocator, init.io);
    if (directory) |root| try selection.directory(root, recursive);
    for (patterns.items) |pattern| {
        selection.pattern(pattern) catch |err| {
            std.log.err("{s}: {s}", .{ pattern, @errorName(err) });
            return err;
        };
    }
    if (batch and selection.paths.count() == 0) {
        std.log.info("No code files found", .{});
        return;
    }

    if (model_config.feature_version != core.features.version) return error.FeatureVersionMismatch;

    const model = try core.weights.decode(core.classifier.Model, model_bytes, core.features.version);
    var runner = try core.inference.Runner.init(&model);
    defer runner.deinit();
    const initial_fallback = runner.fallback_reason;
    if (initial_fallback) |reason| std.log.warn("CPU fallback: {s}", .{reason});
    if (model_info) {
        var digest: [32]u8 = undefined;
        std.crypto.hash.sha2.Sha256.hash(model_bytes, &digest, .{});
        const metadata = try std.json.Stringify.valueAlloc(allocator, .{
            .model = "shared-tokenizer-mlp",
            .style = "poetic-spacious",
            .feature_version = core.features.version,
            .parameters = core.classifier.Model.parameter_count,
            .weight_bytes = model_bytes.len,
            .sha256 = try std.fmt.allocPrint(allocator, "{x}", .{digest}),
            .confidence = confidence,
            .language_whitelist = false,
            .backend = runner.backendName(),
            .device = runner.deviceName(),
            .fallback_reason = runner.fallback_reason,
        }, .{});
        try std.Io.File.stdout().writeStreamingAll(init.io, metadata);
        try std.Io.File.stdout().writeStreamingAll(init.io, "\n");
        return;
    }

    if (batch) {
        var paths: std.ArrayList([]const u8) = .empty;
        var iterator = selection.paths.keyIterator();
        while (iterator.next()) |selected| try paths.append(allocator, selected.*);
        std.mem.sort([]const u8, paths.items, {}, struct {
            fn lessThan(_: void, a: []const u8, b: []const u8) bool {
                return std.mem.lessThan(u8, a, b);
            }
        }.lessThan);

        var changes_needed = false;
        var failed = false;
        for (paths.items) |selected| {
            var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
            defer arena.deinit();
            processFile(arena.allocator(), init.io, selected, check, !check, stats, confidence, &runner) catch |err| {
                if (err == error.ChangesNeeded) {
                    changes_needed = true;
                    std.log.info("Would format {s}", .{selected});
                } else {
                    failed = true;
                    std.log.err("{s}: {s}", .{ selected, @errorName(err) });
                }
            };
        }
        if (failed) return error.FileProcessingFailed;
        if (changes_needed) return error.ChangesNeeded;
        std.log.info("Processed {d} files", .{paths.items.len});
    } else {
        try processFile(allocator, init.io, path, check, write, stats, confidence, &runner);
    }

    if (initial_fallback == null) {
        if (runner.fallback_reason) |reason| std.log.warn("CPU fallback: {s}", .{reason});
    }
}

fn processFile(allocator: std.mem.Allocator, io: std.Io, path: ?[]const u8, check: bool, write: bool, stats: bool, confidence: f32, runner: *core.inference.Runner) !void {
    const source = if (path) |file| try std.Io.Dir.cwd().readFileAlloc(io, file, allocator, .limited(4 * 1024 * 1024)) else block: {
        var buffer: [8192]u8 = undefined;
        var reader = std.Io.File.stdin().reader(io, &buffer);
        break :block try reader.interface.allocRemaining(allocator, .limited(4 * 1024 * 1024));
    };
    const result = try core.engine.apply(allocator, source, runner, confidence);
    if (stats) {
        const report = try std.json.Stringify.valueAlloc(allocator, .{
            .file = path,
            .backend = runner.backendName(),
            .device = runner.deviceName(),
            .gpu_batches = runner.gpu_batches,
            .cpu_batches = runner.cpu_batches,
            .fallback_reason = runner.fallback_reason,
            .candidates = result.candidates,
            .changes = result.changes,
            .abstained = result.abstained,
        }, .{});
        try std.Io.File.stderr().writeStreamingAll(io, report);
        try std.Io.File.stderr().writeStreamingAll(io, "\n");
    }

    if (result.unterminated_region) std.log.warn("Unterminated or unsupported lexical region; source preserved", .{});
    if (check) {
        if (result.changes > 0) return error.ChangesNeeded;
        return;
    }

    if (write) {
        if (result.changes == 0) return;
        const file_path = path.?;
        const stat = try std.Io.Dir.cwd().statFile(io, file_path, .{ .follow_symlinks = false });
        if (stat.kind != .file or stat.nlink != 1) return error.WriteRequiresSingleLinkRegularFile;

        const current = try std.Io.Dir.cwd().readFileAlloc(io, file_path, allocator, .limited(4 * 1024 * 1024));
        if (!std.mem.eql(u8, source, current)) return error.FileChangedDuringRead;
        var atomic = try std.Io.Dir.cwd().createFileAtomic(io, file_path, .{ .permissions = stat.permissions, .replace = true });
        defer atomic.deinit(io);
        try atomic.file.writeStreamingAll(io, result.text);
        try atomic.replace(io);
    } else {
        try std.Io.File.stdout().writeStreamingAll(io, result.text);
    }
}
