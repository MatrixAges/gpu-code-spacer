const std = @import("std");
pub const c = @cImport({
    @cInclude("ggml.h");
    @cInclude("ggml-alloc.h");
    @cInclude("ggml-backend.h");
    @cInclude("ggml-cpu.h");
    @cInclude("ggml-opt.h");
});

pub const commit = @import("ggml_version").commit;
pub const Backend = enum { cpu, gpu };
pub const Tensor = *c.struct_ggml_tensor;

pub fn version() []const u8 {
    return std.mem.span(c.ggml_version());
}

pub const Devices = struct {
    cpu: c.ggml_backend_t = null,
    gpu: c.ggml_backend_t = null,

    pub fn init(backend: Backend, threads: u31) !Devices {
        const linked_commit = std.mem.span(c.ggml_commit());
        if (linked_commit.len < 7 or !std.mem.startsWith(u8, commit, linked_commit)) {
            std.log.err("ggml dependency mismatch ({s}); run zig build bootstrap -- --ggml", .{linked_commit});
            return error.GgmlVersionMismatch;
        }
        c.ggml_log_set(log, null);

        var self: Devices = .{};
        errdefer self.deinit();
        self.cpu = c.ggml_backend_cpu_init() orelse return error.GgmlCpuUnavailable;
        c.ggml_backend_cpu_set_n_threads(self.cpu, @intCast(threads));
        if (backend == .gpu) {
            self.gpu = c.ggml_backend_init_by_type(c.GGML_BACKEND_DEVICE_TYPE_GPU, null) orelse return error.GgmlGpuUnavailable;
        }
        return self;
    }

    pub fn primary(self: *const Devices) c.ggml_backend_t {
        return self.gpu orelse self.cpu;
    }

    pub fn scheduler(self: *const Devices, graph_size: usize) !c.ggml_backend_sched_t {
        var backends = [_]c.ggml_backend_t{ self.gpu, self.cpu };
        const selected = if (self.gpu != null) backends[0..] else backends[1..];
        return c.ggml_backend_sched_new(selected.ptr, null, @intCast(selected.len), graph_size, false, true) orelse error.GgmlAllocationFailed;
    }

    pub fn backendName(self: *const Devices) []const u8 {
        return std.mem.span(c.ggml_backend_name(self.primary()));
    }

    pub fn deviceName(self: *const Devices) []const u8 {
        return std.mem.span(c.ggml_backend_dev_description(c.ggml_backend_get_device(self.primary())));
    }

    pub fn deinit(self: *Devices) void {
        c.ggml_backend_free(self.gpu);
        c.ggml_backend_free(self.cpu);
    }

    fn log(level: c.enum_ggml_log_level, message: [*c]const u8, _: ?*anyopaque) callconv(.c) void {
        if (message == null) return;
        const text = std.mem.trimEnd(u8, std.mem.span(message), "\r\n");
        switch (level) {
            c.GGML_LOG_LEVEL_ERROR => std.log.err("{s}", .{text}),
            c.GGML_LOG_LEVEL_WARN => std.log.warn("{s}", .{text}),
            else => {},
        }
    }
};

/// The same parameter layout and forward graph serve training and inference.
pub fn Network(comptime Model: type) type {
    return struct {
        const Self = @This();
        tensors: [4]Tensor,

        pub fn init(context: *c.struct_ggml_context) Self {
            return .{ .tensors = .{
                c.ggml_new_tensor_2d(context, c.GGML_TYPE_F32, Model.input_count, Model.hidden_count).?,
                c.ggml_new_tensor_1d(context, c.GGML_TYPE_F32, Model.hidden_count).?,
                c.ggml_new_tensor_2d(context, c.GGML_TYPE_F32, Model.hidden_count, Model.output_count).?,
                c.ggml_new_tensor_1d(context, c.GGML_TYPE_F32, Model.output_count).?,
            } };
        }

        pub fn forward(self: *const Self, context: *c.struct_ggml_context, inputs: Tensor) Tensor {
            // Each sample is an independent matrix-vector product. Metal's
            // large matrix kernel converts F32 operands to half internally;
            // the batch dimension keeps this classifier's F32 precision.
            const batch = inputs.ne[1];
            const vectors = c.ggml_reshape_3d(context, inputs, Model.input_count, 1, batch);
            const first = c.ggml_mul_mat(context, self.tensors[0], vectors);
            const hidden = c.ggml_relu(context, c.ggml_add(context, first, self.tensors[1]));
            const second = c.ggml_mul_mat(context, self.tensors[2], hidden);
            const logits = c.ggml_add(context, second, self.tensors[3]);
            return c.ggml_reshape_2d(context, logits, Model.output_count, batch).?;
        }

        pub fn upload(self: *const Self, model: *const Model) void {
            var w1: [Model.input_count * Model.hidden_count]f32 = undefined;
            var w2: [Model.hidden_count * Model.output_count]f32 = undefined;
            for (0..Model.hidden_count) |h| {
                for (0..Model.input_count) |i| w1[h * Model.input_count + i] = model.parameters[Model.w1_start + i * Model.hidden_count + h];
            }
            for (0..Model.output_count) |o| {
                for (0..Model.hidden_count) |h| w2[o * Model.hidden_count + h] = model.parameters[Model.w2_start + h * Model.output_count + o];
            }
            c.ggml_backend_tensor_set(self.tensors[0], &w1, 0, @sizeOf(@TypeOf(w1)));
            c.ggml_backend_tensor_set(self.tensors[1], model.parameters[Model.b1_start..Model.w2_start].ptr, 0, Model.hidden_count * @sizeOf(f32));
            c.ggml_backend_tensor_set(self.tensors[2], &w2, 0, @sizeOf(@TypeOf(w2)));
            c.ggml_backend_tensor_set(self.tensors[3], model.parameters[Model.b2_start..].ptr, 0, Model.output_count * @sizeOf(f32));
        }

        pub fn readParameters(tensors: [4]Tensor, parameters: *Model.Parameters) !void {
            var w1: [Model.input_count * Model.hidden_count]f32 = undefined;
            var w2: [Model.hidden_count * Model.output_count]f32 = undefined;
            c.ggml_backend_tensor_get(tensors[0], &w1, 0, @sizeOf(@TypeOf(w1)));
            c.ggml_backend_tensor_get(tensors[1], parameters[Model.b1_start..Model.w2_start].ptr, 0, Model.hidden_count * @sizeOf(f32));
            c.ggml_backend_tensor_get(tensors[2], &w2, 0, @sizeOf(@TypeOf(w2)));
            c.ggml_backend_tensor_get(tensors[3], parameters[Model.b2_start..].ptr, 0, Model.output_count * @sizeOf(f32));
            for (0..Model.hidden_count) |h| {
                for (0..Model.input_count) |i| parameters[Model.w1_start + i * Model.hidden_count + h] = w1[h * Model.input_count + i];
            }
            for (0..Model.output_count) |o| {
                for (0..Model.hidden_count) |h| parameters[Model.w2_start + h * Model.output_count + o] = w2[o * Model.hidden_count + h];
            }
            for (parameters) |value| {
                if (!std.math.isFinite(value)) return error.NonFiniteParameters;
            }
        }
    };
}
