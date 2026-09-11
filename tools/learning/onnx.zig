const std = @import("std");

/// The protobuf wire types needed by a fixed, inference-only ONNX graph.
/// Field numbers follow ONNX v1.17.0 onnx.proto; IR 8 / opset 13.
const Message = struct {
    allocator: std.mem.Allocator,
    bytes: std.ArrayList(u8) = .empty,

    fn varint(self: *Message, value: u64) !void {
        var remaining = value;
        while (remaining >= 128) : (remaining >>= 7) {
            try self.bytes.append(self.allocator, @as(u8, @truncate(remaining)) | 0x80);
        }
        try self.bytes.append(self.allocator, @intCast(remaining));
    }

    fn integer(self: *Message, field: u32, value: u64) !void {
        try self.varint(@as(u64, field) << 3);
        try self.varint(value);
    }

    fn data(self: *Message, field: u32, value: []const u8) !void {
        try self.varint((@as(u64, field) << 3) | 2);
        try self.varint(value.len);
        try self.bytes.appendSlice(self.allocator, value);
    }

    fn child(self: *Message) Message {
        return .{ .allocator = self.allocator };
    }
};

fn addNode(graph: *Message, op: []const u8, inputs: []const []const u8, output: []const u8) !void {
    var node = graph.child();
    for (inputs) |input| try node.data(1, input);
    try node.data(2, output);
    try node.data(4, op);
    try graph.data(1, node.bytes.items);
}

fn addTensor(graph: *Message, name: []const u8, dimensions: []const u64, values: []const f32) !void {
    var expected: u64 = 1;
    for (dimensions) |dimension| expected *= dimension;
    if (expected != values.len) return error.TensorShapeMismatch;

    var tensor = graph.child();
    for (dimensions) |dimension| try tensor.integer(1, dimension);
    try tensor.integer(2, 1); // TensorProto.FLOAT
    try tensor.data(8, name);

    var raw: std.ArrayList(u8) = .empty;
    for (values) |value| {
        if (!std.math.isFinite(value)) return error.NonFiniteWeight;
        var bytes: [4]u8 = undefined;
        std.mem.writeInt(u32, &bytes, @bitCast(value), .little);
        try raw.appendSlice(graph.allocator, &bytes);
    }

    try tensor.data(9, raw.items);
    try graph.data(5, tensor.bytes.items);
}

fn addValue(graph: *Message, field: u32, name: []const u8, width: u64) !void {
    var batch_dimension = graph.child();
    try batch_dimension.data(2, "batch");

    var width_dimension = graph.child();
    try width_dimension.integer(1, width);

    var shape = graph.child();
    try shape.data(1, batch_dimension.bytes.items);
    try shape.data(1, width_dimension.bytes.items);

    var tensor_type = graph.child();
    try tensor_type.integer(1, 1);
    try tensor_type.data(2, shape.bytes.items);

    var value_type = graph.child();
    try value_type.data(1, tensor_type.bytes.items);

    var value = graph.child();
    try value.data(1, name);
    try value.data(2, value_type.bytes.items);
    try graph.data(field, value.bytes.items);
}

pub fn encode(allocator: std.mem.Allocator, model: anytype, description: []const u8) ![]u8 {
    const Model = @TypeOf(model.*);
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();

    var graph: Message = .{ .allocator = arena.allocator() };
    try graph.data(2, "gpu-code-spacer-mlp");

    try addNode(&graph, "MatMul", &.{ "features", "w1" }, "projection");
    try addNode(&graph, "Add", &.{ "projection", "b1" }, "biased");
    try addNode(&graph, "Relu", &.{"biased"}, "hidden");
    try addNode(&graph, "MatMul", &.{ "hidden", "w2" }, "scores");
    try addNode(&graph, "Add", &.{ "scores", "b2" }, "logits");

    try addTensor(&graph, "w1", &.{ Model.input_count, Model.hidden_count }, model.parameters[Model.w1_start..Model.b1_start]);
    try addTensor(&graph, "b1", &.{Model.hidden_count}, model.parameters[Model.b1_start..Model.w2_start]);
    try addTensor(&graph, "w2", &.{ Model.hidden_count, Model.output_count }, model.parameters[Model.w2_start..Model.b2_start]);
    try addTensor(&graph, "b2", &.{Model.output_count}, model.parameters[Model.b2_start..]);

    try addValue(&graph, 11, "features", Model.input_count);
    try addValue(&graph, 12, "logits", Model.output_count);

    var opset = graph.child();
    try opset.integer(2, 13);

    var result = graph.child();
    try result.integer(1, 8);
    try result.data(2, "gpu-code-spacer Zig trainer");
    try result.data(3, "0.1.0");
    try result.data(6, description);
    try result.data(7, graph.bytes.items);
    try result.data(8, opset.bytes.items);

    return allocator.dupe(u8, result.bytes.items);
}
