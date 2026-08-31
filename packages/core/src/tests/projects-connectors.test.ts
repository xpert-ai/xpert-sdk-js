import { describe, expect, it, vi } from "vitest";
import { Client } from "../index.js";
import type {
  ConnectorConnectRequest,
  ConnectorStrategyDefinition,
  XpertProject,
  XpertWorkspaceFile,
} from "../index.js";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ProjectsClient", () => {
  it("lists only projects available to an Xpert and preserves request hooks", async () => {
    const projects: XpertProject[] = [
      {
        id: "project-1",
        name: "Launch plan",
        status: "active",
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: projects, total: 1 }));
    const onRequest = vi.fn((_url: URL, init: RequestInit) => ({
      ...init,
      headers: { ...init.headers, "organization-id": "org-1" },
    }));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai/",
      apiKey: "secret",
      callerOptions: { fetch: fetchMock },
      onRequest,
    });

    await expect(client.projects.list({ xpertId: "xpert/1" })).resolves.toEqual(
      {
        items: projects,
        total: 1,
      }
    );

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect((url as URL).pathname).toBe("/api/xpert-project/available");
    expect((url as URL).searchParams.get("xpertId")).toBe("xpert/1");
    expect((url as URL).searchParams.get("status")).toBe("active");
    expect((url as URL).searchParams.get("skip")).toBe("0");
    expect((url as URL).searchParams.get("take")).toBe("100");
    expect(init?.headers).toMatchObject({
      "organization-id": "org-1",
      "x-api-key": "secret",
    });
    expect(onRequest).toHaveBeenCalledOnce();
  });

  it("gets a project by encoded id", async () => {
    const project: XpertProject = {
      id: "project/1",
      name: "Launch plan",
      status: "active",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(project));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await expect(client.projects.get("project/1")).resolves.toEqual(project);
    expect((fetchMock.mock.calls[0]?.[0] as URL).pathname).toBe(
      "/api/xpert-project/project%2F1"
    );
  });

  it("requests all project statuses explicitly", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: [], total: 0 }));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await client.projects.list({
      xpertId: "xpert-1",
      status: "all",
      skip: 10,
      take: 20,
    });

    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("xpertId")).toBe("xpert-1");
    expect(url.searchParams.get("status")).toBe("all");
    expect(url.searchParams.get("skip")).toBe("10");
    expect(url.searchParams.get("take")).toBe("20");
  });

  it("lists project workspace files with the requested depth", async () => {
    const files: XpertWorkspaceFile[] = [
      {
        filePath: "briefs",
        hasChildren: true,
        children: [
          { filePath: "briefs/product.pdf", mimeType: "application/pdf" },
        ],
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(files));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      apiKey: "secret",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.projects.listFiles("project/1", {
        path: "briefs",
        depth: 8,
      })
    ).resolves.toEqual(files);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect((url as URL).pathname).toBe("/api/xpert-project/project%2F1/files");
    expect((url as URL).searchParams.get("path")).toBe("briefs");
    expect((url as URL).searchParams.get("deepth")).toBe("8");
    expect(init?.headers).toMatchObject({ "x-api-key": "secret" });
  });
});

describe("AssistantsClient runtime capabilities", () => {
  it("scopes runtime capabilities to the selected project", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ skills: [], plugins: [] }));
    const controller = new AbortController();
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await client.assistants.getRuntimeCapabilities("xpert/1", {
      projectId: "project/1",
      signal: controller.signal,
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect((url as URL).pathname).toBe(
      "/api/ai/assistants/xpert/1/runtime-capabilities"
    );
    expect((url as URL).searchParams.get("projectId")).toBe("project/1");
    expect(init?.signal).toBe(controller.signal);
  });
});

describe("XpertsClient", () => {
  it("lists an assistants workspace files without a conversation", async () => {
    const files: XpertWorkspaceFile[] = [
      { filePath: "project.md", mimeType: "text/markdown", size: 42 },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(files));
    const controller = new AbortController();
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.xperts.listWorkspaceFiles("assistant/1", {
        depth: 12,
        signal: controller.signal,
      })
    ).resolves.toEqual(files);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect((url as URL).pathname).toBe(
      "/api/xpert/assistant%2F1/workspace/files"
    );
    expect((url as URL).searchParams.get("deepth")).toBe("12");
    expect(init?.signal).toBe(controller.signal);
  });
});

describe("WorkspacesClient", () => {
  it("gets the current users default authoring workspace", async () => {
    const workspace = {
      id: "workspace-1",
      name: "Personal workspace",
      status: "active" as const,
      ownerId: "user-1",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(workspace));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      apiKey: "secret",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.workspaces.getDefault({ purpose: "authoring" })
    ).resolves.toEqual(workspace);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect((url as URL).pathname).toBe("/api/xpert-workspace/my/default");
    expect((url as URL).searchParams.get("purpose")).toBe("authoring");
    expect(init?.headers).toMatchObject({ "x-api-key": "secret" });
  });
});

