import { Worker } from 'node:worker_threads';

export async function createNodeGpu(wasm) {
  const worker = new Worker(new URL('./node-worker.js', import.meta.url), {
    workerData: wasm,
    // --input-type only applies to eval/stdin, not this file-backed worker.
    execArgv: process.execArgv.filter((value, index, args) =>
      !value.startsWith('--input-type') && args[index - 1] !== '--input-type'),
  });

  const pending = new Map();
  let sequence = 0;
  let failure;
  let closing;

  function fail(error) {
    failure = error;

    for (const { reject } of pending.values()) reject(error);

    pending.clear();
    worker.unref();
  }

  worker.on('error', fail);
  worker.on('exit', code => fail(new Error(`GPU worker exited (${code}).`)));

  worker.on('message', ({ id, value, error }) => {
    const request = pending.get(id);

    if (!request) return;

    pending.delete(id);

    if (pending.size === 0) worker.unref();

    if (error) {
      request.reject(Object.assign(new Error(error.message), { name: error.name }));
    } else {
      request.resolve(value);
    }
  });

  function invoke(method, args = []) {
    if (failure) return Promise.reject(failure);

    return new Promise((resolve, reject) => {
      const id = sequence++;

      pending.set(id, { resolve, reject });
      worker.ref();

      try {
        worker.postMessage({ id, method, args });
      } catch (error) {
        pending.delete(id);

        if (pending.size === 0) worker.unref();

        reject(error);
      }
    });
  }

  try {
    await invoke('initialize');
  } catch (error) {
    await worker.terminate();

    throw error;
  }

  return {
    backend: 'webgpu',
    format(source, options) {
      if (closing) return Promise.reject(new Error('This spacer has been destroyed.'));

      return invoke('format', [source, options]);
    },
    destroy() {
      closing ??= invoke('destroy').finally(() => worker.terminate());

      return closing;
    },
  };
}
