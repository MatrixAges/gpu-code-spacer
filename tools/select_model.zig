const std = @import("std");
const core = @import("core");
const gguf = @import("learning/gguf.zig");

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
    reviewed_validation_files: usize = 0,
    validation_previously_seen_by_initial_model: bool = false,
};

const Candidate = struct { report: []const u8, score: f64, threshold: ?f32 };

fn checkRegression(allocator: std.mem.Allocator, io: std.Io, path: []const u8, hash: []const u8, confidence: f32) !void {
    const Counts = struct { cases: usize, exact_output: usize, nonblank_preserved: usize, idempotent: usize };
    const bytes = try std.Io.Dir.cwd().readFileAlloc(io, path, allocator, .limited(1024 * 1024));
    const report = (try std.json.parseFromSlice(struct {
        model: struct { sha256: []const u8, confidence: f32 },
        summary: struct { cases: Counts, validation: Counts },
    }, allocator, bytes, .{ .ignore_unknown_fields = true })).value;

    if (!std.mem.eql(u8, hash, report.model.sha256) or report.model.confidence != confidence) return error.RegressionModelMismatch;

    for ([_]Counts{ report.summary.cases, report.summary.validation }) |counts| {
        if (counts.cases == 0 or counts.exact_output != counts.cases or counts.nonblank_preserved != counts.cases or counts.idempotent != counts.cases) return error.RegressionGateFailed;
    }
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    if (args.len < 2) return error.ExpectedTrainingReports;

    var candidates: std.ArrayList(Candidate) = .empty;
    var selected: ?usize = null;
    var objective: ?[]const u8 = null;
    var reviewed_selection = false;
    var validation_previously_seen = false;
    var regression_path: ?[]const u8 = null;
    var argument: usize = 1;

    while (argument < args.len) : (argument += 1) {
        const path = args[argument];
        if (std.mem.eql(u8, path, "--regression-report")) {
            argument += 1;
            if (argument == args.len) return error.MissingRegressionReport;
            regression_path = args[argument];
            continue;
        }
        const bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, path, allocator, .limited(1024 * 1024));
        const report = (try std.json.parseFromSlice(Report, allocator, bytes, .{ .ignore_unknown_fields = true })).value;
        if (report.feature_version != core.features.version or report.test_data_used) return error.InvalidSelectionReport;

        const reviewed = std.mem.eql(u8, report.selection_objective, "reviewed_language_macro_f1");
        if (reviewed) {
            if (report.reviewed_validation_files == 0) return error.InvalidSelectionReport;
        } else if (!report.style_reference or !std.mem.eql(u8, report.selection_objective, "standard_style_macro_f1")) return error.IncompatibleSelectionObjective;

        if (objective) |value| {
            if (!std.mem.eql(u8, value, report.selection_objective)) return error.IncompatibleSelectionObjective;
        } else objective = report.selection_objective;

        var threshold: ?f32 = null;
        for (report.style_confidence_curves) |curve| {
            if (curve.metrics.blank_precision >= 0.95 and curve.metrics.blank_recall >= 0.60) {
                if (threshold == null or curve.threshold < threshold.?) threshold = curve.threshold;
            }
        }
        try candidates.append(allocator, .{ .report = path, .score = report.best_validation_score, .threshold = threshold });
        if (threshold != null and (selected == null or report.best_validation_score > candidates.items[selected.?].score)) {
            selected = candidates.items.len - 1;
            reviewed_selection = reviewed;
            validation_previously_seen = report.validation_previously_seen_by_initial_model;
        }
    }

    const winner = candidates.items[selected orelse return error.NoModelMeetsStyleCalibrationGate];
    if (!std.mem.endsWith(u8, winner.report, ".json")) return error.ExpectedJsonReport;
    const weights_path = try std.fmt.allocPrint(allocator, "{s}.weights", .{winner.report[0 .. winner.report.len - 5]});
    const bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, weights_path, allocator, .limited(1024 * 1024));
    const model = try core.weights.decode(core.classifier.Model, bytes, core.features.version);
    var hash: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(bytes, &hash, .{});
    const hash_text = try std.fmt.allocPrint(allocator, "{x}", .{hash});

    if (reviewed_selection or regression_path != null) {
        try checkRegression(allocator, init.io, regression_path orelse return error.MissingRegressionReport, hash_text, winner.threshold.?);
    }

    const report_bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, winner.report, allocator, .limited(1024 * 1024));
    const selected_report = (try std.json.parseFromSlice(std.json.Value, allocator, report_bytes, .{})).value;
    var training = report_bytes;

    if (selected_report.object.get("training_run_report")) |run_path| {
        const run_bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, run_path.string, allocator, .limited(1024 * 1024));
        var run_report = (try std.json.parseFromSlice(std.json.Value, allocator, run_bytes, .{})).value;
        var fields = selected_report.object.iterator();

        while (fields.next()) |field| try run_report.object.put(allocator, field.key_ptr.*, field.value_ptr.*);
        training = try std.json.Stringify.valueAlloc(allocator, run_report, .{ .whitespace = .indent_2 });
    }

    try std.Io.Dir.cwd().createDirPath(init.io, "models");
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "models/spacer.weights", .data = bytes });
    try gguf.write(allocator, "models/spacer.gguf", &model, core.features.version);

    const config = try std.fmt.allocPrint(allocator, "pub const confidence: f32 = {d:.2};\n\npub const feature_version: u32 = {d};\n", .{ winner.threshold.?, core.features.version });
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "models/config.zig", .data = config });

    const metadata = try std.json.Stringify.valueAlloc(allocator, .{
        .model = "spacer-poetic-v3",
        .style = "代码如诗，不仅要好读，还要好看；疏朗、有语义分组的留白",
        .format = "GCSPMLP2",
        .feature_version = core.features.version,
        .parameters = core.classifier.Model.parameter_count,
        .bytes = bytes.len,
        .sha256 = hash_text,
        .confidence = winner.threshold.?,
        .selected_report = winner.report,
        .selection_score = winner.score,
        .selection_rule = if (reviewed_selection) "highest six-language reviewed whole-file validation macro-F1 among models with dense-input precision >= 0.95 and recall >= 0.60; lowest eligible confidence threshold" else "highest standard-annotated style validation macro-F1 among models with dense-input precision >= 0.95 and recall >= 0.60; lowest eligible confidence threshold",
        .validation_previously_seen_by_initial_model = validation_previously_seen,
        .calibration_input_policy = "dense input: low-confidence predictions preserve zero blank lines; not a guarantee for arbitrary input layouts",
        .candidates = candidates.items,
        .external_tests_used_by_selector = regression_path != null,
        .regression_report = regression_path,
        .automatic_selection_data = if (reviewed_selection) "reviewed six-language validation plus mandatory exact regression qualification; feedback/demo sources overlap training; regression expectations excluded from training" else "standard-annotated personal-style validation only; benchmark development-feedback history is recorded in evaluation reports",
        .language_whitelist = false,
        .source_locks = [_][]const u8{ "config/sources.lock.json", "config/style-sources.lock.json" },
        .limits = "blank-line placement only; generic lexical guards are not a universal semantic proof",
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "models/metadata.json", .data = metadata });
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "models/training.json", .data = training });
    std.log.info("selected {s}, confidence {d:.2}, {d} weight bytes", .{ winner.report, winner.threshold.?, bytes.len });
}
