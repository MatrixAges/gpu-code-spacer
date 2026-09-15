const std = @import("std");

const Spec = struct {
    id: []const u8,
    language: []const u8,
    extension: []const u8,
    local_path: []const u8,
    start_line: usize,
    end_line: usize,
    wrapper_prefix: []const u8 = "",
    wrapper_suffix: []const u8 = "",
    protected_source_ranges: []const [2]usize = &.{},
};

fn excerpt(allocator: std.mem.Allocator, source: []const u8, first: usize, last: usize) ![]const u8 {
    var result: std.ArrayList(u8) = .empty;
    var lines = std.mem.splitScalar(u8, source, '\n');
    var index: usize = 0;
    while (lines.next()) |line| {
        index += 1;
        if (index < first or index > last) continue;
        try result.appendSlice(allocator, line);
        try result.append(allocator, '\n');
    }
    return result.toOwnedSlice(allocator);
}

fn nonblank(allocator: std.mem.Allocator, source: []const u8) ![]const u8 {
    var result: std.ArrayList(u8) = .empty;
    var lines = std.mem.splitScalar(u8, source, '\n');
    while (lines.next()) |line| {
        if (std.mem.trim(u8, line, " \t\r").len == 0) continue;
        try result.appendSlice(allocator, line);
        try result.append(allocator, '\n');
    }
    return result.toOwnedSlice(allocator);
}

fn compact(allocator: std.mem.Allocator, source: []const u8) ![]const u8 {
    var result: std.ArrayList(u8) = .empty;
    for (source) |byte| {
        if (!std.ascii.isWhitespace(byte)) try result.append(allocator, byte);
    }
    return result.toOwnedSlice(allocator);
}

