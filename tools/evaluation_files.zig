const std = @import("std");

pub fn resultsDirectory(allocator: std.mem.Allocator, io: std.Io, root: []const u8) ![]const u8 {
    if (std.mem.eql(u8, root, "evaluation") or (std.mem.startsWith(u8, root, "evaluation/") and !std.mem.eql(u8, root, "evaluation/artifacts") and !std.mem.startsWith(u8, root, "evaluation/artifacts/"))) return error.ResultsMustNotOverwriteEvaluationDataset;
    try std.Io.Dir.cwd().createDirPath(io, root);
    std.log.info("evaluation results: {s}", .{root});

    return allocator.dupe(u8, root);
}

pub fn extension(language: []const u8) ![]const u8 {
    const languages = [_][]const u8{ "typescript", "javascript", "python", "java", "rust", "zig", "go", "cpp", "csharp", "ruby", "kotlin", "swift" };
    const extensions = [_][]const u8{ "ts", "js", "py", "java", "rs", "zig", "go", "cpp", "cs", "rb", "kt", "swift" };
    for (languages, extensions) |name, suffix| {
        if (std.mem.eql(u8, language, name)) return suffix;
    }

    return error.UnknownEvaluationExtension;
}

pub fn hash(allocator: std.mem.Allocator, bytes: []const u8) ![]const u8 {
    var digest: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(bytes, &digest, .{});

    return std.fmt.allocPrint(allocator, "{x}", .{digest});
}

pub const Paths = struct { input: []const u8, output: []const u8, metadata: []const u8 };

pub fn paths(allocator: std.mem.Allocator, io: std.Io, directory: []const u8, language: []const u8) !Paths {
    const parent = std.fs.path.dirname(directory) orelse return error.MissingParentDirectory;
    try std.Io.Dir.cwd().createDirPath(io, parent);
    try std.Io.Dir.cwd().createDirPath(io, directory);
    const suffix = try extension(language);

    return .{
        .input = try std.fmt.allocPrint(allocator, "{s}/input.{s}", .{ directory, suffix }),
        .output = try std.fmt.allocPrint(allocator, "{s}/output.{s}", .{ directory, suffix }),
        .metadata = try std.fs.path.join(allocator, &.{ directory, "metadata.json" }),
    };
}
