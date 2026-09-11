const std = @import("std");
const core = @import("core");
const data = @import("data.zig");
const metrics = @import("metrics.zig");
const ggml = @import("learning/ggml.zig");
const Model = core.classifier.Model;
const Curve = struct { threshold: f32, metrics: metrics.Summary };

fn inputHash(allocator: std.mem.Allocator, io: std.Io, path: []const u8) ![]const u8 {
    const file = try std.Io.Dir.cwd().openFile(io, path, .{});
    defer file.close(io);
    var buffer: [64 * 1024]u8 = undefined;
    var reader = file.reader(io, &buffer);
    var chunk: [64 * 1024]u8 = undefined;
    var hash = std.crypto.hash.sha2.Sha256.init(.{});
    while (true) {
        const count = try reader.interface.readSliceShort(&chunk);
        if (count == 0) break;
        hash.update(chunk[0..count]);
    }
    return std.fmt.allocPrint(allocator, "{x}", .{hash.finalResult()});
}

fn evaluate(model: *const Model, rows: []const data.Row, excluded_language: ?usize) [6]metrics.Metrics {
    var results: [6]metrics.Metrics = @splat(.{});
    for (rows) |row| {
        if (row.language_id >= results.len or row.language_id == excluded_language) continue;
        results[row.language_id].add(row.label, Model.classify(model.forward(row.input)));
    }
    return results;
}

fn score(results: [6]metrics.Metrics) f64 {
    var sum: f64 = 0;
    var languages: usize = 0;
    for (results) |result| {
        if (result.count == 0) continue;
        sum += result.macroF1();
        languages += 1;
    }
    return if (languages == 0) 0 else sum / @as(f64, @floatFromInt(languages));
}

fn styleMetrics(model: *const Model, rows: []const data.Row) metrics.Metrics {
    var result: metrics.Metrics = .{};
    for (rows) |row| result.add(row.label, Model.classify(model.forward(row.input)));
    return result;
}

fn selectionScore(model: *const Model, validation: []const data.Row, style_validation: []const data.Row, excluded_language: ?usize) f64 {
    const base = score(evaluate(model, validation, excluded_language));
    if (style_validation.len == 0) return base;
    return styleMetrics(model, style_validation).macroF1();
}

