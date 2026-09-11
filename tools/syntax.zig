const std = @import("std");
const c = @cImport({
    @cInclude("tree_sitter/api.h");
});

extern fn tree_sitter_typescript() ?*const c.TSLanguage;
extern fn tree_sitter_javascript() ?*const c.TSLanguage;
extern fn tree_sitter_python() ?*const c.TSLanguage;
extern fn tree_sitter_java() ?*const c.TSLanguage;
extern fn tree_sitter_rust() ?*const c.TSLanguage;
extern fn tree_sitter_zig() ?*const c.TSLanguage;

pub const Range = struct { start: usize, end: usize };

pub const StatementKind = enum { binding, assignment, call, conditional, loop, result, transfer, declaration, import, other };
pub const StatementBoundary = struct {
    left_end: usize,
    right_start: usize,
    left_kind: StatementKind,
    right_kind: StatementKind,
    left_multiline: bool,
    right_multiline: bool,
    structural: bool = false,

    pub fn label(self: StatementBoundary) u8 {
        return if (self.structural) 0 else @intFromBool(self.left_multiline or self.right_multiline or self.left_kind != self.right_kind);
    }
};

fn kindIs(kind: []const u8, names: []const []const u8) bool {
    for (names) |name| {
        if (std.mem.eql(u8, kind, name)) return true;
    }
    return false;
}

fn statementKind(node: c.TSNode) StatementKind {
    const kind = std.mem.span(c.ts_node_type(node));
    if (std.mem.eql(u8, kind, "export_statement")) {
        const declaration = c.ts_node_child_by_field_name(node, "declaration", "declaration".len);
        if (!c.ts_node_is_null(declaration)) return statementKind(declaration);
        return .import;
    }
    if (kindIs(kind, &.{ "expression_statement", "await_expression" }) and c.ts_node_named_child_count(node) > 0) return statementKind(c.ts_node_named_child(node, 0));
    if (kindIs(kind, &.{ "lexical_declaration", "variable_declaration", "local_variable_declaration", "let_declaration", "const_declaration", "variable_declarator", "public_field_definition", "field_declaration" })) return .binding;
    if (kindIs(kind, &.{ "assignment", "augmented_assignment", "assignment_expression", "augmented_assignment_expression", "compound_assignment_expr", "assignment_statement", "update_expression" })) return .assignment;
    if (kindIs(kind, &.{ "call_expression", "call", "method_invocation", "macro_invocation", "builtin_function" })) return .call;
    if (kindIs(kind, &.{ "if_statement", "if_expression", "switch_statement", "switch_expression", "match_expression" })) return .conditional;
    if (kindIs(kind, &.{ "for_statement", "for_expression", "while_statement", "while_expression", "loop_expression", "enhanced_for_statement", "do_statement" })) return .loop;
    if (kindIs(kind, &.{ "return_statement", "return_expression", "yield_statement", "yield_expression", "tuple_expression" })) return .result;
    if (kindIs(kind, &.{ "break_statement", "break_expression", "continue_statement", "continue_expression", "throw_statement", "raise_statement", "try_statement", "defer_statement" })) return .transfer;
    if (kindIs(kind, &.{ "import_statement", "import_declaration", "import_from_statement", "use_declaration", "package_declaration" })) return .import;
    if (std.mem.endsWith(u8, kind, "declaration") or std.mem.endsWith(u8, kind, "definition") or std.mem.endsWith(u8, kind, "item")) return .declaration;
    return .other;
}

fn multiline(node: c.TSNode, source: []const u8) bool {
    const value = source[c.ts_node_start_byte(node)..c.ts_node_end_byte(node)];
    var lines = std.mem.splitScalar(u8, value, '\n');
    var count: usize = 0;
    while (lines.next()) |line| {
        if (std.mem.trim(u8, line, " \t\r").len > 0) count += 1;
        if (count > 1) return true;
    }
    return false;
}

