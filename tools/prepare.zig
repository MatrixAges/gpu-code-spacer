const std = @import("std");
const core = @import("core");
const syntax = @import("syntax");
const corpus = @import("collect.zig");
const data = @import("data.zig");
const samples = @import("samples.zig");

fn targetFile(path: []const u8, language: []const u8) bool {
    const extensions = [_][]const u8{ ".ts", ".js", ".py", ".java", ".rs", ".zig", ".go", ".cpp", ".cs", ".rb", ".kt", ".swift" };
    const id = data.languageIndex(language) catch return false;
    const matches = std.mem.endsWith(u8, path, extensions[id]) or (id == 7 and (std.mem.endsWith(u8, path, ".h") or std.mem.endsWith(u8, path, ".cc")));
    if (!matches) return false;

    var parts = std.mem.splitScalar(u8, path, '/');
    while (parts.next()) |part| {
        for ([_][]const u8{ "test", "tests", "testing", "__tests__", "fixtures", "snapshots", "generated", "vendor", "third_party", "node_modules" }) |excluded| {
            if (std.mem.eql(u8, part, excluded)) return false;
        }
    }

    for ([_][]const u8{ ".test.", ".spec.", "_test.", "_tests.", "_fuzz.", "testutil.", "/fuzz.", ".generated.", ".min." }) |marker| {
        if (std.mem.find(u8, path, marker) != null) return false;
    }
    return true;
}

fn canonical(source: []const u8) struct { digest: [32]u8, sketch: [32]u64 } {
    var hash = std.crypto.hash.sha2.Sha256.init(.{});
    var tokenizer: core.tokenizer.Iterator = .{ .source = source };
    var sketch: [32]u64 = @splat(std.math.maxInt(u64));
    var recent: [5]u64 = @splat(0);
    var count: usize = 0;

    while (tokenizer.next()) |token| {
        if (token.kind == .whitespace or token.kind == .newline) continue;
        const text = token.text(source);
        var size: [8]u8 = undefined;
        std.mem.writeInt(u64, &size, text.len, .little);
        hash.update(&size);
        hash.update(text);

        recent[count % recent.len] = core.features.hash(text);
        count += 1;
        if (count < recent.len) continue;
        var value: u64 = 14695981039346656037;
        for (0..recent.len) |i| value = (value ^ recent[(count + i) % recent.len]) *% 1099511628211;
        if (value >= sketch[sketch.len - 1]) continue;
        if (std.mem.findScalar(u64, &sketch, value) != null) continue;
        sketch[sketch.len - 1] = value;
        std.mem.sort(u64, &sketch, {}, std.sort.asc(u64));
    }

    return .{ .digest = hash.finalResult(), .sketch = sketch };
}

fn similar(a: data.File, b: data.File) bool {
    if (std.mem.eql(u8, a.canonical_sha256, b.canonical_sha256)) return true;
    if (@min(a.bytes, b.bytes) * 4 < @max(a.bytes, b.bytes) * 3) return false;
    var common: usize = 0;
    var i: usize = 0;
    var j: usize = 0;
    while (i < a.sketch.len and j < b.sketch.len) {
        if (a.sketch[i] == std.math.maxInt(u64) or b.sketch[j] == std.math.maxInt(u64)) break;
        if (a.sketch[i] == b.sketch[j]) {
            common += 1;
            i += 1;
            j += 1;
        } else if (a.sketch[i] < b.sketch[j]) i += 1 else j += 1;
        if (common + @min(a.sketch.len - i, b.sketch.len - j) < 28) return false;
    }
    return common >= 28;
}

fn rootOf(parents: []usize, start: usize) usize {
    var current = start;
    while (parents[current] != current) current = parents[current];
    var child = start;
    while (parents[child] != child) {
        const parent = parents[child];
        parents[child] = current;
        child = parent;
    }
    return current;
}

fn priority(split: data.Split) u8 {
    return switch (split) {
        .unseen_language => 5,
        .@"test" => 4,
        .style_validation, .validation => 3,
        .style_train => 2,
        .train => 1,
        .rejected => 0,
    };
}

