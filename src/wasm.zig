const std = @import("std");
const engine = @import("engine.zig");
const classifier = @import("classifier.zig");
const weights = @import("weights.zig");
const config = @import("model_config");

const Model = classifier.Model;
const allocator = std.heap.wasm_allocator;
const max_input = 4 * 1024 * 1024;
const gpu_batch_capacity = 4096;

var model: ?Model = null;
var result: ?engine.Result = null;
var failure: []const u8 = "";
var arena: ?std.heap.ArenaAllocator = null;
var prepared: ?engine.Prepared = null;
var inputs: [gpu_batch_capacity]Model.Input = undefined;
var outputs: [gpu_batch_capacity]Model.Output = undefined;
var pending_count: usize = 0;

const Runner = struct {
    pub fn compute(_: *Runner, batch: []const Model.Input, logits: []Model.Output) !void {
        for (batch, logits) |input, *output| output.* = model.?.forward(input);
    }
};

export fn initialize() u32 {
    if (model == null) {
        model = weights.decode(Model, @embedFile("layout_weights"), config.feature_version) catch |err| {
            failure = @errorName(err);
            return 1;
        };
    }

    return 0;
}

export fn allocate(length: usize) ?[*]u8 {
    if (length > max_input) return null;
    const bytes = allocator.alloc(u8, @max(length, 1)) catch return null;
    return bytes.ptr;
}

export fn release(pointer: [*]u8, length: usize) void {
    allocator.free(pointer[0..@max(length, 1)]);
}

export fn reset() void {
    if (result) |previous| allocator.free(previous.text);
    if (arena) |*temporary| temporary.deinit();
    result = null;
    arena = null;
    prepared = null;
    pending_count = 0;
    failure = "";
}

fn begin(length: usize) u32 {
    reset();
    if (length > max_input) {
        failure = "InputTooLarge";
        return 1;
    }

    return initialize();
}

export fn format(pointer: [*]const u8, length: usize, confidence: f32) u32 {
    if (begin(length) != 0) return 1;

    var runner: Runner = .{};
    result = engine.apply(allocator, pointer[0..length], &runner, confidence) catch |err| {
        failure = @errorName(err);
        return 1;
    };
    return 0;
}

export fn prepare(pointer: [*]const u8, length: usize, confidence: f32) u32 {
    if (begin(length) != 0) return 1;

    arena = std.heap.ArenaAllocator.init(allocator);
    prepared = engine.Prepared.init(arena.?.allocator(), pointer[0..length], confidence) catch |err| {
        failure = @errorName(err);
        return 1;
    };
    return 0;
}

export fn encode_batch() usize {
    if (prepared) |*session| {
        pending_count = session.encodeBatch(&inputs);
        return pending_count;
    }
    return 0;
}

export fn accept_batch() u32 {
    if (prepared) |*session| {
        session.acceptBatch(outputs[0..pending_count]) catch |err| {
            failure = @errorName(err);
            return 1;
        };
        pending_count = 0;
        return 0;
    }
    failure = "NoPreparedInput";
    return 1;
}

export fn finish() u32 {
    if (prepared) |*session| {
        result = session.render(allocator) catch |err| {
            failure = @errorName(err);
            return 1;
        };
        return 0;
    }
    failure = "NoPreparedInput";
    return 1;
}

export fn input_pointer() [*]const Model.Input {
    return &inputs;
}

export fn logits_pointer() [*]Model.Output {
    return &outputs;
}

export fn model_pointer() [*]const f32 {
    return &model.?.parameters;
}

export fn input_count() usize {
    return Model.input_count;
}

export fn hidden_count() usize {
    return Model.hidden_count;
}

export fn output_count() usize {
    return Model.output_count;
}

export fn parameter_count() usize {
    return Model.parameter_count;
}

export fn batch_capacity() usize {
    return gpu_batch_capacity;
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