fn collectStatements(allocator: std.mem.Allocator, node: c.TSNode, source: []const u8, output: *std.ArrayList(StatementBoundary), depth: usize) !void {
    if (depth > 512) return error.SyntaxTooDeep;
    const kind = std.mem.span(c.ts_node_type(node));
    const container = kindIs(kind, &.{ "program", "module", "source_file", "statement_block", "block", "constructor_body", "class_body", "declaration_list", "switch_case", "switch_default", "switch_block_statement_group" });
    var previous: ?c.TSNode = null;
    var comment_start: ?usize = null;

    for (0..c.ts_node_named_child_count(node)) |i| {
        const child = c.ts_node_named_child(node, @intCast(i));
        const child_kind = std.mem.span(c.ts_node_type(child));
        if (container) {
            if (kindIs(kind, &.{ "switch_case", "switch_block_statement_group" })) {
                const value = c.ts_node_child_by_field_name(node, "value", "value".len);
                if ((!c.ts_node_is_null(value) and c.ts_node_eq(child, value)) or std.mem.eql(u8, child_kind, "switch_label")) continue;
            }
            if (std.mem.find(u8, child_kind, "comment") != null) {
                if (comment_start == null) comment_start = c.ts_node_start_byte(child);
                continue;
            }
            if (previous) |left| {
                const left_end = c.ts_node_end_byte(left);
                const right_start = comment_start orelse c.ts_node_start_byte(child);
                if (right_start > left_end and std.mem.trim(u8, source[left_end..right_start], " \t\r\n").len == 0) {
                    try output.append(allocator, .{
                        .left_end = left_end,
                        .right_start = right_start,
                        .left_kind = statementKind(left),
                        .right_kind = statementKind(child),
                        .left_multiline = multiline(left, source),
                        .right_multiline = multiline(child, source),
                    });
                }
            }
            previous = child;
            comment_start = null;
        }
        try collectStatements(allocator, child, source, output, depth + 1);
    }

    // Only classify known internal gaps. Missing a statement-container mapping
    // must not silently turn its unknown sibling gaps into negative examples.
    const known_expression = statementKind(node) != .other or std.mem.endsWith(u8, kind, "_expression") or kindIs(kind, &.{
        "arguments", "argument_list", "formal_parameters", "parameters", "parameter_list", "type_arguments", "type_parameters", "array", "object", "list", "dictionary", "tuple", "parenthesized_list_splat", "object_type",
    });
    const child_count = c.ts_node_child_count(node);
    if (child_count < 2) return;
    for (1..child_count) |i| {
        const left = c.ts_node_child(node, @intCast(i - 1));
        const right = c.ts_node_child(node, @intCast(i));
        const punctuation_edge = container and (!c.ts_node_is_named(left) or !c.ts_node_is_named(right));
        if (!punctuation_edge and (container or !known_expression)) continue;
        const left_end = c.ts_node_end_byte(left);
        const right_start = c.ts_node_start_byte(right);
        if (right_start <= left_end or std.mem.trim(u8, source[left_end..right_start], " \t\r\n").len != 0) continue;
        try output.append(allocator, .{
            .left_end = left_end,
            .right_start = right_start,
            .left_kind = .other,
            .right_kind = .other,
            .left_multiline = false,
            .right_multiline = false,
            .structural = true,
        });
    }
}

/// Offline supervision only. Formatting output is still predicted by the
/// deployed model using the same shared features as training.
pub fn statementBoundaries(allocator: std.mem.Allocator, source: []const u8, language: []const u8) !?[]StatementBoundary {
    const lang = grammar(language) orelse return null;
    const parser = c.ts_parser_new() orelse return error.OutOfMemory;
    defer c.ts_parser_delete(parser);
    if (!c.ts_parser_set_language(parser, lang)) return error.GrammarAbiMismatch;
    const tree = c.ts_parser_parse_string(parser, null, source.ptr, @intCast(source.len)) orelse return error.ParseFailed;
    defer c.ts_tree_delete(tree);
    if (c.ts_node_has_error(c.ts_tree_root_node(tree))) return error.InvalidSyntax;

    var result: std.ArrayList(StatementBoundary) = .empty;
    try collectStatements(allocator, c.ts_tree_root_node(tree), source, &result, 0);
    return try result.toOwnedSlice(allocator);
}

