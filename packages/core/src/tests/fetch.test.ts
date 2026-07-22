import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Client } from "../client.js";
import { overrideFetchImplementation } from "../singletons/fetch.js";

describe.each([["global"], ["mocked"]])(
  "Client uses %s fetch",
  (description: string) => {
    let globalFetchMock: ReturnType<typeof vi.fn>;
    let overriddenFetch: ReturnType<typeof vi.fn>;

    let expectedFetchMock: ReturnType<typeof vi.fn>;
    let unexpectedFetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      const defaultPayload = {
        batch_ingest_config: {
          use_multipart_endpoint: true,
        },
      };
      globalFetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(defaultPayload),
          text: () => Promise.resolve(JSON.stringify(defaultPayload)),
          headers: new Headers({}),
        })
      );
      overriddenFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(defaultPayload),
          text: () => Promise.resolve(JSON.stringify(defaultPayload)),
          headers: new Headers({}),
        })
      );
      expectedFetchMock =
        description === "mocked" ? overriddenFetch : globalFetchMock;
      unexpectedFetchMock =
        description === "mocked" ? globalFetchMock : overriddenFetch;

      if (description === "mocked") {
        overrideFetchImplementation(overriddenFetch);
      } else {
        overrideFetchImplementation(globalFetchMock);
      }
      // Mock global fetch
      (globalThis as any).fetch = globalFetchMock;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("createRuns", () => {
      it("should bind an assistant when creating a thread", async () => {
        const client = new Client({ apiKey: "test-api-key" });

        await client.threads.create({
          assistantId: "assistant-1",
          threadId: "thread-1",
        });

        expect(expectedFetchMock).toHaveBeenCalledTimes(1);
        const requestInit = expectedFetchMock.mock.calls[0]?.[1];
        if (typeof requestInit?.body !== "string") {
          throw new Error("Expected the request body to be serialized JSON");
        }
        expect(JSON.parse(requestInit.body)).toMatchObject({
          assistant_id: "assistant-1",
          thread_id: "thread-1",
        });
      });

      it("should create an example with the given input and generation", async () => {
        const client = new Client({ apiKey: "test-api-key" });

        const thread = await client.threads.create();
        expect(expectedFetchMock).toHaveBeenCalledTimes(1);
        expect(unexpectedFetchMock).not.toHaveBeenCalled();

        vi.clearAllMocks(); // Clear all mocks before the next operation

        // Then clear & run the function
        await client.runs.create(thread.thread_id, "somegraph", {
          input: { action: 'send', message: { input: { input: 'test' } } },
        });
        expect(expectedFetchMock).toHaveBeenCalledTimes(1);
        expect(unexpectedFetchMock).not.toHaveBeenCalled();
      });
    });

    describe("assistants runtime capabilities", () => {
      it("should fetch runtime capabilities with the expected path and signal", async () => {
        const controller = new AbortController();
        const payload = {
          skills: [
            {
              id: "skill-default",
              workspaceId: "workspace-1",
              label: "Default Skill",
              meta: {
                icon: {
                  type: "svg",
                  value: '<svg viewBox="0 0 16 16" />',
                },
              },
              default: true,
            },
          ],
          plugins: [
            {
              nodeKey: "middleware-1",
              provider: "sandbox",
              label: "Sandbox",
              meta: {
                icon: {
                  type: "svg",
                  value: '<svg viewBox="0 0 16 16" />',
                },
              },
              toolNames: ["run_command"],
            },
          ],
          subAgents: [
            {
              nodeKey: "researcher",
              type: "agent",
              label: "Researcher",
              name: "researcher",
              description: "Research helper",
              toolNames: ["search"],
              toolsetNames: ["Search Tools"],
              knowledgebaseNames: ["Docs"],
            },
          ],
        };

        expectedFetchMock.mockImplementationOnce(async (url, init) => {
          expect(url).toBeInstanceOf(URL);
          expect((url as URL).pathname).toBe(
            "/assistants/assistant-1/runtime-capabilities"
          );
          expect(init?.signal).toBe(controller.signal);

          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(payload),
            text: () => Promise.resolve(JSON.stringify(payload)),
            headers: new Headers({}),
          } as Response;
        });

        const client = new Client({ apiKey: "test-api-key" });
        await expect(
          client.assistants.getRuntimeCapabilities("assistant-1", {
            signal: controller.signal,
          })
        ).resolves.toEqual(payload);
      });

      it("should reject 404 responses with a status field", async () => {
        expectedFetchMock.mockImplementationOnce(async () => {
          return {
            ok: false,
            status: 404,
            statusText: "Not Found",
            text: () => Promise.resolve("not found"),
            headers: new Headers({}),
          } as Response;
        });

        const client = new Client({ apiKey: "test-api-key" });
        await expect(
          client.assistants.getRuntimeCapabilities("assistant-1")
        ).rejects.toMatchObject({ status: 404 });
      });
    });

    describe("conversation goals", () => {
      it("should manage conversation goals with the expected paths and signal", async () => {
        const controller = new AbortController();
        const goalPayload = {
          id: "goal-1",
          conversationId: "conversation-1",
          threadId: "thread-1",
          objective: "ship feature",
          status: "active",
          tokensUsed: 0,
          elapsedSeconds: 0,
          continuationCount: 0,
        };
        const expectations = [
          {
            path: "/conversations/conversation-1/goal",
            method: "GET",
            payload: goalPayload,
          },
          {
            path: "/conversations/conversation-1/goal",
            method: "PUT",
            body: { objective: "ship feature" },
            payload: goalPayload,
          },
          {
            path: "/conversations/conversation-1/goal",
            method: "PATCH",
            body: { status: "paused" },
            payload: { ...goalPayload, status: "paused" },
          },
          {
            path: "/conversations/conversation-1/goal",
            method: "DELETE",
            payload: null,
          },
        ];

        for (const expectation of expectations) {
          expectedFetchMock.mockImplementationOnce(async (url, init) => {
            expect(url).toBeInstanceOf(URL);
            expect((url as URL).pathname).toBe(expectation.path);
            expect(init?.method ?? "GET").toBe(expectation.method);
            expect(init?.signal).toBe(controller.signal);
            if (expectation.body) {
              expect(init?.body).toBe(JSON.stringify(expectation.body));
            }

            return {
              ok: true,
              status: 200,
              json: () => Promise.resolve(expectation.payload),
              text: () =>
                Promise.resolve(JSON.stringify(expectation.payload)),
              headers: new Headers({}),
            } as Response;
          });
        }

        const client = new Client({ apiKey: "test-api-key" });

        await expect(
          client.conversations.getGoal("conversation-1", {
            signal: controller.signal,
          })
        ).resolves.toEqual(goalPayload);
        await expect(
          client.conversations.setGoal(
            "conversation-1",
            { objective: "ship feature" },
            { signal: controller.signal }
          )
        ).resolves.toEqual(goalPayload);
        await expect(
          client.conversations.updateGoal(
            "conversation-1",
            { status: "paused" },
            { signal: controller.signal }
          )
        ).resolves.toMatchObject({ status: "paused" });
        await expect(
          client.conversations.clearGoal("conversation-1", {
            signal: controller.signal,
          })
        ).resolves.toBeNull();
      });

      it("should tolerate empty conversation goal responses", async () => {
        const goalPayload = {
          id: "goal-1",
          conversationId: "conversation-1",
          threadId: "thread-1",
          objective: "ship feature",
          status: "active",
          tokensUsed: 0,
          elapsedSeconds: 0,
          continuationCount: 0,
        };

        expectedFetchMock
          .mockImplementationOnce(async (url, init) => {
            expect((url as URL).pathname).toBe(
              "/conversations/conversation-1/goal"
            );
            expect(init?.method ?? "GET").toBe("GET");

            return {
              ok: true,
              status: 200,
              text: () => Promise.resolve(""),
              headers: new Headers({}),
            } as Response;
          })
          .mockImplementationOnce(async (url, init) => {
            expect((url as URL).pathname).toBe(
              "/conversations/conversation-1/goal"
            );
            expect(init?.method ?? "GET").toBe("PUT");

            return {
              ok: true,
              status: 200,
              text: () => Promise.resolve(""),
              headers: new Headers({}),
            } as Response;
          })
          .mockImplementationOnce(async (url, init) => {
            expect((url as URL).pathname).toBe(
              "/conversations/conversation-1/goal"
            );
            expect(init?.method ?? "GET").toBe("GET");

            return {
              ok: true,
              status: 200,
              text: () => Promise.resolve(JSON.stringify(goalPayload)),
              headers: new Headers({}),
            } as Response;
          });

        const client = new Client({ apiKey: "test-api-key" });

        await expect(
          client.conversations.getGoal("conversation-1")
        ).resolves.toBeNull();
        await expect(
          client.conversations.setGoal("conversation-1", {
            objective: "ship feature",
          })
        ).resolves.toEqual(goalPayload);
      });
    });

    describe("conversation task summaries", () => {
      it("fetches the summary snapshot and paginated section", async () => {
        const snapshot = {
          version: 1,
          conversationId: "conversation-1",
          threadId: "thread-1",
          task: {},
          outputs: { items: [], total: 0 },
          sources: { items: [], total: 0 },
          agents: { items: [], total: 0 },
          pending: { items: [], total: 0 },
          updatedAt: "2026-07-13T00:00:00.000Z",
        };
        const page = {
          section: "outputs",
          items: [],
          total: 0,
          offset: 3,
          limit: 50,
        };

        expectedFetchMock
          .mockImplementationOnce(async (url, init) => {
            expect((url as URL).pathname).toBe(
              "/conversations/conversation-1/task-summary"
            );
            expect(init?.signal).toBeUndefined();
            return {
              ok: true,
              status: 200,
              json: () => Promise.resolve(snapshot),
              text: () => Promise.resolve(JSON.stringify(snapshot)),
              headers: new Headers({}),
            } as Response;
          })
          .mockImplementationOnce(async (url) => {
            expect((url as URL).pathname).toBe(
              "/conversations/conversation-1/task-summary/outputs"
            );
            expect((url as URL).searchParams.get("offset")).toBe("3");
            expect((url as URL).searchParams.get("limit")).toBe("50");
            return {
              ok: true,
              status: 200,
              json: () => Promise.resolve(page),
              text: () => Promise.resolve(JSON.stringify(page)),
              headers: new Headers({}),
            } as Response;
          });

        const client = new Client({ apiKey: "test-api-key" });
        await expect(
          client.conversations.getTaskSummary("conversation-1")
        ).resolves.toEqual(snapshot);
        await expect(
          client.conversations.listTaskSummaryItems(
            "conversation-1",
            "outputs",
            { offset: 3, limit: 50 }
          )
        ).resolves.toEqual(page);
      });
    });

    describe("sandbox managed services", () => {
      it("should derive the sandbox API URL and list thread services", async () => {
        const controller = new AbortController();
        const payload = [
          {
            id: "service-1",
            conversationId: "conversation-1",
            provider: "local-shell-sandbox",
            name: "web",
            command: "npm run dev",
            workingDirectory: "/workspace/project-1",
            status: "running",
            transportMode: "http",
          },
        ];

        expectedFetchMock.mockImplementationOnce(async (url, init) => {
          expect(url).toBeInstanceOf(URL);
          expect((url as URL).origin).toBe("https://xpert.local");
          expect((url as URL).pathname).toBe(
            "/api/sandbox/threads/thread-1/services"
          );
          expect((url as URL).searchParams.get("organizationId")).toBe(
            "org-1"
          );
          expect(init?.signal).toBe(controller.signal);

          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(payload),
            text: () => Promise.resolve(JSON.stringify(payload)),
            headers: new Headers({}),
          } as Response;
        });

        const client = new Client({
          apiUrl: "https://xpert.local/api/ai",
          apiKey: "test-api-key",
        });

        await expect(
          client.sandbox.listThreadServices("thread-1", {
            organizationId: "org-1",
            signal: controller.signal,
          })
        ).resolves.toEqual(payload);
      });

      it("should stop a thread service with the expected path", async () => {
        const payload = {
          id: "service-1",
          conversationId: "conversation-1",
          provider: "local-shell-sandbox",
          name: "web",
          command: "npm run dev",
          workingDirectory: "/workspace/project-1",
          status: "stopped",
          transportMode: "http",
        };

        expectedFetchMock.mockImplementationOnce(async (url, init) => {
          expect(url).toBeInstanceOf(URL);
          expect((url as URL).pathname).toBe(
            "/api/sandbox/threads/thread-1/services/service-1/stop"
          );
          expect(init?.method).toBe("POST");

          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(payload),
            text: () => Promise.resolve(JSON.stringify(payload)),
            headers: new Headers({}),
          } as Response;
        });

        const client = new Client({
          apiUrl: "https://xpert.local/api/ai/",
          apiKey: "test-api-key",
        });

        await expect(
          client.sandbox.stopThreadService("thread-1", "service-1")
        ).resolves.toEqual(payload);
      });

      it("should manage conversation services through the sandbox API", async () => {
        const servicePayload = {
          id: "service-1",
          conversationId: "conversation-1",
          provider: "local-shell-sandbox",
          name: "web",
          command: "npm run dev",
          workingDirectory: "/workspace/project-1",
          status: "running",
          transportMode: "http",
        };
        const logsPayload = { stdout: "ready", stderr: "" };
        const previewPayload = {
          expiresAt: "2026-05-02T12:00:00.000Z",
          previewUrl:
            "/api/sandbox/conversations/conversation-1/services/service-1/proxy/",
        };
        const expectations = [
          {
            path: "/api/sandbox/conversations/conversation-1/services",
            method: "GET",
            payload: [servicePayload],
          },
          {
            path: "/api/sandbox/conversations/conversation-1/services/service-1",
            method: "GET",
            payload: servicePayload,
          },
          {
            path: "/api/sandbox/conversations/conversation-1/services/start",
            method: "POST",
            payload: servicePayload,
          },
          {
            path: "/api/sandbox/conversations/conversation-1/services/service-1/logs",
            method: "GET",
            payload: logsPayload,
            tail: "120",
          },
          {
            path: "/api/sandbox/conversations/conversation-1/services/service-1/stop",
            method: "POST",
            payload: { ...servicePayload, status: "stopped" },
          },
          {
            path: "/api/sandbox/conversations/conversation-1/services/service-1/restart",
            method: "POST",
            payload: servicePayload,
          },
          {
            path: "/api/sandbox/conversations/conversation-1/services/service-1/preview-session",
            method: "POST",
            payload: previewPayload,
          },
        ];

        for (const expectation of expectations) {
          expectedFetchMock.mockImplementationOnce(async (url, init) => {
            expect((url as URL).pathname).toBe(expectation.path);
            expect((url as URL).searchParams.get("organizationId")).toBe(
              "org-1"
            );
            if (expectation.tail) {
              expect((url as URL).searchParams.get("tail")).toBe(
                expectation.tail
              );
            }
            expect(init?.method ?? "GET").toBe(expectation.method);
            return {
              ok: true,
              status: 200,
              json: () => Promise.resolve(expectation.payload),
              text: () => Promise.resolve(JSON.stringify(expectation.payload)),
              headers: new Headers({}),
            } as Response;
          });
        }

        const client = new Client({
          apiUrl: "https://xpert.local/api/ai",
          apiKey: "test-api-key",
        });
        const options = { organizationId: "org-1" };

        await expect(
          client.sandbox.listConversationServices("conversation-1", options)
        ).resolves.toEqual([servicePayload]);
        await expect(
          client.sandbox.getConversationService(
            "conversation-1",
            "service-1",
            options
          )
        ).resolves.toEqual(servicePayload);
        await expect(
          client.sandbox.startConversationService(
            "conversation-1",
            {
              name: "web",
              command: "npm run dev",
              port: 4173,
            },
            options
          )
        ).resolves.toEqual(servicePayload);
        await expect(
          client.sandbox.getConversationServiceLogs(
            "conversation-1",
            "service-1",
            { ...options, tail: 120 }
          )
        ).resolves.toEqual(logsPayload);
        await expect(
          client.sandbox.stopConversationService(
            "conversation-1",
            "service-1",
            options
          )
        ).resolves.toMatchObject({ status: "stopped" });
        await expect(
          client.sandbox.restartConversationService(
            "conversation-1",
            "service-1",
            options
          )
        ).resolves.toEqual(servicePayload);
        await expect(
          client.sandbox.createConversationServicePreviewSession(
            "conversation-1",
            "service-1",
            options
          )
        ).resolves.toEqual(previewPayload);

        expect(
          client.sandbox.getConversationServiceProxyUrl(
            "conversation-1",
            "service-1",
            "index.html"
          )
        ).toBe(
          "https://xpert.local/api/sandbox/conversations/conversation-1/services/service-1/proxy/index.html"
        );
      });

      it("should manage thread services through the sandbox API", async () => {
        const servicePayload = {
          id: "service-1",
          conversationId: "conversation-1",
          provider: "local-shell-sandbox",
          name: "web",
          command: "npm run dev",
          workingDirectory: "/workspace/project-1",
          status: "running",
          transportMode: "http",
        };
        const logsPayload = { stdout: "ready", stderr: "" };
        const previewPayload = {
          expiresAt: "2026-05-02T12:00:00.000Z",
          previewUrl:
            "/api/sandbox/conversations/conversation-1/services/service-1/proxy/",
        };
        const expectations = [
          {
            path: "/api/sandbox/threads/thread-1/services/service-1",
            method: "GET",
            payload: servicePayload,
          },
          {
            path: "/api/sandbox/threads/thread-1/services/start",
            method: "POST",
            payload: servicePayload,
          },
          {
            path: "/api/sandbox/threads/thread-1/services/service-1/logs",
            method: "GET",
            payload: logsPayload,
          },
          {
            path: "/api/sandbox/threads/thread-1/services/service-1/restart",
            method: "POST",
            payload: servicePayload,
          },
          {
            path: "/api/sandbox/threads/thread-1/services/service-1/preview-session",
            method: "POST",
            payload: previewPayload,
          },
        ];

        for (const expectation of expectations) {
          expectedFetchMock.mockImplementationOnce(async (url, init) => {
            expect((url as URL).pathname).toBe(expectation.path);
            expect(init?.method ?? "GET").toBe(expectation.method);
            return {
              ok: true,
              status: 200,
              json: () => Promise.resolve(expectation.payload),
              text: () => Promise.resolve(JSON.stringify(expectation.payload)),
              headers: new Headers({}),
            } as Response;
          });
        }

        const client = new Client({
          apiUrl: "https://xpert.local/api/ai",
          apiKey: "test-api-key",
        });

        await expect(
          client.sandbox.getThreadService("thread-1", "service-1")
        ).resolves.toEqual(servicePayload);
        await expect(
          client.sandbox.startThreadService("thread-1", {
            name: "web",
            command: "npm run dev",
          })
        ).resolves.toEqual(servicePayload);
        await expect(
          client.sandbox.getThreadServiceLogs("thread-1", "service-1")
        ).resolves.toEqual(logsPayload);
        await expect(
          client.sandbox.restartThreadService("thread-1", "service-1")
        ).resolves.toEqual(servicePayload);
        await expect(
          client.sandbox.createThreadServicePreviewSession(
            "thread-1",
            "service-1"
          )
        ).resolves.toEqual(previewPayload);
      });
    });

    describe("header coalescing", () => {
      it("should properly merge headers with conflicting name casing", async () => {
        const client = new Client({ apiKey: "test-api-key" });
        await (client.threads as any).fetch("/test", {
          headers: { "X-Api-Key": "custom-value" },
        });
        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "custom-value",
            }),
          })
        );
      });

      it("should properly merge headers from multiple sources", async () => {
        const client = new Client({
          apiKey: "test-api-key",
          defaultHeaders: {
            "x-default": "default-value",
            "x-override": "default-value",
          },
        });

        await (client.threads as any).fetch("/test", {
          headers: {
            "x-custom": "custom-value",
            "x-override": "custom-value",
          },
        });

        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "test-api-key",
              "x-default": "default-value",
              "x-custom": "custom-value",
              "x-override": "custom-value",
            }),
          })
        );

        vi.clearAllMocks();

        // Test with null/undefined values
        await (client.threads as any).fetch("/test", {
          headers: {
            "x-null": null,
            "x-undefined": undefined,
            "x-empty": "",
          },
        });

        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "test-api-key",
              "x-default": "default-value",
            }),
          })
        );
        expect(expectedFetchMock).not.toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-null": null,
              "x-undefined": undefined,
            }),
          })
        );
      });

      it("should handle Headers object input", async () => {
        const client = new Client({ apiKey: "test-api-key" });
        const headers = new Headers();
        headers.append("x-custom", "custom-value");
        headers.append("x-multi", "value1");
        headers.append("x-multi", "value2");

        await (client.threads as any).fetch("/test", { headers });

        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "test-api-key",
              "x-custom": "custom-value",
              "x-multi": "value1, value2",
            }),
          })
        );
      });

      it("should handle array of header tuples", async () => {
        const client = new Client({
          apiKey: "test-api-key",
          defaultHeaders: {
            "x-custom": "custom-value",
          },
        });
        const headers = [
          ["x-multi", "value1"],
          ["x-multi", "value2"],
        ];

        await (client.threads as any).fetch("/test", { headers });

        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "test-api-key",
              "x-custom": "custom-value",
              "x-multi": "value1, value2",
            }),
          })
        );
      });
    });
  }
);
