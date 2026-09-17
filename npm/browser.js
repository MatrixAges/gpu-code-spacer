import { fetchWasm, loadRuntime } from './runtime.js';
import { createGpuFormatter } from './webgpu.js';

export async function createSpacer({ wasm = new URL('./spacer.wasm', import.meta.url) } = {}) {
  if (typeof wasm === 'string' || wasm instanceof URL) wasm = await fetchWasm(wasm);

  const runtime = await loadRuntime(wasm);

  return createGpuFormatter(runtime);
}
