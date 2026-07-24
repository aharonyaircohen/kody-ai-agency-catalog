import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const { stdout } = await execFileAsync(
  "git",
  ["ls-tree", "-r", "--name-only", "HEAD", "implementations"],
  { cwd: root, encoding: "utf8" },
);

let restored = 0;
for (const source of stdout.split("\n").filter(Boolean)) {
  const [, slug, ...relativeParts] = source.split("/");
  const relative = relativeParts.join("/");
  if (
    !slug ||
    !relative ||
    relative === "definition.json" ||
    relative === "runtime.json" ||
    relative === "prompt.md" ||
    relative.startsWith("skills/")
  ) {
    continue;
  }

  const target = join(root, "capabilities", slug, "tools", relative);
  const { stdout: contents } = await execFileAsync(
    "git",
    ["show", `HEAD:${source}`],
    { cwd: root, encoding: "buffer", maxBuffer: 20 * 1024 * 1024 },
  );
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
  restored += 1;
}

process.stdout.write(`Restored ${restored} capability tool assets.\n`);
