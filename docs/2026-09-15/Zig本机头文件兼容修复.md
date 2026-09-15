# Zig 本机头文件兼容修复

## Intent：最终目标

修复本机 Zig 0.16 构建 libc++ 时的 `INFINITY` 未定义错误，使项目原有构建命令恢复工作。

## Data：可用证据

- Zig：`/Users/xiewendao/.homebrew/Cellar/zig/0.16.0_1`，版本 0.16.0。
- `--verbose-cc` 确认编译 libc++ 使用 macOS 27 SDK、Zig 自带 `float.h`、严格 C++23 模式。
- macOS 27 SDK 的 `math.h` 在 modules 条件下设置 `__need_infinity_nan` 并包含 `float.h`，由后者提供 `INFINITY` 和 `NAN`。
- Zig 自带 `float.h` 不处理该请求；严格 C++ 模式也不满足它原有的宏定义条件。
- Xcode 自带 Clang 21 与 [LLVM 上游 float.h](https://raw.githubusercontent.com/llvm/llvm-project/main/clang/lib/Headers/float.h) 已处理该协议。
- 指定旧 SDK 的探索遇到 framework 路径缺失，没有继续扩大 SDK 配置修改。

## Edges：边界与限制

- 只修改本机 Zig 头文件，保留原件供回滚，不修改 Apple SDK 或全局开发工具选择。
- 不修改项目业务逻辑，不引入编译器包装器，不新增测试用例。
- Homebrew 重装或升级 Zig 可能覆盖本地补丁，届时先验证新版是否已修复。
- 验收使用原有构建与验证工具。

## Answer：交付格式与成功标准

按 LLVM 的请求宏协议补充本机 `float.h`，不改变普通包含行为。原有构建成功，新二进制可运行，已有保护与样式评估完成。

### 架构图

```mermaid
flowchart LR
    A[项目 Zig 构建] --> B[Zig 内置 Clang 与 libc++]
    B --> C[macOS 27 math.h]
    C --> D[Zig float.h 兼容处理]
    D --> E[编译器内建无穷大与 NaN]
```

### 数据流图

```mermaid
flowchart LR
    A[math.h 设置请求宏] --> B[包含 float.h]
    B --> C[响应请求并定义 INFINITY 和 NAN]
    C --> D[清除请求宏]
    D --> E[libc++ 编译成功]
```

## 执行记录

- 原件备份：`/Users/xiewendao/.local/state/zig-compat/0.16.0_1/float.h.original`。
- 修复文件：`/Users/xiewendao/.homebrew/Cellar/zig/0.16.0_1/lib/zig/include/float.h`。
- 在原有包含保护之外处理 `__need_infinity_nan`，用编译器内建函数定义 `INFINITY` 与 `NAN` 并清除请求宏。置于保护之外，是为了兼容此前已包含过 `float.h` 的情况。
- 头文件初始权限为 0444；修改时临时启用所有者写权限，完成后恢复 0444。
- `zig build -Doptimize=ReleaseSmall`：通过，日志 `/tmp/gcs-libcxx-fixed-build.log`。
- `zig-out/bin/gcs --model-info`：运行成功，Metal 后端 `MTL0`，设备 Apple M5，无回退。
- `zig build verify-guards`：20 类保护、60 个变体通过。
- `zig build evaluate-style -- zig-out/bin/gcs /tmp/gcs-libcxx-style`：214/214 样式断言通过，36 次非空行内容保留与幂等检查通过；该集合没有结构断言（0/0）。报告在 `/tmp/gcs-libcxx-style/report.json`。
- 通过原有工具完成验证，没有生成新的测试用例。

### 回滚

以下命令恢复原始头文件及其权限；恢复后当前 SDK 下的原始错误也可能重现。

```sh
chmod u+w /Users/xiewendao/.homebrew/Cellar/zig/0.16.0_1/lib/zig/include/float.h

cp -p /Users/xiewendao/.local/state/zig-compat/0.16.0_1/float.h.original \
  /Users/xiewendao/.homebrew/Cellar/zig/0.16.0_1/lib/zig/include/float.h
```

## 自我批判

本地补丁是针对旧工具链与新 SDK 协议不兼容的兼容修复，不代表整个 Zig 0.16 与 macOS 27 组合已被完整验证。保留回滚路径，后续以修复该协议的官方工具链替换本地补丁。
