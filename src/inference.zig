const std = @import("std");
const options = @import("gpu_options");
const ggml = @import("ggml");
const c = ggml.c;
const Model = @import("classifier.zig").Model;

pub const batch_capacity = 256;
pub const gpu_enabled = options.enabled;

const Session = struct {
    devices: ggml.Devices = .{},
    scheduler: c.ggml_backend_sched_t = null,
    storage: ?*c.struct_ggml_context = null,
    compute_context: ?*c.struct_ggml_context = null,
    buffer: c.ggml_backend_buffer_t = null,
    inputs: ggml.Tensor = undefined,
    outputs: ggml.Tensor = undefined,
    graph: *c.struct_ggml_cgraph = undefined,

    fn init(model: *const Model, backend: ggml.Backend) !Session {
        var self: Session = .{};
        errdefer self.deinit();
        self.devices = try ggml.Devices.init(backend, 1);
        const graph_size = 32;
        self.scheduler = try self.devices.scheduler(graph_size);
        self.storage = c.ggml_init(.{
            .mem_size = 5 * c.ggml_tensor_overhead(),
            .mem_buffer = null,
            .no_alloc = true,
        }) orelse return error.GgmlAllocationFailed;
        self.compute_context = c.ggml_init(.{
            .mem_size = graph_size * c.ggml_tensor_overhead() + c.ggml_graph_overhead_custom(graph_size, false),
            .mem_buffer = null,
            .no_alloc = true,
        }) orelse return error.GgmlAllocationFailed;

        const network = ggml.Network(Model).init(self.storage.?);
        self.inputs = c.ggml_new_tensor_2d(self.storage, c.GGML_TYPE_F32, Model.input_count, batch_capacity).?;
        c.ggml_set_input(self.inputs);
        self.buffer = c.ggml_backend_alloc_ctx_tensors(self.storage, self.devices.primary()) orelse return error.GgmlAllocationFailed;
        network.upload(model);

        self.outputs = network.forward(self.compute_context.?, self.inputs);
        c.ggml_set_output(self.outputs);
        self.graph = c.ggml_new_graph_custom(self.compute_context, graph_size, false).?;
        c.ggml_build_forward_expand(self.graph, self.outputs);
        if (!c.ggml_backend_sched_alloc_graph(self.scheduler, self.graph)) return error.GgmlAllocationFailed;
        if (self.devices.gpu) |gpu| {
            // A GPU batch counter must mean the entire inference graph ran there.
            for (0..@intCast(c.ggml_graph_n_nodes(self.graph))) |index| {
                const node = c.ggml_graph_node(self.graph, @intCast(index));
                if (c.ggml_backend_sched_get_tensor_backend(self.scheduler, node) != gpu) return error.GgmlGpuGraphUnsupported;
            }
        }
        return self;
    }

    fn compute(self: *Session, inputs: []const Model.Input, outputs: []Model.Output) !void {
        var padded: [batch_capacity]Model.Input = @splat(@splat(0));
        @memcpy(padded[0..inputs.len], inputs);
        c.ggml_backend_tensor_set(self.inputs, &padded, 0, @sizeOf(@TypeOf(padded)));
        if (c.ggml_backend_sched_graph_compute(self.scheduler, self.graph) != c.GGML_STATUS_SUCCESS) return error.GgmlInferenceFailed;
        c.ggml_backend_tensor_get(self.outputs, outputs.ptr, 0, outputs.len * @sizeOf(Model.Output));
        for (outputs) |row| {
            for (row) |value| {
                if (!std.math.isFinite(value)) return error.NonFiniteInferenceOutput;
            }
        }
    }

    fn deinit(self: *Session) void {
        c.ggml_backend_sched_free(self.scheduler);
        c.ggml_backend_buffer_free(self.buffer);
        c.ggml_free(self.compute_context);
        c.ggml_free(self.storage);
        self.devices.deinit();
    }
};

pub const Runner = struct {
    model: *const Model,
    session: ?Session,
    fallback_reason: ?[]const u8 = null,
    gpu_batches: usize = 0,
    cpu_batches: usize = 0,

    pub fn init(model: *const Model) !Runner {
        if (options.enabled) {
            const session = Session.init(model, .gpu) catch |err| {
                return .{ .model = model, .session = try Session.init(model, .cpu), .fallback_reason = @errorName(err) };
            };
            return .{ .model = model, .session = session };
        }
        return .{ .model = model, .session = try Session.init(model, .cpu) };
    }

    pub fn deinit(self: *Runner) void {
        if (self.session) |*session| session.deinit();
        self.session = null;
    }

    pub fn usesGpu(self: *const Runner) bool {
        return if (self.session) |session| session.devices.gpu != null else false;
    }

    pub fn backendName(self: *const Runner) []const u8 {
        return self.session.?.devices.backendName();
    }

    pub fn deviceName(self: *const Runner) []const u8 {
        return self.session.?.devices.deviceName();
    }

    pub fn compute(self: *Runner, inputs: []const Model.Input, outputs: []Model.Output) !void {
        if (inputs.len != outputs.len or inputs.len > batch_capacity) return error.InvalidInferenceBatch;
        if (inputs.len == 0) return;

        if (self.usesGpu()) {
            if (self.session.?.compute(inputs, outputs)) |_| {
                self.gpu_batches += 1;
                return;
            } else |err| {
                self.fallback_reason = @errorName(err);
                self.session.?.deinit();
                self.session = null;
                self.session = try Session.init(self.model, .cpu);
            }
        }
        try self.session.?.compute(inputs, outputs);
        self.cpu_batches += 1;
    }
};
