const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const gpu_enabled = b.option(bool, "gpu", "Try ggml hardware GPU inference before CPU") orelse true;
    const gpu_options = b.addOptions();
    gpu_options.addOption(bool, "enabled", gpu_enabled);
    const ggml_version = b.createModule(.{ .root_source_file = b.path("tools/learning/ggml_version.zig") });
    const ggml = b.createModule(.{
        .root_source_file = b.path("src/ggml.zig"),
        .target = target,
        .optimize = optimize,
    });
    ggml.addImport("ggml_version", ggml_version);
    linkGgml(b, ggml);

    const model_module = b.createModule(.{ .root_source_file = b.path("src/model.zig") });
    const weights_module = b.createModule(.{ .root_source_file = b.path("src/weights.zig") });

    const trainer = b.addExecutable(.{
        .name = "train-probe",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/train_probe.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "model", .module = model_module },
                .{ .name = "weights", .module = weights_module },
            },
        }),
    });

    trainer.root_module.addImport("ggml", ggml);
    const train = b.addRunArtifact(trainer);
    const model = train.addOutputFileArg("probe.onnx");
    const reference = train.addOutputFileArg("reference.bin");
    const report = train.addOutputFileArg("training.json");
    const native_weights = train.addOutputFileArg("probe.weights");

    const training_step = b.step("train-probe", "Validate ggml gradients and train/export a synthetic ONNX model");
    for ([_]struct { path: std.Build.LazyPath, name: []const u8 }{
        .{ .path = model, .name = "probe/model.onnx" },
        .{ .path = reference, .name = "probe/reference.bin" },
        .{ .path = report, .name = "probe/training.json" },
        .{ .path = native_weights, .name = "probe/model.weights" },
    }) |output| {
        const install = b.addInstallFile(output.path, output.name);
        training_step.dependOn(&install.step);
    }

    const verifier = b.addExecutable(.{
        .name = "verify-probe",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/verify_probe.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "model", .module = model_module },
                .{ .name = "weights", .module = weights_module },
            },
        }),
    });
    verifier.root_module.addAnonymousImport("probe_weights", .{ .root_source_file = native_weights });
    verifier.root_module.addAnonymousImport("probe_reference", .{ .root_source_file = reference });

    const verify_step = b.step("verify-probe", "Verify the embedded model against independent input/output vectors");
    const verify = b.addRunArtifact(verifier);
    verify_step.dependOn(&verify.step);
    verify_step.dependOn(&b.addInstallArtifact(verifier, .{}).step);

    const collector = b.addExecutable(.{
        .name = "collect",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/collect.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    const collect = b.addRunArtifact(collector);
    if (b.args) |args| collect.addArgs(args);
    b.step("collect", "Lock GitHub sources and download/extract source archives").dependOn(&collect.step);

    const core = b.createModule(.{ .root_source_file = b.path("src/core.zig"), .target = target, .optimize = optimize });
    core.addOptions("gpu_options", gpu_options);
    core.addImport("ggml", ggml);
    const syntax = syntaxModule(b, target, optimize);
    const prepare = b.addExecutable(.{
        .name = "prepare",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/prepare.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{ .{ .name = "core", .module = core }, .{ .name = "syntax", .module = syntax } },
        }),
    });
    b.step("prepare", "Extract shared tokenizer features and isolate corpus splits").dependOn(&b.addRunArtifact(prepare).step);

    const sampler = b.addExecutable(.{
        .name = "sample",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/sample.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "core", .module = core }},
        }),
    });
    b.step("sample", "Materialize editable source samples without overwriting existing files").dependOn(&b.addRunArtifact(sampler).step);

    const inspector = b.addExecutable(.{
        .name = "inspect-layout",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/inspect_layout.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "core", .module = core }},
        }),
    });
    const inspection = b.addRunArtifact(inspector);
    if (b.args) |args| inspection.addArgs(args);
    b.step("inspect-layout", "Inspect structural inputs and model probabilities").dependOn(&inspection.step);

    const layout_trainer = b.addExecutable(.{
        .name = "train",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/train.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "core", .module = core }},
        }),
    });
    const train_layout = b.addRunArtifact(layout_trainer);
    layout_trainer.root_module.addImport("ggml", ggml);
    if (b.args) |args| train_layout.addArgs(args);
    b.step("train", "Train the shared classifier using development languages only").dependOn(&train_layout.step);

    const guard_verifier = b.addExecutable(.{
        .name = "verify-guards",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/verify_guards.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "core", .module = core }},
        }),
    });
    b.step("verify-guards", "Check literal preservation and layout-independent features").dependOn(&b.addRunArtifact(guard_verifier).step);

    const selected_model = b.option([]const u8, "model", "Model weights to embed") orelse "models/spacer.weights";
    const selected_config = b.option([]const u8, "model-config", "Calibration configuration to embed") orelse "models/config.zig";
    const application = b.addExecutable(.{
        .name = "gpu-code-spacer",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
            .strip = optimize != .Debug,
            .imports = &.{.{ .name = "core", .module = core }},
        }),
    });
    application.root_module.addAnonymousImport("layout_weights", .{ .root_source_file = inputFile(b, selected_model) });
    application.root_module.addAnonymousImport("model_config", .{ .root_source_file = inputFile(b, selected_config) });
    b.installArtifact(application);

    const evaluator = b.addExecutable(.{
        .name = "evaluate",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/evaluate.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{ .{ .name = "core", .module = core }, .{ .name = "syntax", .module = syntax } },
        }),
    });
    const evaluation = b.addRunArtifact(evaluator);
    if (b.args) |args| evaluation.addArgs(args);
    b.step("evaluate", "Build 20 held-out scenario sets and evaluate the frozen model").dependOn(&evaluation.step);
    const check_tools = b.step("check-tools", "Compile offline tools without running training or evaluation");
    check_tools.dependOn(&evaluator.step);
    check_tools.dependOn(&layout_trainer.step);

    const bootstrap = b.addExecutable(.{
        .name = "bootstrap",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/bootstrap.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    const bootstrap_run = b.addRunArtifact(bootstrap);
    if (b.args) |args| bootstrap_run.addArgs(args);
    b.step("bootstrap", "Fetch pinned parsers, style references, or build ggml (--ggml)").dependOn(&bootstrap_run.step);

    const selector = b.addExecutable(.{
        .name = "select-model",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/select_model.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "core", .module = core }},
        }),
    });
    const selection = b.addRunArtifact(selector);
    if (b.args) |args| selection.addArgs(args);
    b.step("select-model", "Freeze model and confidence using validation data only").dependOn(&selection.step);

    const gpu_verifier = b.addExecutable(.{
        .name = "verify-gpu",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/verify_gpu.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "core", .module = core }},
        }),
    });
    check_tools.dependOn(&gpu_verifier.step);
    b.step("verify-gpu", "Verify ggml GPU or explicit CPU inference using synthetic data").dependOn(&b.addRunArtifact(gpu_verifier).step);

    const transfer = b.addExecutable(.{
        .name = "evaluate-transfer",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/evaluate_transfer.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "core", .module = core }},
        }),
    });
    const transfer_run = b.addRunArtifact(transfer);
    check_tools.dependOn(&transfer.step);
    if (b.args) |args| transfer_run.addArgs(args);
    b.step("evaluate-transfer", "Evaluate an explicitly language-held-out model").dependOn(&transfer_run.step);

    const style_evaluator = b.addExecutable(.{
        .name = "evaluate-style",
        .root_module = b.createModule(.{
            .root_source_file = b.path("tools/evaluate_style.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "core", .module = core }},
        }),
    });
    const style_evaluation = b.addRunArtifact(style_evaluator);
    if (b.args) |args| style_evaluation.addArgs(args);
    b.step("evaluate-style", "Check frozen personal-style requirements against a compiled binary").dependOn(&style_evaluation.step);
}