fn astShape(allocator: std.mem.Allocator, io: std.Io, language: []const u8, source: []const u8, path: []const u8) ![]const u8 {
    const parser_config = "config/validation-ast-grep.yml";
    const errors = try std.process.run(allocator, io, .{
        .argv = &.{ "ast-grep", "run", "--config", parser_config, "--lang", language, "--kind", "ERROR", "--json=compact", path },
    });
    if (errors.term != .exited or errors.term.exited > 1 or !std.mem.eql(u8, std.mem.trim(u8, errors.stdout, " \r\n\t"), "[]")) {
        std.log.err("syntax check failed: {s}\n{s}\n{s}", .{ path, errors.stdout, errors.stderr });
        return error.InvalidSampleSyntax;
    }

    const parsed = try std.process.run(allocator, io, .{
        .argv = &.{ "ast-grep", "run", "--config", parser_config, "--lang", language, "--pattern", source, "--debug-query=ast", "--json=compact", path },
        .stderr_limit = .limited(4 * 1024 * 1024),
        .stdout_limit = .limited(4 * 1024 * 1024),
    });
    var shape: std.ArrayList(u8) = .empty;
    var lines = std.mem.splitScalar(u8, parsed.stderr, '\n');
    var found = false;
    while (lines.next()) |line| {
        if (std.mem.eql(u8, line, "Debug AST:")) {
            found = true;
            continue;
        }
        if (!found) continue;
        const coordinates = std.mem.lastIndexOf(u8, line, " (") orelse continue;
        try shape.appendSlice(allocator, line[0..coordinates]);
        try shape.append(allocator, '\n');
    }
    if (shape.items.len == 0) return error.MissingSyntaxTree;
    return shape.toOwnedSlice(allocator);
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const io = init.io;
    const bytes = try std.Io.Dir.cwd().readFileAlloc(io, "config/validation-samples.json", allocator, .limited(4 * 1024 * 1024));
    const specs = (try std.json.parseFromSlice([]Spec, allocator, bytes, .{ .ignore_unknown_fields = true })).value;
    if (specs.len != 30) return error.ExpectedThirtySamples;
    const training_manifest = try std.Io.Dir.cwd().readFileAlloc(io, "dataset/metadata.json", allocator, .limited(16 * 1024 * 1024));
    const samples = (try std.json.parseFromSlice(struct { samples: []struct { sample_path: []const u8 } }, allocator, training_manifest, .{ .ignore_unknown_fields = true })).value.samples;
    var training: std.ArrayList([]const u8) = .empty;
    for (samples) |sample| {
        const code = try std.Io.Dir.cwd().readFileAlloc(io, sample.sample_path, allocator, .limited(4 * 1024 * 1024));
        try training.append(allocator, try compact(allocator, code));
    }
    var development: std.ArrayList([]const u8) = .empty;
    var cases = try std.Io.Dir.cwd().openDir(io, "evaluation/cases", .{ .iterate = true });
    defer cases.close(io);
    var walker = try cases.walk(allocator);
    defer walker.deinit();
    while (try walker.next(io)) |entry| {
        if (entry.kind != .file or std.mem.find(u8, entry.path, "/input.") == null) continue;
        const code = try cases.readFileAlloc(io, entry.path, allocator, .limited(1024 * 1024));
        try development.append(allocator, try compact(allocator, code));
    }

    var seen: std.StringHashMap(void) = .init(allocator);
    var checked: usize = 0;
    var protected_checks: usize = 0;
    var modified_references: usize = 0;
    var source_adaptations: usize = 0;
    for (specs) |spec| {
        const original_file = try std.Io.Dir.cwd().readFileAlloc(io, spec.local_path, allocator, .limited(16 * 1024 * 1024));
        const selected = try excerpt(allocator, original_file, spec.start_line, spec.end_line);
        const original = try std.mem.concat(allocator, u8, &.{ spec.wrapper_prefix, selected, spec.wrapper_suffix });
        const output_path = try std.fmt.allocPrint(allocator, "evaluation/validation/{s}/output.{s}", .{ spec.id, spec.extension });
        const reference = try std.Io.Dir.cwd().readFileAlloc(io, output_path, allocator, .limited(1024 * 1024));
        const expected_nonblank = try nonblank(allocator, reference);
        const source_unchanged = std.mem.eql(u8, expected_nonblank, try nonblank(allocator, original));
        source_adaptations += @intFromBool(!source_unchanged);
        const metadata_path = try std.fmt.allocPrint(allocator, "evaluation/validation/{s}/metadata.json", .{spec.id});
        const metadata_bytes = try std.Io.Dir.cwd().readFileAlloc(io, metadata_path, allocator, .limited(1024 * 1024));
        const metadata = (try std.json.parseFromSlice(struct { initial_output_sha256: []const u8 }, allocator, metadata_bytes, .{ .ignore_unknown_fields = true })).value;
        var current_digest: [32]u8 = undefined;
        std.crypto.hash.sha2.Sha256.hash(reference, &current_digest, .{});
        const current_hash = try std.fmt.allocPrint(allocator, "{x}", .{current_digest});
        modified_references += @intFromBool(!std.mem.eql(u8, metadata.initial_output_sha256, current_hash));
        const canonical = try compact(allocator, if (source_unchanged) selected else reference);
        const entry = try seen.getOrPut(canonical);
        if (entry.found_existing) return error.DuplicateSourceSample;
        for (training.items) |code| {
            if (std.mem.find(u8, code, canonical) != null) return error.TrainingSourceOverlap;
        }
        for (development.items) |code| {
            if (std.mem.find(u8, code, canonical) != null or std.mem.find(u8, canonical, code) != null) return error.DevelopmentSourceOverlap;
        }
        var reference_shape: ?[]const u8 = null;
        for ([_][]const u8{ "output", "input" }) |variant| {
            const path = try std.fmt.allocPrint(allocator, "evaluation/validation/{s}/{s}.{s}", .{ spec.id, variant, spec.extension });
            const content = try std.Io.Dir.cwd().readFileAlloc(io, path, allocator, .limited(1024 * 1024));
            if (!std.mem.eql(u8, expected_nonblank, try nonblank(allocator, content))) return error.NonblankSourceChanged;
            for (spec.protected_source_ranges) |range| {
                const literal = try excerpt(allocator, original_file, range[0], range[1]);
                if (source_unchanged and std.mem.find(u8, content, literal) == null) return error.ProtectedSourceChanged;
                protected_checks += 1;
            }
            const shape = try astShape(allocator, io, spec.language, content, path);
            if (reference_shape) |expected| {
                if (!std.mem.eql(u8, shape, expected)) {
                    std.log.err("AST changed: {s}", .{path});
                    return error.SyntaxTreeChanged;
                }
            } else {
                reference_shape = shape;
                if (source_unchanged) {
                    const source_shape = try astShape(allocator, io, spec.language, original, path);
                    if (!std.mem.eql(u8, shape, source_shape)) return error.SourceSyntaxTreeChanged;
                }
            }
            checked += 1;
        }
    }
    const report = try std.json.Stringify.valueAlloc(allocator, .{
        .samples = specs.len,
        .source_files_checked = checked,
        .syntax_trees_equal_across_current_variants = true,
        .nonblank_bytes_equal_across_current_variants = true,
        .source_adaptations = source_adaptations,
        .modified_output_references = modified_references,
        .protected_region_checks = protected_checks,
        .duplicate_samples = 0,
        .exact_training_source_overlaps = 0,
        .training_files_compared = samples.len,
        .exact_development_source_overlaps = 0,
        .development_cases_compared = development.items.len,
        .product_model_executed = false,
        .limits = "Parser checks are not type checking or execution. Exact normalized-source overlap is checked; absence of semantic near-duplicates is not formally proven.",
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().createDirPath(io, "evaluation/artifacts/validation");
    try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = "evaluation/artifacts/validation/dataset-check.json", .data = report });
    try std.Io.File.stdout().writeStreamingAll(io, report);
}
