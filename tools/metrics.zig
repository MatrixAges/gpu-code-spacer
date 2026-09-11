const std = @import("std");

pub const Metrics = struct {
    confusion: [3][3]usize = @splat(@splat(0)),
    count: usize = 0,
    correct: usize = 0,

    pub fn add(self: *Metrics, truth: usize, prediction: usize) void {
        self.confusion[truth][prediction] += 1;
        self.count += 1;
        if (truth == prediction) self.correct += 1;
    }

    pub fn accuracy(self: Metrics) f64 {
        return ratio(self.correct, self.count);
    }

    pub fn macroF1(self: Metrics) f64 {
        var sum: f64 = 0;
        var classes: usize = 0;
        for (0..3) |label| {
            var truth: usize = 0;
            var predicted: usize = 0;
            for (0..3) |other| {
                truth += self.confusion[label][other];
                predicted += self.confusion[other][label];
            }
            // Keep the class set fixed by the reference support. Otherwise a
            // single prediction of an absent class abruptly changes the mean's
            // denominator and makes model selection incomparable across epochs.
            if (truth == 0) continue;
            sum += ratio(2 * self.confusion[label][label], truth + predicted);
            classes += 1;
        }
        return if (classes == 0) 0 else sum / @as(f64, @floatFromInt(classes));
    }

    pub fn blankPrecision(self: Metrics) f64 {
        var predicted: usize = 0;
        for (self.confusion) |row| predicted += row[1] + row[2];
        return ratio(self.confusion[1][1] + self.confusion[2][2], predicted);
    }

    pub fn blankRecall(self: Metrics) f64 {
        var truth: usize = 0;
        for (self.confusion[1..]) |row| {
            for (row) |value| truth += value;
        }
        return ratio(self.confusion[1][1] + self.confusion[2][2], truth);
    }

    pub fn summary(self: Metrics) Summary {
        return .{
            .count = self.count,
            .accuracy = self.accuracy(),
            .macro_f1 = self.macroF1(),
            .blank_precision = self.blankPrecision(),
            .blank_recall = self.blankRecall(),
            .confusion = self.confusion,
        };
    }
};

pub const Summary = struct {
    count: usize,
    accuracy: f64,
    macro_f1: f64,
    blank_precision: f64,
    blank_recall: f64,
    confusion: [3][3]usize,
};

pub fn ratio(numerator: usize, denominator: usize) f64 {
    return if (denominator == 0) 0 else @as(f64, @floatFromInt(numerator)) / @as(f64, @floatFromInt(denominator));
}
