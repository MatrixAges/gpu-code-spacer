const std = @import("std");
const layout = @import("core").layout;
const files = @import("evaluation_files.zig");

const Scope = enum { style, structure };
const Comparison = enum { exact, at_least };
const Expectation = struct {
    after_line: usize,
    blank_lines: u8,
    principle: []const u8,
    scope: Scope = .style,
    comparison: Comparison = .exact,

    fn matches(self: Expectation, actual: usize) bool {
        return switch (self.comparison) {
            .exact => actual == self.blank_lines,
            .at_least => actual >= self.blank_lines,
        };
    }
};
const Case = struct {
    id: []const u8,
    language: []const u8,
    training_language: bool,
    scenario: []const u8,
    source: []const u8,
    expectations: []Expectation,
};

const Counts = struct {
    total: usize = 0,
    passed: usize = 0,
    required_gaps: usize = 0,
    correct_gaps: usize = 0,
    required_continuity: usize = 0,
    correct_continuity: usize = 0,

    fn add(self: *Counts, expectation: Expectation, actual: usize) void {
        self.total += 1;
        self.passed += @intFromBool(expectation.matches(actual));
        if (expectation.blank_lines > 0) {
            self.required_gaps += 1;
            self.correct_gaps += @intFromBool(expectation.matches(actual));
        } else {
            self.required_continuity += 1;
            self.correct_continuity += @intFromBool(actual == 0);
        }
    }
};

const Group = struct { name: []const u8, scope: Scope, counts: Counts = .{} };
const Assertion = struct {
    case_id: []const u8,
    variant: []const u8,
    language: []const u8,
    principle: []const u8,
    after_line: usize,
    expected: u8,
    scope: Scope,
    comparison: Comparison,
    actual: usize,
    passed: bool,
};

fn addGroup(allocator: std.mem.Allocator, groups: *std.ArrayList(Group), name: []const u8, expectation: Expectation, actual: usize) !void {
    for (groups.items) |*group| {
        if (std.mem.eql(u8, group.name, name) and group.scope == expectation.scope) {
            group.counts.add(expectation, actual);
            return;
        }
    }

    try groups.append(allocator, .{ .name = name, .scope = expectation.scope });
    groups.items[groups.items.len - 1].counts.add(expectation, actual);
}

fn execute(allocator: std.mem.Allocator, io: std.Io, binary: []const u8, path: []const u8) ![]const u8 {
    const result = try std.process.run(allocator, io, .{
        .argv = &.{ binary, path },
        .stdout_limit = .limited(1024 * 1024),
        .stderr_limit = .limited(16 * 1024),
    });
    if (result.term != .exited or result.term.exited != 0) return error.FormatterFailed;

    return result.stdout;
}

fn checkNonblank(source: []const u8, original: layout.Document, output: []const u8, actual: layout.Document) !void {
    if (original.nonblank.len != actual.nonblank.len) return error.NonblankLinesChanged;
    for (original.nonblank, actual.nonblank) |before, after| {
        const a = original.lines[before];
        const b = actual.lines[after];
        if (!std.mem.eql(u8, source[a.start..a.end], output[b.start..b.end])) return error.NonblankBytesChanged;
    }
}

const Reference = struct {
    directory: []const u8,
    dense_path: []const u8,
    spaced_path: []const u8,
    output_path: []const u8,
    output: []const u8,
    corrected: bool,
};

