import { execFileSync } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

execFileSync('zig', ['build', '-Dwasm=true'], { cwd: root, stdio: 'inherit' });
await mkdir(new URL('dist/', root), { recursive: true });

for (const name of ['index.js', 'browser.js', 'runtime.js', 'webgpu.js', 'shader.js', 'node-gpu.js', 'node-worker.js', 'index.d.ts']) {
  await copyFile(new URL(`npm/${name}`, root), new URL(`dist/${name}`, root));
}

await copyFile(new URL('zig-out/bin/spacer.wasm', root), new URL('dist/spacer.wasm', root));
