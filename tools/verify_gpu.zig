const std = @import("std");
const core = @import("core");
const Model = core.classifier.Model;

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const model = Model.init(72026);
    var runner = try core.inference.Runner.init(&model);
    defer runner.deinit();
    if (core.inference.gpu_enabled and !runner.usesGpu()) {
        std.log.err("GPU validation requires actual GPU execution: {s}", .{runner.fallback_reason orelse "unknown"});
        return error.ExpectedHardwareGpu;
    }

    const inputs = try allocator.alloc(Model.Input, 1025);
    const outputs = try allocator.alloc(Model.Output, inputs.len);
    var random = std.Random.DefaultPrng.init(72026);
    for (inputs) |*input| {
        for (input) |*value| value.* = random.random().float(f32) * 2 - 1;
    }

    var start: usize = 0;
    var maximum: f32 = 0;
    var labels_match: usize = 0;
    while (start < inputs.len) : (start += core.inference.batch_capacity) {
        const count = @min(core.inference.batch_capacity, inputs.len - start);
        try runner.compute(inputs[start..][0..count], outputs[start..][0..count]);
    }
    for (inputs, outputs) |input, actual| {
        const expected = model.forward(input);
        for (actual, expected) |gpu, cpu| maximum = @max(maximum, @abs(gpu - cpu));
        if (Model.classify(actual) == Model.classify(expected)) labels_match += 1;
    }
    if (maximum > 0.0001 or labels_match != inputs.len) {
        std.log.err("inference mismatch: max error {d:.8}, matching labels {d}/{d}", .{ maximum, labels_match, inputs.len });
        return error.GpuNumericalMismatch;
    }
    if (core.inference.gpu_enabled and (runner.gpu_batches == 0 or runner.cpu_batches != 0)) return error.UnexpectedCpuFallback;
    if (!core.inference.gpu_enabled and (runner.cpu_batches == 0 or runner.gpu_batches != 0)) return error.InvalidCpuFallback;

    const report = try std.json.Stringify.valueAlloc(allocator, .{
        .backend = runner.backendName(),
        .device = runner.deviceName(),
        .samples = inputs.len,
        .maximum_absolute_error = maximum,
        .matching_classifications = labels_match,
        .gpu_batches = runner.gpu_batches,
        .cpu_batches = runner.cpu_batches,
        .fallback_reason = runner.fallback_reason,
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().createDirPath(init.io, "runs");
    const path = if (core.inference.gpu_enabled) "runs/gpu-verification.json" else "runs/cpu-fallback-verification.json";
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = path, .data = report });
    try std.Io.File.stdout().writeStreamingAll(init.io, report);
    try std.Io.File.stdout().writeStreamingAll(init.io, "\n");
}
