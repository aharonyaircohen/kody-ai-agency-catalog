import { existsSync } from "node:fs";

const candidates = [
  new URL("../../../../shared/tools/kody-memory-client.mjs", import.meta.url),
  new URL("../../../shared/tools/kody-memory-client.mjs", import.meta.url),
];
const client = candidates.find((candidate) => existsSync(candidate));
if (!client) throw new Error("Kody typed-memory client is unavailable");
const { runMemoryTool } = await import(client.href);
await runMemoryTool();
