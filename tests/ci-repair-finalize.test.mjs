import assert from "node:assert/strict";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const runner = resolve(
  new URL(
    "../catalog/capabilities/finalize-ci-repair/tools/run.sh",
    import.meta.url,
  ).pathname,
);

function run(input) {
  const result = spawnSync("bash", [runner], {
    encoding: "utf8",
    env: {
      ...process.env,
      KODY_CAPABILITY_INPUT: JSON.stringify(input),
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

describe("finalize-ci-repair", () => {
  it("completes after one successful repair attempt", () => {
    const output = run({
      status: "healthy",
      summary: "CI is healthy.",
      failedChecks: [],
      pr: 42,
      report: {
        whatFailed: "The unit test failed.",
        likelyCause: "The default value was wrong.",
        whatItTried: ["Changed the default", "Ran the focused test"],
        whyStopped: "Focused verification passed.",
        recommendedNextAction: "Wait for CI.",
      },
    });

    assert.equal(output.status, "completed");
    assert.equal(output.report.whyStopped, "CI passed after one repair attempt.");
    assert.equal(output.report.recommendedNextAction, "Review and merge PR #42.");
  });

  it("blocks with a complete report instead of retrying", () => {
    const output = run({
      status: "red",
      summary: "CI is still red.",
      failedChecks: ["unit"],
      issue: 18,
      runUrl: "https://github.com/acme/app/actions/runs/7",
    });

    assert.equal(output.status, "blocked");
    assert.deepEqual(Object.keys(output.report), [
      "whatFailed",
      "likelyCause",
      "whatItTried",
      "whyStopped",
      "recommendedNextAction",
    ]);
    assert.match(output.report.whatFailed, /unit/);
    assert.match(output.report.whyStopped, /one repair attempt/i);
    assert.match(output.report.recommendedNextAction, /manual/i);
  });
});