pub fn excludedRegions(allocator: std.mem.Allocator, source: []const u8, language: []const u8) ![]Range {
    const lang = grammar(language) orelse return allocator.alloc(Range, 0);
    const parser = c.ts_parser_new() orelse return error.OutOfMemory;
    defer c.ts_parser_delete(parser);
    if (!c.ts_parser_set_language(parser, lang)) return error.GrammarAbiMismatch;
    const tree = c.ts_parser_parse_string(parser, null, source.ptr, @intCast(source.len)) orelse return error.ParseFailed;
    defer c.ts_tree_delete(tree);

    var ranges: std.ArrayList(Range) = .empty;
    try collectExcluded(c.ts_tree_root_node(tree), source, &ranges, allocator, 0);
    return ranges.toOwnedSlice(allocator);
}

fn collectExcluded(node: c.TSNode, source: []const u8, ranges: *std.ArrayList(Range), allocator: std.mem.Allocator, depth: usize) !void {
    if (depth > 512) return error.SyntaxTooDeep;
    const kind = std.mem.span(c.ts_node_type(node));
    var omit = std.mem.eql(u8, kind, "test_declaration");
    var previous = c.ts_node_prev_named_sibling(node);
    while (!c.ts_node_is_null(previous) and std.mem.eql(u8, std.mem.span(c.ts_node_type(previous)), "attribute_item")) {
        const attribute = source[c.ts_node_start_byte(previous)..c.ts_node_end_byte(previous)];
        var compact: [256]u8 = undefined;
        var length: usize = 0;
        for (attribute) |byte| {
            if (std.ascii.isWhitespace(byte)) continue;
            if (length == compact.len) break;
            compact[length] = byte;
            length += 1;
        }
        if (std.mem.eql(u8, compact[0..length], "#[cfg(test)]")) omit = true;
        previous = c.ts_node_prev_named_sibling(previous);
    }

    if (omit) {
        try ranges.append(allocator, .{ .start = c.ts_node_start_byte(node), .end = c.ts_node_end_byte(node) });
        return;
    }
    for (0..c.ts_node_named_child_count(node)) |i| {
        try collectExcluded(c.ts_node_named_child(node, @intCast(i)), source, ranges, allocator, depth + 1);
    }
}

pub fn excluded(offset: usize, ranges: []const Range) bool {
    for (ranges) |range| {
        if (offset >= range.start and offset < range.end) return true;
    }
    return false;
}

/// Offline oracles for the initial corpus. Not linked into the shipped model
/// and not consulted when deciding which languages the classifier accepts.
fn grammar(name: []const u8) ?*const c.TSLanguage {
    if (std.mem.eql(u8, name, "typescript")) return tree_sitter_typescript();
    if (std.mem.eql(u8, name, "javascript")) return tree_sitter_javascript();
    if (std.mem.eql(u8, name, "python")) return tree_sitter_python();
    if (std.mem.eql(u8, name, "java")) return tree_sitter_java();
    if (std.mem.eql(u8, name, "rust")) return tree_sitter_rust();
    if (std.mem.eql(u8, name, "zig")) return tree_sitter_zig();
    return null;
}

pub fn fingerprint(source: []const u8, language: []const u8) !?[32]u8 {
    const lang = grammar(language) orelse return null;
    if (source.len > std.math.maxInt(u32)) return error.SourceTooLarge;

    const parser = c.ts_parser_new() orelse return error.OutOfMemory;
    defer c.ts_parser_delete(parser);
    if (!c.ts_parser_set_language(parser, lang)) return error.GrammarAbiMismatch;

    const tree = c.ts_parser_parse_string(parser, null, source.ptr, @intCast(source.len)) orelse return error.ParseFailed;
    defer c.ts_tree_delete(tree);
    const root = c.ts_tree_root_node(tree);
    if (c.ts_node_has_error(root)) return error.InvalidSyntax;

    var hash = std.crypto.hash.sha2.Sha256.init(.{});
    try hashNode(root, source, &hash, 0);
    return hash.finalResult();
}

fn hashNode(node: c.TSNode, source: []const u8, hash: *std.crypto.hash.sha2.Sha256, depth: usize) !void {
    if (depth > 512) return error.SyntaxTooDeep;
    hash.update(std.mem.span(c.ts_node_type(node)));
    hash.update(&.{0});

    const children = c.ts_node_child_count(node);
    if (children == 0) {
        const start = c.ts_node_start_byte(node);
        const end = c.ts_node_end_byte(node);
        hash.update(source[start..end]);
    } else {
        for (0..children) |i| try hashNode(c.ts_node_child(node, @intCast(i)), source, hash, depth + 1);
    }
    hash.update(&.{255});
}
