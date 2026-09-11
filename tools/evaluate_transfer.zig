const std = @import("std");
const core = @import("core");
const data = @import("data.zig");
const metrics = @import("metrics.zig");
const Model = core.classifier.Model;

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    if (args.len != 3 or !std.mem.endsWith(u8, args[1], ".weights")) return error.ExpectedWeightsAndHeldoutLanguage;
    const language = try data.languageIndex(args[2]);
    const report_path = try std.fmt.allocPrint(allocator, "{s}.json", .{args[1][0 .. args[1].len - 8]});
    const report_bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, report_path, allocator, .limited(1024 * 1024));
    const training_report = try std.json.parseFromSlice(struct { heldout_language: ?[]const u8, test_data_used: bool, feature_version: u32 }, allocator, report_bytes, .{ .ignore_unknown_fields = true });
    if (training_report.value.heldout_language == null or !std.mem.eql(u8, training_report.value.heldout_language.?, args[2]) or training_report.value.test_data_used or training_report.value.feature_version != core.features.version) return error.InvalidLanguageHoldoutReport;

    const bytes = try std.Io.Dir.cwd().readFileAlloc(init.io, args[1], allocator, .limited(1024 * 1024));
    const model = try core.weights.decode(Model, bytes, core.features.version);
    var runner = try core.inference.Runner.init(&model);
    defer runner.deinit();
    const rows = try data.load(allocator, init.io, "data/processed/test.bin");
    const inputs = try allocator.alloc(Model.Input, core.inference.batch_capacity);
    const outputs = try allocator.alloc(Model.Output, core.inference.batch_capacity);
    const labels = try allocator.alloc(u8, core.inference.batch_capacity);
    var accumulated: metrics.Metrics = .{};
    var count: usize = 0;

    for (rows, 0..) |row, i| {
        if (row.language_id == language) {
            inputs[count] = row.input;
            labels[count] = row.label;
            count += 1;
        }
        if (count > 0 and (count == inputs.len or i + 1 == rows.len)) {
            try runner.compute(inputs[0..count], outputs[0..count]);
            for (outputs[0..count], labels[0..count]) |output, label| accumulated.add(label, Model.classify(output));
            count = 0;
        }
    }
    if (accumulated.count == 0) return error.NoHeldoutSamples;

    const report = try std.json.Stringify.valueAlloc(allocator, .{
        .experiment = "leave-one-language-out",
        .heldout_language = args[2],
        .model = args[1],
        .scope = "language excluded from gradient updates and validation selection; scored on independent project",
        .metrics = accumulated.summary(),
        .backend = runner.backendName(),
        .device = runner.deviceName(),
        .gpu_batches = runner.gpu_batches,
        .cpu_batches = runner.cpu_batches,
    }, .{ .whitespace = .indent_2 });
    try std.Io.Dir.cwd().createDirPath(init.io, "runs");
    const path = try std.fmt.allocPrint(allocator, "runs/transfer-{s}.json", .{args[2]});
    try std.Io.Dir.cwd().writeFile(init.io, .{ .sub_path = path, .data = report });
    try std.Io.File.stdout().writeStreamingAll(init.io, report);
    try std.Io.File.stdout().writeStreamingAll(init.io, "\n");
}
