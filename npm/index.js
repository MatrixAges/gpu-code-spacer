import { readFile } from 'node:fs/promises';
import { createFormatter, fetchWasm, loadRuntime } from './runtime.js';
import { createNodeGpu } from './node-gpu.js';

export async function createSpacer({ wasm = new URL('./spacer.wasm', import.meta.url), backend = 'auto' } = {}) {
  if (!['auto', 'webgpu', 'wasm'].includes(backend)) throw new TypeError('Unknown spacer backend.');
  if (typeof wasm === 'string') wasm = new URL(wasm, import.meta.url);

  if (wasm instanceof URL) {
    wasm = wasm.protocol === 'file:' ? await readFile(wasm) : await fetchWasm(wasm);
  }

  let fallbackReason;

  if (backend !== 'wasm') {
    try {
      return await createNodeGpu(wasm);
    } catch (error) {
      if (backend === 'webgpu') throw error;

      fallbackReason = error.message;
    }
  }

  const runtime = await loadRuntime(wasm);

  const formatter = createFormatter(runtime, 'wasm', (pointer, length, confidence) => {
    runtime.check(runtime.wasm.format(pointer, length, confidence));

    return runtime.result();
  });

  return Object.assign(formatter, { fallbackReason });
}
