const std = @import("std");
const features = @import("core").features;
pub const Model = @import("core").classifier.Model;

pub const languages = [_][]const u8{ "typescript", "javascript", "python", "java", "rust", "zig", "go", "cpp", "csharp", "ruby", "kotlin", "swift" };

pub const Split = enum { train, validation, @"test", unseen_language, style_train, style_validation, rejected };

pub const File = struct {
    id: usize,
    repository: []const u8,
    language: []const u8,
    path: []const u8,
    source_path: []const u8,
    sha256: []const u8,
    canonical_sha256: []const u8,
    sketch: [32]u64,
    split: Split,
    reason: ?[]const u8 = null,
    bytes: usize,
    boundaries: usize,
    syntax_checked: bool,
    class_counts: [3]usize,
    source_trust: []const u8,
    allowed_lines: []const [2]usize,
    layout_corrected: bool = false,
};

pub const Row = struct {
    file_id: u32,
    boundary_id: u32,
    language_id: u8,
    label: u8,
    input: features.Vector,
};

pub const row_bytes = 12 + features.count * 4;

pub fn languageIndex(language: []const u8) !usize {
    for (languages, 0..) |name, i| {
        if (std.mem.eql(u8, language, name)) return i;
    }
    return error.UnknownDatasetLanguage;
}

pub fn writeRow(writer: *std.Io.Writer, row: Row) !void {
    var bytes: [row_bytes]u8 = @splat(0);
    std.mem.writeInt(u32, bytes[0..4], row.file_id, .little);
    std.mem.writeInt(u32, bytes[4..8], row.boundary_id, .little);
    bytes[8] = row.language_id;
    bytes[9] = row.label;
    for (row.input, 0..) |value, i| {
        std.mem.writeInt(u32, bytes[12 + i * 4 ..][0..4], @bitCast(value), .little);
    }
    try writer.writeAll(&bytes);
}

pub fn load(allocator: std.mem.Allocator, io: std.Io, path: []const u8) ![]Row {
    const summary_bytes = try std.Io.Dir.cwd().readFileAlloc(io, "data/processed/summary.json", allocator, .limited(1024 * 1024));
    defer allocator.free(summary_bytes);
    const summary = try std.json.parseFromSlice(struct { feature_version: u32, feature_count: usize }, allocator, summary_bytes, .{ .ignore_unknown_fields = true });
    defer summary.deinit();
    if (summary.value.feature_version != features.version or summary.value.feature_count != features.count) return error.StaleDatasetFeatures;

    const bytes = try std.Io.Dir.cwd().readFileAlloc(io, path, allocator, .limited(1024 * 1024 * 1024));
    defer allocator.free(bytes);
    if (bytes.len % row_bytes != 0) return error.InvalidDatasetSize;
    const rows = try allocator.alloc(Row, bytes.len / row_bytes);

    for (rows, 0..) |*row, index| {
        const raw = bytes[index * row_bytes ..][0..row_bytes];
        row.file_id = std.mem.readInt(u32, raw[0..4], .little);
        row.boundary_id = std.mem.readInt(u32, raw[4..8], .little);
        row.language_id = raw[8];
        row.label = raw[9];
        if (row.label > 2 or row.language_id >= languages.len) return error.InvalidDatasetLabel;
        for (&row.input, 0..) |*value, i| {
            value.* = @bitCast(std.mem.readInt(u32, raw[12 + i * 4 ..][0..4], .little));
            if (!std.math.isFinite(value.*)) return error.InvalidDatasetFeature;
        }
    }
    return rows;
}
