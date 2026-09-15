# gpu code spacer

A model-based code spacing tool (50kb model size). Adjusts blank lines between code lines while preserving code content and indentation.

```sh
gcs -f src/main.ts
gcs -p src -r
```

[Installation](#installation) · [Usage](#usage) · [Codex Hooks](#codex-hooks) · [Limitations](#limitations) · [License](#license)

## What is gcs

`gcs` uses an embedded model to place blank lines between logical groups of code, keeping the original code and indentation intact.

**Before**

```ts
function available(stock: number, reserved: number): boolean {
  const remaining = stock - reserved;
  const threshold = 2;
  if (remaining < threshold) {
    return false;
  }
  return true;
}
```

**After**

```ts
function available(stock: number, reserved: number): boolean {
  const remaining = stock - reserved;
  const threshold = 2;

  if (remaining < threshold) {
    return false;
  }

  return true;
}
```

## Features

- Supports individual files, recursive directory scanning, and glob patterns.
- Shares a model instance across batch processing and automatically deduplicates files.
- Writes files atomically, preserves file permissions, and supports check-only mode.
- Implemented in Zig with an embedded model. ggml inference prefers the GPU and falls back to the CPU when unavailable.
- Includes a hook adapter script for automatic formatting after Codex edits.

## Installation

### GitHub Actions packages

Push an update to the `build` branch to build packages automatically, or open
[Build GCS](https://github.com/MatrixAges/gpu-code-spacer/actions/workflows/build.yml),
click **Run workflow**, leave `master` selected, and run it manually. A manual run
fetches the latest `master`, fast-forwards `build` to that commit, and builds that
exact revision on all three platforms. If `build` has divergent commits, the run
fails instead of force-overwriting them. Direct pushes to `build` still build the
pushed commit. Keep local development on `master`; no local branch switch is needed.

Artifact versions use `.version` from `build.zig.zon`, for example `v0.1.0`,
without a commit hash suffix. Update the manifest version
when releasing a new version. Download artifacts from the completed run:

- `gcs-<version>-linux-x86_64`: Linux binary package using the CPU backend, cross-compiled on macOS.
- `gcs-<version>-macos-aarch64`: Apple Silicon binary package with Metal support, built on macOS 15.
- `gcs-<version>-windows-x86_64`: Windows `gcs.exe` package using the CPU backend, cross-compiled on macOS.
- `gcs-<version>-gguf`: standalone `spacer-<version>.gguf`, exported from the same committed weights as the binaries.

Each binary artifact contains an archive (`.zip` for Windows, `.tar.gz` otherwise)
and its SHA-256 checksum. Extract
the archive to preserve executable permissions. It includes `gcs`, `spacer.gguf`,
model metadata and calibration configuration, `VERSION`, `COMMIT`, README, and license.
Archive and checksum filenames include the same version; the executable inside
keeps the stable name `gcs` or `gcs.exe`.
Artifacts are retained for 30 days. These builds do not retrain the model.

All three build jobs run in parallel on macOS 15 runners. macOS keeps Metal support;
Linux and Windows use separate cross-compiled ggml libraries. Only the native macOS
binary is executed during the workflow; no Linux or Windows runners are used.

The GGUF uses the custom `gcs_mlp` architecture and requires GCS feature extraction
and inference logic; it is not a general-purpose model for llama.cpp or Ollama.

### Build from source

Building from source requires Zig 0.16.0, Git, CMake, and a system C/C++ compiler. Run these commands from the repository root:

```sh
# Set up ggml before the first build
zig build bootstrap -- --ggml

zig build -Doptimize=ReleaseSmall
```

The executable is located at `zig-out/bin/gcs`. Run it directly or add the directory to your PATH:

```sh
export PATH="$PWD/zig-out/bin:$PATH"
```

Both the model and ggml are compiled into the executable, so no separate model files or ggml shared libraries are needed at runtime. Earlier builds were executed successfully on macOS Apple Silicon, Ubuntu 24.04 x86_64, and Windows Server 2022. The current workflow executes only its native macOS binary; cross-compiled Linux and Windows packages are not run on their target operating systems in CI.

To cross-compile Linux and Windows x86_64 on macOS, install Ninja alongside Zig and CMake:

```sh
zig build bootstrap -- --ggml-linux

zig build -Doptimize=ReleaseSmall -Dcpu=baseline \
  -Dtarget=x86_64-linux-gnu -Dggml-prefix=.deps/ggml-linux-install \
  --prefix zig-out/linux-x86_64

zig build bootstrap -- --ggml-windows

zig build -Doptimize=ReleaseSmall -Dcpu=baseline \
  -Dtarget=x86_64-windows-gnu -Dggml-prefix=.deps/ggml-windows-install \
  --prefix zig-out/windows-x86_64
```

The executables are `zig-out/linux-x86_64/bin/gcs` and
`zig-out/windows-x86_64/bin/gcs.exe`. Target libraries are built in separate
directories, so they do not replace the host libraries used to export GGUF.

## Usage

### Files and Directories

```sh
# A single file
gcs -f src/main.ts

# Multiple files
gcs -f src/main.ts src/utils.ts

# Code files in a directory
gcs -p src

# Process subdirectories recursively
gcs -p src -r
```

`-f` and `-p` write changes in place by default and cannot be combined. `-r` is only supported with `-p`.

### Glob

```sh
gcs -f '*.ts'
gcs -f 'src/**/*.ts'
gcs -f 'src/app/\[id\]/page.tsx'
```

Supports `*`, `?`, `[abc]`, `[a-z]`, and `**` as a standalone path segment. Brace expansion and extglob are not supported. Quote patterns to prevent the shell from expanding them first. Escape glob characters in filenames, as shown with `[id]` above.

On Windows, both `/` and `\` separate directories; backslashes do not escape glob
characters. Use `[[]` and `[]]` for literal brackets, e.g. `gcs.exe -f 'src\[[]id[]]\page.tsx'`
in PowerShell. Windows glob matching is case-sensitive and byte-wise (`?` consumes
one UTF-8 byte). Drive-relative glob paths such as `C:*.ts` and POSIX named character
classes are unsupported; use an absolute path such as `C:\src\*.ts` instead.

### Checking and Standard Output

```sh
# Check whether changes are needed without writing them
gcs -p src -r --check

# Write to stdout without modifying the file
gcs src/main.ts

# Read from stdin
gcs < src/main.ts
```

### Options

| Option | Description |
| --- | --- |
| `-f <file or glob>...` | Format one or more files in place |
| `-p <directory>` | Format code files in a directory in place |
| `-r` | Process recursively; use with `-p` |
| `--check` | Check only, without writing changes |
| `--write` | Write changes in place when using a positional argument, e.g. `gcs --write file.ts` |
| `--confidence <0..1>` | Override the model's default confidence threshold |
| `--stats` | Print per-file statistics to stderr; the inference batch count is cumulative for the process |
| `--model-info` | Show the embedded model and the inference backend actually in use |
| `-h`, `--help` | Show help |

Exit codes: `0` for success; `1` when `--check` finds suggested changes; `2` for execution errors.

### File Scanning

Directory mode filters files by common code extensions. See [src/files.zig](src/files.zig) for the complete list. Explicit file mode accepts any extension.

Recursive scanning skips hidden directories and the following directories. It does not read `.gitignore`:

```text
node_modules  vendor  dist  build  target  zig-out  __pycache__
```

To process one of these directories, specify it directly with `-p`. `**` uses the same exclusion rules, and ordinary wildcards do not match hidden names. Scanning does not recursively follow directory symlinks it discovers.

A glob with no matching files returns `2`; a directory with no code files returns `0`.

## Codex Hooks

Use [tools/hooks/gcs.py](tools/hooks/gcs.py) to batch-format code files added or modified by a patch after each successful Codex `apply_patch` call.

Requires a version of Codex that supports `PostToolUse` and Python 3.9+.

### Configuration

Merge the following configuration into `~/.codex/hooks.json` or the target project's `.codex/hooks.json`. Replace `/path/to/gpu-code-spacer` with the absolute path to this repository, and adjust the Python path as needed.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "^apply_patch$",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"/path/to/gpu-code-spacer/tools/hooks/gcs.py\" \"/path/to/gpu-code-spacer/zig-out/bin/gcs\"",
            "timeout": 120,
            "statusMessage": "Formatting edited code files with gcs"
          }
        ]
      }
    ]
  }
}
```

Preserve existing hooks and avoid adding the same rule to both the global and project configurations.

### Enabling the Hook

Run `/hooks` in the Codex CLI to review and trust the hook. If the new configuration does not appear, reopen the session. Project hooks also require the project configuration layer to be trusted. Changes to the configuration or definition may require trusting the hook again. See the [Codex Hooks documentation](https://learn.chatgpt.com/docs/hooks) for details.

### Execution Behavior

- Runs synchronously once per successful patch, processing the relevant code files in a single `gcs -f` call.
- Supports destination paths for moved files, spaces, and literal filenames such as `[id]`.
- Skips deleted files, non-code files, and file symlinks. Does not depend on Git.
- Reports results to Codex; failures do not undo the original patch.
- Covers only `apply_patch`. After writing files through the shell, Python, or other tools, call `gcs -f` explicitly.

Formatting may change line numbers, so subsequent edits should use the updated file contents. Update the hook paths if you move the repository or executable. You can disable the rule in `/hooks`.

## Limitations

gcs currently adjusts only blank lines. It does not change indentation, wrap long lines, or sort imports.

Input should be UTF-8 source code, with a maximum size of 4 MiB per file. Writing changes back is supported only for regular files with a single hard link, and the tool checks for content changes before replacing a file. If a file fails during batch processing, the remaining files are still processed and the final exit code is `2`. Completed writes are not rolled back.

The default model is `v6-2026-standard`, with a confidence threshold of `0`. See the [model metadata](models/metadata.json) for details. All 90 regression cases in the current revised set pass; this does not guarantee complete coverage of every language or coding style.

## License

[MIT](LICENSE)
