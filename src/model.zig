const std = @import("std");

/// Native model layout, initialization, and inference shared with ggml training.
pub fn Mlp(comptime inputs: usize, comptime hidden: usize, comptime outputs: usize) type {
    return struct {
        const Self = @This();

        pub const input_count = inputs;
        pub const hidden_count = hidden;
        pub const output_count = outputs;
        pub const w1_start = 0;
        pub const b1_start = inputs * hidden;
        pub const w2_start = b1_start + hidden;
        pub const b2_start = w2_start + hidden * outputs;
        pub const parameter_count = b2_start + outputs;

        pub const Input = [inputs]f32;
        pub const Output = [outputs]f32;
        pub const Parameters = [parameter_count]f32;

        pub const Sample = struct {
            input: Input,
            label: usize,
        };

        parameters: Parameters,

        pub fn init(seed: u64) Self {
            var rng = std.Random.DefaultPrng.init(seed);
            const random = rng.random();
            var self: Self = .{ .parameters = @splat(0) };

            const scale1 = @sqrt(6.0 / @as(f32, @floatFromInt(inputs + hidden)));
            const scale2 = @sqrt(6.0 / @as(f32, @floatFromInt(hidden + outputs)));

            for (self.parameters[w1_start..b1_start]) |*weight| {
                weight.* = (2 * random.float(f32) - 1) * scale1;
            }

            for (self.parameters[w2_start..b2_start]) |*weight| {
                weight.* = (2 * random.float(f32) - 1) * scale2;
            }

            return self;
        }

        fn activations(self: *const Self, input: Input) [hidden]f32 {
            var values: [hidden]f32 = undefined;

            for (&values, 0..) |*value, h| {
                var sum = self.parameters[b1_start + h];
                for (input, 0..) |x, i| {
                    sum += x * self.parameters[w1_start + i * hidden + h];
                }
                value.* = @max(0, sum);
            }

            return values;
        }

        pub fn forward(self: *const Self, input: Input) Output {
            const values = self.activations(input);
            return self.project(values);
        }

        fn project(self: *const Self, values: [hidden]f32) Output {
            var logits: Output = undefined;

            for (&logits, 0..) |*logit, o| {
                logit.* = self.parameters[b2_start + o];
                for (values, 0..) |value, h| {
                    logit.* += value * self.parameters[w2_start + h * outputs + o];
                }
            }

            return logits;
        }

        pub fn probabilities(logits: Output) Output {
            const largest = std.mem.max(f32, &logits);
            var result: Output = undefined;
            var total: f32 = 0;

            for (&result, logits) |*value, logit| {
                value.* = @exp(logit - largest);
                total += value.*;
            }

            for (&result) |*value| value.* /= total;
            return result;
        }

        pub fn classify(logits: Output) usize {
            return std.sort.argMax(f32, &logits, {}, std.sort.asc(f32)).?;
        }

        pub fn loss(self: *const Self, sample: Sample) f32 {
            const logits = self.forward(sample.input);
            const largest = std.mem.max(f32, &logits);
            var total: f32 = 0;
            for (logits) |logit| total += @exp(logit - largest);

            return largest + @log(total) - logits[sample.label];
        }
    };
}
