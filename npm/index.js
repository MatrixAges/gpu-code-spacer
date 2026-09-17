import { readFile } from 'node:fs/promises';
import { fetchWasm, instantiate } from './runtime.js';

export async function createSpacer({ wasm = new URL('./spacer.wasm', import.meta.url) } = {}) {
  if (typeof wasm === 'string') wasm = new URL(wasm, import.meta.url);
  if (wasm instanceof URL) {
    wasm = wasm.protocol === 'file:' ? await readFile(wasm) : await fetchWasm(wasm);
  }

  return instantiate(wasm);
}
