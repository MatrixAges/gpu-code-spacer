const std = @import("std");

pub const Line = struct {
    start: usize,
    end: usize,
    after: usize,
    indent: usize,
    blank: bool,
    protected: bool,
    protected_before: bool,
    protected_after: bool,
    comment: bool,
    continued: bool,
    braces: i32,
    parentheses: i32,
    brackets: i32,
};

pub const Boundary = struct {
    start: usize,
    end: usize,
    before: usize,
    after: usize,
    blank_lines: usize,
    crlf: bool,
};

pub const Document = struct {
    lines: []Line,
    nonblank: []usize,
    boundaries: []Boundary,
    unterminated_region: bool,
    units: @import("units.zig").Index,
};

/// A shared lexical guard, not a language detector or a complete parser.
/// Unknown extensions take exactly the same path as training languages.
const Scanner = struct {
    quote: u8 = 0,
    quote_width: usize = 0,
    block_close: []const u8 = "",
    block_open: []const u8 = "",
    block_depth: usize = 0,
    raw_close: []const u8 = "",
    raw_buffer: [32]u8 = undefined,
    heredoc: []const u8 = "",
    indent_literal: ?usize = null,
    macro_delimiter: u8 = 0,
    macro_level: i32 = 0,
    paired_open: u8 = 0,
    paired_close: u8 = 0,
    paired_depth: usize = 0,
    data_tail: bool = false,
    braces: i32 = 0,
    parentheses: i32 = 0,
    brackets: i32 = 0,

    fn active(self: *const Scanner) bool {
        return self.quote != 0 or self.block_depth > 0 or self.raw_close.len > 0 or self.heredoc.len > 0 or self.indent_literal != null or self.macro_delimiter != 0 or self.paired_depth != 0;
    }

    fn scan(self: *Scanner, text: []const u8, remaining: []const u8) struct { protected: bool, comment: bool } {
        const trimmed = std.mem.trim(u8, text, " \t\r");
        if (self.data_tail) return .{ .protected = true, .comment = false };
        if (!self.active() and (std.mem.eql(u8, trimmed, "__END__") or std.mem.eql(u8, trimmed, "__DATA__"))) {
            self.data_tail = true;
            return .{ .protected = true, .comment = false };
        }
        if (self.indent_literal) |parent_indent| {
            const indent = text.len - std.mem.trimStart(u8, text, " \t").len;
            if (trimmed.len == 0 or indent > parent_indent) return .{ .protected = true, .comment = false };
            self.indent_literal = null;
        }
        const started_inside = self.active();

        if (self.heredoc.len > 0) {
            if (std.mem.eql(u8, trimmed, self.heredoc)) self.heredoc = "";
            return .{ .protected = true, .comment = false };
        }

        // A line-literal prefix. Its content and adjoining gaps are preserved.
        if (!self.active() and std.mem.startsWith(u8, trimmed, "\\\\")) {
            return .{ .protected = true, .comment = false };
        }

        if (!self.active() and std.mem.eql(u8, trimmed, "=begin")) {
            self.heredoc = "=end";
            return .{ .protected = true, .comment = true };
        }

        // Indented block scalars (including optional chomping/indent markers).
        if (!self.active() and std.mem.findScalar(u8, trimmed, '=') == null) {
            if (std.mem.lastIndexOfScalar(u8, trimmed, ':')) |colon| {
                const marker = std.mem.trim(u8, trimmed[colon + 1 ..], " \t");
                if (marker.len > 0 and (marker[0] == '|' or marker[0] == '>')) {
                    var valid_marker = true;
                    for (marker[1..]) |byte| {
                        if (!std.ascii.isDigit(byte) and byte != '+' and byte != '-') valid_marker = false;
                    }
                    if (valid_marker) {
                        self.indent_literal = text.len - std.mem.trimStart(u8, text, " \t").len;
                        return .{ .protected = true, .comment = false };
                    }
                }
            }
        }

        var comment = false;
        var i: usize = 0;
        while (i < text.len) {
            const rest = text[i..];

            if (self.paired_depth > 0) {
                if (text[i] == '\\') {
                    i += @min(@as(usize, 2), text.len - i);
                    continue;
                }
                if (self.paired_open != self.paired_close and text[i] == self.paired_open) self.paired_depth += 1;
                if (text[i] == self.paired_close) self.paired_depth -= 1;
                i += 1;
                continue;
            }

            if (self.raw_close.len > 0) {
                if (std.mem.startsWith(u8, rest, self.raw_close)) {
                    i += self.raw_close.len;
                    self.raw_close = "";
                } else i += 1;
                continue;
            }

            if (self.block_depth > 0) {
                if (std.mem.startsWith(u8, rest, self.block_close)) {
                    self.block_depth -= 1;
                    i += self.block_close.len;
                } else if (self.block_open.len > 0 and std.mem.startsWith(u8, rest, self.block_open)) {
                    self.block_depth += 1;
                    i += self.block_open.len;
                } else i += 1;
                continue;
            }

            if (self.quote != 0) {
                if (text[i] == '\\') {
                    i += @min(@as(usize, 2), text.len - i);
                    continue;
                }

                var matched: usize = 0;
                while (matched < self.quote_width and i + matched < text.len and text[i + matched] == self.quote) : (matched += 1) {}
                if (matched == self.quote_width) {
                    self.quote = 0;
                    i += matched;
                } else i += 1;
                continue;
            }

            const prefix = std.mem.trim(u8, text[0..i], " \t");
            if (text[i] == '[' or std.mem.startsWith(u8, rest, "--[")) {
                const opening = if (text[i] == '[') i else i + 2;
                var closing = opening + 1;
                while (closing < text.len and text[closing] == '=') : (closing += 1) {}
                if (closing < text.len and text[closing] == '[' and closing - opening < self.raw_buffer.len - 1) {
                    const width = closing - opening + 1;
                    self.raw_buffer[0] = ']';
                    @memset(self.raw_buffer[1 .. width - 1], '=');
                    self.raw_buffer[width - 1] = ']';
                    self.raw_close = self.raw_buffer[0..width];
                    comment = opening != i;
                    i = closing + 1;
                    continue;
                }
            }

            if (std.mem.startsWith(u8, rest, "//") or text[i] == '#' or
                (std.mem.startsWith(u8, rest, "--") and (i == 0 or std.ascii.isWhitespace(text[i - 1]))) or
                (text[i] == ';' and prefix.len == 0))
            {
                comment = prefix.len == 0;
                break;
            }

            const block_pairs = [_][2][]const u8{ .{ "/*", "*/" }, .{ "<!--", "-->" }, .{ "(*", "*)" }, .{ "{-", "-}" } };
            var opened_block = false;
            for (block_pairs) |pair| {
                if (std.mem.startsWith(u8, rest, pair[0])) {
                    // The same punctuation also occurs in pointer/variadic
                    // expressions and negative set literals. Inspect balanced
                    // closing syntax instead of treating the opener as proof.
                    if (std.mem.eql(u8, pair[0], "(*") and !closesAsComment(remaining[i..], '(', ')', '*')) continue;
                    if (std.mem.eql(u8, pair[0], "{-") and !closesAsComment(remaining[i..], '{', '}', '-')) continue;
                    self.block_open = pair[0];
                    self.block_close = pair[1];
                    self.block_depth = 1;
                    comment = prefix.len == 0;
                    i += pair[0].len;
                    opened_block = true;
                    break;
                }
            }
            if (opened_block) continue;

            // Balanced text forms share the same delimiter machinery regardless
            // of extension: %(text), %q{text}, %r{pattern}, and similar forms.
            if (text[i] == '%') {
                var delimiter = i + 1;
                if (delimiter < text.len and std.ascii.isAlphabetic(text[delimiter])) delimiter += 1;
                if (delimiter < text.len and std.mem.findScalar(u8, "([{</!|^", text[delimiter]) != null) {
                    self.paired_open = text[delimiter];
                    self.paired_close = switch (text[delimiter]) {
                        '(' => ')',
                        '[' => ']',
                        '{' => '}',
                        '<' => '>',
                        else => text[delimiter],
                    };
                    self.paired_depth = 1;
                    i = delimiter + 1;
                    continue;
                }
            }

            // Raw delimiters have no escape interpretation. Matching is lexical,
            // regardless of a file's extension or declared language.
            if (std.mem.startsWith(u8, rest, "R\"")) {
                if (std.mem.findScalar(u8, rest[2..], '(')) |relative| {
                    if (relative <= 16) {
                        self.raw_buffer[0] = ')';
                        @memcpy(self.raw_buffer[1 .. relative + 1], rest[2 .. 2 + relative]);
                        self.raw_buffer[relative + 1] = '"';
                        self.raw_close = self.raw_buffer[0 .. relative + 2];
                        i += relative + 3;
                        continue;
                    }
                }
            }

            if (text[i] == 'r') {
                var end = i + 1;
                while (end < text.len and text[end] == '#') : (end += 1) {}
                if (end < text.len and text[end] == '"' and end - i < self.raw_buffer.len) {
                    self.raw_buffer[0] = '"';
                    @memset(self.raw_buffer[1 .. end - i], '#');
                    self.raw_close = self.raw_buffer[0 .. end - i];
                    i = end + 1;
                    continue;
                }
            }

            if (text[i] == '$') {
                var end = i + 1;
                while (end < text.len and (std.ascii.isAlphanumeric(text[end]) or text[end] == '_')) : (end += 1) {}
                if (end < text.len and text[end] == '$') {
                    self.raw_close = text[i .. end + 1];
                    i = end + 1;
                    continue;
                }
            }

            if (std.mem.startsWith(u8, rest, "<<")) {
                var begin = i + 2;
                if (begin < text.len and text[begin] == '<') begin += 1;
                if (begin < text.len and (text[begin] == '-' or text[begin] == '~')) begin += 1;
                while (begin < text.len and std.ascii.isWhitespace(text[begin])) : (begin += 1) {}
                const quoted = begin < text.len and (text[begin] == '\'' or text[begin] == '"');
                if (quoted) begin += 1;
                var end = begin;
                while (end < text.len and (std.ascii.isAlphanumeric(text[end]) or text[end] == '_')) : (end += 1) {}
                // A bare << is also a shift/stream/metaclass operator. Require
                // the independently identifiable closing line before entering
                // a heredoc region; a word alone is not sufficient evidence.
                if (end > begin and !std.ascii.isDigit(text[begin]) and hasTerminator(remaining, text[begin..end])) {
                    self.heredoc = text[begin..end];
                    break;
                }
            }

            if (text[i] == '/') {
                const before = std.mem.trimEnd(u8, text[0..i], " \t");
                const expects_value = before.len == 0 or std.mem.findScalar(u8, "=(:,[!?{", before[before.len - 1]) != null or std.mem.endsWith(u8, before, "return") or std.mem.endsWith(u8, before, "=>");
                if (expects_value) {
                    var end = i + 1;
                    var character_class = false;
                    while (end < text.len) : (end += 1) {
                        if (text[end] == '\\') {
                            end += 1;
                            continue;
                        }
                        if (text[end] == '[') character_class = true;
                        if (text[end] == ']') character_class = false;
                        if (text[end] == '/' and !character_class) break;
                    }
                    if (end < text.len) {
                        i = end + 1;
                        continue;
                    }
                }
            }

            if (text[i] == '"' or text[i] == '\'' or text[i] == '`') {
                // Apostrophe-prefixed identifiers in lifetime/type positions
                // are not quoted literals. Do not infer this from language ID.
                const before_quote = std.mem.trimEnd(u8, text[0..i], " \t");
                if (text[i] == '\'') {
                    var closing = i + 1;
                    while (closing < text.len) : (closing += 1) {
                        if (text[closing] == '\\') {
                            closing += 1;
                            continue;
                        }
                        if (text[closing] == '\'') break;
                    }
                    var end = i + 1;
                    while (end < text.len and (std.ascii.isAlphanumeric(text[end]) or text[end] == '_')) : (end += 1) {}
                    const reference_position = i > 0 and text[i - 1] == '&';
                    const type_position = (before_quote.len == 0 or std.mem.findScalar(u8, "<,:+", before_quote[before_quote.len - 1]) != null) and end < text.len and std.mem.findScalar(u8, ",>:+", text[end]) != null;
                    if (closing == text.len and end > i + 1 and (reference_position or type_position)) {
                        i = end;
                        continue;
                    }
                }

                self.quote = text[i];
                self.quote_width = if (i + 2 < text.len and text[i + 1] == text[i] and text[i + 2] == text[i]) 3 else 1;
                i += self.quote_width;
                continue;
            }

            const before_symbol = std.mem.trimEnd(u8, text[0..i], " \t");
            if (self.macro_delimiter == 0 and std.mem.findScalar(u8, "({[", text[i]) != null and before_symbol.len >= 2 and
                before_symbol[before_symbol.len - 1] == '!' and (std.ascii.isAlphanumeric(before_symbol[before_symbol.len - 2]) or before_symbol[before_symbol.len - 2] == '_'))
            {
                self.macro_delimiter = text[i];
                self.macro_level = switch (text[i]) {
                    '{' => self.braces,
                    '(' => self.parentheses,
                    '[' => self.brackets,
                    else => unreachable,
                };
            }

            switch (text[i]) {
                '{' => self.braces += 1,
                '}' => self.braces -= 1,
                '(' => self.parentheses += 1,
                ')' => self.parentheses -= 1,
                '[' => self.brackets += 1,
                ']' => self.brackets -= 1,
                else => {},
            }
            const macro_level = switch (self.macro_delimiter) {
                '{' => self.braces,
                '(' => self.parentheses,
                '[' => self.brackets,
                else => null,
            };
            if (macro_level) |level| {
                if (level == self.macro_level) self.macro_delimiter = 0;
            }
            i += 1;
        }

        return .{ .protected = started_inside or self.active(), .comment = comment };
    }
};

