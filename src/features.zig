const std = @import("std");
const layout = @import("layout.zig");
const tokenizer = @import("tokenizer.zig");
const roles = @import("roles.zig");

pub const version = 6;
pub const count = 192;
pub const Vector = [count]f32;

pub fn hash(bytes: []const u8) u64 {
    var value: u64 = 14695981039346656037;
    for (bytes) |byte| {
        value = (value ^ std.ascii.toLower(byte)) *% 1099511628211;
    }
    return value;
}

fn text(source: []const u8, document: layout.Document, index: usize) []const u8 {
    const line = document.lines[document.nonblank[index]];
    return std.mem.trim(u8, source[line.start..line.end], " \t\r");
}

fn firstWord(line: []const u8) []const u8 {
    var iterator: tokenizer.Iterator = .{ .source = line };
    while (iterator.next()) |token| {
        if (token.kind == .word) return token.text(line);
    }
    return "";
}

fn bag(line: []const u8, output: []f32, scale: f32) void {
    const excerpt = line[0..@min(line.len, 512)];
    var iterator: tokenizer.Iterator = .{ .source = excerpt };
    var tokens: f32 = 0;

    while (iterator.next()) |token| {
        if (token.kind == .whitespace or token.kind == .newline) continue;
        const value = hash(token.text(excerpt));
        output[value % output.len] += if ((value >> 32) & 1 == 0) scale else -scale;
        tokens += 1;
    }

    const denominator = @sqrt(@max(tokens, 1));
    for (output) |*value| value.* /= denominator;
}

fn bounded(value: usize, maximum: f32) f32 {
    return @min(@as(f32, @floatFromInt(value)), maximum) / maximum;
}

fn logarithm(value: usize) f32 {
    return @log2(1 + @as(f32, @floatFromInt(@min(value, 1024)))) / 10;
}

fn flag(value: bool) f32 {
    return if (value) 1 else 0;
}

