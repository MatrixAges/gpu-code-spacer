const std = @import("std");
const learning = @import("model");
const weights = @import("weights");
const onnx = @import("learning/onnx.zig");
const ggml = @import("learning/ggml.zig");

const Model = learning.Mlp(8, 16, 3);

/// Synthetic nonlinear classification. This is NOT code-layout training data.
fn samples(allocator: std.mem.Allocator, count: usize, seed: u64) ![]Model.Sample {
    var rng = std.Random.DefaultPrng.init(seed);
    const random = rng.random();
    const result = try allocator.alloc(Model.Sample, count);

    for (result) |*sample| {
        for (&sample.input) |*x| x.* = random.float(f32) * 2 - 1;
        const x = sample.input[0];
        const y = sample.input[1];
        sample.label = if (x * x + y * y < 0.45) 0 else if (x * y >= 0) 1 else 2;
    }

    return result;
}

fn averageLoss(model: *const Model, data: []const Model.Sample, class_weights: [3]f32) f32 {
    var sum: f32 = 0;
    for (data) |sample| sum += class_weights[sample.label] * model.loss(sample);
    return sum / @as(f32, @floatFromInt(data.len));
}

fn accuracy(model: *const Model, data: []const Model.Sample) f32 {
    var correct: usize = 0;
    for (data) |sample| {
        if (Model.classify(model.forward(sample.input)) == sample.label) correct += 1;
    }
    return @as(f32, @floatFromInt(correct)) / @as(f32, @floatFromInt(data.len));
}

fn checkGradient(model: *Model, data: []const Model.Sample) !f32 {
    var trainer: ggml.Trainer(Model) = undefined;
    try trainer.init(model, .cpu, 1, 0.005, .gradients);
    defer trainer.deinit();

    var inputs: [ggml.batch_size]Model.Input = undefined;
    var labels: [ggml.batch_size]u8 = undefined;
    for (&inputs, &labels, 0..) |*input, *label, index| {
        const sample = data[index % data.len];
        input.* = sample.input;
        label.* = @intCast(sample.label);
    }
    const class_weights = [3]f32{ 0.7, 1.3, 2.1 };
    try trainer.step(&inputs, &labels, &class_weights);
    var gradient: Model.Parameters = undefined;
    try trainer.gradients(&gradient);

    var maximum_error: f32 = 0;
    const epsilon = 0.001;

    // Check all parameters on a small batch, including both layers and biases.
    for (&model.parameters, gradient) |*weight, analytic| {
        const original = weight.*;
        weight.* = original + epsilon;
        const plus = averageLoss(model, data, class_weights);
        weight.* = original - epsilon;
        const minus = averageLoss(model, data, class_weights);
        weight.* = original;

        const numerical = (plus - minus) / (2 * epsilon);
        maximum_error = @max(maximum_error, @abs(numerical - analytic));
    }

    if (maximum_error > 0.002) return error.GradientCheckFailed;
    return maximum_error;
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    if (args.len != 5) return error.ExpectedModelReferenceReportWeightsPaths;

    const training = try samples(allocator, 2048, 41);
    const validation = try samples(allocator, 1024, 97);
    const comparison = try samples(allocator, 257, 2026);

    var model = Model.init(73);
    const gradient_error = try checkGradient(&model, training[0..8]);
    const initial_loss = averageLoss(&model, training, @splat(1));
    var trainer: ggml.Trainer(Model) = undefined;
    try trainer.init(&model, .cpu, 1, 0.005, .train);
    defer trainer.deinit();
    var random = std.Random.DefaultPrng.init(11);

    for (0..150) |_| {
        random.random().shuffle(Model.Sample, training);

        var start: usize = 0;
        while (start < training.len) : (start += 64) {
            const batch = training[start..@min(start + 64, training.len)];
            var inputs: [ggml.batch_size]Model.Input = undefined;
            var labels: [ggml.batch_size]u8 = undefined;
            for (batch, &inputs, &labels) |sample, *input, *label| {
                input.* = sample.input;
                label.* = @intCast(sample.label);
            }
            try trainer.step(&inputs, &labels, &@as([3]f32, @splat(1)));
        }
    }

    try trainer.download(&model);
    const final_loss = averageLoss(&model, training, @splat(1));
    const validation_accuracy = accuracy(&model, validation);
    if (!std.math.isFinite(final_loss) or final_loss >= initial_loss * 0.3) return error.TrainingDidNotConverge;
    if (validation_accuracy < 0.90) return error.SyntheticValidationFailed;

    const model_bytes = try onnx.encode(allocator, &model, "Synthetic feasibility probe; not a code-spacing model.");
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = args[1], .data = model_bytes });

    const native_bytes = try weights.encode(allocator, &model, 0);
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = args[4], .data = native_bytes });

    // Independent comparison vectors: little-endian inputs followed by logits.
    var reference: std.ArrayList(u8) = .empty;
    var offset: usize = 0;
    while (offset < comparison.len) : (offset += ggml.batch_size) {
        const batch = comparison[offset..@min(offset + ggml.batch_size, comparison.len)];
        var inputs: [ggml.batch_size]Model.Input = @splat(@splat(0));
        for (batch, 0..) |sample, index| inputs[index] = sample.input;
        const outputs = try trainer.predict(&inputs);

        for (batch, 0..) |sample, index| {
            for (sample.input ++ outputs[index]) |value| {
                var bytes: [4]u8 = undefined;
                std.mem.writeInt(u32, &bytes, @bitCast(value), .little);
                try reference.appendSlice(allocator, &bytes);
            }
        }
    }
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = args[2], .data = reference.items });

    const report = try std.fmt.allocPrint(allocator,
        \\{{"kind":"synthetic-feasibility","training_engine":"ggml","zig":"0.16.0","parameters":{d},"epochs":150,"training_samples":2048,"validation_samples":1024,"comparison_samples":257,"gradient_max_abs_error":{d:.8},"initial_loss":{d:.8},"final_loss":{d:.8},"validation_accuracy":{d:.8},"onnx_bytes":{d}}}
        \\
    , .{ Model.parameter_count, gradient_error, initial_loss, final_loss, validation_accuracy, model_bytes.len });

    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = args[3], .data = report });
    try std.Io.File.stdout().writeStreamingAll(init.io, report);
}
