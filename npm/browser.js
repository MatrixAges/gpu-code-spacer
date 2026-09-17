import { fetchWasm, instantiate } from './runtime.js';

export async function createSpacer({ wasm = new URL('./spacer.wasm', import.meta.url) } = {}) {
  if (typeof wasm === 'string' || wasm instanceof URL) wasm = await fetchWasm(wasm);

  return instantiate(wasm);
}
