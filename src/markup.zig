const std = @import("std");

fn nameEnd(source: []const u8, start: usize) usize {
    if (start == source.len or !(std.ascii.isAlphabetic(source[start]) or source[start] == '_')) return start;

    var end = start + 1;
    while (end < source.len and (std.ascii.isAlphanumeric(source[end]) or std.mem.findScalar(u8, "_:-.$", source[end]) != null)) : (end += 1) {}

    return end;
}

fn skipSpace(source: []const u8, position: *usize) void {
    while (position.* < source.len and std.ascii.isWhitespace(source[position.*])) : (position.* += 1) {}
}

fn quotedEnd(source: []const u8, start: usize, escapes: bool) ?usize {
    var i = start + 1;
    while (i < source.len) : (i += 1) {
        if (escapes and source[i] == '\\') {
            i += 1;
            continue;
        }
        if (source[i] == source[start]) return i + 1;
    }

    return null;
}

fn expressionEnd(source: []const u8, start: usize) ?usize {
    var depth: usize = 1;
    var i = start + 1;
    while (i < source.len) {
        if (std.mem.startsWith(u8, source[i..], "/*")) {
            const end = std.mem.indexOf(u8, source[i + 2 ..], "*/") orelse return null;
            i += end + 4;
            continue;
        }
        if (std.mem.startsWith(u8, source[i..], "//")) {
            i = std.mem.findScalarPos(u8, source, i, '\n') orelse return null;
            continue;
        }
        if (source[i] == '\'' or source[i] == '"' or source[i] == '`') {
            i = quotedEnd(source, i, true) orelse return null;
            continue;
        }

        if (source[i] == '{') depth += 1;
        if (source[i] == '}') {
            depth -= 1;
            if (depth == 0) return i + 1;
        }
        i += 1;
    }

    return null;
}

/// Recognize a complete tag before protecting it. Attribute assignments,
/// self-closing syntax or a matching closing tag distinguish it from generics.
pub fn tagEnd(source: []const u8) ?usize {
    if (source.len < 3 or source[0] != '<') return null;

    const closing = source[1] == '/';
    const start: usize = if (closing) 2 else 1;
    var i = nameEnd(source, start);
    if (i == start) return null;

    const name = source[start..i];
    var evidence = closing;
    while (i < source.len) {
        const before_space = i;
        skipSpace(source, &i);
        if (i == source.len) return null;

        if (std.mem.startsWith(u8, source[i..], "/>")) return if (closing) null else i + 2;
        if (source[i] == '>') {
            if (evidence) return i + 1;

            var search = i + 1;
            while (std.mem.indexOf(u8, source[search..], "</")) |relative| {
                const candidate = search + relative + 2;
                const end = nameEnd(source, candidate);
                if (std.mem.eql(u8, source[candidate..end], name)) {
                    var close = end;
                    skipSpace(source, &close);
                    if (close < source.len and source[close] == '>') return i + 1;
                }
                search = candidate;
            }
            return null;
        }
        if (closing or i == before_space) return null;

        if (source[i] == '{') {
            i = expressionEnd(source, i) orelse return null;
            continue;
        }

        const attribute_end = nameEnd(source, i);
        if (attribute_end == i) return null;
        i = attribute_end;

        var assignment = i;
        skipSpace(source, &assignment);
        if (assignment == source.len or source[assignment] != '=') continue;

        i = assignment + 1;
        skipSpace(source, &i);
        if (i == source.len) return null;

        i = switch (source[i]) {
            '\'', '"' => quotedEnd(source, i, false) orelse return null,
            '{' => expressionEnd(source, i) orelse return null,
            else => return null,
        };
        evidence = true;
    }

    return null;
}
