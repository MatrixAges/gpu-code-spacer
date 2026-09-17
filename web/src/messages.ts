export type SyntaxSpan = Awaited<ReturnType<typeof import('gpu-lexer').parse>>[number];

export interface FormatRequest {
  id: number;
  source: string;
}

export type FormatResponse = {
  id: number;
  ok: true;
  text: string;
  backend: 'webgpu' | 'wasm';
  before: SyntaxSpan[];
  after: SyntaxSpan[];

  highlightError?: string;
  changes: number;

  milliseconds: number;
} | {
  id: number;

  ok: false;
  error: string;
};