fn closesAsComment(source: []const u8, opening: u8, closing: u8, marker: u8) bool {
    var depth: usize = 1;
    for (source[2..], 2..) |byte, i| {
        if (byte == opening) depth += 1;
        if (byte == closing) {
            depth -= 1;
            // Opening and closing delimiters must not overlap: (*) is an
            // argument/pointer form, while the shortest (* ... *) is (**).
            if (depth == 0) return i >= 3 and source[i - 1] == marker;
        }
    }
    return true;
}

fn hasTerminator(source: []const u8, marker: []const u8) bool {
    var lines = std.mem.splitScalar(u8, source, '\n');
    _ = lines.next();
    while (lines.next()) |line| {
        if (std.mem.eql(u8, std.mem.trim(u8, line, " \t\r"), marker)) return true;
    }
    return false;
}

pub fn analyze(allocator: std.mem.Allocator, source: []const u8) !Document {
    var lines: std.ArrayList(Line) = .empty;
    var nonblank: std.ArrayList(usize) = .empty;
    var boundaries: std.ArrayList(Boundary) = .empty;
    var scanner: Scanner = .{};
    var start: usize = 0;

    while (start < source.len) {
        const newline = std.mem.findScalarPos(u8, source, start, '\n') orelse source.len;
        const end = if (newline > start and source[newline - 1] == '\r') newline - 1 else newline;
        const after = if (newline < source.len) newline + 1 else newline;
        const text = source[start..end];
        const blank = std.mem.trim(u8, text, " \t\r").len == 0;
        var indent: usize = 0;
        for (text) |character| {
            if (character == ' ') indent += 1 else if (character == '\t') indent += 4 else break;
        }

        const protected_before = scanner.active();
        const lexical = scanner.scan(text, source[start..]);
        const protected_after = scanner.active();
        const whole_line_literal = lexical.protected and !protected_before and !protected_after;
        const trimmed = std.mem.trimEnd(u8, text, " \t");
        try lines.append(allocator, .{
            .start = start,
            .end = end,
            .after = after,
            .indent = indent,
            .blank = blank,
            .protected = lexical.protected,
            .protected_before = protected_before or whole_line_literal,
            .protected_after = protected_after or whole_line_literal,
            .comment = lexical.comment,
            .continued = std.mem.endsWith(u8, trimmed, "\\"),
            .braces = scanner.braces,
            .parentheses = scanner.parentheses,
            .brackets = scanner.brackets,
        });

        if (!blank) try nonblank.append(allocator, lines.items.len - 1);
        start = after;
    }

    for (nonblank.items, 0..) |next_index, position| {
        if (position == 0) continue;
        const previous_index = nonblank.items[position - 1];
        const previous = lines.items[previous_index];
        const next = lines.items[next_index];
        if (previous.protected_after or next.protected_before or previous.comment or previous.continued) continue;

        var protected_gap = false;
        for (lines.items[previous_index + 1 .. next_index]) |line| {
            if (line.protected) protected_gap = true;
        }
        if (protected_gap) continue;

        try boundaries.append(allocator, .{
            .start = previous.after,
            .end = next.start,
            .before = position - 1,
            .after = position,
            .blank_lines = next_index - previous_index - 1,
            .crlf = previous.after - previous.end == 2,
        });
    }

    const owned_lines = try lines.toOwnedSlice(allocator);
    const owned_nonblank = try nonblank.toOwnedSlice(allocator);
    return .{
        .lines = owned_lines,
        .nonblank = owned_nonblank,
        .boundaries = try boundaries.toOwnedSlice(allocator),
        .unterminated_region = scanner.active(),
        .units = try @import("units.zig").build(allocator, source, owned_lines, owned_nonblank),
    };
}

pub fn render(allocator: std.mem.Allocator, source: []const u8, document: Document, labels: []const u8) ![]u8 {
    if (labels.len != document.boundaries.len) return error.BoundaryCountMismatch;
    var output: std.ArrayList(u8) = .empty;
    var cursor: usize = 0;

    for (document.boundaries, labels) |boundary, label| {
        if (label > 2 and label != 255) return error.InvalidBlankLineCount;
        try output.appendSlice(allocator, source[cursor..boundary.start]);

        if (label == 255 or label == boundary.blank_lines) {
            try output.appendSlice(allocator, source[boundary.start..boundary.end]);
        } else {
            for (0..label) |_| try output.appendSlice(allocator, if (boundary.crlf) "\r\n" else "\n");
        }

        cursor = boundary.end;
    }
    try output.appendSlice(allocator, source[cursor..]);
    return output.toOwnedSlice(allocator);
}
