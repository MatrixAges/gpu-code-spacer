const std = @import("std");
const Model = @import("model").Mlp(8, 16, 3);
const weights = @import("weights");

const embedded_model = @embedFile("probe_weights");
const comparison = @embedFile("probe_reference");

pub fn main(init: std.process.Init) !void {
    const model = try weights.decode(Model, embedded_model, 0);
    const row_bytes = (Model.input_count + Model.output_count) * @sizeOf(f32);
    if (comparison.len % row_bytes != 0) return error.InvalidReference;

    var maximum_error: f32 = 0;
    var offset: usize = 0;
    while (offset < comparison.len) : (offset += row_bytes) {
        var input: Model.Input = undefined;
        for (&input, 0..) |*value, i| {
            value.* = @bitCast(std.mem.readInt(u32, comparison[offset + i * 4 ..][0..4], .little));
        }

        const logits = model.forward(input);
        for (logits, 0..) |logit, i| {
            const expected: f32 = @bitCast(std.mem.readInt(u32, comparison[offset + (Model.input_count + i) * 4 ..][0..4], .little));
            if (!std.math.isFinite(logit)) return error.NonFiniteOutput;
            maximum_error = @max(maximum_error, @abs(logit - expected));
        }
    }

    if (maximum_error > 0.0001) return error.InferenceMismatch;

    const report = try std.fmt.allocPrint(init.arena.allocator(),
        \\{{"kind":"embedded-native-probe","samples":{d},"model_bytes":{d},"maximum_absolute_error":{d:.9}}}
        \\
    , .{ comparison.len / row_bytes, embedded_model.len, maximum_error });
    try std.Io.File.stdout().writeStreamingAll(init.io, report);
}
