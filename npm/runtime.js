const encoder = new TextEncoder();
const decoder = new TextDecoder();
const maxBytes = 4 * 1024 * 1024;

export async function loadRuntime(bytes) {
  const loaded = await WebAssembly.instantiate(bytes, {});
  const wasm = (loaded instanceof WebAssembly.Instance ? loaded : loaded.instance).exports;
  const outputText = () => decoder.decode(new Uint8Array(wasm.memory.buffer, wasm.output_pointer(), wasm.output_length()));

  function check(status) {
    if (status !== 0) throw new Error(`Unable to format source: ${outputText()}`);
  }

  check(wasm.initialize());

  return {
    wasm,
    check,
    result() {
      return { text: outputText(), changes: wasm.changes(), candidates: wasm.candidates() };
    },
    async withInput(source, confidence, operation) {
      if (typeof source !== 'string') throw new TypeError('Source must be a string.');
      if (!source.isWellFormed()) throw new TypeError('Source contains an unpaired UTF-16 surrogate.');
      if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
        throw new RangeError('Confidence must be between 0 and 1.');
      }
      if (source.length > maxBytes) throw new RangeError('Source exceeds the 4 MiB limit.');

      const input = encoder.encode(source);
      if (input.byteLength > maxBytes) throw new RangeError('Source exceeds the 4 MiB limit.');

      const pointer = wasm.allocate(input.byteLength);
      if (!pointer) throw new Error('Unable to allocate WebAssembly memory.');

      try {
        new Uint8Array(wasm.memory.buffer, pointer, input.byteLength).set(input);
        return await operation(pointer, input.byteLength, confidence);
      } finally {
        wasm.reset();
        wasm.release(pointer, input.byteLength);
      }
    },
  };
}

export function createFormatter(runtime, backend, operation, release = () => {}) {
  let queue = Promise.resolve();
  let closing;

  return {
    get backend() { return backend; },

    async format(source, { confidence = runtime.wasm.default_confidence() } = {}) {
      if (closing) throw new Error('This spacer has been destroyed.');

      const result = queue.then(() => runtime.withInput(source, confidence, operation));
      queue = result.then(() => {}, () => {});
      return result;
    },

    destroy() {
      closing ??= queue.then(() => {
        release();
        runtime.wasm.reset();
      });
      return closing;
    },
  };
}

export async function fetchWasm(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load WebAssembly (${response.status}).`);

  return response.arrayBuffer();
}
