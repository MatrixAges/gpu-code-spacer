import './style.css';
import examples from './examples.json';
import type { FormatRequest, FormatResponse, SyntaxSpan } from './messages';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);

  if (!found) throw new Error(`Missing element: ${id}`);

  return found as T;
}

const source = element<HTMLTextAreaElement>('source');
const sourceHighlight = element('source-highlight');
const output = element('output');
const copyOutput = element<HTMLButtonElement>('copy-output');
const status = element('status');
const exampleButtons = element('examples');
const credit = element('example-credit');
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const maxDemoBytes = 256 * 1024;
let revision = 0;
let timer: ReturnType<typeof setTimeout>;
let activeExample = examples[0];
let exampleRequest: AbortController | undefined;
let formatted = '';
let composing = false;
let workerFailed = false;

for (const example of examples) {
  const button = document.createElement('button');

  button.textContent = example.label;
  button.dataset.language = example.language;

  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => void loadExample(example));
  exampleButtons.append(button);
}

function setStatus(message: string, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}

function lineCount(text: string) {
  return text.length === 0 ? 0 : text.split('\n').length - Number(text.endsWith('\n'));
}

function syncScroll() {
  sourceHighlight.scrollTop = source.scrollTop;
  sourceHighlight.scrollLeft = source.scrollLeft;
}

function renderCode(container: HTMLElement, text: string, spans: SyntaxSpan[]) {
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  let offset = 0;

  for (const token of spans) {
    if (token.start > offset) code.append(text.slice(offset, token.start));

    const span = document.createElement('span');

    span.className = `syntax-${token.type}`;
    span.textContent = text.slice(token.start, token.end);

    code.append(span);

    offset = token.end;
  }

  code.append(text.slice(offset));

  if (text.endsWith('\n')) code.append('\n');

  pre.append(code);
  container.replaceChildren(pre);
}

function clearResult() {
  formatted = '';
  copyOutput.disabled = true;

  output.replaceChildren();
  element('output-count').textContent = 'Updating…';
  element('timing').textContent = '—';
}

function schedule(immediate = false) {
  clearTimeout(timer);

  revision += 1;

  source.classList.add('pending');
  clearResult();

  const bytes = new TextEncoder().encode(source.value).byteLength;

  element('source-count').textContent = `${lineCount(source.value)} lines · ${(bytes / 1024).toFixed(1)} KB`;

  if (workerFailed) {
    setStatus('The processing worker stopped. Reload the page to try again.', true);

    return;
  }

  if (bytes > maxDemoBytes) {
    setStatus('Live demo limit: 256 KiB. The npm API supports files up to 4 MiB.', true);
    element('output-count').textContent = 'Input too large';

    return;
  }

  setStatus('Spacing & highlighting…');

  if (composing) return;

  const request: FormatRequest = { id: revision, source: source.value };

  timer = setTimeout(() => worker.postMessage(request), immediate ? 0 : 180);
}

worker.onmessage = (event: MessageEvent<FormatResponse>) => {
  const result = event.data;

  if (result.id !== revision) return;

  if (!result.ok) {
    setStatus(result.error, true);
    element('output-count').textContent = 'Unable to format';

    return;
  }

  formatted = result.text;

  renderCode(sourceHighlight, source.value, result.before);
  renderCode(output, result.text, result.after);
  source.classList.remove('pending');
  syncScroll();

  copyOutput.disabled = false;

  element('output-count').textContent = `${lineCount(formatted)} lines · ${result.changes} spacing changes`;
  element('timing').textContent = `${result.milliseconds.toFixed(1)} ms`;

  if (result.highlightError) {
    setStatus(`Spacing complete; highlighting unavailable: ${result.highlightError}. WebGPU over HTTPS or localhost is required.`, true);
  } else {
    setStatus(result.changes ? 'A little more breathing room. Code content preserved.' : 'All set. No spacing changes needed.');
  }
};

worker.onerror = () => {
  workerFailed = true;

  clearTimeout(timer);
  clearResult();
  setStatus('Unable to load the processing worker. Reload the page to try again.', true);
};

async function loadExample(example: typeof examples[number]) {
  exampleRequest?.abort();

  const controller = new AbortController();

  exampleRequest = controller;
  revision += 1;

  clearTimeout(timer);
  clearResult();
  setStatus(`Loading ${example.file}…`);

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}examples/${example.file}.txt`, { signal: controller.signal });

    if (!response.ok) throw new Error(`Unable to load example (${response.status}).`);

    const text = await response.text();

    if (controller.signal.aborted) return;

    activeExample = example;
    source.value = text;

    element('source-file').textContent = example.file;

    source.scrollTop = 0;
    source.scrollLeft = 0;

    for (const button of exampleButtons.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.language === example.language));
    }

    const license = document.createElement('a');

    license.href = `${import.meta.env.BASE_URL}examples/${example.language}-LICENSE.txt`;
    license.textContent = example.license;

    credit.replaceChildren(`Edited excerpt · ${example.lines} lines · `, license);

    if (example.language === 'python') {
      const notice = document.createElement('a');

      notice.href = `${import.meta.env.BASE_URL}examples/python-NOTICE.txt`;
      notice.textContent = 'NOTICE';

      credit.append(' · ', notice);
    }

    schedule(true);
  } catch (error) {
    if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : String(error), true);
  }
}

source.addEventListener('input', () => {
  exampleRequest?.abort();
  schedule();
});

source.addEventListener('scroll', syncScroll);
source.addEventListener('compositionstart', () => { composing = true; });

source.addEventListener('compositionend', () => {
  composing = false;

  schedule();
});

element('reset').addEventListener('click', () => void loadExample(activeExample));

async function copy(text: string, button: HTMLButtonElement) {
  const previous = button.id === 'copy-output' ? 'Copy code ⧉' : 'npm i gpu-code-spacer ⧉';

  try {
    await navigator.clipboard.writeText(text);

    button.textContent = 'Copied ✓';

    setTimeout(() => { button.textContent = previous; }, 1600);
  } catch {
    setStatus('Clipboard unavailable. Select and copy the code manually.', true);
  }
}

copyOutput.addEventListener('click', () => void copy(formatted, copyOutput));

const copyInstall = element<HTMLButtonElement>('copy-install');

copyInstall.addEventListener('click', () => void copy('npm i gpu-code-spacer', copyInstall));
void loadExample(activeExample);
