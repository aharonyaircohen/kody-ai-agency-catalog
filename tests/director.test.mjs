import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("Director Agent", () => {
  it("is a generic identity with evidence, deduplication, and recovery boundaries", async () => {
    const markdown = await readFile(new URL("../agents/director.md", import.meta.url), "utf8");

    assert.match(markdown, /^# Director/);
    assert.match(markdown, /Identity only/i);
    assert.match(markdown, /One problem, one Todo/i);
    assert.match(markdown, /stable work key/i);
    assert.match(markdown, /pending-state field/i);
    assert.match(markdown, /submit that field as `null`/i);
    assert.match(markdown, /submit continuation state last/i);
    assert.match(markdown, /close work only when later evidence proves recovery/i);
    assert.doesNotMatch(markdown, /observe-repo-ci|director-ci-monitor|15m/i);
  });
});
