import { parentPort, workerData } from 'node:worker_threads';
import { loadRuntime } from './runtime.js';
import { createGpuFormatter } from './webgpu.js';

let formatter;
let gpu;

parentPort.on('message', async ({ id, method, args }) => {
  try {
    let value;

    if (method === 'initialize') {
      const { create, globals } = await import('webgpu');

      gpu = create([]);
      formatter = await createGpuFormatter(await loadRuntime(workerData), gpu, globals);
    } else if (method === 'format') {
      value = await formatter.format(...args);
    } else if (method === 'destroy') {
      await formatter.destroy();

      formatter = undefined;
      gpu = undefined;
    } else {
      throw new Error('Unknown GPU worker operation.');
    }

    parentPort.postMessage({ id, value });
  } catch (error) {
    parentPort.postMessage({ id, error: { name: error.name, message: error.message } });
  }
});
