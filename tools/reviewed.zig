const std = @import("std");
const data = @import("data.zig");
const core = @import("core");

pub const Split = struct {
    training: []const data.Row,
    validation: []const data.Row,
    replay: []const data.Row,
    files: usize,
    heldout_files: usize,
    feedback_sha256: ?[]const u8,
};

pub fn split(allocator: std.mem.Allocator, io: std.Io, rows: []const data.Row, feedback_path: ?[]const u8) !Split {
    const bytes = try std.Io.Dir.cwd().readFileAlloc(io, "data/processed/files.json", allocator, .limited(32 * 1024 * 1024));
    const entries = (try std.json.parseFromSlice([]data.File, allocator, bytes, .{})).value;
    var selected = std.AutoHashMap(u32, bool).init(allocator);
    var feedback_ids = std.AutoHashMap(u32, void).init(allocator);
    const feedback = if (feedback_path) |path| (try std.json.parseFromSlice([][]const u8, allocator, try std.Io.Dir.cwd().readFileAlloc(io, path, allocator, .limited(1024 * 1024)), .{})).value else null;
    var files: usize = 0;
    var heldout_files: usize = 0;

    for (entries) |file| {
        if (file.split != .train or !file.layout_corrected) continue;

        // Partition complete files by layout-independent content, without
        // consulting demo identities, boundary labels, or model predictions.
        const heldout = try std.fmt.parseInt(u32, file.canonical_sha256[0..8], 16) % 10 == 0;
        try selected.put(@intCast(file.id), heldout);

        if (feedback) |paths| {
            for (paths) |path| {
                if (std.mem.eql(u8, path, file.source_path)) try feedback_ids.put(@intCast(file.id), {});
            }
        }
        files += 1;
        heldout_files += @intFromBool(heldout);
    }

    var training: std.ArrayList(data.Row) = .empty;
    var validation: std.ArrayList(data.Row) = .empty;
    var replay: std.ArrayList(data.Row) = .empty;

    for (rows) |row| {
        const heldout = selected.get(row.file_id) orelse {
            try replay.append(allocator, row);
            continue;
        };

        if (heldout) {
            try validation.append(allocator, row);
        } else if (feedback == null or feedback_ids.contains(row.file_id)) {
            try training.append(allocator, row);
        } else try replay.append(allocator, row);
    }

    var feedback_hash = std.crypto.hash.sha2.Sha256.init(.{});

    if (feedback) |paths| {
        for (paths, 0..) |path, index| {
            const source = try std.Io.Dir.cwd().readFileAlloc(io, path, allocator, .limited(4 * 1024 * 1024));
            feedback_hash.update(path);
            feedback_hash.update(&.{0});
            feedback_hash.update(source);

            var known = false;
            for (entries) |file| {
                if (std.mem.eql(u8, path, file.source_path)) known = true;
            }
            if (known) continue;

            // New, explicitly reviewed feedback uses its parent directory as
            // training metadata only. Language never enters model features.
            const language = try data.languageIndex(std.fs.path.basename(std.fs.path.dirname(path) orelse return error.MissingFeedbackLanguage));
            const document = try core.layout.analyze(allocator, source);

            for (document.boundaries, 0..) |boundary, boundary_index| {
                if (boundary.blank_lines > 2) return error.InvalidFeedbackLayout;

                try training.append(allocator, .{
                    .file_id = @intCast(entries.len + index),
                    .boundary_id = @intCast(boundary_index),
                    .language_id = @intCast(language),
                    .label = @intCast(boundary.blank_lines),
                    .input = core.features.encode(source, document, boundary),
                });
            }

            files += 1;
        }
    }

    if (training.items.len == 0 or validation.items.len == 0) return error.MissingReviewedData;

    return .{
        .training = try training.toOwnedSlice(allocator),
        .validation = try validation.toOwnedSlice(allocator),
        .replay = try replay.toOwnedSlice(allocator),
        .files = files,
        .heldout_files = heldout_files,
        .feedback_sha256 = if (feedback != null) try std.fmt.allocPrint(allocator, "{x}", .{feedback_hash.finalResult()}) else null,
    };
}
