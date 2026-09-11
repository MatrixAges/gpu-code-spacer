const std = @import("std");
const shared = @import("ggml");
const c = shared.c;

pub const commit = shared.commit;
pub const version = shared.version;
pub const batch_size = 64;
pub const Backend = shared.Backend;
pub const Mode = enum { train, gradients };

/// Keeps ggml ownership, tensor layout, and optimization out of the data pipeline.
pub fn Trainer(comptime Model: type) type {
    return struct {
        const Self = @This();
        const Tensor = *c.struct_ggml_tensor;
        const graph_size = c.GGML_DEFAULT_GRAPH_SIZE;

        devices: shared.Devices = .{},
        scheduler: c.ggml_backend_sched_t = null,
        storage: ?*c.struct_ggml_context = null,
        compute: ?*c.struct_ggml_context = null,
        buffer: c.ggml_backend_buffer_t = null,
        optimizer: c.ggml_opt_context_t = null,
        optimizer_params: c.struct_ggml_opt_optimizer_params = undefined,
        network: shared.Network(Model) = undefined,
        inputs: Tensor = undefined,
        labels: Tensor = undefined,
        sample_weights: Tensor = undefined,
        logits: Tensor = undefined,
        predictions: Tensor = undefined,

        // Initialize in place: ggml retains the optimizer_params callback pointer.
        pub fn init(self: *Self, model: *const Model, backend: Backend, threads: u31, rate: f32, mode: Mode) !void {
            self.* = .{};
            errdefer self.deinit();

            self.devices = try shared.Devices.init(backend, threads);
            self.scheduler = try self.devices.scheduler(graph_size);

            self.storage = c.ggml_init(.{
                .mem_size = 8 * c.ggml_tensor_overhead(),
                .mem_buffer = null,
                .no_alloc = true,
            }) orelse return error.GgmlAllocationFailed;
            self.compute = c.ggml_init(.{
                .mem_size = c.ggml_tensor_overhead() * graph_size + 3 * c.ggml_graph_overhead_custom(graph_size, true),
                .mem_buffer = null,
                .no_alloc = true,
            }) orelse return error.GgmlAllocationFailed;

            self.network = shared.Network(Model).init(self.storage.?);
            for (self.network.tensors, [_][*:0]const u8{ "w1", "b1", "w2", "b2" }) |tensor, name| {
                c.ggml_set_param(tensor);
                _ = c.ggml_set_name(tensor, name);
            }
            self.inputs = c.ggml_new_tensor_2d(self.storage, c.GGML_TYPE_F32, Model.input_count, batch_size).?;
            self.labels = c.ggml_new_tensor_2d(self.storage, c.GGML_TYPE_F32, Model.output_count, batch_size).?;
            self.sample_weights = c.ggml_new_tensor_2d(self.storage, c.GGML_TYPE_F32, 1, batch_size).?;
            self.predictions = c.ggml_new_tensor_2d(self.storage, c.GGML_TYPE_F32, Model.output_count, batch_size).?;
            for ([_]Tensor{ self.inputs, self.labels, self.sample_weights }) |tensor| c.ggml_set_input(tensor);

            self.buffer = c.ggml_backend_alloc_ctx_tensors(self.storage, self.devices.primary()) orelse return error.GgmlAllocationFailed;
            self.network.upload(model);

            const logits = self.network.forward(self.compute.?, self.inputs);
            // ggml-opt copies static graphs internally. Keep exported logits in
            // caller-owned storage instead of reading an unallocated graph node.
            self.logits = c.ggml_cpy(self.compute, logits, self.predictions).?;
            c.ggml_set_output(self.logits);

            // logaddexp(a, b) = a + softplus(b - a): stable without exp(logit).
            // Weighted one-hot labels cannot be used with ggml's fused CE backward,
            // which assumes each label vector sums to one.
            var log_partition = self.column(0);
            for (1..Model.output_count) |index| {
                const next = self.column(index);
                log_partition = c.ggml_add(self.compute, log_partition, c.ggml_softplus(self.compute, c.ggml_sub(self.compute, next, log_partition))).?;
            }
            const target = c.ggml_sum_rows(self.compute, c.ggml_mul(self.compute, self.logits, self.labels));
            const losses = c.ggml_mul(self.compute, c.ggml_sub(self.compute, log_partition, target), self.sample_weights);

            self.optimizer_params = c.ggml_opt_get_default_optimizer_params(null);
            self.optimizer_params.adamw = .{ .alpha = rate, .beta1 = 0.9, .beta2 = 0.999, .eps = 1e-8, .wd = 0 };
            var params = c.ggml_opt_default_params(self.scheduler, c.GGML_OPT_LOSS_TYPE_MEAN);
            params.ctx_compute = self.compute;
            params.inputs = self.inputs;
            params.outputs = losses;
            // The first of two accumulation passes exposes gradients without an
            // optimizer update. ggml scales these by opt_period internally.
            if (mode == .gradients) params.opt_period = 2;
            params.get_opt_pars = c.ggml_opt_get_constant_optimizer_params;
            params.get_opt_pars_ud = &self.optimizer_params;
            self.optimizer = c.ggml_opt_init(params) orelse return error.GgmlAllocationFailed;
        }

        fn column(self: *Self, index: usize) Tensor {
            return c.ggml_cont(self.compute, c.ggml_view_2d(self.compute, self.logits, 1, batch_size, Model.output_count * @sizeOf(f32), index * @sizeOf(f32))).?;
        }

        pub fn deinit(self: *Self) void {
            c.ggml_opt_free(self.optimizer);
            c.ggml_backend_sched_free(self.scheduler);
            c.ggml_backend_buffer_free(self.buffer);
            c.ggml_free(self.compute);
            c.ggml_free(self.storage);
            self.devices.deinit();
        }

        pub fn backendName(self: *const Self) []const u8 {
            return self.devices.backendName();
        }

        pub fn step(self: *Self, inputs: *const [batch_size]Model.Input, labels: *const [batch_size]u8, class_weights: *const [Model.output_count]f32) !void {
            try self.evaluate(inputs, labels, class_weights, true);
        }

        fn evaluate(self: *Self, inputs: *const [batch_size]Model.Input, labels: *const [batch_size]u8, class_weights: *const [Model.output_count]f32, backward: bool) !void {
            var one_hot: [batch_size][Model.output_count]f32 = @splat(@splat(0));
            var weights: [batch_size]f32 = undefined;
            for (labels, &one_hot, &weights) |label, *target, *weight| {
                target[label] = 1;
                weight.* = class_weights[label];
            }
            c.ggml_opt_alloc(self.optimizer, backward);
            c.ggml_backend_tensor_set(self.inputs, inputs, 0, @sizeOf(@TypeOf(inputs.*)));
            c.ggml_backend_tensor_set(self.labels, &one_hot, 0, @sizeOf(@TypeOf(one_hot)));
            c.ggml_backend_tensor_set(self.sample_weights, &weights, 0, @sizeOf(@TypeOf(weights)));
            c.ggml_opt_eval(self.optimizer, null);

            var loss: f32 = undefined;
            c.ggml_backend_tensor_get(c.ggml_opt_loss(self.optimizer), &loss, 0, @sizeOf(f32));
            if (!std.math.isFinite(loss)) return error.NonFiniteTrainingLoss;
        }

        pub fn download(self: *Self, model: *Model) !void {
            try shared.Network(Model).readParameters(self.network.tensors, &model.parameters);
        }

        pub fn gradients(self: *Self, result: *Model.Parameters) !void {
            var tensors: [4]Tensor = undefined;
            for (&tensors, self.network.tensors) |*tensor, weight| {
                tensor.* = c.ggml_opt_grad_acc(self.optimizer, weight) orelse return error.GgmlGradientUnavailable;
            }
            try shared.Network(Model).readParameters(tensors, result);
            for (result) |*value| value.* *= 2;
        }

        pub fn predict(self: *Self, inputs: *const [batch_size]Model.Input) ![batch_size]Model.Output {
            try self.evaluate(inputs, &@as([batch_size]u8, @splat(0)), &@as([Model.output_count]f32, @splat(1)), false);
            var outputs: [batch_size]Model.Output = undefined;
            c.ggml_backend_tensor_get(self.predictions, &outputs, 0, @sizeOf(@TypeOf(outputs)));
            return outputs;
        }
    };
}
