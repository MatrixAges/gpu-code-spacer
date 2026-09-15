"""Format code files from a successful Codex apply_patch event."""

import json
from pathlib import Path
import subprocess
import sys


# Keep aligned with the directory selector in src/files.zig.
CODE_EXTENSIONS = set(
    ".ts .tsx .mts .cts .js .jsx .mjs .cjs .py .pyi .java .rs .zig .go "
    ".c .h .cc .cpp .cxx .hpp .hxx .cs .rb .php .kt .kts .swift .m .mm "
    ".scala .sc .dart .lua .ml .mli .ex .exs .erl .hrl .hs .sh .bash "
    ".zsh .fish .pl .pm .r .R .sql .vue .svelte .html .css .scss .less".split()
)


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def changed_paths(patch):
    paths = []

    for line in patch.splitlines():
        if line.startswith(("*** Add File: ", "*** Update File: ")):
            paths.append(line.split(": ", 1)[1])
        elif line.startswith("*** Move to: ") and paths:
            paths[-1] = line.removeprefix("*** Move to: ")

    return paths


def feedback(message):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": message,
        },
    }, ensure_ascii=False))


def main():
    event = json.load(sys.stdin)
    if event.get("hook_event_name") != "PostToolUse" or event.get("tool_name") != "apply_patch":
        return

    output = "\n".join(strings(event.get("tool_response")))
    if "Success. Updated the following files:" not in output:
        return

    cwd = Path(event["cwd"])
    paths = set()

    for name in changed_paths(event["tool_input"]["command"]):
        path = cwd / name
        if path.suffix in CODE_EXTENSIONS and path.is_file() and not path.is_symlink():
            paths.add(str(path.absolute()))

    if not paths:
        return

    # Escape glob metacharacters so routes such as [id].ts remain literal paths.
    arguments = [
        "".join("\\" + char if char in "\\*?[" else char for char in path)
        for path in sorted(paths)
    ]
    result = subprocess.run(
        [sys.argv[1], "-f", *arguments],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=110,
    )

    if result.returncode:
        feedback(f"gcs 自动美化失败（退出码 {result.returncode}）：\n{result.stderr[-4000:]}")
        return

    feedback(
        f"gcs 已处理本次补丁的 {len(paths)} 个代码文件，文件中的空行可能已改变。"
        "继续编辑前请按需重读相关文件。"
    )


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
        feedback(f"gcs 编辑后 hook 失败：{error}")
