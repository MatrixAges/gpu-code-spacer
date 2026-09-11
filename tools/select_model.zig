const std = @import("std");
const core = @import("core");

const Curve = struct {
    threshold: f32,
    metrics: struct { blank_precision: f64, blank_recall: f64 },
};

const Report = struct {
    seed: u64,
    feature_version: u32,
    style_reference: bool,
    best_validation_score: f64,
    style_confidence_curves: []Curve,
    test_data_used: bool,
    selection_objective: []const u8,
};

const Candidate = struct { report: []const u8, score: f64, threshold: ?f32 };

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    if (args.len < 2) return error.ExpectedTrainingReports;

    var candidates: std.ArrayList(Candidate) = .empty;
    var selected: ?usize = null;
    for (args[1..]) |path| {
        const bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, path, allocator, .limited(1024 * 1024));
        const report = (try std.json.parseFromSlice(Report, allocator, bytes, .{ .ignore_unknown_fields = true })).value;
        if (report.feature_version != core.features.version or !report.style_reference or report.test_data_used) return error.InvalidSelectionReport;
        if (!std.mem.eql(u8, report.selection_objective, "standard_style_macro_f1")) return error.IncompatibleSelectionObjective;

        var threshold: ?f32 = null;
        for (report.style_confidence_curves) |curve| {
            if (curve.metrics.blank_precision >= 0.95 and curve.metrics.blank_recall >= 0.60) {
                if (threshold == null or curve.threshold < threshold.?) threshold = curve.threshold;
            }
        }
        try candidates.append(allocator, .{ .report = path, .score = report.best_validation_score, .threshold = threshold });
        if (threshold != null and (selected == null or report.best_validation_score > candidates.items[selected.?].score)) selected = candidates.items.len - 1;
    }

    const winner = candidates.items[selected orelse return error.NoModelMeetsStyleCalibrationGate];
    if (!std.mem.endsWith(u8, winner.report, ".json")) return error.ExpectedJsonReport;
    const weights_path = try std.fmt.allocPrint(allocator, "{s}.weights", .{winner.report[0 .. winner.report.len - 5]});
    const bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, weights_path, allocator, .limited(1024 * 1024));
    _ = try core.weights.decode(core.classifier.Model, bytes, core.features.version);
    var hash: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(bytes, &hash, .{});

    try std.Io.Dir.cwd().createDirPath(init.io, "models");
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "models/spacer.weights", .data = bytes });
    const config = try std.fmt.allocPrint(allocator, "pub const confidence: f32 = {d:.2};\n\npub const feature_version: u32 = {d};\n", .{ winner.threshold.?, core.features.version });
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "models/config.zig", .data = config });

    const metadata = try std.json.Stringify.valueAlloc(allocator, .{
        .model = "spacer-poetic-v3",
        .style = "代码如诗，不仅要好读，还要好看；疏朗、有语义分组的留白",
        .format = "GCSPMLP2",
        .feature_version = core.features.version,
        .parameters = core.classifier.Model.parameter_count,
        .bytes = bytes.len,
        .sha256 = try std.fmt.allocPrint(allocator, "{x}", .{hash}),
        .confidence = winner.threshold.?,
        .selected_report = winner.report,
        .selection_score = winner.score,
        .selection_rule = "highest standard-annotated style validation macro-F1 among models with dense-input precision >= 0.95 and recall >= 0.60; lowest eligible confidence threshold",
        .calibration_input_policy = "dense input: low-confidence predictions preserve zero blank lines; not a guarantee for arbitrary input layouts",
        .candidates = candidates.items,
        .external_tests_used_by_selector = false,
        .automatic_selection_data = "standard-annotated personal-style validation only; benchmark development-feedback history is recorded in evaluation reports",
        .language_whitelist = false,
        .source_locks = [_][]const u8{ "config/sources.lock.json", "config/style-sources.lock.json" },
        .limits = "blank-line placement only; generic lexical guards are not a universal semantic proof",
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "models/metadata.json", .data = metadata });
    const training = try std.Io.Dir.cwd().readFileAlloc(init.io, winner.report, allocator, .limited(1024 * 1024));
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "models/training.json", .data = training });
    std.log.info("selected {s}, confidence {d:.2}, {d} weight bytes", .{ winner.report, winner.threshold.?, bytes.len });
}
