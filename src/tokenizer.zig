const std = @import("std");

/// Lossless, language-independent segmentation. Tokens describe surface shape,
/// not grammar roles (a word may be a keyword, variable, type, or plain text).
pub const Kind = enum { word, number, symbol, whitespace, newline };

pub const Token = struct {
    kind: Kind,
    start: usize,
    end: usize,

    pub fn text(self: Token, source: []const u8) []const u8 {
        return source[self.start..self.end];
    }
};

pub const Iterator = struct {
    source: []const u8,
    position: usize = 0,

    pub fn next(self: *Iterator) ?Token {
        if (self.position == self.source.len) return null;
        const start = self.position;
        const first = self.source[start];
        self.position += 1;

        const kind: Kind = if (first == '\n' or first == '\r') block: {
            if (first == '\r' and self.position < self.source.len and self.source[self.position] == '\n') self.position += 1;
            break :block .newline;
        } else if (first == ' ' or first == '\t' or first == 0x0b or first == 0x0c) block: {
            while (self.position < self.source.len) : (self.position += 1) {
                const byte = self.source[self.position];
                if (byte != ' ' and byte != '\t' and byte != 0x0b and byte != 0x0c) break;
            }
            break :block .whitespace;
        } else if (wordByte(first)) block: {
            var numeric = std.ascii.isDigit(first);
            while (self.position < self.source.len and wordByte(self.source[self.position])) : (self.position += 1) {
                numeric = numeric and std.ascii.isDigit(self.source[self.position]);
            }
            break :block if (numeric) .number else .word;
        } else .symbol;

        return .{ .kind = kind, .start = start, .end = self.position };
    }
};

fn wordByte(byte: u8) bool {
    // Non-ASCII UTF-8 bytes stay together without imposing an ASCII-only
    // vocabulary. Classification does not alter or normalize source bytes.
    return std.ascii.isAlphanumeric(byte) or byte == '_' or byte >= 128;
}
