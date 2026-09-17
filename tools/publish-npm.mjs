import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const version = process.env.VERSION?.replace(/^v/, '');
const archive = `npm-package/gpu-code-spacer-${version}.tgz`;
const metadata = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], { encoding: 'utf8' }));

if (metadata.name !== 'gpu-code-spacer' || metadata.version !== version) {
  throw new Error('Built npm package does not match the release version.');
}

const integrity = `sha512-${createHash('sha512').update(await readFile(archive)).digest('base64')}`;
const response = await fetch(`https://registry.npmjs.org/gpu-code-spacer/${version}`);

if (response.ok) {
  const published = await response.json();

  if (published.dist.integrity !== integrity) {
    throw new Error(`gpu-code-spacer@${version} already exists with different contents. Bump the version.`);
  }

  console.log(`gpu-code-spacer@${version} is already published with identical contents.`);
} else if (response.status === 404) {
  execFileSync('npm', ['publish', archive, '--access', 'public', '--provenance', '--ignore-scripts'], { stdio: 'inherit' });
} else {
  throw new Error(`Unable to inspect npm version (${response.status}).`);
}