describe("ConnectorsClient", () => {
  it("loads runtime options for the Xpert and selected project", async () => {
    const response = {
      scope: { type: "project" as const, projectId: "project-1" },
      items: [
        {
          bindingId: "binding-1",
          provider: "google-drive",
          authorizationMode: "personal" as const,
          status: "active" as const,
          granted: true,
          label: "Google Drive",
          authMethods: [
            { id: "oauth2", type: "oauth2" as const, label: "OAuth" },
          ],
        },
      ],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(response));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.connectors.runtimeOptions("xpert/1", {
        projectId: "project/1",
      })
    ).resolves.toEqual(response);

    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.pathname).toBe("/api/connector/runtime-options");
    expect(url.searchParams.get("xpertId")).toBe("xpert/1");
    expect(url.searchParams.get("projectId")).toBe("project/1");
  });

  it("lists definitions and bindings for a typed scope", async () => {
    const definitions: ConnectorStrategyDefinition[] = [
      {
        provider: "google-drive",
        label: { en_US: "Google Drive", zh_Hans: "Google Drive" },
        auth: { type: "oauth2" },
      },
    ];
    const bindings = [
      {
        id: "binding-1",
        scopeType: "project" as const,
        scope: { type: "project" as const, projectId: "project-1" },
        projectId: "project-1",
        provider: "google-drive",
        authorizationMode: "shared" as const,
        status: "active" as const,
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(definitions))
      .mockResolvedValueOnce(jsonResponse(bindings));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    const scope = { type: "project" as const, projectId: "project/1" };
    await expect(client.connectors.definitions(scope)).resolves.toEqual(
      definitions
    );
    await expect(client.connectors.listBindings(scope)).resolves.toEqual(
      bindings
    );

    expect((fetchMock.mock.calls[0]?.[0] as URL).pathname).toBe(
      "/api/connector/definitions"
    );
    expect(
      (fetchMock.mock.calls[0]?.[0] as URL).searchParams.get("scopeType")
    ).toBe("project");
    expect(
      (fetchMock.mock.calls[0]?.[0] as URL).searchParams.get("scopeId")
    ).toBe("project/1");
    expect((fetchMock.mock.calls[1]?.[0] as URL).pathname).toBe(
      "/api/connector/bindings"
    );
  });

  it("starts and polls connector authorization with typed payloads", async () => {
    const connectInput: ConnectorConnectRequest = {
      authMethodId: "oauth2",
      xpertId: "xpert-1",
    };
    const pending = {
      status: "pending" as const,
      connector: {
        id: "connector-1",
        workspaceId: "workspace-1",
        provider: "google-drive",
        authMethodId: "oauth2",
        status: "pending" as const,
      },
      authorizationUrl: "https://accounts.example/authorize",
      pollIntervalSeconds: 5,
    };
    const active = {
      connector: { ...pending.connector, status: "active" as const },
      granted: true,
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(pending))
      .mockResolvedValueOnce(jsonResponse(active));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.connectors.connect("binding/1", connectInput)
    ).resolves.toEqual(pending);
    await expect(
      client.connectors.authorizationStatus("binding/1", {
        xpertId: "xpert-1",
      })
    ).resolves.toEqual(active);

    const [connectUrl, connectInit] = fetchMock.mock.calls[0] ?? [];
    expect((connectUrl as URL).pathname).toBe(
      "/api/connector/bindings/binding%2F1/connect"
    );
    expect(connectInit?.method).toBe("POST");
    expect(connectInit?.body).toBe(JSON.stringify(connectInput));
    expect((fetchMock.mock.calls[1]?.[0] as URL).pathname).toBe(
      "/api/connector/bindings/binding%2F1/authorization-status"
    );
    expect(
      (fetchMock.mock.calls[1]?.[0] as URL).searchParams.get("xpertId")
    ).toBe("xpert-1");
  });

  it("records personal Connector consent in the current Xpert context", async () => {
    const granted = {
      id: "binding-1",
      provider: "google-drive",
      scopeType: "project" as const,
      scope: { type: "project" as const, projectId: "project-1" },
      projectId: "project-1",
      authorizationMode: "personal" as const,
      status: "active" as const,
      profile: { name: "Alice" },
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(granted));
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.connectors.consent("binding/1", { xpertId: "xpert-1" })
    ).resolves.toEqual(granted);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect((url as URL).pathname).toBe(
      "/api/connector/bindings/binding%2F1/consent"
    );
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ xpertId: "xpert-1" }));
  });

  it("lists the current users personal Connector accounts", async () => {
    const accounts = [
      {
        id: "account-1",
        provider: "google-drive",
        status: "active" as const,
        profile: { name: "Alice" },
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(accounts));
    const controller = new AbortController();
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.connectors.listPersonalAccounts({ signal: controller.signal })
    ).resolves.toEqual(accounts);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect((url as URL).pathname).toBe("/api/connector/personal-accounts");
    expect(init?.signal).toBe(controller.signal);
  });

  it("surfaces connector API errors through the shared HTTP error contract", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("connector access denied", {
        status: 403,
        statusText: "Forbidden",
      })
    );
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      callerOptions: { fetch: fetchMock, maxRetries: 0 },
    });

    await expect(
      client.connectors.runtimeOptions("xpert-1")
    ).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining("connector access denied"),
    });
  });
});

describe("ConversationsClient workspace files", () => {
  it("lists the workspace files bound to an encoded conversation id", async () => {
    const files: XpertWorkspaceFile[] = [
      { filePath: "brief.pdf", mimeType: "application/pdf", size: 2048 },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(files));
    const controller = new AbortController();
    const client = new Client({
      apiUrl: "https://xpert.example/api/ai",
      apiKey: "secret",
      callerOptions: { fetch: fetchMock },
    });

    await expect(
      client.conversations.listWorkspaceFiles("conversation/1", {
        depth: 4,
        signal: controller.signal,
      })
    ).resolves.toEqual(files);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect((url as URL).pathname).toBe(
      "/api/ai/conversations/conversation%2F1/files"
    );
    expect((url as URL).searchParams.get("deepth")).toBe("4");
    expect(init?.headers).toMatchObject({ "x-api-key": "secret" });
    expect(init?.signal).toBe(controller.signal);
  });
});