const Owner = struct { file: usize, boundary: usize, rank: u8 };
const Owners = std.AutoHashMap([32]u8, Owner);

fn contextHash(source: []const u8, document: core.layout.Document, boundary: core.layout.Boundary) [32]u8 {
    const first = boundary.before -| 3;
    const last = @min(boundary.after + 3, document.nonblank.len - 1);
    const begin = document.lines[document.nonblank[first]].start;
    const end = document.lines[document.nonblank[last]].end;
    var tokenizer: core.tokenizer.Iterator = .{ .source = source[begin..end] };
    var hash = std.crypto.hash.sha2.Sha256.init(.{});
    while (tokenizer.next()) |token| {
        if (token.kind == .whitespace or token.kind == .newline) continue;
        var size: [8]u8 = undefined;
        std.mem.writeInt(u64, &size, token.end - token.start, .little);
        hash.update(&size);
        hash.update(token.text(source[begin..end]));
    }
    return hash.finalResult();
}

fn contextOwners(allocator: std.mem.Allocator, io: std.Io, files: []const data.File) !Owners {
    var owners = Owners.init(allocator);
    for (files) |file| {
        if (file.split == .rejected) continue;
        var arena = std.heap.ArenaAllocator.init(allocator);
        defer arena.deinit();
        const temporary = arena.allocator();
        const source = try std.Io.Dir.cwd().readFileAlloc(io, file.source_path, temporary, .limited(1024 * 1024));
        const document = try core.layout.analyze(temporary, source);
        const exclusions = try syntax.excludedRegions(temporary, source, file.language);
        for (document.boundaries, 0..) |boundary, index| {
            if (boundary.blank_lines > 2 or syntax.excluded(boundary.start, exclusions) or !withinSelectedLines(document, boundary, file.allowed_lines)) continue;
            const entry = try owners.getOrPut(contextHash(source, document, boundary));
            if (!entry.found_existing or priority(file.split) > entry.value_ptr.rank) {
                entry.value_ptr.* = .{ .file = file.id, .boundary = index, .rank = priority(file.split) };
            }
        }
    }
    return owners;
}

fn withinSelectedLines(document: core.layout.Document, boundary: core.layout.Boundary, ranges: []const [2]usize) bool {
    if (ranges.len == 0) return true;
    const previous = document.nonblank[boundary.before] + 1;
    const next = document.nonblank[boundary.after] + 1;
    for (ranges) |range| {
        if (previous >= range[0] and next <= range[1]) return true;
    }
    return false;
}

