import { createSpacer } from 'gpu-code-spacer';
import wasm from 'gpu-code-spacer/spacer.wasm?url';
import { parse } from 'gpu-lexer';
import type { FormatRequest, FormatResponse, SyntaxSpan } from './messages';

const ready = createSpacer({ wasm });

// Surface initialization failures through the request that needs the model.
void ready.catch(() => {});

let pending: FormatRequest | undefined;
let running = false;

self.onmessage = (event: MessageEvent<FormatRequest>) => {
  pending = event.data;
  void drain();
};

async function drain() {
  if (running) return;
  running = true;

  try {
    while (pending) {
      const request = pending;
      pending = undefined;
      await processRequest(request);
    }
  } finally {
    running = false;
  }
}

async function processRequest({ id, source }: FormatRequest) {
  try {
    const spacer = await ready;
    const start = performance.now();
    const result = spacer.format(source);
    const milliseconds = performance.now() - start;
    let before: SyntaxSpan[] = [];
    let after: SyntaxSpan[] = [];
    let highlightError: string | undefined;

    try {
      // The package shares a GPU runtime. Keep the two parses sequential.
      before = await parse(source);
      after = result.text === source ? before : await parse(result.text);
    } catch (error) {
      before = [];
      after = [];
      highlightError = error instanceof Error ? error.message : String(error);
    }

    self.postMessage({ id, ok: true, ...result, before, after, highlightError, milliseconds } satisfies FormatResponse);
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) } satisfies FormatResponse);
  }
}
