const std = @import("std");
const corpus = @import("collect.zig");

fn command(allocator: std.mem.Allocator, io: std.Io, argv: []const []const u8) ![]const u8 {
    const result = try std.process.run(allocator, io, .{ .argv = argv, .stdout_limit = .limited(1024 * 1024), .stderr_limit = .limited(4 * 1024 * 1024) });
    if (result.term != .exited or result.term.exited != 0) {
        std.log.err("{s}: {s}", .{ argv[0], result.stderr });
        return error.DependencyCommandFailed;
    }
    return std.mem.trim(u8, result.stdout, " \t\r\n");
}

fn exists(io: std.Io, path: []const u8) !bool {
    _ = std.Io.Dir.cwd().statFile(io, path, .{}) catch |err| switch (err) {
        error.FileNotFound => return false,
        else => return err,
    };
    return true;
}

fn verify(allocator: std.mem.Allocator, io: std.Io, path: []const u8, commit: []const u8) !void {
    const actual = try command(allocator, io, &.{ "git", "-C", path, "rev-parse", "HEAD" });
    if (!std.mem.eql(u8, actual, commit)) return error.DependencyCommitMismatch;
    const changed = try command(allocator, io, &.{ "git", "-C", path, "status", "--porcelain" });
    if (changed.len != 0) return error.ModifiedDependency;
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    if (args.len > 2) return error.UnknownArgument;

    if (args.len == 2 and std.mem.eql(u8, args[1], "--ggml")) {
        const commit = @import("learning/ggml_version.zig").commit;
        const path = ".deps/ggml";
        if (!try exists(init.io, path)) {
            try std.Io.Dir.cwd().createDirPath(init.io, path);
            _ = try command(allocator, init.io, &.{ "git", "-C", path, "init" });
            _ = try command(allocator, init.io, &.{ "git", "-C", path, "remote", "add", "origin", "https://github.com/ggml-org/ggml.git" });
            _ = try command(allocator, init.io, &.{ "git", "-C", path, "fetch", "--depth", "1", "origin", commit });
            _ = try command(allocator, init.io, &.{ "git", "-C", path, "checkout", "--detach", commit });
        }
        try verify(allocator, init.io, path, commit);

        const cmake_args = [_][]const u8{
            "cmake",                      "-S",                      path,                    "-B",                            ".deps/ggml-build",
            "-DCMAKE_BUILD_TYPE=Release", "-DBUILD_SHARED_LIBS=OFF", "-DGGML_BACKEND_DL=OFF", "-DGGML_METAL_EMBED_LIBRARY=ON", "-DGGML_BUILD_TESTS=OFF",
            "-DGGML_BUILD_EXAMPLES=OFF",  "-DGGML_OPENMP=OFF",       "-DGGML_BLAS=OFF",       "-DGGML_NATIVE=OFF",             "-DCMAKE_INSTALL_PREFIX=.deps/ggml-install",
            "-DCMAKE_INSTALL_LIBDIR=lib",
        };
        // Linux host GCC would produce libstdc++ objects, whereas the Zig
        // executable links libc++. Use the same toolchain for both sides.
        const compiler_args: []const []const u8 = if (@import("builtin").os.tag == .linux) &.{
            "-DCMAKE_C_COMPILER=zig",
            "-DCMAKE_C_COMPILER_ARG1=cc",
            "-DCMAKE_CXX_COMPILER=zig",
            "-DCMAKE_CXX_COMPILER_ARG1=c++",
            "-DCMAKE_ASM_COMPILER=zig",
            "-DCMAKE_ASM_COMPILER_ARG1=cc",
        } else &.{};
        _ = try command(allocator, init.io, try std.mem.concat(allocator, []const u8, &.{ &cmake_args, compiler_args }));
        _ = try command(allocator, init.io, &.{ "cmake", "--build", ".deps/ggml-build", "--config", "Release", "--parallel", "4" });
        _ = try command(allocator, init.io, &.{ "cmake", "--install", ".deps/ggml-build", "--config", "Release" });
        std.log.info("ggml verified and built: {s}", .{commit});
        return;
    }
    if (args.len == 2 and !std.mem.eql(u8, args[1], "--style")) return error.UnknownArgument;

    if (args.len == 2) {
        const bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, "config/style-sources.lock.json", allocator, .limited(1024 * 1024));
        const records = try std.json.parseFromSlice([]corpus.Record, allocator, bytes, .{});
        for (records.value) |record| {
            if (!try exists(init.io, record.raw_path)) {
                try std.Io.Dir.cwd().createDirPath(init.io, std.fs.path.dirname(record.raw_path).?);
                _ = try command(allocator, init.io, &.{ "gh", "repo", "clone", record.source.repository, record.raw_path, "--", "--depth", "1" });
                _ = try command(allocator, init.io, &.{ "git", "-C", record.raw_path, "fetch", "--depth", "1", "origin", record.commit });
                _ = try command(allocator, init.io, &.{ "git", "-C", record.raw_path, "checkout", "--detach", record.commit });
            }
            try verify(allocator, init.io, record.raw_path, record.commit);
            std.log.info("style source verified: {s}", .{record.source.repository});
        }
        return;
    }

    const bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, "config/parsers.lock.json", allocator, .limited(1024 * 1024));
    const Dependency = struct { name: []const u8, repository: []const u8, tag: []const u8, commit: []const u8 };
    const dependencies = try std.json.parseFromSlice([]Dependency, allocator, bytes, .{});
    try std.Io.Dir.cwd().createDirPath(init.io, ".deps");

    for (dependencies.value) |dependency| {
        const path = try std.fmt.allocPrint(allocator, ".deps/{s}", .{dependency.name});
        if (!try exists(init.io, path)) {
            const url = try std.fmt.allocPrint(allocator, "https://github.com/{s}.git", .{dependency.repository});
            _ = try command(allocator, init.io, &.{ "git", "clone", "--depth", "1", "--branch", dependency.tag, url, path });
        }
        try verify(allocator, init.io, path, dependency.commit);
        std.log.info("offline parser verified: {s}", .{dependency.name});
    }
}