fn inspect(allocator: std.mem.Allocator, io: std.Io, source_record: corpus.Record, path: []const u8, id: usize, sample: ?samples.Entry) !data.File {
    const raw_path = try std.fs.path.join(allocator, &.{ source_record.raw_path, path });
    const source_path = if (sample) |entry| entry.sample_path else raw_path;
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const temporary = arena.allocator();
    const bytes = try std.Io.Dir.cwd().readFileAlloc(io, source_path, temporary, .limited(1024 * 1024));

    var sha: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(bytes, &sha, .{});
    const normalized = canonical(bytes);
    var allowed: std.ArrayList([2]usize) = .empty;
    for (source_record.source.regions) |region| {
        if (std.mem.eql(u8, region.path, path)) try allowed.append(allocator, .{ region.start_line, region.end_line });
    }
    const is_style = std.mem.eql(u8, source_record.source.role, "style");
    var file: data.File = .{
        .id = id,
        .repository = source_record.source.repository,
        .language = source_record.source.language,
        .path = try allocator.dupe(u8, path),
        .source_path = source_path,
        .sha256 = try std.fmt.allocPrint(allocator, "{x}", .{sha}),
        .canonical_sha256 = try std.fmt.allocPrint(allocator, "{x}", .{normalized.digest}),
        .sketch = normalized.sketch,
        .split = if (sample) |entry| entry.split else if (is_style) (if (core.features.hash(raw_path) % 100 < 20) .style_validation else .style_train) else if (std.mem.eql(u8, source_record.source.role, "test")) .@"test" else if (std.mem.eql(u8, source_record.source.role, "unseen_language")) .unseen_language else if (core.features.hash(raw_path) % 100 < 15) .validation else .train,
        .bytes = bytes.len,
        .boundaries = 0,
        .syntax_checked = false,
        .class_counts = @splat(0),
        .source_trust = source_record.source.trust,
        .allowed_lines = try allowed.toOwnedSlice(allocator),
    };
    if (sample) |entry| {
        file.layout_corrected = !std.mem.eql(u8, entry.initial_sha256, file.sha256);
        // A changed source sample is an explicit new layout reference. The
        // original repository's partial selection is no longer its authority.
        if (file.layout_corrected) file.allowed_lines = &.{};
    }

    if (!std.unicode.utf8ValidateSlice(bytes)) {
        file.split = .rejected;
        file.reason = "invalid_utf8";
        return file;
    }
    const prefix = bytes[0..@min(bytes.len, 2048)];
    for ([_][]const u8{ "DO NOT EDIT", "DO NOT MODIFY", "Code generated", "automatically generated" }) |marker| {
        if (std.mem.find(u8, prefix, marker) != null) {
            file.split = .rejected;
            file.reason = "generated_header";
            return file;
        }
    }

    const original_tree = syntax.fingerprint(bytes, file.language) catch |err| {
        file.split = .rejected;
        file.reason = @errorName(err);
        return file;
    };
    file.syntax_checked = original_tree != null;

    const document = try core.layout.analyze(temporary, bytes);
    const exclusions = try syntax.excludedRegions(temporary, bytes, file.language);
    for (document.boundaries) |boundary| {
        if (boundary.blank_lines > 2 or syntax.excluded(boundary.start, exclusions) or !withinSelectedLines(document, boundary, file.allowed_lines)) continue;
        file.class_counts[boundary.blank_lines] += 1;
        file.boundaries += 1;
    }
    if (file.boundaries < 3) {
        file.split = .rejected;
        file.reason = "insufficient_boundaries";
        return file;
    }

    if (original_tree) |expected| {
        const labels = try temporary.alloc(u8, document.boundaries.len);
        for ([_]u8{ 0, 2 }) |label| {
            @memset(labels, label);
            const modified = try core.layout.render(temporary, bytes, document, labels);
            const actual = syntax.fingerprint(modified, file.language) catch {
                file.split = .rejected;
                file.reason = "unsafe_lexical_boundaries";
                return file;
            };
            if (!std.mem.eql(u8, &expected, &actual.?)) {
                file.split = .rejected;
                file.reason = "changed_literal_or_structure";
                return file;
            }
        }
    }
    return file;
}

fn records(allocator: std.mem.Allocator, io: std.Io, path: []const u8) ![]corpus.Record {
    const bytes = try std.Io.Dir.cwd().readFileAlloc(io, path, allocator, .limited(4 * 1024 * 1024));
    return (try std.json.parseFromSlice([]corpus.Record, allocator, bytes, .{})).value;
}

const StandardCounts = struct { rows: usize = 0, sibling_boundaries: usize = 0, unclassified_boundaries: usize = 0, corrected_boundaries: usize = 0, changed_labels: usize = 0, labels: [3]usize = .{ 0, 0, 0 } };

fn lineAt(document: core.layout.Document, offset: usize) usize {
    var low: usize = 0;
    var high = document.lines.len;
    while (low + 1 < high) {
        const middle = low + (high - low) / 2;
        if (document.lines[middle].start <= offset) low = middle else high = middle;
    }
    return low;
}

