import { describe, expect, it, vi } from "vitest";
import {
  ASSISTANT_CHAT_SEND_MESSAGE_COMMAND,
  ASSISTANT_CITATION_OPEN_EVENT,
  ASSISTANT_CONTEXT_SET_COMMAND,
  Client,
} from "../index.js";
import type {
  XpertExtensionViewManifest,
  XpertViewJsonSchema,
} from "../index.js";

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("ViewHostsClient", () => {
  it("exports Remote View runtime constants and public contract types", () => {
    const inputSchema: XpertViewJsonSchema = {
      type: "object",
      properties: {
        approved: { type: "boolean" },
      },
    };
    const manifest: XpertExtensionViewManifest = {
      key: "provider__view",
      title: { en_US: "View" },
      hostType: "agent",
      slot: "agent.workbench.fixed",
      source: { provider: "provider" },
      view: { type: "raw_json" },
      dataSource: { mode: "platform" },
      actions: [
        {
          key: "approve",
          label: { en_US: "Approve" },
          actionType: "invoke",
          inputSchema,
        },
      ],
    };

    expect(manifest.actions?.[0]?.inputSchema).toBe(inputSchema);
    expect(ASSISTANT_CHAT_SEND_MESSAGE_COMMAND).toBe(
      "assistant.chat.send_message"
    );
    expect(ASSISTANT_CONTEXT_SET_COMMAND).toBe("assistant.context.set");
    expect(ASSISTANT_CITATION_OPEN_EVENT).toBe("assistant.citation.open");
  });

  it("loads slot manifests and an individual manifest", async () => {
    const manifest = {
      key: "provider__view",
      title: { en_US: "View" },
      hostType: "agent",
      slot: "agent.workbench.fixed",
      source: { provider: "provider" },
      view: { type: "raw_json" },
      dataSource: { mode: "platform" },
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([manifest]))
      .mockResolvedValueOnce(jsonResponse(manifest));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.viewHosts.listSlotViews(
        "agent",
        "agent/1",
        "agent.workbench.fixed"
      )
    ).resolves.toEqual([manifest]);
    await expect(
      client.viewHosts.getManifest("agent", "agent/1", "provider__view")
    ).resolves.toEqual(manifest);

    expect((fetchMock.mock.calls[0]?.[0] as URL).pathname).toBe(
      "/api/view-hosts/agent/agent%2F1/slots/agent.workbench.fixed/views"
    );
    expect((fetchMock.mock.calls[1]?.[0] as URL).pathname).toBe(
      "/api/view-hosts/agent/agent%2F1/views/provider__view/manifest"
    );
  });

  it("derives service URLs, encodes path/query values, and preserves request hooks", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([]));
    const onRequest = vi.fn(
      (_url: URL, init: RequestInit): RequestInit => ({
        ...init,
        headers: { ...init.headers, "x-workspace": "workspace-1" },
      })
    );
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai/",
      callerOptions: { fetch: fetchMock },
      onRequest,
    });

    await client.viewHosts.getData(
      "agent",
      "agent/1",
      "provider__view 1",
      {
        page: 2,
        pageSize: 25,
        search: "quarterly report",
        filters: [{ key: "status", operator: "eq", value: "ready" }],
        parameters: { table: "documents", enabled: true },
      },
      { signal }
    );

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).origin).toBe("https://xpert.example");
    expect((url as URL).pathname).toBe(
      "/api/view-hosts/agent/agent%2F1/views/provider__view%201/data"
    );
    expect((url as URL).searchParams.get("page")).toBe("2");
    expect((url as URL).searchParams.get("pageSize")).toBe("25");
    expect((url as URL).searchParams.get("search")).toBe("quarterly report");
    expect(JSON.parse((url as URL).searchParams.get("filters") ?? "")).toEqual([
      { key: "status", operator: "eq", value: "ready" },
    ]);
    expect(
      JSON.parse((url as URL).searchParams.get("parameters") ?? "")
    ).toEqual({
      table: "documents",
      enabled: true,
    });
    expect(init?.signal).toBe(signal);
    expect(new Headers(init?.headers).get("x-workspace")).toBe("workspace-1");
    expect(onRequest).toHaveBeenCalledOnce();
  });

  it("returns remote component entry HTML as text", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('<!doctype html><div id="root"></div>', { status: 200 })
      );
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.viewHosts.getRemoteComponentEntry("agent", "agent-1", "view-1")
    ).resolves.toContain('id="root"');

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("accept")).toBe("text/html");
  });

  it("serializes JSON actions and multipart file actions", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => jsonResponse({ success: true }));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await client.viewHosts.executeAction(
      "agent",
      "agent-1",
      "view-1",
      "approve",
      {
        targetId: "doc-1",
        input: { approved: true },
        parameters: { source: "review" },
      }
    );
    await client.viewHosts.executeFileAction(
      "agent",
      "agent-1",
      "view-1",
      "upload",
      {
        file: new Uint8Array([1, 2, 3]),
        fileName: "evidence.bin",
        targetId: "doc-1",
        input: { replace: true },
        parameters: { source: "review" },
      }
    );

    const [, jsonInit] = fetchMock.mock.calls[0] ?? [];
    expect(jsonInit?.body).toBe(
      JSON.stringify({
        targetId: "doc-1",
        input: { approved: true },
        parameters: { source: "review" },
      })
    );

    const [, fileInit] = fetchMock.mock.calls[1] ?? [];
    expect(fileInit?.body).toBeInstanceOf(FormData);
    const formData = fileInit?.body as FormData;
    expect(formData.get("targetId")).toBe("doc-1");
    expect(formData.get("input")).toBe(JSON.stringify({ replace: true }));
    expect(formData.get("parameters")).toBe(
      JSON.stringify({ source: "review" })
    );
    const file = formData.get("file");
    expect(file).toBeInstanceOf(Blob);
    expect((file as File).name).toBe("evidence.bin");
  });

  it("uses the workspace-files service and credentials for file sessions", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          sessionId: "session/1",
          expiresAt: "2030-01-01T00:00:00.000Z",
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          url: "/content/session-1/grant-1/report.pdf",
          expiresAt: "2030-01-01T00:00:00.000Z",
          fileName: "report.pdf",
          mimeType: "application/pdf",
        })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true }));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await client.viewHosts.createFileAccessSession(
      "agent",
      "agent-1",
      "view-1"
    );
    await client.viewHosts.createFileAccessGrant("session/1", {
      fileKey: "report",
      purpose: "preview",
    });
    await client.viewHosts.revokeFileAccessSession("session/1");

    const [createUrl, createInit] = fetchMock.mock.calls[0] ?? [];
    expect((createUrl as URL).pathname).toBe(
      "/api/workspace-files/view-sessions"
    );
    expect(createInit?.credentials).toBe("include");

    const [grantUrl] = fetchMock.mock.calls[1] ?? [];
    expect((grantUrl as URL).pathname).toBe(
      "/api/workspace-files/view-sessions/session%2F1/grants"
    );

    const [revokeUrl, revokeInit] = fetchMock.mock.calls[2] ?? [];
    expect((revokeUrl as URL).pathname).toBe(
      "/api/workspace-files/view-sessions/session%2F1"
    );
    expect(revokeInit?.credentials).toBe("include");
    expect(revokeInit?.method).toBe("DELETE");
  });

  it("reuses API key, authentication, and organization headers across both services", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({
          sessionId: "session-1",
          expiresAt: "2030-01-01T00:00:00.000Z",
        })
      );
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      apiKey: "api-key-secret",
      defaultHeaders: {
        authorization: "Bearer secret",
        "organization-id": "organization-1",
      },
      callerOptions: { fetch: fetchMock },
    });

    await client.viewHosts.listSlotViews(
      "agent",
      "agent-1",
      "agent.workbench.fixed"
    );
    await client.viewHosts.createFileAccessSession(
      "agent",
      "agent-1",
      "view-1"
    );

    for (const [, init] of fetchMock.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer secret");
      expect(headers.get("x-api-key")).toBe("api-key-secret");
      expect(headers.get("organization-id")).toBe("organization-1");
    }
  });

  it("converts remote entry HTTP errors through the shared caller", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("remote entry unavailable", {
        status: 503,
        statusText: "Service Unavailable",
      })
    );
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock, maxRetries: 0 },
    });

    await expect(
      client.viewHosts.getRemoteComponentEntry("agent", "agent-1", "view-1")
    ).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("remote entry unavailable"),
    });
  });
});