fn confidenceCurves(model: *const Model, rows: []const data.Row) [6]Curve {
    const thresholds = [_]f32{ 0.0, 0.5, 0.7, 0.8, 0.9, 0.95 };
    var accumulated: [6]metrics.Metrics = @splat(.{});
    for (rows) |row| {
        const probabilities = Model.probabilities(model.forward(row.input));
        const label = Model.classify(probabilities);
        for (thresholds, &accumulated) |threshold, *result| {
            result.add(row.label, if (probabilities[label] >= threshold) label else 0);
        }
    }

    var result: [6]Curve = undefined;
    for (&result, thresholds, accumulated) |*item, threshold, metric| item.* = .{ .threshold = threshold, .metrics = metric.summary() };
    return result;
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    var seed: u64 = 73;
    var epochs: usize = 24;
    var steps: usize = 512;
    var heldout_language: ?usize = null;
    var style = false;
    var initial_model: ?[]const u8 = null;
    var output_prefix: ?[]const u8 = null;
    var style_share: f32 = 1;
    var standard = false;
    var backend: ggml.Backend = .cpu;
    var threads: u31 = 1;

    var argument: usize = 1;
    while (argument < args.len) {
        const option = args[argument];
        argument += 1;
        if (std.mem.eql(u8, option, "--style")) {
            style = true;
            continue;
        }
        if (std.mem.eql(u8, option, "--standard")) {
            standard = true;
            continue;
        }
        if (argument == args.len) return error.MissingArgumentValue;
        const value = args[argument];
        argument += 1;
        if (std.mem.eql(u8, option, "--seed")) {
            seed = try std.fmt.parseInt(u64, value, 10);
        } else if (std.mem.eql(u8, option, "--epochs")) {
            epochs = try std.fmt.parseInt(usize, value, 10);
        } else if (std.mem.eql(u8, option, "--steps")) {
            steps = try std.fmt.parseInt(usize, value, 10);
        } else if (std.mem.eql(u8, option, "--backend")) {
            backend = std.meta.stringToEnum(ggml.Backend, value) orelse return error.UnknownTrainingBackend;
        } else if (std.mem.eql(u8, option, "--threads")) {
            threads = try std.fmt.parseInt(u31, value, 10);
        } else if (std.mem.eql(u8, option, "--init")) {
            initial_model = value;
        } else if (std.mem.eql(u8, option, "--output-prefix")) {
            output_prefix = value;
        } else if (std.mem.eql(u8, option, "--style-share")) {
            style_share = try std.fmt.parseFloat(f32, value);
        } else if (std.mem.eql(u8, option, "--holdout-language")) {
            heldout_language = try data.languageIndex(value);
            if (heldout_language.? >= 6) return error.LanguageAlreadyHeldOut;
        } else return error.UnknownArgument;
    }
    if (epochs == 0 or steps == 0) return error.InvalidTrainingBudget;
    if (threads == 0) return error.InvalidThreadCount;
    if (!std.math.isFinite(style_share) or style_share <= 0 or style_share > 1) return error.InvalidStyleShare;
    if (style and heldout_language != null) return error.SeparateStyleAndLanguageHoldoutExperiments;

    const prefix = if (standard) "standard_" else "";
    const training_path = try std.fmt.allocPrint(allocator, "data/processed/{s}train.bin", .{prefix});
    const validation_path = try std.fmt.allocPrint(allocator, "data/processed/{s}validation.bin", .{prefix});
    const style_training_path = try std.fmt.allocPrint(allocator, "data/processed/{s}style_train.bin", .{prefix});
    const style_validation_path = try std.fmt.allocPrint(allocator, "data/processed/{s}style_validation.bin", .{prefix});
    const training = try data.load(allocator, init.io, training_path);
    const validation = try data.load(allocator, init.io, validation_path);
    const style_training = if (style) try data.load(allocator, init.io, style_training_path) else &.{};
    const style_validation = if (style) try data.load(allocator, init.io, style_validation_path) else &.{};
    if (style and (style_training.len == 0 or style_validation.len == 0)) return error.MissingStyleData;
    var style_files: std.ArrayList(std.ArrayList(usize)) = .empty;
    var style_file_indices = std.AutoHashMap(u32, usize).init(allocator);
    for (style_training, 0..) |row, index| {
        const entry = try style_file_indices.getOrPut(row.file_id);
        if (!entry.found_existing) {
            entry.value_ptr.* = style_files.items.len;
            try style_files.append(allocator, .empty);
        }

        try style_files.items[entry.value_ptr.*].append(allocator, index);
    }

    var buckets: [6]std.ArrayList(usize) = @splat(.empty);
    var counts: [3]usize = @splat(0);

    for (training, 0..) |row, index| {
        if (row.language_id >= buckets.len or row.language_id == heldout_language) continue;
        try buckets[row.language_id].append(allocator, index);
        counts[row.label] += 1;
    }
    var active: std.ArrayList(usize) = .empty;
    for (buckets, 0..) |bucket, language| {
        if (bucket.items.len > 0) try active.append(allocator, language);
    }
    if (active.items.len < 2) return error.InsufficientLanguageCoverage;

    var class_weights: [3]f32 = undefined;
    const total = counts[0] + counts[1] + counts[2];
    for (&class_weights, counts) |*weight, count| {
        weight.* = @min(3, @sqrt(@as(f32, @floatFromInt(total)) / @as(f32, @floatFromInt(3 * @max(count, 1)))));
    }

    var model = if (initial_model) |path| try core.weights.decode(Model, try std.Io.Dir.cwd().readFileAlloc(init.io, path, allocator, .limited(1024 * 1024)), core.features.version) else Model.init(seed);
    var best = model;
    const initial_score = selectionScore(&model, validation, style_validation, heldout_language);
    var best_score = initial_score;
    var best_epoch: usize = 0;
    var trainer: ggml.Trainer(Model) = undefined;
    try trainer.init(&model, backend, threads, if (style) 0.0003 else 0.001, .train);
    defer trainer.deinit();
    std.log.info("training: ggml {s}, backend {s}, CPU threads {d}", .{ ggml.commit, trainer.backendName(), threads });
    var random = std.Random.DefaultPrng.init(seed ^ 0x5a17);
    var completed: usize = 0;

    try std.Io.Dir.cwd().createDirPath(init.io, "artifacts");
    for (0..epochs) |epoch| {
        for (0..steps) |_| {
            var inputs: [ggml.batch_size]Model.Input = undefined;
            var labels: [ggml.batch_size]u8 = undefined;
            for (&inputs, &labels) |*input, *label| {
                const row = if (style and random.random().float(f32) < style_share) block: {
                    const file = style_files.items[random.random().uintLessThan(usize, style_files.items.len)];
                    break :block style_training[file.items[random.random().uintLessThan(usize, file.items.len)]];
                } else block: {
                    const language = active.items[random.random().uintLessThan(usize, active.items.len)];
                    const bucket = buckets[language].items;
                    break :block training[bucket[random.random().uintLessThan(usize, bucket.len)]];
                };
                input.* = row.input;
                label.* = row.label;
            }
            try trainer.step(&inputs, &labels, &class_weights);
        }

        try trainer.download(&model);
        completed = epoch + 1;
        const current_score = selectionScore(&model, validation, style_validation, heldout_language);
        if (!std.math.isFinite(current_score)) return error.NonFiniteScore;
        std.log.info("seed {d} epoch {d}: validation selection score {d:.5}", .{ seed, completed, current_score });
        if (current_score > best_score + 0.0001) {
            best_score = current_score;
            best_epoch = completed;
            best = model;
        } else if (completed - best_epoch >= 5) break;
    }

    const suffix = if (heldout_language) |language| data.languages[language] else if (style) "style" else "all";
    const destination = output_prefix orelse try std.fmt.allocPrint(allocator, "artifacts/seed-{d}-{s}", .{ seed, suffix });
    const output_path = try std.fmt.allocPrint(allocator, "{s}.weights", .{destination});
    const encoded = try core.weights.encode(allocator, &best, core.features.version);
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = output_path, .data = encoded });

    const validated = evaluate(&best, validation, heldout_language);
    var summaries: [6]metrics.Summary = undefined;
    for (validated, &summaries) |result, *summary| summary.* = result.summary();
    const report = try std.json.Stringify.valueAlloc(allocator, .{
        .training_engine = "ggml",
        .ggml_version = ggml.version(),
        .ggml_commit = ggml.commit,
        .training_backend = trainer.backendName(),
        .cpu_threads = threads,
        .optimizer = "AdamW (weight_decay=0, beta1=0.9, beta2=0.999, epsilon=1e-8)",
        .loss = "mean(class_weight[label] * cross_entropy)",
        .seed = seed,
        .heldout_language = if (heldout_language) |language| data.languages[language] else null,
        .style_reference = style,
        .initial_model = initial_model,
        .feature_version = core.features.version,
        .language_is_model_input = false,
        .parameters = Model.parameter_count,
        .model_bytes = encoded.len,
        .completed_epochs = completed,
        .best_epoch = best_epoch,
        .steps_per_epoch = steps,
        .batch_size = ggml.batch_size,
        .sampling = if (style) "uniform personal-style file then boundary; optional development-language replay, with replacement" else "uniform language then uniform training boundary, with replacement",
        .style_share = if (style) style_share else 0,
        .selection_objective = if (style and standard) "standard_style_macro_f1" else if (style) "personal_style_macro_f1" else "development_language_macro_f1",
        .label_set = if (standard) "AST-annotated user standard" else "original author layout",
        .style_training_files = style_files.items.len,
        .class_weights = class_weights,
        .initial_validation_score = initial_score,
        .best_validation_score = best_score,
        .macro_f1_class_policy = "classes with reference support, fixed per language",
        .language_order = data.languages[0..6],
        .validation = summaries,
        .style_validation = styleMetrics(&best, style_validation).summary(),
        .style_confidence_curves = confidenceCurves(&best, style_validation),
        .calibration_input_policy = "dense input: low-confidence predictions preserve zero blank lines",
        .test_data_used = false,
        .dataset_sha256 = .{
            .train = try inputHash(allocator, init.io, training_path),
            .validation = try inputHash(allocator, init.io, validation_path),
            .style_train = if (style) try inputHash(allocator, init.io, style_training_path) else null,
            .style_validation = if (style) try inputHash(allocator, init.io, style_validation_path) else null,
        },
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = try std.fmt.allocPrint(allocator, "{s}.json", .{destination}), .data = report });
}
