# WebGPU 推理执行记录

## Intent：最终目标

修正此前 npm 浏览器入口使用 WASM CPU 模型推理的实现，使空行模型在浏览器通过 WebGPU 运行，并让落地页直接使用同一 npm 路径。本文取代初次 npm 与网页执行记录中的“浏览器 CPU 推理”描述。

## Data：实现与证据

### 共享处理逻辑

- `src/engine.zig` 提取 `Prepared`：输入验证、布局分析、批量特征、接收 logits、分类及渲染。
- 原生 `apply` 通过 Prepared 和既有 ggml runner 处理，原有模型与权重不变。
- 未闭合区域直接保守保留；零候选跳过计算；不完整推理禁止渲染。
- 整批 logits 有限性检查通过后才写入标签，非空行逐字节保真检查仍在统一渲染路径执行。

### WASM 和 WebGPU

- `src/wasm.zig` 增加 initialize、prepare、encode_batch、accept_batch、finish、reset 及模型/缓冲区访问接口。
- 批容量为 4096，特征内存约 3 MiB，不为整个输入生成庞大全量特征矩阵。
- `npm/shader.js` 生成 WGSL：192 → 64 ReLU → 3 logits，严格沿用 Zig 参数布局；一个边界对应一个 workgroup。
- `npm/webgpu.js` 初始化 GPUDevice、GPUComputePipeline 和可复用缓冲区，权重每实例上传一次。
- 每批实际调用 dispatchWorkgroups，经 mapAsync 回读 logits 后交回 WASM 分类与渲染。
- GPU 设备丢失、管线失败、验证错误及内存分配错误会报告；浏览器无 CPU 自动降级路径。
- `npm/runtime.js` 管理异步调用队列和 WASM 输入生命周期，保证同一实例不会交叉覆盖全局处理状态。
- `destroy()` 关闭新请求入口，等待已排队处理完成，释放 GPU 缓冲区、设备和临时 WASM 状态。
- Node 使用相同异步接口，但仍通过 WASM CPU 推理。`backend` 分别报告 webgpu / wasm。

### 网页和发布包

- Worker 改为 `await spacer.format(source)`，返回真实 backend；状态栏成功处理后显示 `Spacing · WebGPU`。
- 更新页面 API 示例、架构说明、初始化错误提示和 README。
- TypeScript 声明统一为 `Promise<FormatResult>`，新增 backend 与 destroy。
- 打包脚本包含 shader.js、webgpu.js；发布包没有新增运行时依赖或安装脚本。

### 参考与执行环境

参考的是 gpu-lexer 的 WebGPU 初始化、资源复用和异步回读方式，没有复制其模型或将它当作空行模型：

- https://github.com/vercel-labs/gpu-lexer
- https://github.com/vercel-labs/gpu-lexer/blob/main/packages/core/src/gpu.js

为遵循“不调用浏览器 UI 验收”的要求，在 `/tmp/gcs-webgpu-runtime` 安装 Dawn 的 Node 绑定 webgpu@0.6.1，仅作为本机执行工具，不进入项目依赖或 npm 包。Dawn 官方说明：https://dawn.googlesource.com/dawn/+/refs/heads/main/src/dawn/node/README.md 。

实际适配器为 Apple M5，Metal driver on macOS Version 27.0 (Build 26A428)，isFallbackAdapter=false，是真实硬件而非模拟 WebGPU 或 CPU 软件后端。

### 验证结果

| 验证项 | 结果 |
| --- | --- |
| Zig 原生 ReleaseSmall 构建 | 通过 |
| Zig WASM 构建 | 通过 |
| 既有 verify-guards | 20 类保护区域、60 个布局变体通过 |
| TypeScript 严格检查与 Vite 生产构建 | 通过 |
| 12 份现有 demo 的 WebGPU / WASM CPU / 原生输出比较 | 全部一致 |
| 1,610,629 bytes 的既有 Sema.zig | 31,988 个候选，8 次 GPU dispatch，结果与 CPU 一致 |
| 8 批次大小 | 4096 × 7 + 3316 |
| 一个实例同时提交 12 个已有样例 | 队列执行，结果与 CPU 一致 |
| 无效 confidence 后继续调用 | 正确拒绝无效请求，后续正常执行 |
| destroy 在队列工作期间调用 | 等待所有已排队工作完成，后续新请求被拒绝 |
| 无 WebGPU 的浏览器入口 | 明确初始化失败，没有 CPU 回退 |
| 解压真实 npm tarball 后运行上述接口 | 通过 |
| 生产 Worker bundle + 实际 GPU + gpu-lexer | backend=webgpu，32 个空行调整，前后 700 / 738 个高亮片段，无高亮错误 |
| git diff --check、zig fmt --check | 通过 |

WASM 大小为约 89.2 KB，生产 Worker（含 gpu-lexer）约 65.0 KB，npm 包为 10 个文件、压缩后约 74.9 KB。样例运行时间没有作为性能承诺或跨实现速度基准。

## Edges：边界与限制

- 本次没有浏览器 UI 验收、没有新增测试用例文件；运行验证使用现有源码、既有 guard 检查和临时命令。
- 已验证真实 Metal WebGPU 后端，不代表所有浏览器/驱动上的着色器行为或性能均已验证。
- GPU 和 CPU 的浮点累加可能在分类临界值附近存在差异，现有样例一致不代表全输入逐位相同。
- WebGPU 只计算 MLP 网络，词法分析、特征编码、softmax/标签选择和渲染继续由 Zig/WASM 在 CPU 完成。
- API 从同步 format 变成统一异步 Promise；尚未发布 npm，使用示例与声明已同步。
- 未发布 npm、未提交/推送、未触发远端 Pages。

## Answer：交付与使用

```js
import { createSpacer } from 'gpu-code-spacer';

const spacer = await createSpacer();

try {
  const result = await spacer.format(source);
  console.log(spacer.backend, result.text);
} finally {
  await spacer.destroy();
}
```

浏览器成功初始化后 backend 为 webgpu；需要支持 WebGPU 的 HTTPS 页面或 localhost。Vite WASM URL 用法见 README。

## 自我批判

1. 此前只把高亮接入 GPU，空行模型仍是 CPU，未满足用户对浏览器 npm 包的预期。这次将模型计算本身迁移到 GPU，并以实际 dispatch 和硬件执行验证。
2. 为避免两套空行算法分叉，修改的是引擎处理阶段，而不是把分词、保护区或排版规则重写成 JavaScript。
3. 只做 f32 两层模型计算，不引入 f16、量化、通用图执行器或多后端自动回退，保持与现有权重和分类约定一致。
4. 异步计算需要资源生命周期与串行队列，这些用于保护 WASM 状态和 GPU 回读缓冲，未扩展成通用任务调度框架。
5. 构建成功不能证明 WebGPU 运行正确，因此进一步使用 Dawn 在真实 M5 上执行发布包及生产 Worker；仍明确区别该验证和浏览器 UI 验收。
