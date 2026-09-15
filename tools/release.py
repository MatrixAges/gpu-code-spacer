"""Publish the built revision with raw assets and a commit-based changelog."""

import json
import os
import re
import subprocess
from pathlib import Path

def run(*args):
    return subprocess.check_output(args, text=True).strip()

def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    server = os.environ["GITHUB_SERVER_URL"]
    version = os.environ["VERSION"]
    revision = os.environ["SOURCE_SHA"]

    assets = [
        Path("artifacts") / name
        for name in (
            f"gcs-{version}-linux-x86_64",
            f"gcs-{version}-linux-arm_64",
            f"gcs-{version}-macos-arm_64",
            f"gcs-{version}-windows-x86_64.exe",
            f"spacer-{version}.gguf",
        )
    ]

    for asset in assets:
        if not asset.is_file() or asset.stat().st_size == 0:
            raise SystemExit(f"Missing release asset: {asset}")

    pages = json.loads(run("gh", "api", "--paginate", "--slurp", f"repos/{repository}/releases?per_page=100"))
    releases = [release for page in pages for release in page]
    existing = next((release for release in releases if release["tag_name"] == version), None)

    tag = subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet", f"refs/tags/{version}^{{commit}}"],
        capture_output=True,
        text=True,
    )

    if tag.returncode == 0 and tag.stdout.strip() != revision:
        raise SystemExit(f"Tag {version} points to a different commit")

    if existing:
        if tag.returncode != 0 and existing["target_commitish"] != revision:
            raise SystemExit(f"Release {version} targets a different commit")

        if not existing["draft"]:
            expected = {(asset.name, asset.stat().st_size) for asset in assets}
            uploaded = {(asset["name"], asset["size"]) for asset in existing["assets"]}

            if tag.returncode != 0 or not expected.issubset(uploaded):
                raise SystemExit(f"Published release {version} is incomplete; refusing to overwrite it")

            print(existing["html_url"])

            return

    published = sorted(
        (release for release in releases if not release["draft"] and not release["prerelease"]),
        key=lambda release: release["published_at"],
        reverse=True,
    )

    previous = published[0]["tag_name"] if published else None

    if previous:
        subprocess.run(["git", "merge-base", "--is-ancestor", f"refs/tags/{previous}", revision], check=True)

    commit_range = f"{previous}..{revision}" if previous else revision
    commits = run("git", "log", "--reverse", "--format=%H%x09%s", commit_range)
    notes = ["## Changes", ""]

    if previous:
        notes.extend([f"Changes since [{previous}]({server}/{repository}/releases/tag/{previous}).", ""])
    else:
        notes.extend(["Initial release; includes the commit history through this version.", ""])

    for line in commits.splitlines():
        sha, _, subject = line.partition("\t")

        subject = re.sub(r"([\\`*_{}\[\]<>])", r"\\\1", subject)

        notes.append(f"- {subject} ([{sha[:7]}]({server}/{repository}/commit/{sha}))")

    if previous:
        notes.extend(["", f"[Full diff]({server}/{repository}/compare/{previous}...{version})"])

    notes_path = Path("artifacts/release-notes.md")

    notes_path.write_text("\n".join(notes) + "\n")

    if not existing:
        run(
            "gh", "release", "create", version, "--repo", repository,
            "--draft", "--target", revision, "--title", version,
            "--notes-file", str(notes_path),
        )

    run("gh", "release", "upload", version, *map(str, assets), "--repo", repository, "--clobber")

    run(
        "gh", "release", "edit", version, "--repo", repository,
        "--notes-file", str(notes_path), "--draft=false", "--latest",
    )

    print(run("gh", "release", "view", version, "--repo", repository, "--json", "url", "--jq", ".url"))

if __name__ == "__main__":
    main()
