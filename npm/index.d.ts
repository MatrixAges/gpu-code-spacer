export interface FormatOptions {
  /** Minimum model confidence, from 0 to 1. Defaults to the embedded calibration. */
  confidence?: number;
}

export interface FormatResult {
  text: string;
  /** Number of boundaries whose blank-line count changed. */
  changes: number;
  candidates: number;
}

export interface Spacer {
  /** Actual inference backend. Node.js prefers native WebGPU when available. */
  readonly backend: 'webgpu' | 'wasm';
  /** Node.js auto mode: why GPU initialization failed, if WASM was selected. */
  readonly fallbackReason?: string;

  /** Format UTF-8 source up to 4 MiB. Calls on the same instance are queued. */
  format(source: string, options?: FormatOptions): Promise<FormatResult>;
  /** Stop accepting new calls, wait for queued calls, then release resources. */
  destroy(): Promise<void>;
}

export interface SpacerOptions {
  /** Node.js only: auto prefers GPU, webgpu requires GPU, wasm forces CPU. */
  backend?: 'auto' | 'webgpu' | 'wasm';

  /** Optional asset URL, compiled module, or bytes for custom loaders and bundlers. */
  wasm?: string | URL | BufferSource | WebAssembly.Module;
}

/** Browsers require WebGPU over HTTPS or localhost; no automatic CPU fallback. */
export function createSpacer(options?: SpacerOptions): Promise<Spacer>;
