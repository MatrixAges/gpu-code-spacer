const std = @import("std");
const is_windows = @import("builtin").os.tag == .windows;
const windows_glob = @import("glob_windows.zig");
const c = if (is_windows) struct {} else @cImport({
    @cInclude("fnmatch.h");
});

pub const Selection = struct {
    allocator: std.mem.Allocator,
    io: std.Io,
    paths: std.StringHashMap(void),

    pub fn init(allocator: std.mem.Allocator, io: std.Io) Selection {
        return .{ .allocator = allocator, .io = io, .paths = std.StringHashMap(void).init(allocator) };
    }

    pub fn addFile(self: *Selection, path: []const u8) !void {
        const stat = try std.Io.Dir.cwd().statFile(self.io, path, .{ .follow_symlinks = false });
        if (stat.kind != .file or stat.nlink != 1) return error.WriteRequiresSingleLinkRegularFile;

        const absolute = try std.Io.Dir.cwd().realPathFileAlloc(self.io, path, self.allocator);
        if (self.paths.contains(absolute)) {
            self.allocator.free(absolute);
            return;
        }
        try self.paths.put(absolute, {});
    }

    pub fn directory(self: *Selection, path: []const u8, recursive: bool) !void {
        var dir = try std.Io.Dir.cwd().openDir(self.io, path, .{ .iterate = true, .follow_symlinks = false });
        defer dir.close(self.io);
        var iterator = dir.iterate();

        while (try iterator.next(self.io)) |entry| {
            if (entry.kind == .file and isCode(entry.name)) {
                const child = try std.fs.path.join(self.allocator, &.{ path, entry.name });
                defer self.allocator.free(child);
                try self.addFile(child);
            } else if (recursive and entry.kind == .directory and !skipDirectory(entry.name)) {
                const child = try std.fs.path.join(self.allocator, &.{ path, entry.name });
                defer self.allocator.free(child);
                try self.directory(child, true);
            }
        }
    }

    pub fn pattern(self: *Selection, value: []const u8) !void {
        if (!hasPattern(value)) return self.addFile(value);

        if (is_windows) {
            // Backslashes are separators; use bracket expressions for literal metacharacters.
            const normalized = try self.allocator.dupe(u8, value);
            defer self.allocator.free(normalized);
            std.mem.replaceScalar(u8, normalized, '\\', '/');

            const parsed = std.fs.path.parsePathWindows(u8, normalized);
            if (parsed.kind == .drive_relative) return error.DriveRelativeGlobUnsupported;
            const base = if (parsed.root.len == 0) "." else parsed.root;
            const matched = try self.expand(base, std.mem.trimStart(u8, normalized[parsed.root.len..], "/"));
            if (!matched) return error.NoFilesMatched;
            return;
        }

        const matched = try self.expand(if (std.fs.path.isAbsolute(value)) "/" else ".", std.mem.trimStart(u8, value, "/"));
        if (!matched) return error.NoFilesMatched;
    }

    fn expand(self: *Selection, base: []const u8, pattern_text: []const u8) !bool {
        const separator = std.mem.indexOfScalar(u8, pattern_text, '/');
        const segment = if (separator) |index| pattern_text[0..index] else pattern_text;
        const rest = if (separator) |index| pattern_text[index + 1 ..] else null;
        const recursive = std.mem.eql(u8, segment, "**");
        var matched = false;

        if (recursive) {
            if (rest) |remaining| matched = try self.expand(base, remaining);
        }

        var dir = std.Io.Dir.cwd().openDir(self.io, base, .{ .iterate = true }) catch |err| switch (err) {
            error.FileNotFound, error.NotDir => return false,
            else => return err,
        };
        defer dir.close(self.io);
        const segment_z: ?[:0]u8 = if (is_windows) null else try self.allocator.dupeZ(u8, segment);
        defer if (segment_z) |bytes| self.allocator.free(bytes);
        var iterator = dir.iterate();

        // Literal path segments include . and .., which directory iteration omits.
        if (!recursive and !hasPattern(segment) and rest != null) {
            const child = try std.fs.path.join(self.allocator, &.{ base, segment });
            defer self.allocator.free(child);
            return self.expand(child, rest.?);
        }

        while (try iterator.next(self.io)) |entry| {
            if (is_windows) {
                if (!windows_glob.matches(segment, entry.name)) continue;
            } else {
                const name_z = try self.allocator.dupeZ(u8, entry.name);
                defer self.allocator.free(name_z);
                if (c.fnmatch(segment_z.?.ptr, name_z.ptr, c.FNM_PERIOD) != 0) continue;
            }

            const child = try std.fs.path.join(self.allocator, &.{ base, entry.name });
            defer self.allocator.free(child);
            if (entry.kind == .directory) {
                if (recursive and !skipDirectory(entry.name)) {
                    matched = try self.expand(child, pattern_text) or matched;
                } else if (!recursive) {
                    if (rest) |remaining| matched = try self.expand(child, remaining) or matched;
                }
            } else if (entry.kind == .file and rest == null) {
                try self.addFile(child);
                matched = true;
            }
        }
        return matched;
    }
};

fn hasPattern(value: []const u8) bool {
    return std.mem.indexOfAny(u8, value, if (is_windows) "*?[" else "*?[\\") != null;
}

fn skipDirectory(name: []const u8) bool {
    if (std.mem.startsWith(u8, name, ".")) return true;
    for ([_][]const u8{ "node_modules", "vendor", "dist", "build", "target", "zig-out", "__pycache__" }) |excluded| {
        if (std.mem.eql(u8, name, excluded)) return true;
    }
    return false;
}

fn isCode(name: []const u8) bool {
    const extension = std.fs.path.extension(name);
    for ([_][]const u8{
        ".ts",  ".tsx",  ".mts",    ".cts",  ".js",  ".jsx",   ".mjs",  ".cjs",
        ".py",  ".pyi",  ".java",   ".rs",   ".zig", ".go",    ".c",    ".h",
        ".cc",  ".cpp",  ".cxx",    ".hpp",  ".hxx", ".cs",    ".rb",   ".php",
        ".kt",  ".kts",  ".swift",  ".m",    ".mm",  ".scala", ".sc",   ".dart",
        ".lua", ".ml",   ".mli",    ".ex",   ".exs", ".erl",   ".hrl",  ".hs",
        ".sh",  ".bash", ".zsh",    ".fish", ".pl",  ".pm",    ".r",    ".R",
        ".sql", ".vue",  ".svelte", ".html", ".css", ".scss",  ".less",
    }) |suffix| {
        if (std.mem.eql(u8, extension, suffix)) return true;
    }
    return false;
}
