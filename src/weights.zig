const std = @import("std");

const magic = "GCSPMLP2";
const header_size = magic.len + 4 * @sizeOf(u32);
const checksum_size = std.crypto.hash.sha2.Sha256.digest_length;

pub fn encode(allocator: std.mem.Allocator, model: anytype, feature_version: u32) ![]u8 {
    const Model = @TypeOf(model.*);
    const size = header_size + Model.parameter_count * @sizeOf(f32);
    const bytes = try allocator.alloc(u8, size + checksum_size);
    errdefer allocator.free(bytes);

    @memcpy(bytes[0..magic.len], magic);
    for ([_]usize{ Model.input_count, Model.hidden_count, Model.output_count }, 0..) |dimension, i| {
        std.mem.writeInt(u32, bytes[magic.len + i * 4 ..][0..4], @intCast(dimension), .little);
    }
    std.mem.writeInt(u32, bytes[20..24], feature_version, .little);

    for (model.parameters, 0..) |value, i| {
        if (!std.math.isFinite(value)) return error.NonFiniteWeight;
        std.mem.writeInt(u32, bytes[header_size + i * 4 ..][0..4], @bitCast(value), .little);
    }

    std.crypto.hash.sha2.Sha256.hash(bytes[0..size], bytes[size..][0..checksum_size], .{});
    return bytes;
}

pub fn decode(comptime Model: type, bytes: []const u8, feature_version: u32) !Model {
    const size = header_size + Model.parameter_count * @sizeOf(f32);
    if (bytes.len != size + checksum_size) return error.InvalidModelSize;
    if (!std.mem.eql(u8, bytes[0..magic.len], magic)) return error.InvalidModelVersion;

    for ([_]usize{ Model.input_count, Model.hidden_count, Model.output_count }, 0..) |dimension, i| {
        const actual = std.mem.readInt(u32, bytes[magic.len + i * 4 ..][0..4], .little);
        if (actual != dimension) return error.ModelShapeMismatch;
    }
    if (std.mem.readInt(u32, bytes[20..24], .little) != feature_version) return error.FeatureVersionMismatch;

    var checksum: [checksum_size]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(bytes[0..size], &checksum, .{});
    if (!std.mem.eql(u8, &checksum, bytes[size..])) return error.ModelChecksumMismatch;

    var model: Model = undefined;
    for (&model.parameters, 0..) |*value, i| {
        value.* = @bitCast(std.mem.readInt(u32, bytes[header_size + i * 4 ..][0..4], .little));
        if (!std.math.isFinite(value.*)) return error.NonFiniteWeight;
    }

    return model;
}
