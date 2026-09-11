const std = @import("std");
const layout = @import("layout.zig");
const roles = @import("roles.zig");

pub const Unit = struct { first: usize, last: usize, role: roles.Role };
pub const Index = struct { starting: []?Unit, ending: []?Unit, interior: []bool };

fn text(source: []const u8, lines: []const layout.Line, nonblank: []const usize, index: usize) []const u8 {
    const line = lines[nonblank[index]];
    return std.mem.trim(u8, source[line.start..line.end], " \t\r");
}

fn wordIs(value: []const u8, word: []const u8) bool {
    return std.mem.startsWith(u8, value, word) and (value.len == word.len or !std.ascii.isAlphanumeric(value[word.len]) and value[word.len] != '_');
}

fn closing(value: []const u8) bool {
    return value.len > 0 and (std.mem.findScalar(u8, "})]", value[0]) != null or std.mem.eql(u8, value, "end") or std.mem.eql(u8, value, "end;"));
}

fn trailingOperator(value: []const u8) bool {
    if (value.len == 0) return false;
    return std.mem.findScalar(u8, "=,+|&", value[value.len - 1]) != null or std.mem.endsWith(u8, value, "=>");
}

fn braceIsBody(value: []const u8) bool {
    if (roles.classify(value) == .control) return true;
    if (std.mem.find(u8, value, "=>") != null) return true;
    for ([_][]const u8{ "class", "struct", "impl", "fn", "function", "def", "namespace", "interface" }) |word| {
        if (wordIs(value, word)) return true;
    }
    return std.mem.findScalar(u8, value, '=') == null and std.mem.findScalar(u8, value, '(') != null;
}

fn updateFrames(allocator: std.mem.Allocator, frames: *std.ArrayList(usize), depth: i32, index: usize) !void {
    const size: usize = @intCast(@max(depth, 0));
    if (frames.items.len > size) frames.shrinkRetainingCapacity(size);
    while (frames.items.len < size) try frames.append(allocator, index);
}

/// Shared structural approximation: balanced lexical delimiters, indentation,
/// continuation lines and explicit block endings. It has no blank-line policy.
pub fn build(allocator: std.mem.Allocator, source: []const u8, lines: []const layout.Line, nonblank: []const usize) !Index {
    const starting = try allocator.alloc(?Unit, nonblank.len);
    const ending = try allocator.alloc(?Unit, nonblank.len);
    const interior = try allocator.alloc(bool, nonblank.len);
    @memset(starting, null);
    @memset(ending, null);
    @memset(interior, false);

    var braces: std.ArrayList(usize) = .empty;
    defer braces.deinit(allocator);
    var parentheses: std.ArrayList(usize) = .empty;
    defer parentheses.deinit(allocator);
    var brackets: std.ArrayList(usize) = .empty;
    defer brackets.deinit(allocator);
    for (nonblank, 0..) |line_index, index| {
        var body_open: ?usize = null;
        if (braces.items.len > 0) {
            const opening = braces.items[braces.items.len - 1];
            var header = text(source, lines, nonblank, opening);
            if (std.mem.eql(u8, header, "{") and opening > 0) header = text(source, lines, nonblank, opening - 1);
            if (braceIsBody(header)) body_open = opening else interior[index] = true;
        }
        for ([_][]const usize{ parentheses.items, brackets.items }) |frames| {
            if (frames.len == 0) continue;
            const opening = frames[frames.len - 1];
            if (body_open == null or body_open.? < opening) interior[index] = true;
        }

        const line = lines[line_index];
        try updateFrames(allocator, &braces, line.braces, index);
        try updateFrames(allocator, &parentheses, line.parentheses, index);
        try updateFrames(allocator, &brackets, line.brackets, index);
    }

    for (nonblank, 0..) |line_index, first| {
        const line = lines[line_index];
        const value = text(source, lines, nonblank, first);
        const before = if (first > 0) lines[nonblank[first - 1]] else null;

        if (line.protected_before or line.comment or closing(value) or std.mem.eql(u8, value, "{") or std.mem.startsWith(u8, value, ".") or std.mem.startsWith(u8, value, ",")) continue;

        const base_braces = if (before) |previous| previous.braces else 0;
        const base_parentheses = if (before) |previous| previous.parentheses else 0;
        const base_brackets = if (before) |previous| previous.brackets else 0;
        var last = first;

        while (last + 1 < nonblank.len) {
            const current = lines[nonblank[last]];
            const next = lines[nonblank[last + 1]];
            const next_text = text(source, lines, nonblank, last + 1);
            const unmatched = current.braces > base_braces or current.parentheses > base_parentheses or current.brackets > base_brackets or current.protected_after;
            const indented = next.indent > line.indent;
            const allman = next.indent == line.indent and std.mem.eql(u8, next_text, "{");
            const continuation = std.mem.startsWith(u8, next_text, ".") or current.continued or trailingOperator(text(source, lines, nonblank, last));
            const explicit_end = last > first and next.indent == line.indent and wordIs(next_text, "end");
            const branch = next.indent == line.indent and roles.classify(value) == .control and (wordIs(next_text, "else") or wordIs(next_text, "catch") or wordIs(next_text, "finally") or wordIs(next_text, "elif"));
            if (!unmatched and !indented and !allman and !continuation and !explicit_end and !branch) break;
            last += 1;
            if (explicit_end) break;
        }

        const unit: Unit = .{ .first = first, .last = last, .role = roles.classify(value) };
        starting[first] = unit;
        if (ending[last] == null) ending[last] = unit;
    }

    return .{ .starting = starting, .ending = ending, .interior = interior };
}
