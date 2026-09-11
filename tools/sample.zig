const std = @import("std");
const core = @import("core");
const data = @import("data.zig");
const samples = @import("samples.zig");

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const io = init.io;
    const bytes = try std.Io.Dir.cwd().readFileAlloc(io, "data/processed/files.json", allocator, .limited(16 * 1024 * 1024));
    const manifest = (try std.json.parseFromSlice([]data.File, allocator, bytes, .{})).value;
    var entries: std.ArrayList(samples.Entry) = .empty;
    try entries.appendSlice(allocator, try samples.load(allocator, io));
    var added: usize = 0;

    for (manifest) |file| {
        if (file.split != .train and file.split != .style_train) continue;
        if (samples.find(entries.items, file.repository, file.path) != null) continue;
        const directory = try std.fmt.allocPrint(allocator, "dataset/{s}", .{file.language});
        try std.Io.Dir.cwd().createDirPath(io, directory);
        const identity = try std.fmt.allocPrint(allocator, "{s}/{s}", .{ file.repository, file.path });
        const destination = try std.fmt.allocPrint(allocator, "{s}/{s}--{x}{s}", .{
            directory, std.fs.path.stem(file.path), core.features.hash(identity), std.fs.path.extension(file.path),
        });
        const source = try std.Io.Dir.cwd().readFileAlloc(io, file.source_path, allocator, .limited(1024 * 1024));
        const output = try std.Io.Dir.cwd().createFile(io, destination, .{ .exclusive = true });
        defer output.close(io);
        try output.writeStreamingAll(io, source);
        try entries.append(allocator, .{
            .repository = file.repository,
            .path = file.path,
            .raw_path = file.source_path,
            .sample_path = destination,
            .split = file.split,
            .initial_sha256 = file.sha256,
        });
        added += 1;
    }

    const metadata = try std.json.Stringify.valueAlloc(allocator, .{
        .version = 1,
        .unit = "complete source files selected by corpus filters and duplicate isolation",
        .editing_policy = "Edit source samples directly. Existing samples are never overwritten; modified layouts override automatic training annotations. Independent generalization cases belong in evaluation/validation.",
        .samples = entries.items,
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = "dataset/metadata.json", .data = metadata });
    std.log.info("editable dataset: {d} added, {d} total; dataset/<language>", .{ added, entries.items.len });
}
