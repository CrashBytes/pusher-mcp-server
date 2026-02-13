import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerListChannels } from "../../src/tools/list-channels.js";
import { createMockPusherClient } from "../helpers.js";

vi.mock("../../src/pusher-client.js", () => ({
  getPusherClient: vi.fn(),
}));

import { getPusherClient } from "../../src/pusher-client.js";

describe("list_channels", () => {
  let server: McpServer;
  let client: Client;
  let mockPusher: ReturnType<typeof createMockPusherClient>;

  beforeEach(async () => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    client = new Client({ name: "test-client", version: "1.0.0" });

    mockPusher = createMockPusherClient();
    vi.mocked(getPusherClient).mockReturnValue(mockPusher as any);

    registerListChannels(server);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("lists active channels", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        channels: {
          "chat-room": {},
          "notifications": {},
          "presence-lobby": {},
        },
      }),
    });

    const result = await client.callTool({
      name: "list_channels",
      arguments: {},
    });

    expect(mockPusher.get).toHaveBeenCalledWith({
      path: "/channels",
      params: {},
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Active channels (3):\nchat-room\nnotifications\npresence-lobby",
      },
    ]);
  });

  it("filters by prefix", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        channels: {
          "presence-room-1": { user_count: 5 },
          "presence-room-2": { user_count: 3 },
        },
      }),
    });

    const result = await client.callTool({
      name: "list_channels",
      arguments: {
        prefix: "presence-",
        info: ["user_count"],
      },
    });

    expect(mockPusher.get).toHaveBeenCalledWith({
      path: "/channels",
      params: {
        filter_by_prefix: "presence-",
        info: "user_count",
      },
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Active channels (2):\npresence-room-1 — users: 5\npresence-room-2 — users: 3",
      },
    ]);
  });

  it("includes subscription count when requested", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        channels: {
          "my-channel": { subscription_count: 42 },
        },
      }),
    });

    const result = await client.callTool({
      name: "list_channels",
      arguments: {
        info: ["subscription_count"],
      },
    });

    expect(result.content).toEqual([
      {
        type: "text",
        text: "Active channels (1):\nmy-channel — subscriptions: 42",
      },
    ]);
  });

  it("returns message when no channels are active", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ channels: {} }),
    });

    const result = await client.callTool({
      name: "list_channels",
      arguments: {},
    });

    expect(result.content).toEqual([
      { type: "text", text: "No active channels" },
    ]);
  });

  it("returns message when no channels match prefix", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ channels: {} }),
    });

    const result = await client.callTool({
      name: "list_channels",
      arguments: { prefix: "private-" },
    });

    expect(result.content).toEqual([
      {
        type: "text",
        text: 'No active channels matching prefix "private-"',
      },
    ]);
  });

  it("handles non-200 API responses", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 403,
      json: async () => ({}),
    });

    const result = await client.callTool({
      name: "list_channels",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "Pusher API returned status 403" },
    ]);
  });

  it("handles API exceptions", async () => {
    mockPusher.get.mockRejectedValueOnce(new Error("Network timeout"));

    const result = await client.callTool({
      name: "list_channels",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "Failed to list channels: Network timeout" },
    ]);
  });
});
