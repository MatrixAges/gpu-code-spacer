const std = @import("std");

/// Match one path segment, case-sensitively and byte-wise, with shell-style dotfile rules.
/// Backslashes belong to path parsing, never escaping. Use [[], []], [*], [?] for literals.
/// Supports *, ?, [abc], [a-z], [!abc] and [^abc]; POSIX named classes are not supported.
pub fn matches(pattern: []const u8, name: []const u8) bool {
    if (name.len > 0 and name[0] == '.' and (pattern.len == 0 or pattern[0] != '.')) return false;

    var pattern_index: usize = 0;
    var name_index: usize = 0;
    var star_pattern: ?usize = null;
    var star_name: usize = 0;

    while (name_index < name.len) {
        if (pattern_index < pattern.len and pattern[pattern_index] == '*') {
            pattern_index += 1;
            star_pattern = pattern_index;
            star_name = name_index;
            continue;
        }

        if (pattern_index < pattern.len) {
            const token = matchToken(pattern[pattern_index..], name[name_index]);
            if (token.matched) {
                pattern_index += token.length;
                name_index += 1;
                continue;
            }
        }

        if (star_pattern) |after_star| {
            star_name += 1;
            name_index = star_name;
            pattern_index = after_star;
        } else return false;
    }

    while (pattern_index < pattern.len and pattern[pattern_index] == '*') pattern_index += 1;
    return pattern_index == pattern.len;
}

const Token = struct {
    matched: bool,
    length: usize,
};

fn matchToken(pattern: []const u8, value: u8) Token {
    if (pattern[0] == '?') return .{ .matched = true, .length = 1 };
    if (pattern[0] != '[') return .{ .matched = pattern[0] == value, .length = 1 };

    var index: usize = 1;
    const negated = index < pattern.len and (pattern[index] == '!' or pattern[index] == '^');
    if (negated) index += 1;
    const first = index;
    if (index < pattern.len and pattern[index] == ']') index += 1;
    const end = std.mem.indexOfScalarPos(u8, pattern, index, ']') orelse
        return .{ .matched = value == '[', .length = 1 };

    var matched = false;
    index = first;
    while (index < end) {
        if (index + 2 < end and pattern[index + 1] == '-') {
            matched = matched or (pattern[index] <= value and value <= pattern[index + 2]);
            index += 3;
        } else {
            matched = matched or pattern[index] == value;
            index += 1;
        }
    }

    return .{ .matched = matched != negated, .length = end + 1 };
}
