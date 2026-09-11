const std = @import("std");

const Spec = struct {
    id: []const u8,
    repository: []const u8,
    language: []const u8,
    extension: []const u8,
    commit: []const u8,
    path: []const u8,
    local_path: []const u8,
    start_line: usize,
    end_line: usize,
    symbol: []const u8,
    wrapper_prefix: []const u8 = "",
    wrapper_suffix: []const u8 = "",
    gap_after_source_lines: []const usize,
    gap_after_wrapper_lines: []const usize = &.{},
    protected_source_ranges: []const [2]usize = &.{},
    notes: []const u8,
    license_file: []const u8,
    language_in_archives: bool = false,
};

const Line = struct { text: []const u8, source_line: usize, protected: bool };

fn hash(allocator: std.mem.Allocator, bytes: []const u8) ![]const u8 {
    var digest: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(bytes, &digest, .{});

    return std.fmt.allocPrint(allocator, "{x}", .{digest});
}

fn appendWrapper(allocator: std.mem.Allocator, lines: *std.ArrayList(Line), wrapper: []const u8) !void {
    var iterator = std.mem.splitScalar(u8, wrapper, '\n');
    while (iterator.next()) |line| {
        if (line.len == 0) continue;
        try lines.append(allocator, .{ .text = line, .source_line = 0, .protected = false });
    }
}

