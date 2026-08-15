import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyStrategyApplication } from "../catalog/capabilities/verify-strategy-application/tools/scripts/verify-strategy-application.mjs";

const blueprint = {
  verification: {
    delivery: {
      requiredFiles: [".github/workflows/release-validation.yml"],
      requiredConfigPaths: ["release.validation.workflow", "release.timeoutMs"],
      requiredChecks: ["validate"],
    },
  },
};

describe("verify Strategy application", () => {
  it("passes only when Blueprint artifacts, config, and checks are proven", () => {
    const result = verifyStrategyApplication({
      blueprint,
      installation: { configPatch: { activeWorkflows: ["web-release"] } },
      files: new Map([
        [".github/workflows/release-validation.yml", "name: Release Validation"],
        ["kody.config.json", JSON.stringify({
          release: { validation: { workflow: "Release Validation" }, timeoutMs: 1800000 },
          company: { activeWorkflows: ["chore", "web-release"] },
        })],
      ]),
      checks: [{ name: "validate", state: "SUCCESS" }],
      pr: 42,
    });
    assert.equal(result.status, "verified");
    assert.equal(result.agencyVerification.passed, true);
  });

  it("blocks when configuration or a required check is missing", () => {
    const result = verifyStrategyApplication({
      blueprint,
      installation: { configPatch: { activeWorkflows: ["web-release"] } },
      files: new Map([
        [".github/workflows/release-validation.yml", "name: Release Validation"],
        ["kody.config.json", JSON.stringify({ company: { activeWorkflows: ["chore"] } })],
      ]),
      checks: [{ name: "health", state: "SUCCESS" }],
      pr: 42,
    });
    assert.equal(result.status, "blocked");
    assert.match(result.summary, /release\.validation\.workflow/);
    assert.match(result.summary, /web-release/);
    assert.match(result.summary, /validate/);
    assert.equal("agencyVerification" in result, false);
  });
});
