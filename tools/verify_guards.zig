const std = @import("std");
const core = @import("core");

const cases = [_]struct { name: []const u8, literal: []const u8 }{
    .{ .name = "triple-double", .literal = "value = \"\"\"first\n\nlast\"\"\"\n" },
    .{ .name = "triple-single", .literal = "value = '''first\n\nlast'''\n" },
    .{ .name = "backtick", .literal = "value = `first\n\nlast`\n" },
    .{ .name = "raw-hashes", .literal = "value = r##\"first \" text\n\nlast\"##;\n" },
    .{ .name = "raw-delimiter", .literal = "value = R\"tag(first \" text\n\nlast)tag\";\n" },
    .{ .name = "long-brackets", .literal = "value = [=[first\n\nlast]=]\n" },
    .{ .name = "dollar-quoted", .literal = "value = $body$first\n\nlast$body$;\n" },
    .{ .name = "heredoc", .literal = "cat <<'END'\nfirst\n\nlast\nEND\n" },
    .{ .name = "block-comment", .literal = "/* first\n\nlast */\n" },
    .{ .name = "nested-comment", .literal = "{- first {- inner -}\n\nlast -}\n" },
    .{ .name = "parenthesized-comment", .literal = "(* first\n\nlast *)\n" },
    .{ .name = "line-delimited-comment", .literal = "=begin\nfirst\n\nlast\n=end\n" },
    .{ .name = "macro-token-body", .literal = "expand! {\nfirst\n\nlast\n}\n" },
    .{ .name = "indented-scalar", .literal = "key: |\n  first\n\n  last\n" },
    .{ .name = "line-literal", .literal = "\\\\first\n\n\\\\last\n" },
    .{ .name = "long-comment", .literal = "--[=[first\n\nlast]=]\n" },
    .{ .name = "comma-multiline-string", .literal = "call(first, 'line one\n\nline two')\n" },
    .{ .name = "regex-quote", .literal = "const pattern = /['\"#]/g;\n" },
    .{ .name = "paired-text", .literal = "value = %q{first (nested)\n\nlast}\n" },
    .{ .name = "paired-regex", .literal = "value = %r{first #{nested}\n\nlast}\n" },
};

fn verifyTokens(source: []const u8) !void {
    var iterator: core.tokenizer.Iterator = .{ .source = source };
    var offset: usize = 0;
    while (iterator.next()) |token| {
        if (token.start != offset or token.end <= token.start) return error.NonContiguousTokens;
        offset = token.end;
    }
    if (offset != source.len) return error.TokenBytesLost;
}

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    var variants: usize = 0;

    for (cases) |case| {
        const source = try std.mem.concat(allocator, u8, &.{ "prepare()\nvalidate()\n", case.literal, "finish()\nreturn result\n" });
        try verifyTokens(source);
        const document = try core.layout.analyze(allocator, source);
        if (document.unterminated_region) {
            std.log.err("unclosed guard: {s}", .{case.name});
            return error.GuardDidNotClose;
        }
        if (document.boundaries.len < 2) return error.AllBoundariesSuppressed;
        const labels = try allocator.alloc(u8, document.boundaries.len);

        for ([_]u8{ 0, 1, 2 }) |label| {
            @memset(labels, label);
            const modified = try core.layout.render(allocator, source, document, labels);
            if (std.mem.find(u8, modified, case.literal) == null) {
                std.log.err("literal modified: {s}", .{case.name});
                return error.ProtectedBytesChanged;
            }

            const next_document = try core.layout.analyze(allocator, modified);
            if (next_document.boundaries.len != document.boundaries.len) return error.CandidateIdentityChanged;
            for (document.boundaries, next_document.boundaries) |before, after| {
                const first = core.features.encode(source, document, before);
                const second = core.features.encode(modified, next_document, after);
                if (!std.mem.eql(f32, &first, &second)) return error.LayoutLeakedIntoFeatures;
            }
            variants += 1;
        }
    }

    try verifyTokens("const 名字 = '🍃';\r\n\r\nΔelta(42)\n");
    try verifyTokens("");
    try verifyTokens("\t\r\n   \n");
    const tail_source = "prepare()\nvalidate()\n__END__\nfirst\n\nlast\n";
    const tail_document = try core.layout.analyze(allocator, tail_source);
    const tail_labels = try allocator.alloc(u8, tail_document.boundaries.len);
    @memset(tail_labels, 2);
    const tail_output = try core.layout.render(allocator, tail_source, tail_document, tail_labels);
    if (std.mem.find(u8, tail_output, "__END__\nfirst\n\nlast\n") == null) return error.DataTailChanged;
    for ([_][]const u8{
        "def apply(*values)\n  first(values)\n  second(values)\nend\n",
        "def apply(*)\n  first()\n  second()\nend\n",
        "value = (*pointer)\nconsume(value)\nfinish()\n",
        "value = input << amount\nconsume(value)\nfinish()\n",
        "class << self\n  first()\n  second()\nend\n",
        "value = {-amount}\nconsume(value)\nfinish()\n",
    }) |source| {
        const document = try core.layout.analyze(allocator, source);
        if (document.unterminated_region or document.boundaries.len < 2) return error.OperatorMisclassifiedAsLiteral;
    }
    const report = try std.fmt.allocPrint(allocator, "{{\"guard_families\":{d},\"layout_variants\":{d},\"tokenizer_lossless\":true,\"features_layout_invariant\":true}}\n", .{ cases.len, variants });
    try std.Io.File.stdout().writeStreamingAll(init.io, report);
}
