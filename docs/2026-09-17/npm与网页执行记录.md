# npm 与网页执行记录

## Intent：最终目标

交付可由维护者发布的 npm 包，以及支持编辑、多语言源码演示和固定深色主题的 Web 版本。网页高亮遵循用户最新指定的 gpu-lexer，GitHub Pages 通过 Actions 构建部署。

## Data：实现与证据

### 核心和 npm

- 新增 `src/wasm.zig`，复用原有空行分析、特征、权重校验、模型分类及渲染代码。
- `engine.apply` 接收结构化 runner，解除对 ggml 的编译依赖；原生 runner 保持原路径。
- 修复三处特征数组索引的 32 位编译问题：对已取模的 u64 数值显式转换为 usize，不改变哈希和特征值。
- `zig build -Dwasm=true` 生成 freestanding WebAssembly，无 WASI、文件系统或其它导入。
- npm 提供 `createSpacer()`、同步 `format()`、类型声明、Node 和浏览器条件入口、自定义 WASM URL/字节/Module 加载。
- 输入按 UTF-8 字节限制为 4 MiB，拒绝非完整 Unicode 和无效 confidence。
- 包中只有 dist、README、LICENSE 和 package.json；无运行时 npm 依赖，无安装时构建脚本。
- npm 版本为 0.1.3，与原生版本目前一致，但之后独立维护，不修改现有原生自动发布逻辑。

### 页面

- 参考站的等宽排版、留白、虚线边框，转成固定深色和柔和绿色强调；无主题切换。
- 左侧 textarea 覆盖高亮层，保留原生编辑、选择和滚动能力；右侧只读输出与复制。
- 推理和 gpu-lexer 解析在 Worker 中串行运行，输入防抖，使用请求序号拒绝旧结果。
- gpu-lexer 使用 npm 0.0.3 发布包的 `parse(code)`，不传语言参数。结果是 UTF-16 范围，通过 textContent 渲染，不将源码插入 HTML。
- 高亮失败时明确显示错误及 WebGPU 要求，仍展示 WASM 整理结果；没有引入其它高亮引擎。
- demo 限制 256 KiB，npm 库限制 4 MiB；页面时长只统计空行整理，不含高亮。
- 所有资源本地打包，代码输入不发往服务器；跨域链接仅是可点击的源码与仓库引用。
- gpu-lexer 与 Geist Mono 的完整许可放入网页 THIRD_PARTY_NOTICES.txt。

### Live demos

全部为仓库现有语料的上游完整文件，未裁切、未拼接、未补行。源码、固定提交链接、许可证和 Requests NOTICE 随网页一起发布。

| 语言 | 来源 | 文件 | 原文行数 | 整理边界变化数 | 与原生结果一致 |
| --- | --- | --- | ---: | ---: | --- |
| TypeScript | Vite | env.ts | 127 | 10 | 是 |
| JavaScript | Express | view.js | 205 | 14 | 是 |
| Python | Requests | structures.py | 130 | 9 | 是 |
| Java | Guava | CaseFormat.java | 221 | 23 | 是 |
| Rust | ripgrep | haystack.rs | 160 | 10 | 是 |
| Zig | Zig std | InstallArtifact.zig | 205 | 25 | 是 |

六份输入均验证非空行内容保持和再次格式化幂等。它们属于已有训练语料，因此这些结果仅证明端口一致性，不是独立泛化基准。

### 构建与打包检查

- `zig build -Doptimize=ReleaseSmall`：通过，原生编译保留。
- `zig build -Dwasm=true`：通过，WASM 导入列表为空。
- `npm ci` 后执行 `npm run build:web`：通过，包含 TypeScript 严格检查和 Vite 生产构建。
- `npm pack --dry-run` 及实际 `npm pack`：通过，8 个包文件，压缩后约 71.3 KB。
- 在临时目录解包，使用 Node 默认入口、浏览器字节入口及编译 Module 入口运行已有 env.ts：三者结果一致。
- 在 Node 中加载真实生产 Worker bundle，提供本地文件 fetch；无 WebGPU 时返回整理成功、10 个变化、明确的 `WebGPU unavailable` 高亮错误。
- `git diff --check`、`zig fmt --check`：通过。
- 没有新增测试文件或测试用例，没有调用浏览器进行 UI 验收。

生产核心资产大小：

| 资产 | 大小 |
| --- | ---: |
| 含模型的 spacer.wasm | 87,595 bytes（约 85.5 KiB） |
| Worker（含 gpu-lexer） | 约 61.4 KB |
| 页面 JS | 约 6.1 KB |
| CSS | 约 7.9 KB |
| Geist Mono Latin 字体 | 约 23.1 KB |

### 发布支持

- `.github/workflows/web.yml`：master push/手动构建部署，PR 仅构建；输出 web-dist，配置相对资源 URL 适配项目子目录。
- `.github/workflows/npm.yml`：仅 master 上手动触发；支持 NPM_TOKEN 或 npm trusted publishing，附带 provenance。
- README 包含本地运行、API、打包、版本、npm 发布和 Pages 设置说明。

## Edges：边界与限制

- 用户明确表示 npm 由自己发布，本次未执行 npm publish。
- 未提交或推送当前工作区，也未改远程 Pages 设置或触发部署。查询时此仓库尚未配置 Pages。
- Pages 首次使用需在 Settings → Pages 选择 GitHub Actions，并将本次修改推送到 master。
- 未执行浏览器视觉、光标对齐或真实 WebGPU 设备验收。GPU 着色行为来自已安装库的接口与生产构建验证，不能宣称已完成设备验证。
- 标量推理与 ggml 累加顺序可能存在浮点边界差异，六份样例一致不代表所有输入逐位等价。
- Node 中复用生产 Worker 的检查只覆盖资源加载、消息格式和无 GPU 错误路径，不等价于浏览器验收。
- 当前美化范围仍然是空行，不改变缩进、行内空格、代码内容或语法。

## Answer：交付与成功标准

- 已完成 npm 包源代码、WASM 编译、类型声明及发布工作流。
- 已完成可编译静态页面、双栏交互、gpu-lexer 高亮接入和六个至少 100 行示例。
- 已完成 GitHub Pages 构建部署工作流；实际远端发布待维护者操作。
- 可运行 `npm run dev` 查看，`npm run build:web` 生成 web-dist，`npm publish --access public` 发布 npm。

## 自我批判

1. 首轮按原需求接入了 Shiki，用户更新要求后已移除其代码、依赖和语言包。最终只使用 gpu-lexer，不保留两套路径。
2. 页面选择了原生 textarea 叠层，依赖较少，但比成熟编辑器少了多光标、自动缩进等能力。当前需求不需要这些功能，没有引入完整编辑器框架。
3. 首次 WASM 编译暴露了真实的 64 位假设。修复位于取模后的索引转换，避免用单独的 JS 格式化实现绕开核心行为。
4. 参考站使用不同主题，本次是遵循其排版语言的深色实现，不是像素级复刻；按用户约束未做浏览器视觉验证。
5. 本机编译与打包通过不能替代 GitHub Actions 和 npm 身份配置。交付时明确区分“支持发布”和“已经上线”。
