const std = @import("std");
const data = @import("data.zig");

pub const Entry = struct {
    repository: []const u8,
    path: []const u8,
    raw_path: []const u8,
    sample_path: []const u8,
    split: data.Split,
    initial_sha256: []const u8,
};

pub fn load(allocator: std.mem.Allocator, io: std.Io) ![]Entry {
    const bytes = std.Io.Dir.cwd().readFileAlloc(io, "dataset/metadata.json", allocator, .limited(16 * 1024 * 1024)) catch |err| switch (err) {
        error.FileNotFound => return allocator.alloc(Entry, 0),
        else => return err,
    };
    const parsed = try std.json.parseFromSlice(struct { version: u32, samples: []Entry }, allocator, bytes, .{ .ignore_unknown_fields = true });
    if (parsed.value.version != 1) return error.UnsupportedSampleManifest;

    return parsed.value.samples;
}

pub fn find(entries: []const Entry, repository: []const u8, path: []const u8) ?Entry {
    for (entries) |entry| {
        if (std.mem.eql(u8, repository, entry.repository) and std.mem.eql(u8, path, entry.path)) return entry;
    }

    return null;
}