fn inputFile(b: *std.Build, path: []const u8) std.Build.LazyPath {
    return if (std.fs.path.isAbsolute(path)) .{ .cwd_relative = path } else b.path(path);
}

fn linkGgml(b: *std.Build, module: *std.Build.Module) void {
    module.addIncludePath(b.path(".deps/ggml-install/include"));
    module.link_libc = true;
    module.link_libcpp = true;
    for ([_][]const u8{ "ggml", "ggml-cpu", "ggml-base" }) |library| {
        module.addObjectFile(b.path(b.fmt(".deps/ggml-install/lib/lib{s}.a", .{library})));
    }
    if (module.resolved_target.?.result.os.tag == .macos) {
        module.addObjectFile(b.path(".deps/ggml-install/lib/libggml-metal.a"));
        for ([_][]const u8{ "Foundation", "Metal", "MetalKit", "Accelerate" }) |framework| module.linkFramework(framework, .{});
    } else if (module.resolved_target.?.result.os.tag == .linux) {
        for ([_][]const u8{ "m", "dl", "pthread" }) |library| module.linkSystemLibrary(library, .{});
    }
}

fn syntaxModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode) *std.Build.Module {
    const module = b.createModule(.{
        .root_source_file = b.path("tools/syntax.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });
    module.addIncludePath(b.path(".deps/tree-sitter/lib/include"));
    module.addIncludePath(b.path(".deps/tree-sitter/lib/src"));
    module.addCSourceFile(.{ .file = b.path(".deps/tree-sitter/lib/src/lib.c"), .flags = &.{ "-std=c11", "-D_POSIX_C_SOURCE=200809L" } });

    const grammars = [_]struct { directory: []const u8, scanner: bool }{
        .{ .directory = ".deps/tree-sitter-typescript/typescript/src", .scanner = true },
        .{ .directory = ".deps/tree-sitter-javascript/src", .scanner = true },
        .{ .directory = ".deps/tree-sitter-python/src", .scanner = true },
        .{ .directory = ".deps/tree-sitter-java/src", .scanner = false },
        .{ .directory = ".deps/tree-sitter-rust/src", .scanner = true },
        .{ .directory = ".deps/tree-sitter-zig/src", .scanner = false },
    };
    for (grammars) |grammar| {
        module.addIncludePath(b.path(grammar.directory));
        module.addCSourceFile(.{ .file = b.path(b.pathJoin(&.{ grammar.directory, "parser.c" })), .flags = &.{"-std=c11"} });
        if (grammar.scanner) module.addCSourceFile(.{ .file = b.path(b.pathJoin(&.{ grammar.directory, "scanner.c" })), .flags = &.{"-std=c11"} });
    }
    return module;
}
