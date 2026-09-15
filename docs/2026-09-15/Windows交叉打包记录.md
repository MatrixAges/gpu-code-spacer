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
- 云端 Linux 交叉编译及 Windows 原生执行结果待补充。

## 自我审查

- 新增 glob 实现只用于 Windows，不替换 Unix 上已使用的 libc 匹配器。
- GGUF 仍由宿主导出工具生成，不尝试在 Linux 执行 Windows 导出器。
- 编译成功不代表 Windows 实际可用，验收包含 Windows 原生启动、模型初始化及真实文件选择。
