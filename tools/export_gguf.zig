const std = @import("std");
const core = @import("core");
const gguf = @import("learning/gguf.zig");

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);

    if (args.len != 1 and args.len != 3) {
        std.log.err("usage: export-gguf [input.weights output.gguf]", .{});

        return error.InvalidArguments;
    }

    const input = if (args.len == 3) args[1] else "models/spacer.weights";
    const output = if (args.len == 3) args[2] else "models/spacer.gguf";
    const bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, input, allocator, .limited(1024 * 1024));
    const model = try core.weights.decode(core.classifier.Model, bytes, core.features.version);

    try gguf.write(allocator, output, &model, core.features.version);

    std.log.info("exported {s}: {d} F32 parameters", .{ output, core.classifier.Model.parameter_count });
}
