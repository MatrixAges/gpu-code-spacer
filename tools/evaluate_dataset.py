"""Evaluate every current dense input against its complete reviewed output."""

import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path


def digest(content):
    return hashlib.sha256(content).hexdigest()


def layout(content):
    lines = content.splitlines(keepends=True)
    positions = [i for i, line in enumerate(lines) if line.strip()]

    return (
        [lines[i] for i in positions],
        [right - left - 1 for left, right in zip(positions, positions[1:])],
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binary", type=Path)
    parser.add_argument("report_directory", type=Path)
    args = parser.parse_args()

    repository = Path(__file__).resolve().parent.parent
    evaluation = repository / "evaluation"
    destination = args.report_directory.resolve()
    if destination == evaluation or (
        destination.is_relative_to(evaluation)
        and not destination.is_relative_to(evaluation / "artifacts")
    ):
        parser.error("Reports must not overwrite the evaluation dataset")

    # A fresh directory and frozen binary keep subsequent builds from changing
    # the implementation halfway through a run.
    destination.mkdir(parents=True, exist_ok=False)
    binary = destination / "evaluated-binary"
    shutil.copy2(args.binary.resolve(), binary)
    model = json.loads(subprocess.check_output([str(binary), "--model-info"]))

    def predict(source):
        return subprocess.run(
            [str(binary)], input=source, capture_output=True, check=True
        ).stdout

    results = []
    summaries = {}

    for split in ("cases", "validation"):
        rows = []

        for case in sorted((evaluation / split).iterdir()):
            if not case.is_dir():
                continue

            expected_path, = case.glob("output.*")
            input_path, = case.glob("input.*")

            source = input_path.read_bytes()
            expected = expected_path.read_bytes()
            source_lines, _ = layout(source)
            expected_lines, expected_gaps = layout(expected)
            if source_lines != expected_lines:
                raise ValueError(f"Input and reference source differ: {case}")

            actual = predict(source)
            actual_lines, actual_gaps = layout(actual)
            preserved = actual_lines == source_lines
            output_path = destination / split / case.name / input_path.name
            output_path.parent.mkdir(parents=True)
            output_path.write_bytes(actual)

            rows.append({
                "case": case.name,
                "split": split,
                "language": json.loads((case / "metadata.json").read_text())["language"],
                "exact_output": actual == expected,
                "nonblank_preserved": preserved,
                "idempotent": actual == predict(actual),
                "gaps_total": len(expected_gaps),
                "gaps_correct": sum(a == b for a, b in zip(actual_gaps, expected_gaps)) if preserved else 0,
                "input_sha256": digest(source),
                "expected_sha256": digest(expected),
                "prediction_sha256": digest(actual),
                "prediction_path": str(output_path.relative_to(destination)),
            })

        passed = sum(row["exact_output"] for row in rows)
        summaries[split] = {
            "cases": len(rows),
            "exact_output": passed,
            "exact_percent": 100 * passed / len(rows) if rows else 0,
            "target_met": bool(rows) and passed == len(rows),
            **{
                key: sum(row[key] for row in rows)
                for key in ("nonblank_preserved", "idempotent", "gaps_total", "gaps_correct")
            },
        }
        results.extend(rows)

    report = {
        "input_policy": "dense only",
        "comparison": "complete byte equality; every case has equal weight",
        "model": model,
        "binary_sha256": digest(binary.read_bytes()),
        "summary": summaries,
        "results": results,
    }
    (destination / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(summaries, ensure_ascii=False, indent=2))

    successful = all(
        summary["target_met"]
        and summary["nonblank_preserved"] == summary["cases"]
        and summary["idempotent"] == summary["cases"]
        for summary in summaries.values()
    )

    return 0 if successful else 1


if __name__ == "__main__":
    raise SystemExit(main())