fn writeDataset(allocator: std.mem.Allocator, io: std.Io, files: []const data.File, split: data.Split, owners: *const Owners, standard_counts: *StandardCounts) !usize {
    const path = try std.fmt.allocPrint(allocator, "data/processed/{s}.bin", .{@tagName(split)});
    defer allocator.free(path);
    const file = try std.Io.Dir.cwd().createFile(io, path, .{});
    defer file.close(io);
    var buffer: [64 * 1024]u8 = undefined;
    var writer = file.writer(io, &buffer);
    const standard_path = try std.fmt.allocPrint(allocator, "data/processed/standard_{s}.bin", .{@tagName(split)});
    defer allocator.free(standard_path);
    const standard_file = try std.Io.Dir.cwd().createFile(io, standard_path, .{});
    defer standard_file.close(io);
    var standard_buffer: [64 * 1024]u8 = undefined;
    var standard_writer = standard_file.writer(io, &standard_buffer);
    var count: usize = 0;

    for (files) |entry| {
        if (entry.split != split) continue;
        var arena = std.heap.ArenaAllocator.init(allocator);
        defer arena.deinit();
        const temporary = arena.allocator();
        const source = try std.Io.Dir.cwd().readFileAlloc(io, entry.source_path, temporary, .limited(1024 * 1024));
        const document = try core.layout.analyze(temporary, source);
        const exclusions = try syntax.excludedRegions(temporary, source, entry.language);
        const annotations = try syntax.statementBoundaries(temporary, source, entry.language);
        var siblings = std.AutoHashMap(usize, struct { next: usize, label: u8, structural: bool }).init(temporary);
        if (annotations) |items| {
            for (items) |item| {
                if (item.left_end == 0) continue;
                const left = lineAt(document, item.left_end - 1);
                const right = lineAt(document, item.right_start);
                if (right > left) try siblings.put(left, .{ .next = right, .label = item.label(), .structural = item.structural });
            }
        }

        for (document.boundaries, 0..) |boundary, index| {
            if (boundary.blank_lines > 2 or syntax.excluded(boundary.start, exclusions) or !withinSelectedLines(document, boundary, entry.allowed_lines)) continue;
            const owner = owners.get(contextHash(source, document, boundary)).?;
            if (owner.file != entry.id or owner.boundary != index) continue;
            var row: data.Row = .{
                .file_id = @intCast(entry.id),
                .boundary_id = @intCast(index),
                .language_id = @intCast(try data.languageIndex(entry.language)),
                .label = @intCast(boundary.blank_lines),
                .input = core.features.encode(source, document, boundary),
            };
            try data.writeRow(&writer.interface, row);
            if (annotations != null) {
                var standard_label: ?u8 = if (entry.layout_corrected) row.label else null;
                if (siblings.get(document.nonblank[boundary.before])) |annotation| {
                    if (annotation.next == document.nonblank[boundary.after]) {
                        if (!entry.layout_corrected) standard_label = annotation.label;
                        if (!annotation.structural) standard_counts.sibling_boundaries += 1;
                    }
                }
                if (standard_label) |label| {
                    standard_counts.rows += 1;
                    standard_counts.labels[label] += 1;
                    standard_counts.changed_labels += @intFromBool(label != row.label);
                    standard_counts.corrected_boundaries += @intFromBool(entry.layout_corrected);
                    row.label = label;
                    try data.writeRow(&standard_writer.interface, row);
                } else standard_counts.unclassified_boundaries += 1;
            }
            count += 1;
        }
    }
    try writer.interface.flush();
    try standard_writer.interface.flush();
    return count;
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const primary = try records(allocator, init.io, "config/sources.lock.json");
    const evaluation = try records(allocator, init.io, "config/evaluation-sources.lock.json");
    const style = try records(allocator, init.io, "config/style-sources.lock.json");
    const all = try std.mem.concat(allocator, corpus.Record, &.{ primary, evaluation, style });
    const editable_samples = try samples.load(allocator, init.io);
    var files: std.ArrayList(data.File) = .empty;

    for (all) |record| {
        if (record.status != .complete) return error.IncompleteSource;
        var root = try std.Io.Dir.cwd().openDir(init.io, record.raw_path, .{ .iterate = true });
        defer root.close(init.io);
        var walker = try root.walk(allocator);
        defer walker.deinit();
        var paths: std.ArrayList([]const u8) = .empty;

        while (try walker.next(init.io)) |entry| {
            if (entry.kind != .file or !targetFile(entry.path, record.source.language)) continue;
            var selected = false;
            for (record.source.paths) |prefix| {
                if (std.mem.eql(u8, prefix, ".") or std.mem.eql(u8, entry.path, prefix) or (std.mem.startsWith(u8, entry.path, prefix) and entry.path.len > prefix.len and entry.path[prefix.len] == '/')) selected = true;
            }
            if (selected) try paths.append(allocator, try allocator.dupe(u8, entry.path));
        }
        std.mem.sort([]const u8, paths.items, {}, struct {
            fn less(_: void, a: []const u8, b: []const u8) bool {
                return std.mem.lessThan(u8, a, b);
            }
        }.less);

        for (paths.items) |path| {
            const entry = inspect(allocator, init.io, record, path, files.items.len, samples.find(editable_samples, record.source.repository, path)) catch |err| {
                std.log.warn("excluded {s}/{s}: {s}", .{ record.source.repository, path, @errorName(err) });
                continue;
            };
            if (entry.layout_corrected and entry.split == .rejected) {
                std.log.err("edited sample rejected: {s}: {s}", .{ entry.source_path, entry.reason orelse "unknown" });
                return error.InvalidEditedSample;
            }
            try files.append(allocator, entry);
        }
        std.log.info("inspected {s}: {d} candidate files", .{ record.source.repository, paths.items.len });
    }

    // Cluster before selecting representatives, so transitive duplicates never
    // keep a training member alongside a held-out member of the same cluster.
    const parents = try allocator.alloc(usize, files.items.len);
    const representatives = try allocator.alloc(?usize, files.items.len);
    @memset(representatives, null);
    for (parents, 0..) |*parent, i| parent.* = i;

    for (files.items, 0..) |file, i| {
        if (file.split == .rejected) continue;
        for (files.items[0..i], 0..) |earlier, j| {
            if (earlier.split == .rejected or !similar(file, earlier)) continue;
            parents[rootOf(parents, i)] = rootOf(parents, j);
        }
    }

    for (files.items, 0..) |file, i| {
        if (file.split == .rejected) continue;
        const root = rootOf(parents, i);
        if (representatives[root]) |current| {
            if (priority(file.split) > priority(files.items[current].split)) representatives[root] = i;
        } else representatives[root] = i;
    }

    var duplicate_count: usize = 0;
    for (files.items, 0..) |*file, i| {
        if (file.split == .rejected) continue;
        if (representatives[rootOf(parents, i)].? != i) {
            file.split = .rejected;
            file.reason = "duplicate";
            duplicate_count += 1;
        }
    }

    try std.Io.Dir.cwd().createDirPath(init.io, "data/processed");
    var owners = try contextOwners(allocator, init.io, files.items);
    defer owners.deinit();
    const manifest = try std.json.Stringify.valueAlloc(allocator, files.items, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "data/processed/files.json", .data = manifest });

    var split_counts: [6]usize = undefined;
    var standard_counts: [6]StandardCounts = @splat(.{});
    for ([_]data.Split{ .train, .validation, .@"test", .unseen_language, .style_train, .style_validation }, 0..) |split, i| {
        split_counts[i] = try writeDataset(allocator, init.io, files.items, split, &owners, &standard_counts[i]);
        std.log.info("{s}: {d} independent boundaries", .{ @tagName(split), split_counts[i] });
    }

    const report = try std.json.Stringify.valueAlloc(allocator, .{
        .feature_version = core.features.version,
        .editable_sample_count = editable_samples.len,
        .feature_count = core.features.count,
        .language_is_model_input = false,
        .files = files.items.len,
        .duplicate_rejections = duplicate_count,
        .unique_contexts = owners.count(),
        .train = split_counts[0],
        .validation = split_counts[1],
        .@"test" = split_counts[2],
        .unseen_language = split_counts[3],
        .style_train = split_counts[4],
        .style_validation = split_counts[5],
        .labels = "original-author weak supervision; not human gold labels",
        .standard_rule_version = 2,
        .standard_labels = "offline AST supervision: multiline siblings or different statement kinds => 1; single-line same-kind siblings and known internal gaps => 0; unclassified gaps omitted; edited sample layouts override annotations; never a runtime formatting rule",
        .standard_split_order = [_][]const u8{ "train", "validation", "test", "unseen_language", "style_train", "style_validation" },
        .standard_counts = standard_counts,
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = "data/processed/summary.json", .data = report });
}
