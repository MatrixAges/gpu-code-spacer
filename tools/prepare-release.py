"""Resolve one source revision and version for native and npm builds."""

import json
import os
import re
import subprocess
from pathlib import Path

def main():
    path = Path("build.zig.zon")
    manifest = path.read_text()

    match = re.search(r'^\s*\.version\s*=\s*"([0-9]+\.[0-9]+\.[0-9]+)"', manifest, re.MULTILINE)

    if match is None:
        raise SystemExit("Expected a numeric major.minor.patch version in build.zig.zon")

    version = match.group(1)
    package = json.loads(Path("package.json").read_text())
    lock = json.loads(Path("package-lock.json").read_text())

    if any(value != version for value in (package["version"], lock["version"], lock["packages"][""]["version"])):
        raise SystemExit("Zig, npm and lockfile versions must match before release")

    if os.environ["GITHUB_EVENT_NAME"] == "workflow_dispatch":
        major, minor, patch = map(int, version.split("."))
        carry, patch = divmod(patch + 1, 10)
        carry, minor = divmod(minor + carry, 10)

        major += carry
        version = f"{major}.{minor}.{patch}"

        path.write_text(manifest[:match.start(1)] + version + manifest[match.end(1):])

        package["version"] = version

        lock["version"] = version
        lock["packages"][""]["version"] = version

        for name, data in (("package.json", package), ("package-lock.json", lock)):
            Path(name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

        subprocess.run(["git", "config", "user.name", "github-actions[bot]"], check=True)
        subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], check=True)
        subprocess.run(["git", "add", "build.zig.zon", "package.json", "package-lock.json"], check=True)
        subprocess.run(["git", "commit", "-m", f"chore: release v{version}"], check=True)

    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()

    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        output.write(f"sha={sha}\nversion=v{version}\n")

    print(f"Building v{version} from {sha}")

if __name__ == "__main__":
    main()
