const std = @import("std");
const core = @import("core");
const syntax = @import("syntax");
const data = @import("data.zig");
const metrics = @import("metrics.zig");
const evaluation_files = @import("evaluation_files.zig");
const Model = core.classifier.Model;

const group_names = [_][]const u8{
    "typescript",         "javascript",       "python",           "java",               "rust",              "zig",
    "unseen-go",          "unseen-cpp",       "unseen-csharp",    "unseen-ruby",        "unseen-kotlin",     "unseen-swift",
    "comment-boundaries", "nested-blocks",    "long-expressions", "top-level-sections", "protected-regions", "crlf",
    "idempotence",        "perturbed-layout",
};

const Chunk = struct { begin: usize, end: usize, used: bool = false };
const Group = struct {
    name: []const u8,
    cases: usize = 0,
    focused_boundaries: usize = 0,
    syntax_verified: usize = 0,
    syntax_unavailable: usize = 0,
    lexical_abstentions: usize = 0,
    proposed_edits: usize = 0,
    idempotent_cases: usize = 0,
    binary_checks: usize = 0,
};

fn rule(input: core.features.Vector) usize {
    if (input[11] == 1 or input[12] == 1) return 0;
    if (input[17] == 1) return 1;
    if (input[18] == 1) return 0;
    if (input[30] == 1 and input[4] == 1) return 1;
    if (input[26] == 1 and input[1] > 0) return 1;
    return 0;
}

fn matches(group: usize, rows: []const data.Row) bool {
    if (group < 12) return rows[0].language_id == group;
    for (rows) |row| {
        const x = row.input;
        if (group == 12 and x[17] == 1) return true;
        if (group == 13 and x[1] > 0 and (x[12] == 1 or x[13] == 1)) return true;
        if (group == 14 and (x[8] > 0.7 or x[9] > 0.7)) return true;
        if (group == 15 and x[25] == 1 and x[26] == 1) return true;
    }
    return group >= 16;
}

fn withCrlf(allocator: std.mem.Allocator, source: []const u8) ![]u8 {
    var output: std.ArrayList(u8) = .empty;
    for (source, 0..) |byte, i| {
        if (byte == '\n' and (i == 0 or source[i - 1] != '\r')) try output.append(allocator, '\r');
        try output.append(allocator, byte);
    }
    return output.toOwnedSlice(allocator);
}

fn excerpt(source: []const u8, document: core.layout.Document, first: usize, last: usize) []const u8 {
    const begin = document.lines[document.nonblank[first]].start;
    const end = document.lines[document.nonblank[last]].after;
    return source[begin..end];
}

fn checkBinary(allocator: std.mem.Allocator, io: std.Io, source: []const u8, expected: []const u8, confidence: f32, directory: []const u8) !void {
    const path = try std.fs.path.join(allocator, &.{ directory, ".binary-input.unknown-extension" });
    try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = path, .data = source });
    defer std.Io.Dir.cwd().deleteFile(io, path) catch {};
    const threshold = try std.fmt.allocPrint(allocator, "{d:.2}", .{confidence});
    const result = try std.process.run(allocator, io, .{
        .argv = &.{ "./zig-out/bin/gpu-code-spacer", "--confidence", threshold, path },
        .stdout_limit = .limited(8 * 1024 * 1024),
        .stderr_limit = .limited(16 * 1024),
    });
    if (result.term != .exited or result.term.exited != 0) return error.BinaryExecutionFailed;
    if (!std.mem.eql(u8, result.stdout, expected)) return error.BinaryOutputMismatch;

    const write = try std.process.run(allocator, io, .{
        .argv = &.{ "./zig-out/bin/gpu-code-spacer", "--write", "--confidence", threshold, path },
        .stdout_limit = .limited(1024),
        .stderr_limit = .limited(16 * 1024),
    });
    if (write.term != .exited or write.term.exited != 0) return error.BinaryWriteFailed;
    const actual = try std.Io.Dir.cwd().readFileAlloc(io, path, allocator, .limited(8 * 1024 * 1024));
    if (!std.mem.eql(u8, actual, expected)) return error.BinaryWriteMismatch;
}

