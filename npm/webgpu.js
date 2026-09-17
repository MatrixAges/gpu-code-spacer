import { modelShader } from './shader.js';
import { createFormatter } from './runtime.js';

export async function createGpuFormatter(runtime, gpu = globalThis.navigator?.gpu, constants = globalThis) {
  const compute = await createGpu(runtime.wasm, gpu, constants);

  return createFormatter(runtime, 'webgpu', async (pointer, length, confidence) => {
    const { wasm, check } = runtime;

    check(wasm.prepare(pointer, length, confidence));

    while (true) {
      const count = wasm.encode_batch();

      if (count === 0) break;

      await compute.compute(count);
      check(wasm.accept_batch());
    }

    check(wasm.finish());

    return runtime.result();
  }, compute.destroy);
}

async function createGpu(wasm, gpu, { GPUBufferUsage, GPUMapMode }) {
  if (!gpu) throw new Error('WebGPU is required. Use a supported browser over HTTPS or localhost.');

  const adapter = await gpu.requestAdapter();

  if (!adapter) throw new Error('No WebGPU adapter is available.');
  if (adapter.info.isFallbackAdapter) throw new Error('Only a software WebGPU adapter is available.');

  const device = await adapter.requestDevice();
  const buffers = [];
  let deviceFailure;

  void device.lost.then(info => {
    deviceFailure = new Error(`WebGPU device lost: ${info.message || info.reason}`);
  });

  function destroy() {
    for (const buffer of buffers) buffer.destroy();

    device.destroy();
  }

  function buffer(size, usage) {
    const value = device.createBuffer({ size, usage });

    buffers.push(value);

    return value;
  }

  async function checked(operation) {
    if (deviceFailure) throw deviceFailure;

    device.pushErrorScope('out-of-memory');
    device.pushErrorScope('validation');

    let value;
    let failure;

    try {
      value = await operation();
    } catch (error) {
      failure = error;
    }

    const validation = await device.popErrorScope();
    const allocation = await device.popErrorScope();

    if (failure) throw failure;
    if (deviceFailure) throw deviceFailure;
    if (validation || allocation) throw new Error(`WebGPU: ${(validation || allocation).message}`);

    return value;
  }

  try {
    const inputCount = wasm.input_count();
    const hiddenCount = wasm.hidden_count();
    const outputCount = wasm.output_count();
    const capacity = wasm.batch_capacity();
    let pipeline;
    let weights;
    let inputs;
    let outputs;
    let readback;
    let bindings;

    await checked(async () => {
      const module = device.createShaderModule({ code: modelShader(inputCount, hiddenCount, outputCount) });

      pipeline = await device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'main' } });
      weights = buffer(wasm.parameter_count() * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
      inputs = buffer(capacity * inputCount * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
      outputs = buffer(capacity * outputCount * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
      readback = buffer(capacity * outputCount * 4, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);

      device.queue.writeBuffer(weights, 0, new Float32Array(wasm.memory.buffer, wasm.model_pointer(), wasm.parameter_count()));

      bindings = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [weights, inputs, outputs].map((value, binding) => ({ binding, resource: { buffer: value } })),
      });
    });

    return {
      destroy,
      async compute(count) {
        if (!Number.isInteger(count) || count < 1 || count > capacity) throw new RangeError('Invalid GPU batch size.');

        await checked(async () => {
          const bytes = count * outputCount * 4;

          device.queue.writeBuffer(inputs, 0, new Float32Array(wasm.memory.buffer, wasm.input_pointer(), count * inputCount));

          const encoder = device.createCommandEncoder();
          const pass = encoder.beginComputePass();

          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindings);
          pass.dispatchWorkgroups(count);
          pass.end();
          encoder.copyBufferToBuffer(outputs, 0, readback, 0, bytes);
          device.queue.submit([encoder.finish()]);

          try {
            await readback.mapAsync(GPUMapMode.READ, 0, bytes);

            // Reacquire WASM memory after awaiting; memory.grow invalidates old views.
            new Float32Array(wasm.memory.buffer, wasm.logits_pointer(), count * outputCount)
              .set(new Float32Array(readback.getMappedRange(0, bytes)));
          } finally {
            if (readback.mapState === 'mapped') readback.unmap();
          }
        });
      },
    };
  } catch (error) {
    destroy();

    throw error;
  }
}
