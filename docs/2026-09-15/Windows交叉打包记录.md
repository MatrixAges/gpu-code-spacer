# Windows 交叉打包记录

## Intent：最终目标

Linux 生成 Windows x86_64 可执行文件和 GGUF 下载包，复用现有自动及手动触发入口。

## Data：实现证据

- `--ggml-windows` 使用 Zig Windows GNU C/C++ 目标和独立构建、安装目录。
- CMake 使用 Zig 自带归档工具，避免宿主工具不能正确归档 Windows COFF 对象。
- `-Dggml-prefix` 显式指定匹配目标的静态库路径，Windows 使用 CMake 生成的无 `lib` 前缀库名。
- Windows 匹配器替代不可用的 `fnmatch.h`，Unix 分支保持原实现。
- 构建矩阵增加 Linux runner 上的 Windows 交叉构建，Windows runner 仅下载并运行 ZIP 中的 EXE。

## Edges：边界与限制

- Windows 只包含 x86_64 CPU 后端。
- Windows glob 区分大小写，`?` 消费一个 UTF-8 字节，不支持 POSIX 命名字符类或盘符相对 glob。
- Windows 反斜杠是路径分隔符，字面量方括号通过 `[[]`、`[]]` 表示。
- 不新增测试用例；原生执行检查使用包内已有的配置文件，不生成针对性源码样例。

## Answer：验证结果

- 本地 macOS 成功交叉构建 Windows ggml 静态库和 `gcs.exe`，说明源码及链接层可以跨目标构建。
- `file` 确认为 `PE32+ executable (console) x86-64, for MS Windows`。
- actionlint、Zig 格式检查和 diff 空白检查通过。
- 本机后续 macOS 构建发生 Zig libc++ `INFINITY` 未定义错误，系统 Git 也遇到 Xcode 许可状态阻碍；未修改系统许可或工具链配置，仓库操作改用已安装的独立 Git。
- 同一提交的 GitHub macOS 和 Linux 原生构建、GGUF 导出、启动及上传均成功，因此没有把本机环境问题当成产品代码问题修补。
- [GitHub Actions 运行 34937943597](https://github.com/MatrixAges/gpu-code-spacer/actions/runs/34937943597)全部成功，验证提交为 `1f17a66`。
- Ubuntu runner 完成 Windows ggml、`gcs.exe`、GGUF 导出和 ZIP 打包，用时 8 分 12 秒。
- Windows Server 2022 下载该 ZIP，通过 SHA-256 校验、`--help`、`--model-info` 和包内配置文件的绝对路径 glob 格式化检查，用时 8 秒。
- 现有 macOS 打包用时 1 分 16 秒，Linux 打包用时 1 分 47 秒，均成功。
- 上传新增产物 `gcs-windows-x86_64`，现有两个平台及独立 GGUF 下载保持可用。
- 最后的验证记录和说明提交标记 `[skip ci]`，构建及运行代码与成功运行一致。

## 自我审查

- 新增 glob 实现只用于 Windows，不替换 Unix 上已使用的 libc 匹配器。
- GGUF 仍由宿主导出工具生成，不尝试在 Linux 执行 Windows 导出器。
- 编译成功不代表 Windows 实际可用，验收包含 Windows 原生启动、模型初始化及真实文件选择。
