import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createSerializer } from '@jlarky/gha-ts/render';
import { validateWorkflow } from '@jlarky/gha-ts/workflow-types';
import { stringify } from 'yaml';

const source = new URL('../.github/tsflows/', import.meta.url);
const check = process.argv.includes('--check');

for (const name of (await readdir(source)).filter(name => name.endsWith('.ts')).sort()) {
  const { default: definition } = await import(new URL(name, source));
  const serializer = createSerializer(validateWorkflow(definition), value => stringify(value, { lineWidth: 0 }));
  const output = new URL(`../.github/workflows/${name.replace(/\.ts$/, '.generated.yml')}`, import.meta.url);

  if (check) {
    if (await readFile(output, 'utf8') !== serializer.stringifyWorkflow()) {
      throw new Error(`Regenerate ${name}: npm run build:workflows`);
    }
  } else {
    serializer.writeWorkflow(fileURLToPath(output));
  }
}
