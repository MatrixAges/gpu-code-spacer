const features = @import("features.zig");

pub const Model = @import("model.zig").Mlp(features.count, 64, 3);

pub const keep = 255;

pub fn choose(logits: Model.Output, threshold: f32) u8 {
    const probabilities = Model.probabilities(logits);
    const label = Model.classify(probabilities);
    if (probabilities[label] < threshold) return keep;
    return @intCast(label);
}