/// No language, extension, repository, original blank count or byte offset is
/// encoded. Context is indexed by nonblank lines, so editing is idempotent.
pub fn encode(source: []const u8, document: layout.Document, boundary: layout.Boundary) Vector {
    var result: Vector = @splat(0);
    const previous = document.lines[document.nonblank[boundary.before]];
    const next = document.lines[document.nonblank[boundary.after]];
    const left = text(source, document, boundary.before);
    const right = text(source, document, boundary.after);

    result[0] = 1;
    result[1] = bounded(previous.indent, 32);
    result[2] = bounded(next.indent, 32);
    result[3] = std.math.clamp((@as(f32, @floatFromInt(next.indent)) - @as(f32, @floatFromInt(previous.indent))) / 16, -1, 1);
    result[4] = flag(previous.indent == next.indent);
    result[5] = std.math.clamp(@as(f32, @floatFromInt(previous.braces)) / 8, -1, 1);
    result[6] = std.math.clamp(@as(f32, @floatFromInt(previous.parentheses)) / 8, -1, 1);
    result[7] = std.math.clamp(@as(f32, @floatFromInt(previous.brackets)) / 8, -1, 1);
    result[8] = logarithm(left.len);
    result[9] = logarithm(right.len);
    result[10] = flag(left.len > 0 and std.mem.findScalar(u8, "})]", left[0]) != null);
    result[11] = flag(right.len > 0 and std.mem.findScalar(u8, "})]", right[0]) != null);
    result[12] = flag(std.mem.endsWith(u8, left, "{") or std.mem.endsWith(u8, left, ":"));
    result[13] = flag(std.mem.endsWith(u8, right, "{") or std.mem.endsWith(u8, right, ":"));
    result[14] = flag(std.mem.endsWith(u8, left, ";"));
    result[15] = flag(std.mem.endsWith(u8, right, ";"));
    result[16] = flag(previous.comment);
    result[17] = flag(next.comment);
    result[18] = flag(std.mem.eql(u8, firstWord(left), firstWord(right)));
    result[19] = flag(std.mem.findScalar(u8, left, '(') != null);
    result[20] = flag(std.mem.findScalar(u8, right, '(') != null);
    result[21] = flag(std.mem.findScalar(u8, left, '=') != null);
    result[22] = flag(std.mem.findScalar(u8, right, '=') != null);
    result[23] = flag(std.mem.endsWith(u8, left, ","));
    result[24] = flag(std.mem.endsWith(u8, right, ","));
    result[25] = flag(previous.indent == 0);
    result[26] = flag(next.indent == 0);
    result[27] = flag((std.mem.startsWith(u8, right, "@") and !std.mem.endsWith(u8, right, ";")) or std.mem.startsWith(u8, right, "#["));
    result[28] = flag(std.mem.findScalar(u8, left, ':') != null);
    result[29] = flag(std.mem.findScalar(u8, right, ':') != null);
    result[30] = flag(std.mem.endsWith(u8, left, "}"));
    result[31] = flag(std.mem.endsWith(u8, right, "}"));

    bag(left, result[32..64], 1);
    bag(right, result[64..96], 1);

    for (1..4) |distance| {
        if (boundary.before >= distance) {
            const context = firstWord(text(source, document, boundary.before - distance));
            result[96 + hash(context) % 16] += 1 / @as(f32, @floatFromInt(distance));
        }
        if (boundary.after + distance < document.nonblank.len) {
            const context = firstWord(text(source, document, boundary.after + distance));
            result[112 + hash(context) % 16] += 1 / @as(f32, @floatFromInt(distance));
        }
    }

    // Give structural roles their own channels instead of colliding with
    // identifiers in the token bags. Layout labels are still learned from
    // source examples; these channels never prescribe an output blank count.
    result[128 + @as(usize, @intFromEnum(roles.classify(left)))] = 1;
    result[136 + @as(usize, @intFromEnum(roles.classify(right)))] = 1;

    // Same-indent context can recover the head of a multiline construct.
    // Work in nonblank positions to keep the representation layout-invariant.
    var prior = boundary.before;
    while (prior > 0 and boundary.before - prior < 16) {
        prior -= 1;
        const line = document.lines[document.nonblank[prior]];
        if (line.indent < previous.indent) break;
        if (line.indent == previous.indent and !line.comment and !line.protected) {
            result[144 + @as(usize, @intFromEnum(roles.classify(text(source, document, prior))))] = 1;
            break;
        }
    }

    var following = boundary.after + 1;
    while (following < document.nonblank.len and following - boundary.after <= 16) : (following += 1) {
        const line = document.lines[document.nonblank[following]];
        if (line.indent < next.indent) break;
        if (line.indent == next.indent and !line.comment and !line.protected) {
            result[152 + @as(usize, @intFromEnum(roles.classify(text(source, document, following))))] = 1;
            break;
        }
    }

    const left_unit = document.units.ending[boundary.before];
    var right_position = boundary.after;
    while (right_position + 1 < document.nonblank.len and document.lines[document.nonblank[right_position]].comment) right_position += 1;
    const right_unit = document.units.starting[right_position];
    if (left_unit) |unit| {
        result[160 + @as(usize, @intFromEnum(unit.role))] = 1;
        result[176] = flag(unit.last > unit.first);
        result[181] = 1;
        result[184] = logarithm(unit.last - unit.first + 1);
    }
    if (right_unit) |unit| {
        result[168 + @as(usize, @intFromEnum(unit.role))] = 1;
        result[177] = flag(unit.last > unit.first);
        result[182] = 1;
        result[185] = logarithm(unit.last - unit.first + 1);
    }
    result[179] = flag(document.units.interior[right_position] or left_unit == null or right_unit == null);
    result[186] = flag(right_position != boundary.after);
    if (left_unit != null and right_unit != null) {
        const left_indent = document.lines[document.nonblank[left_unit.?.first]].indent;
        const right_indent = document.lines[document.nonblank[right_unit.?.first]].indent;
        result[180] = flag(left_unit.?.role == right_unit.?.role);
        result[183] = flag(left_indent == right_indent);
        result[178] = flag(left_indent == right_indent and !document.units.interior[right_position]);
    }

    return result;
}