fn referenceFiles(allocator: std.mem.Allocator, io: std.Io, benchmark_path: []const u8, case: Case, original: layout.Document, spaced: []const u8) !Reference {
    const root = "evaluation/cases";
    try std.Io.Dir.cwd().createDirPath(io, root);
    const directory = try std.fs.path.join(allocator, &.{ root, case.id });
    const suffix = try files.extension(case.language);
    const dense_path = try std.fmt.allocPrint(allocator, "{s}/input/dense.{s}", .{ directory, suffix });
    const spaced_path = try std.fmt.allocPrint(allocator, "{s}/input/spaced.{s}", .{ directory, suffix });
    const output_path = try std.fmt.allocPrint(allocator, "{s}/output.{s}", .{ directory, suffix });
    const metadata_path = try std.fs.path.join(allocator, &.{ directory, "metadata.json" });
    var existing = false;
    std.Io.Dir.cwd().createDir(io, directory, .default_dir) catch |err| switch (err) {
        error.PathAlreadyExists => existing = true,
        else => return err,
    };

    if (!existing) {
        try std.Io.Dir.cwd().createDirPath(io, try std.fs.path.join(allocator, &.{ directory, "input" }));
        const targets = try allocator.alloc(u8, original.boundaries.len);
        @memset(targets, 255);
        // Serialize existing explicit reference annotations. This does not
        // consult the model or derive formatting decisions from source code.
        for (original.boundaries, targets) |boundary, *target| {
            for (case.expectations) |expectation| {
                if (original.nonblank[boundary.before] + 1 == expectation.after_line) target.* = expectation.blank_lines;
            }
        }
        const output = try layout.render(allocator, case.source, original, targets);
        try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = dense_path, .data = case.source });
        try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = spaced_path, .data = spaced });
        try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = output_path, .data = output });
        const metadata = try std.json.Stringify.valueAlloc(allocator, .{
            .schema_version = 2,
            .case_id = case.id,
            .language = case.language,
            .scenario = case.scenario,
            .source_benchmark = benchmark_path,
            .source_sha256 = try files.hash(allocator, case.source),
            .initial_output_sha256 = try files.hash(allocator, output),
            .reference_status = "migrated_partial_annotations",
            .output_role = "Shared expected output for all input variants. Model predictions never overwrite this file.",
            .correction_policy = "Editing output makes its complete blank-line layout authoritative on subsequent evaluation; nonblank source content must remain unchanged.",
            .expectations = case.expectations,
        }, .{ .whitespace = .indent_2 });
        try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = metadata_path, .data = metadata });
    }

    const metadata = try std.Io.Dir.cwd().readFileAlloc(io, metadata_path, allocator, .limited(1024 * 1024));
    const saved = (try std.json.parseFromSlice(struct { source_sha256: []const u8, initial_output_sha256: []const u8 }, allocator, metadata, .{ .ignore_unknown_fields = true })).value;
    if (!std.mem.eql(u8, saved.source_sha256, try files.hash(allocator, case.source))) return error.ReferenceSourceChanged;
    const output = try std.Io.Dir.cwd().readFileAlloc(io, output_path, allocator, .limited(1024 * 1024));
    const target_document = try layout.analyze(allocator, output);
    try checkNonblank(case.source, original, output, target_document);

    return .{
        .directory = directory,
        .dense_path = dense_path,
        .spaced_path = spaced_path,
        .output_path = output_path,
        .output = output,
        .corrected = !std.mem.eql(u8, saved.initial_output_sha256, try files.hash(allocator, output)),
    };
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const io = init.io;
    const args = try init.minimal.args.toSlice(allocator);
    if (args.len < 3 or args.len > 5) return error.ExpectedBinaryAndOutputDirectory;
    const binary = args[1];
    const directory = try files.resultsDirectory(allocator, io, args[2]);

    const benchmark_path = if (args.len >= 4) args[3] else "config/style-benchmark.json";
    const benchmark_role = if (args.len == 5) args[4] else "regression";
    if (!std.mem.eql(u8, benchmark_role, "regression") and !std.mem.eql(u8, benchmark_role, "heldout")) return error.InvalidBenchmarkRole;
    const bytes = try std.Io.Dir.cwd().readFileAlloc(io, benchmark_path, allocator, .limited(4 * 1024 * 1024));
    const benchmark = (try std.json.parseFromSlice(struct {
        version: u32,
        status: ?[]const u8 = null,
        cases: []Case,
    }, allocator, bytes, .{ .ignore_unknown_fields = true })).value;
    if ((benchmark.version != 1 and benchmark.version != 2) or benchmark.cases.len == 0) return error.InvalidBenchmark;
    if (benchmark.status) |status| {
        if (std.mem.eql(u8, status, "regression") and std.mem.eql(u8, benchmark_role, "heldout")) return error.BenchmarkAlreadyObserved;
    }
    var digest: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(bytes, &digest, .{});

    const metadata = try std.process.run(allocator, io, .{ .argv = &.{ binary, "--model-info" } });
    if (metadata.term != .exited or metadata.term.exited != 0) return error.ModelMetadataFailed;
    const model = (try std.json.parseFromSlice(std.json.Value, allocator, metadata.stdout, .{})).value;

    var assertions: std.ArrayList(Assertion) = .empty;
    var languages: std.ArrayList(Group) = .empty;
    var principles: std.ArrayList(Group) = .empty;
    var variants: std.ArrayList(Group) = .empty;
    var seen: Counts = .{};
    var unseen: Counts = .{};
    var style: Counts = .{};
    var structure: Counts = .{};
    var checks: usize = 0;

    for (benchmark.cases) |case| {
        const original = try layout.analyze(allocator, case.source);
        if (original.unterminated_region) return error.UnsupportedBenchmarkRegion;
        for (original.nonblank, 0..) |line, index| {
            if (index > 0 and line != original.nonblank[index - 1] + 1) return error.ExpectedDenseBenchmarkSource;
        }

        const labels = try allocator.alloc(u8, original.boundaries.len);
        @memset(labels, 255);

        // Perturb only explicitly scored, lexically editable gaps. The second
        // variant measures removal as well as insertion; it is not training.
        for (original.boundaries, labels) |boundary, *label| {
            for (case.expectations) |expectation| {
                if (original.nonblank[boundary.before] + 1 == expectation.after_line) label.* = 2;
            }
        }
        const spaced = try layout.render(allocator, case.source, original, labels);
        const reference = try referenceFiles(allocator, io, benchmark_path, case, original, spaced);
        const reference_document = try layout.analyze(allocator, reference.output);
        var expectations: std.ArrayList(Expectation) = .empty;
        if (reference.corrected) {
            for (0..original.nonblank.len - 1) |position| {
                const gap = reference_document.nonblank[position + 1] - reference_document.nonblank[position] - 1;
                try expectations.append(allocator, .{
                    .after_line = original.nonblank[position] + 1,
                    .blank_lines = std.math.cast(u8, gap) orelse return error.ExcessiveReferenceGap,
                    .principle = "corrected_output",
                    .scope = .style,
                    .comparison = .exact,
                });
            }
        } else try expectations.appendSlice(allocator, case.expectations);

        const case_directory = try std.fs.path.join(allocator, &.{ directory, case.id });
        try std.Io.Dir.cwd().createDirPath(io, case_directory);
        const suffix = try files.extension(case.language);
        const assertion_start = assertions.items.len;
        var output_hashes: [2][]const u8 = undefined;
        var input_hashes: [2][]const u8 = undefined;

        for ([_][]const u8{ "dense", "spaced" }, [_][]const u8{ reference.dense_path, reference.spaced_path }, 0..) |variant, input_path, variant_index| {
            const input = try std.Io.Dir.cwd().readFileAlloc(io, input_path, allocator, .limited(1024 * 1024));
            try checkNonblank(case.source, original, input, try layout.analyze(allocator, input));
            const output_path = try std.fmt.allocPrint(allocator, "{s}/{s}.{s}", .{ case_directory, variant, suffix });
            const output = try execute(allocator, io, binary, input_path);
            try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = output_path, .data = output });
            const repeated = try execute(allocator, io, binary, output_path);
            if (!std.mem.eql(u8, output, repeated)) return error.NonIdempotent;
            const actual = try layout.analyze(allocator, output);
            try checkNonblank(case.source, original, output, actual);
            checks += 1;
            output_hashes[variant_index] = try files.hash(allocator, output);
            input_hashes[variant_index] = try files.hash(allocator, input);

            for (expectations.items) |expectation| {
                if (expectation.after_line == 0) return error.InvalidExpectation;
                const before = std.mem.findScalar(usize, original.nonblank, expectation.after_line - 1) orelse return error.ExpectedNonblankSourceLine;
                if (before + 1 >= actual.nonblank.len) return error.ExpectedFollowingLine;
                const gap = actual.nonblank[before + 1] - actual.nonblank[before] - 1;
                switch (expectation.scope) {
                    .style => {
                        style.add(expectation, gap);
                        if (case.training_language) seen.add(expectation, gap) else unseen.add(expectation, gap);
                    },
                    .structure => structure.add(expectation, gap),
                }
                try addGroup(allocator, &languages, case.language, expectation, gap);
                try addGroup(allocator, &principles, expectation.principle, expectation, gap);
                try addGroup(allocator, &variants, variant, expectation, gap);
                try assertions.append(allocator, .{
                    .case_id = case.id,
                    .variant = variant,
                    .language = case.language,
                    .principle = expectation.principle,
                    .after_line = expectation.after_line,
                    .expected = expectation.blank_lines,
                    .scope = expectation.scope,
                    .comparison = expectation.comparison,
                    .actual = gap,
                    .passed = expectation.matches(gap),
                });
            }
        }

        const metadata_json = try std.json.Stringify.valueAlloc(allocator, .{
            .schema_version = 2,
            .case_id = case.id,
            .language = case.language,
            .variants = [_][]const u8{ "dense", "spaced" },
            .scenario = case.scenario,
            .benchmark_path = benchmark_path,
            .benchmark_sha256 = try files.hash(allocator, bytes),
            .benchmark_role = benchmark_role,
            .criteria_version = benchmark.version,
            .model = model,
            .reference_directory = reference.directory,
            .expected_output = reference.output_path,
            .expected_output_sha256 = try files.hash(allocator, reference.output),
            .output_corrected = reference.corrected,
            .input_sha256 = input_hashes,
            .prediction_sha256 = output_hashes,
            .variant_predictions_equal = std.mem.eql(u8, output_hashes[0], output_hashes[1]),
            .expectations = expectations.items,
            .generated_assertions = assertions.items[assertion_start..],
            .nonblank_bytes_preserved = true,
            .idempotent = true,
        }, .{ .whitespace = .indent_2 });
        try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = try std.fs.path.join(allocator, &.{ case_directory, "metadata.json" }), .data = metadata_json });
    }

    const report = try std.json.Stringify.valueAlloc(allocator, .{
        .benchmark_sha256 = try std.fmt.allocPrint(allocator, "{x}", .{digest}),
        .benchmark_path = benchmark_path,
        .results_directory = directory,
        .model = model,
        .cases = benchmark.cases.len,
        .nonblank_byte_preservation_and_idempotence_checks = checks,
        .criteria_version = benchmark.version,
        .style = style,
        .structure = structure,
        .seen_languages = seen,
        .unseen_languages = unseen,
        .languages = languages.items,
        .principles = principles.items,
        .variants = variants.items,
        .assertions = assertions.items,
        .all_style_expectations_met = style.total > 0 and style.total == style.passed,
        .all_structure_expectations_met = structure.total == structure.passed,
        .benchmark_role = benchmark_role,
        .participated_in_development_feedback = std.mem.eql(u8, benchmark_role, "regression"),
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = try std.fmt.allocPrint(allocator, "{s}/report.json", .{directory}), .data = report });
    std.log.info("style {d}/{d}; structure {d}/{d}; {d} preservation/idempotence checks", .{
        style.passed, style.total, structure.passed, structure.total, checks,
    });
}
