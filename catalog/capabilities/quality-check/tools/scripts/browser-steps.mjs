import { promises as dns } from "node:dns";
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { join } from "node:path";
import { createRequire } from "node:module";

import { resolveFillValue } from "./browser-step-values.mjs";

const qualityRunId = clean(process.env.QUALITY_RUN_ID);
const journeyName = clean(process.env.QUALITY_JOURNEY_NAME);
const sourceCommit = clean(process.env.QUALITY_SOURCE_COMMIT);
const steps = parseSteps(process.env.QUALITY_STEPS);
const target = await safeTarget(process.env.QUALITY_TARGET_URL);
const artifactPath = join("test-results", "quality-runs", qualityRunId);
let passed = 0;
let browser;

try {
  if (!target)
    throw new Error("The deployment URL is not a safe public HTTPS address.");
  if (!steps) throw new Error("The saved Journey has invalid steps.");
  await mkdir(artifactPath, { recursive: true });
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (let index = 0; index < steps.length; index += 1) {
    await execute(page, steps[index], target);
    passed += 1;
    if (!(steps[index].operation === "fill" && "valueFrom" in steps[index])) {
      await page.screenshot({
        path: join(
          artifactPath,
          `${String(index + 1).padStart(2, "0")}-${steps[index].operation}.png`,
        ),
        fullPage: true,
      });
    }
  }

  await writeSummary({ status: "pass", passed, failed: 0 });
  result(0);
} catch (error) {
  await mkdir(artifactPath, { recursive: true });
  await writeSummary({
    status: "fail",
    passed,
    failed: 1,
    error: error instanceof Error ? error.message : "Unknown browser error",
  });
  result(1);
} finally {
  await browser?.close();
}

async function execute(page, step, baseUrl) {
  if (step.operation === "open") {
    const destination = new URL(step.path, baseUrl);
    if (destination.origin !== baseUrl.origin)
      throw new Error("Open steps cannot leave the selected deployment.");
    await page.goto(destination.href, { waitUntil: "domcontentloaded" });
    return;
  }
  if (step.operation === "click") {
    await (
      await firstVisible([
        page.getByRole("button", { name: step.target, exact: true }),
        page.getByRole("link", { name: step.target, exact: true }),
        page.getByText(step.target, { exact: true }),
      ])
    ).click();
    return;
  }
  if (step.operation === "fill") {
    await (
      await firstVisible([
        page.getByLabel(step.target, { exact: true }),
        page.getByPlaceholder(step.target, { exact: true }),
      ])
    ).fill(resolveFillValue(step), { timeout: 180_000 });
    return;
  }
  if (step.operation === "reload") {
    await page.reload({ waitUntil: "domcontentloaded" });
    return;
  }
  if (step.operation === "check") {
    await page
      .getByText(step.text, { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 180_000 });
    return;
  }
  throw new Error("Unsupported Journey step.");
}

async function firstVisible(locators, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const locator of locators) {
      const count = await locator.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (await candidate.isVisible().catch(() => false)) return candidate;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The requested page control was not visible.");
}

async function loadPlaywright() {
  const packageFiles = [join(process.cwd(), "package.json")];
  for (const folder of ["apps", "packages"]) {
    const root = join(process.cwd(), folder);
    if (!existsSync(root)) continue;
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory())
        packageFiles.push(join(root, entry.name, "package.json"));
    }
  }
  for (const packageFile of packageFiles) {
    if (!existsSync(packageFile)) continue;
    const requireFromPackage = createRequire(packageFile);
    for (const moduleName of ["playwright", "@playwright/test"]) {
      try {
        return requireFromPackage(moduleName);
      } catch {}
    }
  }
  throw new Error("This repository does not have Playwright installed.");
}

async function safeTarget(value) {
  try {
    const url = new URL(clean(value));
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      blockedHost(url.hostname)
    )
      return null;
    const records = await dns.lookup(url.hostname, { all: true });
    if (
      records.length === 0 ||
      records.some((record) => privateAddress(record.address))
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

function blockedHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    (isIP(host) > 0 && privateAddress(host))
  );
}

function privateAddress(address) {
  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }
  const parts = address.split(".").map(Number);
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function parseSteps(value) {
  try {
    const parsed = JSON.parse(value ?? "");
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 200)
      return null;
    return parsed.every(validStep) ? parsed : null;
  } catch {
    return null;
  }
}

function validStep(step) {
  if (!step || typeof step !== "object" || Array.isArray(step)) return false;
  if (step.operation === "reload") return Object.keys(step).length === 1;
  if (step.operation === "open")
    return only(step, ["operation", "path"]) && text(step.path, 2048);
  if (step.operation === "click")
    return only(step, ["operation", "target"]) && text(step.target, 500);
  if (step.operation === "check")
    return only(step, ["operation", "text"]) && text(step.text, 500);
  if (step.operation !== "fill" || !text(step.target, 500)) return false;
  if (only(step, ["operation", "target", "value"])) {
    return typeof step.value === "string" && step.value.length <= 4000;
  }
  return (
    only(step, ["operation", "target", "valueFrom"]) &&
    step.valueFrom === "github-test-token"
  );
}
function only(value, keys) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => key in value)
  );
}
function text(value, max) {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
  );
}
function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}
async function writeSummary(summary) {
  await writeFile(
    join(artifactPath, "summary.json"),
    `${JSON.stringify({ journeyName, sourceCommit, ...summary }, null, 2)}\n`,
  );
}
function result(failed) {
  process.stdout.write(
    `KODY_QUALITY_RESULT=${JSON.stringify({ journeyName, artifactPath, passed, failed, sourceCommit })}\n`,
  );
  process.exitCode = failed > 0 ? 1 : 0;
}
