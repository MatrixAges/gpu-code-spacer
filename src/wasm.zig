const std = @import("std");
const engine = @import("engine.zig");
const classifier = @import("classifier.zig");
const weights = @import("weights.zig");
const config = @import("model_config");

const allocator = std.heap.wasm_allocator;
const max_input = 4 * 1024 * 1024;

var model: ?classifier.Model = null;
var result: ?engine.Result = null;
var failure: []const u8 = "";

const Runner = struct {
    pub fn compute(_: *Runner, inputs: []const classifier.Model.Input, outputs: []classifier.Model.Output) !void {
        for (inputs, outputs) |input, *output| output.* = model.?.forward(input);
    }
};

export fn allocate(length: usize) ?[*]u8 {
    if (length > max_input) return null;
    const bytes = allocator.alloc(u8, @max(length, 1)) catch return null;
    return bytes.ptr;
}

export fn release(pointer: [*]u8, length: usize) void {
    allocator.free(pointer[0..@max(length, 1)]);
}

export fn format(pointer: [*]const u8, length: usize, confidence: f32) u32 {
    if (result) |previous| allocator.free(previous.text);
    result = null;
    failure = "";

    if (length > max_input) {
        failure = "InputTooLarge";
        return 1;
    }

    if (model == null) {
        model = weights.decode(classifier.Model, @embedFile("layout_weights"), config.feature_version) catch |err| {
            failure = @errorName(err);
            return 1;
        };
    }

    var runner: Runner = .{};
    result = engine.apply(allocator, pointer[0..length], &runner, confidence) catch |err| {
        failure = @errorName(err);
        return 1;
    };
    return 0;
}

export fn output_pointer() [*]const u8 {
    return if (result) |value| value.text.ptr else failure.ptr;
}

export fn output_length() usize {
    return if (result) |value| value.text.len else failure.len;
}

export fn changes() usize {
    return if (result) |value| value.changes else 0;
}

export fn candidates() usize {
    return if (result) |value| value.candidates else 0;
}

export fn default_confidence() f32 {
    return config.confidence;
}
