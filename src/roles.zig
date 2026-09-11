const std = @import("std");
const tokenizer = @import("tokenizer.zig");

/// Surface roles are input features, not formatting decisions or a parser.
/// Unknown languages use the same token shapes; no filename is consulted.
pub const Role = enum { other, binding, assignment, call, control, exit, opening, closing };
pub const count = @typeInfo(Role).@"enum".fields.len;

fn oneOf(word: []const u8, words: []const []const u8) bool {
    for (words) |candidate| {
        if (std.mem.eql(u8, word, candidate)) return true;
    }

    return false;
}

pub fn classify(line: []const u8) Role {
    var tokens: tokenizer.Iterator = .{ .source = line };
    var first = tokens.next() orelse return .other;
    if (std.mem.eql(u8, first.text(line), "@")) first = tokens.next() orelse return .other;
    const word = first.text(line);
    if (oneOf(word, &.{ "}", ")", "]" }) or std.mem.eql(u8, line, "end") or std.mem.eql(u8, line, "end;")) return .closing;
    if (std.mem.eql(u8, word, "{")) return .opening;
    if (first.kind != .word) return .other;

    if (oneOf(word, &.{ "return", "throw", "break", "continue", "yield" })) return .exit;
    if (oneOf(word, &.{ "if", "else", "elif", "unless", "guard", "for", "foreach", "while", "switch", "match", "try", "catch", "finally", "do", "lock" })) return .control;
    if (oneOf(word, &.{ "const", "let", "var", "val", "final", "def", "fn", "function", "class", "struct", "interface", "enum", "type" })) return .binding;
    if (oneOf(word, &.{ "import", "using", "package", "namespace" })) return .other;

    var words: usize = 1;
    var generic_depth: usize = 0;
    var member = false;
    var subscript = false;
    var previous: []const u8 = word;

    while (tokens.next()) |token| {
        if (token.kind == .whitespace) continue;
        const current = token.text(line);

        if (std.mem.eql(u8, current, "=")) {
            const rest = line[token.end..];
            if (rest.len > 0 and (rest[0] == '=' or rest[0] == '>')) return .other;
            if (oneOf(previous, &.{ "=", "!", "<", ">" })) return .other;
            if (std.mem.eql(u8, previous, ":")) return .binding;

            return if (words >= 2 and !member and !subscript) .binding else .assignment;
        }

        if (std.mem.eql(u8, current, "<")) generic_depth += 1;
        if (std.mem.eql(u8, current, ">") and generic_depth > 0) generic_depth -= 1;
        if (generic_depth == 0) {
            if (token.kind == .word) {
                words += 1;
                if (!std.mem.eql(u8, previous, ".")) member = false;
            }
            if (std.mem.eql(u8, current, ".")) member = true;
            if (std.mem.eql(u8, current, "[")) subscript = true;
            if (std.mem.eql(u8, current, "(")) return .call;
        }

        previous = current;
    }

    if (words >= 2 and !member and !subscript and std.mem.endsWith(u8, line, ";")) return .binding;

    return if (member) .call else .other;
}
