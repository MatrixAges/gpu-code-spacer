const std = @import("std");
const ggml = @import("ggml");
const c = ggml.c;

/// Export the same F32 tensor layout used by the shared inference graph.
pub fn write(allocator: std.mem.Allocator, path: []const u8, model: anytype, feature_version: u32) !void {
    const Model = @TypeOf(model.*);

    for (model.parameters) |value| {
        if (!std.math.isFinite(value)) return error.NonFiniteWeight;
    }

    var devices = try ggml.Devices.init(.cpu, 1);

    defer devices.deinit();

    const context = c.ggml_init(.{
        .mem_size = 4 * c.ggml_tensor_overhead(),
        .mem_buffer = null,
        .no_alloc = true,
    }) orelse return error.GgmlAllocationFailed;

    defer c.ggml_free(context);

    const network = ggml.Network(Model).init(context);
    const buffer = c.ggml_backend_alloc_ctx_tensors(context, devices.primary()) orelse return error.GgmlAllocationFailed;

    defer c.ggml_backend_buffer_free(buffer);
    network.upload(model);

    const file = c.gguf_init_empty() orelse return error.GgmlAllocationFailed;

    defer c.gguf_free(file);
    c.gguf_set_val_str(file, "general.architecture", "gcs_mlp");
    c.gguf_set_val_str(file, "general.name", "gpu-code-spacer-mlp");
    c.gguf_set_val_str(file, "general.description", "Blank-line classifier; requires gpu-code-spacer feature extraction and inference graph");
    c.gguf_set_val_u32(file, "general.file_type", 0); // ALL_F32
    c.gguf_set_val_u32(file, "gcs_mlp.feature_version", feature_version);
    c.gguf_set_val_u32(file, "gcs_mlp.input_count", Model.input_count);
    c.gguf_set_val_u32(file, "gcs_mlp.hidden_count", Model.hidden_count);
    c.gguf_set_val_u32(file, "gcs_mlp.output_count", Model.output_count);
    c.gguf_set_val_str(file, "gcs_mlp.activation", "relu");

    const names = [_][:0]const u8{ "w1", "b1", "w2", "b2" };

    for (network.tensors, names) |tensor, name| {
        _ = c.ggml_set_name(tensor, name);

        c.gguf_add_tensor(file, tensor);
    }

    const filename = try allocator.dupeZ(u8, path);

    defer allocator.free(filename);

    if (!c.gguf_write_to_file(file, filename, false)) return error.GgufWriteFailed;
}
