import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const script = resolve(
  new URL("../catalog/capabilities/test-health-check/tools/run.sh", import.meta.url)
    .pathname,
);

async function fixture(quality) {
  const cwd = await mkdtemp(join(tmpdir(), "kody-test-health-"));
  await writeFile(
    join(cwd, "kody.config.json"),
    `${JSON.stringify({ quality }, null, 2)}\n`,
  );
  const bin = join(cwd, "bin");
  await writeFile(join(cwd, "placeholder"), "");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(bin));
  const gh = join(bin, "gh");
  await writeFile(
    gh,
    `#!/usr/bin/env bash\nif [[ "$*" == *"issue list"* ]]; then echo '[]'; else echo 'https://github.com/acme/repo/issues/42'; fi\n`,
  );
  await chmod(gh, 0o755);
  return { cwd, bin };
}

function run(cwd, bin, extraEnv = {}) {
  const result = spawnSync("bash", [script], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      KODY_ARG_REPEAT: "2",
      ...extraEnv,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

describe("test-health-check", () => {
  it("runs the configured tests repeatedly and enforces configured coverage", async () => {
    const { cwd, bin } = await fixture({
      testUnit: 'node -e "process.exit(0)"',
      coverage: 'node -e "process.exit(0)"',
    });

    const result = run(cwd, bin);

    assert.equal(result.status, "healthy");
    assert.equal(result.needsRepair, false);
    assert.equal(result.facts.testRuns, 2);
    assert.equal(result.facts.coverageConfigured, true);
    assert.equal(result.facts.finding.status, "resolved");
  });

  it("opens one repair issue when tests fail consistently", async () => {
    const { cwd, bin } = await fixture({
      testUnit: 'node -e "process.exit(1)"',
      coverage: 'node -e "process.exit(0)"',
    });

    const result = run(cwd, bin);

    assert.equal(result.status, "red");
    assert.equal(result.needsRepair, true);
    assert.equal(result.issue, 42);
    assert.equal(result.facts.finding.status, "open");
    assert.match(result.summary, /tests failed/i);
  });

  it("reports missing coverage without changing code", async () => {
    const { cwd, bin } = await fixture({
      testUnit: 'node -e "process.exit(0)"',
    });

    const result = run(cwd, bin);

    assert.equal(result.status, "concern");
    assert.equal(result.needsRepair, false);
    assert.equal(result.facts.coverageConfigured, false);
    assert.match(result.facts.finding.actual, /coverage command is not configured/i);
  });

  it("reports an inconsistent repeated result as a repairable flaky test", async () => {
    const { cwd, bin } = await fixture({
      testUnit: "node flaky.mjs",
      coverage: 'node -e "process.exit(0)"',
    });
    await writeFile(
      join(cwd, "flaky.mjs"),
      `import { existsSync, writeFileSync } from "node:fs";\nconst first = !existsSync("attempt");\nwriteFileSync("attempt", "done");\nprocess.exit(first ? 1 : 0);\n`,
    );

    const result = run(cwd, bin);

    assert.equal(result.status, "red");
    assert.equal(result.needsRepair, true);
    assert.equal(result.issue, 42);
    assert.match(result.summary, /changed between repeated runs/i);
  });

  it("reports disabled tests as a quality concern without automatic repair", async () => {
    const { cwd, bin } = await fixture({
      testUnit: 'node -e "process.exit(0)"',
      coverage: 'node -e "process.exit(0)"',
    });
    await writeFile(join(cwd, "sample.test.js"), "it.skip('later', () => {});\n");

    const result = run(cwd, bin);

    assert.equal(result.status, "concern");
    assert.equal(result.needsRepair, false);
    assert.equal(result.facts.disabledOrFocusedTests, 1);
  });

  it("blocks clearly when the repository has no test command", async () => {
    const { cwd, bin } = await fixture({ coverage: 'node -e "process.exit(0)"' });

    const result = run(cwd, bin);

    assert.equal(result.status, "blocked");
    assert.equal(result.needsRepair, false);
    assert.match(result.summary, /quality\.testUnit is not configured/i);
  });

  it("keeps command output out of the machine-readable result", async () => {
    const { cwd, bin } = await fixture({
      testUnit: 'node -e "console.log(\'test chatter\')"',
      coverage: 'node -e "console.error(\'coverage chatter\')"',
    });

    const result = spawnSync("bash", [script], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, KODY_ARG_REPEAT: "1" },
    });

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /chatter/);
    assert.equal(JSON.parse(result.stdout).status, "healthy");
  });
});