fn render(allocator: std.mem.Allocator, lines: []const Line, spec: Spec, variant: enum { dense, spaced, reference }) ![]const u8 {
    var output: std.ArrayList(u8) = .empty;
    for (lines, 0..) |line, i| {
        try output.appendSlice(allocator, line.text);
        try output.append(allocator, '\n');
        if (i + 1 == lines.len or (line.protected and lines[i + 1].protected)) continue;
        const gaps: usize = switch (variant) {
            .dense => 0,
            .spaced => 2,
            // These positions were individually annotated before this import.
            // No source-role rules or product model generate the reference.
            .reference => @intFromBool(std.mem.findScalar(usize, spec.gap_after_source_lines, line.source_line) != null or
                (line.source_line == 0 and std.mem.findScalar(usize, spec.gap_after_wrapper_lines, i + 1) != null)),
        };
        try output.appendNTimes(allocator, '\n', gaps);
    }

    return output.toOwnedSlice(allocator);
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const io = init.io;
    const args = try init.minimal.args.toSlice(allocator);
    if (args.len != 2) return error.ExpectedReviewedSelectionFile;
    const selection = try std.Io.Dir.cwd().readFileAlloc(io, args[1], allocator, .limited(4 * 1024 * 1024));
    const specs = (try std.json.parseFromSlice([]Spec, allocator, selection, .{ .ignore_unknown_fields = true })).value;
    if (specs.len != 30) return error.ExpectedThirtySamples;

    for (specs) |spec| {
        const directory = try std.fmt.allocPrint(allocator, "evaluation/validation/{s}", .{spec.id});
        if (std.Io.Dir.cwd().openDir(io, directory, .{})) |existing| {
            existing.close(io);
            std.log.info("preserved existing editable sample: {s}", .{spec.id});
            continue;
        } else |err| {
            if (err != error.FileNotFound) return err;
        }
        if (!std.mem.startsWith(u8, spec.local_path, "data/validation/")) return error.ExpectedNewZipSource;
        const source = try std.Io.Dir.cwd().readFileAlloc(io, spec.local_path, allocator, .limited(16 * 1024 * 1024));
        var lines: std.ArrayList(Line) = .empty;
        try appendWrapper(allocator, &lines, spec.wrapper_prefix);
        var iterator = std.mem.splitScalar(u8, source, '\n');
        var number: usize = 0;
        var selected: std.ArrayList(u8) = .empty;
        var notice: std.ArrayList(u8) = .empty;

        while (iterator.next()) |line| {
            number += 1;
            if (number <= 25) {
                try notice.appendSlice(allocator, line);
                try notice.append(allocator, '\n');
            }
            if (number < spec.start_line or number > spec.end_line) continue;
            try selected.appendSlice(allocator, line);
            try selected.append(allocator, '\n');
            var protected = false;
            for (spec.protected_source_ranges) |range| {
                if (number >= range[0] and number <= range[1]) protected = true;
            }
            if (!protected and std.mem.trim(u8, line, " \t\r").len == 0) continue;
            try lines.append(allocator, .{ .text = line, .source_line = number, .protected = protected });
        }
        if (number < spec.end_line or spec.start_line > spec.end_line) return error.InvalidSourceRange;
        for (spec.gap_after_source_lines) |gap| {
            var found = false;
            for (lines.items) |line| {
                if (line.source_line == gap and !line.protected) found = true;
            }
            if (!found) return error.InvalidReviewedGap;
        }
        try appendWrapper(allocator, &lines, spec.wrapper_suffix);

        const dense = try render(allocator, lines.items, spec, .dense);
        const spaced = try render(allocator, lines.items, spec, .spaced);
        const reference = try render(allocator, lines.items, spec, .reference);
        try std.Io.Dir.cwd().createDir(io, directory, .default_dir);
        try std.Io.Dir.cwd().createDir(io, try std.fs.path.join(allocator, &.{ directory, "input" }), .default_dir);
        for ([_][]const u8{ "input/dense", "input/spaced", "output" }, [_][]const u8{ dense, spaced, reference }) |name, content| {
            const path = try std.fmt.allocPrint(allocator, "{s}/{s}.{s}", .{ directory, name, spec.extension });
            try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = path, .data = content });
        }

        const metadata = try std.json.Stringify.valueAlloc(allocator, .{
            .schema_version = 3,
            .case_id = spec.id,
            .language = spec.language,
            .language_in_archives = spec.language_in_archives,
            .generalization_scope = if (spec.language_in_archives) "new repository; language already present in archived evaluation" else "new repository and language absent from archived corpus language list",
            .purpose = "independent_generalization",
            .reference_status = "assistant_annotated_pending_user_review",
            .source = .{
                .repository = spec.repository,
                .commit = spec.commit,
                .path = spec.path,
                .start_line = spec.start_line,
                .end_line = spec.end_line,
                .symbol = spec.symbol,
                .url = try std.fmt.allocPrint(allocator, "https://github.com/{s}/blob/{s}/{s}#L{d}-L{d}", .{ spec.repository, spec.commit, spec.path, spec.start_line, spec.end_line }),
                .local_file = spec.local_path,
                .file_sha256 = try hash(allocator, source),
                .excerpt_sha256 = try hash(allocator, selected.items),
                .upstream_header = notice.items,
            },
            .extraction = .{
                .wrapper_prefix = spec.wrapper_prefix,
                .wrapper_suffix = spec.wrapper_suffix,
                .nonblank_source_bytes_preserved = true,
                .original_context_required_for_execution = true,
            },
            .annotation = .{
                .method = "individual source review; no product formatter or model prediction used",
                .gap_after_source_lines = spec.gap_after_source_lines,
                .gap_after_wrapper_lines = spec.gap_after_wrapper_lines,
                .protected_source_ranges = spec.protected_source_ranges,
                .notes = spec.notes,
                .comparison = "shared output is the editable expected result",
            },
            .license_file = spec.license_file,
            .input_sha256 = .{ .dense = try hash(allocator, dense), .spaced = try hash(allocator, spaced) },
            .initial_output_sha256 = try hash(allocator, reference),
            .used_for_training = false,
            .used_for_model_selection = false,
            .product_model_executed = false,
        }, .{ .whitespace = .indent_2 });
        try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = try std.fs.path.join(allocator, &.{ directory, "metadata.json" }), .data = metadata });
        std.log.info("created {s}", .{directory});
    }
}
