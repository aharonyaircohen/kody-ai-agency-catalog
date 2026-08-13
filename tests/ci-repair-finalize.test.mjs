import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const runner = resolve(
  new URL(
    "../catalog/capabilities/finalize-ci-repair/tools/run.sh",
    import.meta.url,
  ).pathname,
);

function run(input, env = {}) {
  const result = spawnSync("bash", [runner], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
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

  it("blocks with the supplied complete report after retrying cannot continue", () => {
    const bin = mkdtempSync(resolve(tmpdir(), "kody-finalize-ci-"));
    const argsFile = resolve(bin, "gh-args.txt");
    const bodyFile = resolve(bin, "gh-body.txt");
    const gh = resolve(bin, "gh");
    writeFileSync(
      gh,
      `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${argsFile}"\nprintf '%s' "$5" > "${bodyFile}"\n`,
    );
    chmodSync(gh, 0o755);

    const output = run(
      {
        status: "red",
        summary: "CI is still red.",
        failedChecks: ["unit"],
        issue: 18,
        runUrl: "https://github.com/acme/app/actions/runs/7",
        report: {
          whatFailed: "The lint check failed.",
          likelyCause: "Formatting does not match the repository rules.",
          whatItTried: ["Ran the formatter check"],
          whyStopped: "The retry limit was reached.",
          recommendedNextAction: "Review the remaining formatter output.",
        },
      },
      { PATH: `${bin}:${process.env.PATH}` },
    );

    assert.equal(output.status, "blocked");
    assert.deepEqual(Object.keys(output.report), [
      "whatFailed",
      "likelyCause",
      "whatItTried",
      "whyStopped",
      "recommendedNextAction",
    ]);
    assert.equal(output.report.whatFailed, "The lint check failed.");
    assert.equal(output.report.whyStopped, "The retry limit was reached.");
    assert.equal(
      output.report.recommendedNextAction,
      "Review the remaining formatter output.",
    );
    assert.match(readFileSync(argsFile, "utf8"), /^issue\ncomment\n18\n--body\n/);
    const published = readFileSync(bodyFile, "utf8");
    assert.match(published, /What failed/);
    assert.match(published, /Likely cause/);
    assert.match(published, /What Kody tried/);
    assert.match(published, /Why Kody stopped/);
    assert.match(published, /Recommended next action/);
    rmSync(bin, { recursive: true, force: true });
  });
});