fn writeCase(allocator: std.mem.Allocator, io: std.Io, runner: *core.inference.Runner, file: data.File, rows: []const data.Row, group_index: usize, group: *Group, directory: []const u8, model_sha256: []const u8, confidence: f32, timings: *std.ArrayList(u64)) !void {
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const temporary = arena.allocator();
    const original = try std.Io.Dir.cwd().readFileAlloc(io, file.source_path, temporary, .limited(1024 * 1024));
    const source = if (group_index == 17) try withCrlf(temporary, original) else original;
    const document = try core.layout.analyze(temporary, source);
    var protected: usize = 0;
    for (document.lines) |line| {
        if (line.protected) protected += 1;
    }
    if (group_index == 16 and protected == 0) return error.NotRelevantToGroup;

    const labels = try temporary.alloc(u8, document.boundaries.len);
    for (labels, 0..) |*label, i| label.* = if (group_index == 18) core.classifier.keep else if (group_index == 19) @intCast(i % 3) else 0;
    const input = try core.layout.render(temporary, source, document, labels);

    const started = std.Io.Clock.awake.now(io);
    const result = try core.engine.apply(temporary, input, runner, confidence);
    const elapsed = started.durationTo(std.Io.Clock.awake.now(io)).nanoseconds;
    try timings.append(allocator, @intCast(@max(elapsed, 0)));
    const repeated = try core.engine.apply(temporary, result.text, runner, confidence);
    if (!std.mem.eql(u8, result.text, repeated.text)) return error.NonIdempotentOutput;

    const input_tree = try syntax.fingerprint(input, file.language);
    if (input_tree) |tree| {
        const output_tree = try syntax.fingerprint(result.text, file.language);
        if (!std.mem.eql(u8, &tree, &output_tree.?)) return error.SyntaxOrLiteralChanged;
        group.syntax_verified += 1;
    } else group.syntax_unavailable += 1;

    if (group.cases == 0) {
        try checkBinary(temporary, io, input, result.text, confidence, directory);
        group.binary_checks += 1;
    }

    const first_boundary = document.boundaries[rows[0].boundary_id];
    const last_boundary = document.boundaries[rows[rows.len - 1].boundary_id];
    const first = first_boundary.before -| 3;
    const last = @min(last_boundary.after + 3, document.nonblank.len - 1);
    const input_document = try core.layout.analyze(temporary, input);
    const output_document = try core.layout.analyze(temporary, result.text);
    if (document.nonblank.len != input_document.nonblank.len or document.nonblank.len != output_document.nonblank.len) return error.NonblankLineCountChanged;

    const targets = try temporary.alloc(u8, rows.len);
    const ids = try temporary.alloc(u32, rows.len);
    for (rows, targets, ids) |row, *target, *id| {
        target.* = row.label;
        id.* = row.boundary_id;
    }
    const record = try std.json.Stringify.valueAlloc(temporary, .{
        .schema_version = 1,
        .id = try std.fmt.allocPrint(temporary, "{d:0>2}-{d:0>3}", .{ group_index + 1, group.cases + 1 }),
        .repository = file.repository,
        .source_path = file.source_path,
        .source_sha256 = file.sha256,
        .source_split = file.split,
        .input_sha256 = try evaluation_files.hash(temporary, input),
        .generated_output_sha256 = try evaluation_files.hash(temporary, result.text),
        .model_sha256 = model_sha256,
        .feature_version = core.features.version,
        .confidence = confidence,
        .review_status = "unreviewed",
        .correction_policy = "Edit output to record a correction; generation scores describe the saved hash, not later edits. Corrections are not automatically used for training.",
        .language = file.language,
        .boundary_ids = ids,
        .original_labels = targets,
        .reference_kind = "original-author weak layout reference, not an aesthetic oracle",
        .input_transform = if (group_index == 18) "original" else if (group_index == 19) "cycle-safe-gaps-0-1-2" else if (group_index == 17) "CRLF-and-dense" else "dense-safe-gaps",
        .input_excerpt = excerpt(input, input_document, first, last),
        .reference_excerpt = excerpt(source, document, first, last),
        .prediction_excerpt = excerpt(result.text, output_document, first, last),
        .full_context_preserved = true,
        .syntax_checked = input_tree != null,
        .nonblank_bytes_preserved = true,
        .idempotent = true,
        .lexical_abstention = result.unterminated_region,
        .full_file_changes = result.changes,
        .backend = runner.backendName(),
    }, .{ .whitespace = .indent_2 });
    const case_directory = try std.fmt.allocPrint(temporary, "{s}/{d:0>2}-{s}/{d:0>3}", .{ directory, group_index + 1, group.name, group.cases + 1 });
    const paths = try evaluation_files.paths(temporary, io, case_directory, file.language);
    try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = paths.input, .data = input });
    try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = paths.output, .data = result.text });
    try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = paths.metadata, .data = record });

    group.cases += 1;
    group.focused_boundaries += rows.len;
    group.proposed_edits += result.changes;
    group.idempotent_cases += 1;
    if (result.unterminated_region) group.lexical_abstentions += 1;
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    if (args.len < 2 or args.len > 3) return error.ExpectedModelPathAndOptionalConfidence;
    const confidence = if (args.len == 3) try std.fmt.parseFloat(f32, args[2]) else 0.90;
    const encoded = try std.Io.Dir.cwd().readFileAlloc(init.io, args[1], allocator, .limited(1024 * 1024));
    const model = try core.weights.decode(Model, encoded, core.features.version);
    var runner = try core.inference.Runner.init(&model);
    defer runner.deinit();
    const known = try data.load(allocator, init.io, "data/processed/test.bin");
    const unseen = try data.load(allocator, init.io, "data/processed/unseen_language.bin");
    const rows = try std.mem.concat(allocator, data.Row, &.{ known, unseen });
    const manifest = try std.Io.Dir.cwd().readFileAlloc(init.io, "data/processed/files.json", allocator, .limited(16 * 1024 * 1024));
    const files = (try std.json.parseFromSlice([]data.File, allocator, manifest, .{})).value;

    var raw_metrics: [12]metrics.Metrics = @splat(.{});
    var threshold_metrics: [12]metrics.Metrics = @splat(.{});
    var rule_metrics: [12]metrics.Metrics = @splat(.{});
    var unchanged_metrics: [12]metrics.Metrics = @splat(.{});
    const batch_inputs = try allocator.alloc(Model.Input, core.inference.batch_capacity);
    const batch_outputs = try allocator.alloc(Model.Output, core.inference.batch_capacity);
    var batch_start: usize = 0;
    while (batch_start < rows.len) : (batch_start += core.inference.batch_capacity) {
        const count = @min(core.inference.batch_capacity, rows.len - batch_start);
        for (rows[batch_start..][0..count], batch_inputs[0..count]) |row, *input| input.* = row.input;
        try runner.compute(batch_inputs[0..count], batch_outputs[0..count]);
        for (rows[batch_start..][0..count], batch_outputs[0..count]) |row, output| {
            const probabilities = Model.probabilities(output);
            const label = Model.classify(probabilities);
            raw_metrics[row.language_id].add(row.label, label);
            threshold_metrics[row.language_id].add(row.label, if (probabilities[label] >= confidence) label else 0);
            rule_metrics[row.language_id].add(row.label, rule(row.input));
            unchanged_metrics[row.language_id].add(row.label, 0);
        }
    }

    var chunks: std.ArrayList(Chunk) = .empty;
    var begin: usize = 0;
    while (begin < rows.len) {
        var end = begin + 1;
        while (end < rows.len and rows[end].file_id == rows[begin].file_id and end - begin < 8) : (end += 1) {}
        if (end - begin >= 4) try chunks.append(allocator, .{ .begin = begin, .end = end });
        begin = end;
    }
    var random = std.Random.DefaultPrng.init(20260910);
    random.random().shuffle(Chunk, chunks.items);

    const directory = try evaluation_files.resultsDirectory(allocator, init.io, "evaluation/artifacts/corpus");
    const model_sha256 = try evaluation_files.hash(allocator, encoded);
    var groups: [20]Group = undefined;
    var timings: std.ArrayList(u64) = .empty;
    const file_counts = try allocator.alloc(usize, files.len);
    for (group_names, &groups, 0..) |name, *group, index| {
        group.* = .{ .name = name };
        @memset(file_counts, 0);
        for (0..2) |pass| {
            for (chunks.items) |*chunk| {
                if (group.cases == 30) break;
                if (chunk.used) continue;
                const selection = rows[chunk.begin..chunk.end];
                const source_file = files[selection[0].file_id];
                if (!matches(index, selection)) continue;
                if (pass == 0 and file_counts[source_file.id] >= 3) continue;
                writeCase(allocator, init.io, &runner, source_file, selection, index, group, directory, model_sha256, confidence, &timings) catch |err| switch (err) {
                    error.NotRelevantToGroup => continue,
                    else => {
                        std.log.err("{s}, {s}: {s}", .{ name, source_file.source_path, @errorName(err) });
                        return err;
                    },
                };
                chunk.used = true;
                file_counts[source_file.id] += 1;
            }
        }
        if (group.cases < 30) return error.InsufficientIndependentCases;
        std.log.info("evaluation {s}: {d} cases", .{ name, group.cases });
    }

    const LanguageReport = struct { language: []const u8, unseen: bool, classifier: metrics.Summary, confidence_filtered_dense: metrics.Summary, rule_baseline: metrics.Summary, unchanged_dense_baseline: metrics.Summary };
    var language_reports: [12]LanguageReport = undefined;
    for (&language_reports, 0..) |*report, i| report.* = .{
        .language = data.languages[i],
        .unseen = i >= 6,
        .classifier = raw_metrics[i].summary(),
        .confidence_filtered_dense = threshold_metrics[i].summary(),
        .rule_baseline = rule_metrics[i].summary(),
        .unchanged_dense_baseline = unchanged_metrics[i].summary(),
    };
    std.mem.sort(u64, timings.items, {}, std.sort.asc(u64));
    var digest: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(encoded, &digest, .{});
    const report = try std.json.Stringify.valueAlloc(allocator, .{
        .results_directory = directory,
        .model_sha256 = try std.fmt.allocPrint(allocator, "{x}", .{digest}),
        .confidence = confidence,
        .backend = runner.backendName(),
        .device = runner.deviceName(),
        .gpu_batches = runner.gpu_batches,
        .cpu_batches = runner.cpu_batches,
        .fallback_reason = runner.fallback_reason,
        .sampling_seed = 20260910,
        .groups = groups,
        .languages = language_reports,
        .case_count = timings.items.len,
        .case_identity = "non-overlapping scored boundary ranges; full-file context may be shared",
        .references = "author-layout agreement; not human-rated beauty or universal correctness",
        .macro_f1_class_policy = "classes with reference support, fixed per language",
        .syntax_oracles = "offline initial-language parsers only; unavailable languages reported separately",
        .warm_engine_p50_ms = @as(f64, @floatFromInt(timings.items[timings.items.len / 2])) / 1e6,
        .warm_engine_p95_ms = @as(f64, @floatFromInt(timings.items[timings.items.len * 95 / 100])) / 1e6,
        .timing_scope = "full-file tokenize, features, inference, byte contract; excludes disk and process startup",
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = try std.fs.path.join(allocator, &.{ directory, "report.json" }), .data = report });
}
