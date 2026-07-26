import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  callMemoryApi,
  callMemoryLearningApi,
  callMemoryTool,
  engineIdentityToken,
} from "../shared/tools/kody-memory-client.mjs";

describe("repository memory tool", () => {
  it("uses GitHub workflow identity without exposing it in the command body", async () => {
    const calls = [];
    const fetchImpl = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (calls.length === 1) {
        return new Response(JSON.stringify({ value: "signed-oidc-token" }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ memories: [] }), { status: 200 });
    };
    const env = {
      GITHUB_ACTIONS: "true",
      ACTIONS_ID_TOKEN_REQUEST_URL:
        "https://github.example/id-token?existing=value",
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
      KODY_API_URL: "https://dashboard.example",
    };

    const result = await callMemoryApi(
      { action: "list" },
      { env, fetchImpl },
    );

    assert.deepEqual(result, { memories: [] });
    assert.equal(
      calls[0].url,
      "https://github.example/id-token?existing=value&audience=kody-api",
    );
    assert.equal(
      calls[0].init.headers.Authorization,
      "Bearer request-token",
    );
    assert.equal(
      calls[1].url,
      "https://dashboard.example/api/kody/engine/memory",
    );
    assert.equal(calls[1].init.headers.Authorization, "Bearer signed-oidc-token");
    assert.equal(calls[1].init.body, JSON.stringify({ action: "list" }));
    assert.doesNotMatch(calls[1].init.body, /request-token|signed-oidc-token/);
  });

  it("rejects execution outside GitHub Actions", async () => {
    await assert.rejects(
      engineIdentityToken(
        {
          GITHUB_ACTIONS: "false",
          ACTIONS_ID_TOKEN_REQUEST_URL: "https://github.example/id-token",
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
        },
        async () => new Response(),
      ),
      /GitHub Actions identity is required/,
    );
  });

  it("uses the separate learning ledger endpoint", async () => {
    const calls = [];
    const fetchImpl = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      return calls.length === 1
        ? new Response(JSON.stringify({ value: "signed-oidc-token" }))
        : new Response(JSON.stringify({ runId: "source-run-1" }));
    };

    const result = await callMemoryLearningApi(
      { action: "claim" },
      {
        env: {
          GITHUB_ACTIONS: "true",
          ACTIONS_ID_TOKEN_REQUEST_URL: "https://github.example/id-token",
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
          KODY_API_URL: "https://dashboard.example",
        },
        fetchImpl,
      },
    );

    assert.deepEqual(result, { runId: "source-run-1" });
    assert.equal(
      calls[1].url,
      "https://dashboard.example/api/kody/engine/memory-learning",
    );
    assert.equal(calls[1].init.body, JSON.stringify({ action: "claim" }));
  });

  it("honors the Dashboard URL supplied by the workflow", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(String(url));
      return calls.length === 1
        ? new Response(JSON.stringify({ value: "signed-oidc-token" }))
        : new Response(JSON.stringify({ memories: [] }));
    };

    await callMemoryApi(
      { action: "list" },
      {
        env: {
          GITHUB_ACTIONS: "true",
          ACTIONS_ID_TOKEN_REQUEST_URL: "https://github.example/id-token",
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
          DASHBOARD_URL: "https://current-dashboard.example",
        },
        fetchImpl,
      },
    );

    assert.equal(
      calls[1],
      "https://current-dashboard.example/api/kody/engine/memory",
    );
  });

  it("routes a resource command without forwarding the routing field", async () => {
    const calls = [];
    const fetchImpl = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      return calls.length === 1
        ? new Response(JSON.stringify({ value: "signed-oidc-token" }))
        : new Response(JSON.stringify({ completed: true }));
    };

    await callMemoryTool(
      {
        resource: "learning",
        action: "complete",
        sourceRunId: "source-run-1",
      },
      {
        env: {
          GITHUB_ACTIONS: "true",
          ACTIONS_ID_TOKEN_REQUEST_URL: "https://github.example/id-token",
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
          KODY_API_URL: "https://dashboard.example",
        },
        fetchImpl,
      },
    );

    assert.equal(
      calls[1].init.body,
      JSON.stringify({
        action: "complete",
        sourceRunId: "source-run-1",
      }),
    );
    await assert.rejects(
      callMemoryTool({ resource: "personal", action: "list" }),
      /resource must be "memory" or "learning"/,
    );
  });

  it("rejects insecure identity and API URLs", async () => {
    await assert.rejects(
      engineIdentityToken(
        {
          GITHUB_ACTIONS: "true",
          ACTIONS_ID_TOKEN_REQUEST_URL: "http://github.example/id-token",
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
        },
        async () => new Response(),
      ),
      /HTTPS/,
    );

    await assert.rejects(
      callMemoryApi(
        { action: "list" },
        {
          env: {
            GITHUB_ACTIONS: "true",
            ACTIONS_ID_TOKEN_REQUEST_URL: "https://github.example/id-token",
            ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
            KODY_API_URL: "http://dashboard.example",
          },
          fetchImpl: async () =>
            new Response(JSON.stringify({ value: "signed" }), { status: 200 }),
        },
      ),
      /HTTPS/,
    );
  });

  it("fails closed when either remote endpoint rejects the request", async () => {
    await assert.rejects(
      callMemoryApi(
        { action: "list" },
        {
          env: {
            GITHUB_ACTIONS: "true",
            ACTIONS_ID_TOKEN_REQUEST_URL: "https://github.example/id-token",
            ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
            KODY_API_URL: "https://dashboard.example",
          },
          fetchImpl: async () => new Response("denied", { status: 401 }),
        },
      ),
      /identity request failed \(401\)/,
    );
  });
});
