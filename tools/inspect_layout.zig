const std = @import("std");
const core = @import("core");

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    if (args.len != 2) return error.ExpectedSourcePath;
    const source = try std.Io.Dir.cwd().readFileAlloc(init.io, args[1], allocator, .limited(1024 * 1024));
    const encoded = try std.Io.Dir.cwd().readFileAlloc(init.io, "models/spacer.weights", allocator, .limited(1024 * 1024));
    const model = try core.weights.decode(core.classifier.Model, encoded, core.features.version);
    const document = try core.layout.analyze(allocator, source);

    for (document.boundaries) |boundary| {
        const vector = core.features.encode(source, document, boundary);
        const report = try std.json.Stringify.valueAlloc(allocator, .{
            .after_line = document.nonblank[boundary.before] + 1,
            .left_unit = document.units.ending[boundary.before],
            .right_unit = document.units.starting[boundary.after],
            .structure_features = vector[176..],
            .probabilities = core.classifier.Model.probabilities(model.forward(vector)),
        }, .{});
        try std.Io.File.stdout().writeStreamingAll(init.io, report);
        try std.Io.File.stdout().writeStreamingAll(init.io, "\n");
    }
}
