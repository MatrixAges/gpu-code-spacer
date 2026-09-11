const std = @import("std");
const layout = @import("layout.zig");
const features = @import("features.zig");
const classifier = @import("classifier.zig");
const inference = @import("inference.zig");

pub const Result = struct {
    text: []u8,
    candidates: usize,
    changes: usize,
    abstained: usize,
    protected_lines: usize,
    unterminated_region: bool,
};

pub fn apply(allocator: std.mem.Allocator, source: []const u8, runner: *inference.Runner, confidence: f32) !Result {
    if (!std.unicode.utf8ValidateSlice(source)) return error.InvalidUtf8;
    if (!std.math.isFinite(confidence) or confidence < 0 or confidence > 1) return error.InvalidConfidence;
    for (source, 0..) |byte, i| {
        if (byte == '\r' and (i + 1 == source.len or source[i + 1] != '\n')) return error.UnsupportedBareCarriageReturn;
    }

    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const temporary = arena.allocator();
    const document = try layout.analyze(temporary, source);
    var protected_lines: usize = 0;
    for (document.lines) |line| {
        if (line.protected) protected_lines += 1;
    }

    const labels = try temporary.alloc(u8, document.boundaries.len);
    var changes: usize = 0;
    var abstained: usize = 0;
    if (document.unterminated_region) {
        @memset(labels, classifier.keep);
        abstained = labels.len;
    } else {
        const inputs = try temporary.alloc(features.Vector, inference.batch_capacity);
        const outputs = try temporary.alloc(classifier.Model.Output, inference.batch_capacity);
        var start: usize = 0;
        while (start < document.boundaries.len) : (start += inference.batch_capacity) {
            const count = @min(inference.batch_capacity, document.boundaries.len - start);
            for (document.boundaries[start..][0..count], inputs[0..count]) |boundary, *input| input.* = features.encode(source, document, boundary);
            try runner.compute(inputs[0..count], outputs[0..count]);

            for (document.boundaries[start..][0..count], labels[start..][0..count], outputs[0..count]) |boundary, *label, output| {
                label.* = classifier.choose(output, confidence);
                if (label.* == classifier.keep) {
                    abstained += 1;
                } else if (label.* != boundary.blank_lines) changes += 1;
            }
        }
    }

    const result = try layout.render(allocator, source, document, labels);
    errdefer allocator.free(result);

    // Check the product's narrow byte-level contract independently of weights.
    var before = std.mem.splitScalar(u8, source, '\n');
    var after = std.mem.splitScalar(u8, result, '\n');
    while (nextNonblank(&before)) |line| {
        const next = nextNonblank(&after) orelse return error.NonblankContentChanged;
        if (!std.mem.eql(u8, line, next)) return error.NonblankContentChanged;
    }
    if (nextNonblank(&after) != null) return error.NonblankContentChanged;

    return .{
        .text = result,
        .candidates = document.boundaries.len,
        .changes = changes,
        .abstained = abstained,
        .protected_lines = protected_lines,
        .unterminated_region = document.unterminated_region,
    };
}

fn nextNonblank(iterator: *std.mem.SplitIterator(u8, .scalar)) ?[]const u8 {
    while (iterator.next()) |line| {
        if (std.mem.trim(u8, line, " \t\r").len > 0) return line;
    }
    return null;
}
