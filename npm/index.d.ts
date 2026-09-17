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
  /** Synchronously format UTF-8 source up to 4 MiB without changing nonblank lines. */
  format(source: string, options?: FormatOptions): FormatResult;
}

export interface SpacerOptions {
  /** Optional asset URL, compiled module, or bytes for custom loaders and bundlers. */
  wasm?: string | URL | BufferSource | WebAssembly.Module;
}

/** Create an independent reusable WebAssembly CPU formatter with embedded weights. */
export function createSpacer(options?: SpacerOptions): Promise<Spacer>;
