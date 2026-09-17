const std = @import("std");
const layout = @import("layout.zig");
const features = @import("features.zig");
const classifier = @import("classifier.zig");
const batch_capacity = 256;

pub const Result = struct {
    text: []u8,
    candidates: usize,
    changes: usize,
    abstained: usize,
    protected_lines: usize,
    unterminated_region: bool,
};

/// Caller owns the source and allocator until rendering completes.
pub const Prepared = struct {
    source: []const u8,
    document: layout.Document,
    labels: []u8,
    confidence: f32,
    cursor: usize = 0,
    changes: usize = 0,
    abstained: usize = 0,
    protected_lines: usize = 0,

    pub fn init(allocator: std.mem.Allocator, source: []const u8, confidence: f32) !Prepared {
        if (!std.unicode.utf8ValidateSlice(source)) return error.InvalidUtf8;
        if (!std.math.isFinite(confidence) or confidence < 0 or confidence > 1) return error.InvalidConfidence;

        for (source, 0..) |byte, i| {
            if (byte == '\r' and (i + 1 == source.len or source[i + 1] != '\n')) return error.UnsupportedBareCarriageReturn;
        }

        const document = try layout.analyze(allocator, source);
        const labels = try allocator.alloc(u8, document.boundaries.len);
        @memset(labels, classifier.keep);

        var self: Prepared = .{
            .source = source,
            .document = document,
            .labels = labels,
            .confidence = confidence,
        };

        for (document.lines) |line| {
            if (line.protected) self.protected_lines += 1;
        }

        if (document.unterminated_region) {
            self.cursor = labels.len;
            self.abstained = labels.len;
        }

        return self;
    }

    pub fn encodeBatch(self: *const Prepared, inputs: []features.Vector) usize {
        const count = @min(inputs.len, self.labels.len - self.cursor);

        for (self.document.boundaries[self.cursor..][0..count], inputs[0..count]) |boundary, *input| {
            input.* = features.encode(self.source, self.document, boundary);
        }

        return count;
    }

    pub fn acceptBatch(self: *Prepared, outputs: []const classifier.Model.Output) !void {
        if (outputs.len > self.labels.len - self.cursor) return error.InvalidInferenceBatch;

        for (outputs) |output| {
            for (output) |value| {
                if (!std.math.isFinite(value)) return error.NonFiniteInferenceOutput;
            }
        }

        for (self.document.boundaries[self.cursor..][0..outputs.len], self.labels[self.cursor..][0..outputs.len], outputs) |boundary, *label, output| {
            label.* = classifier.choose(output, self.confidence);
            if (label.* == classifier.keep) {
                self.abstained += 1;
            } else if (label.* != boundary.blank_lines) self.changes += 1;
        }

        self.cursor += outputs.len;
    }

    pub fn render(self: *const Prepared, allocator: std.mem.Allocator) !Result {
        if (self.cursor != self.labels.len) return error.IncompleteInference;

        const result = try layout.render(allocator, self.source, self.document, self.labels);
        errdefer allocator.free(result);

        // Check the product's narrow byte-level contract independently of weights.
        var before = std.mem.splitScalar(u8, self.source, '\n');
        var after = std.mem.splitScalar(u8, result, '\n');
        while (nextNonblank(&before)) |line| {
            const next = nextNonblank(&after) orelse return error.NonblankContentChanged;
            if (!std.mem.eql(u8, line, next)) return error.NonblankContentChanged;
        }
        if (nextNonblank(&after) != null) return error.NonblankContentChanged;

        return .{
            .text = result,
            .candidates = self.document.boundaries.len,
            .changes = self.changes,
            .abstained = self.abstained,
            .protected_lines = self.protected_lines,
            .unterminated_region = self.document.unterminated_region,
        };
    }
};

pub fn apply(allocator: std.mem.Allocator, source: []const u8, runner: anytype, confidence: f32) !Result {
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const temporary = arena.allocator();
    var prepared = try Prepared.init(temporary, source, confidence);

    if (prepared.cursor < prepared.labels.len) {
        const inputs = try temporary.alloc(features.Vector, batch_capacity);
        const outputs = try temporary.alloc(classifier.Model.Output, batch_capacity);

        while (true) {
            const count = prepared.encodeBatch(inputs);
            if (count == 0) break;

            try runner.compute(inputs[0..count], outputs[0..count]);
            try prepared.acceptBatch(outputs[0..count]);
        }
    }

    return prepared.render(allocator);
}

fn nextNonblank(iterator: *std.mem.SplitIterator(u8, .scalar)) ?[]const u8 {
    while (iterator.next()) |line| {
        if (std.mem.trim(u8, line, " \t\r").len > 0) return line;
    }
    return null;
}
