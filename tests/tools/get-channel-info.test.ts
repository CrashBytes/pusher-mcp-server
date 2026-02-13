import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerGetChannelInfo } from "../../src/tools/get-channel-info.js";
import { createMockPusherClient } from "../helpers.js";

vi.mock("../../src/pusher-client.js", () => ({
  getPusherClient: vi.fn(),
}));

import { getPusherClient } from "../../src/pusher-client.js";

describe("get_channel_info", () => {
  let server: McpServer;
  let client: Client;
  let mockPusher: ReturnType<typeof createMockPusherClient>;

  beforeEach(async () => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    client = new Client({ name: "test-client", version: "1.0.0" });

    mockPusher = createMockPusherClient();
    vi.mocked(getPusherClient).mockReturnValue(mockPusher as any);

    registerGetChannelInfo(server);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("returns channel info with occupied status", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ occupied: true }),
    });

    const result = await client.callTool({
      name: "get_channel_info",
      arguments: { channel: "my-channel" },
    });

    expect(mockPusher.get).toHaveBeenCalledWith({
      path: "/channels/my-channel",
      params: {},
    });
    expect(result.content).toEqual([
      { type: "text", text: "Channel: my-channel\nOccupied: true" },
    ]);
  });

  it("returns subscription and user counts when requested", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        occupied: true,
        subscription_count: 15,
        user_count: 8,
      }),
    });

    const result = await client.callTool({
      name: "get_channel_info",
      arguments: {
        channel: "presence-room",
        info: ["subscription_count", "user_count"],
      },
    });

    expect(mockPusher.get).toHaveBeenCalledWith({
      path: "/channels/presence-room",
      params: { info: "subscription_count,user_count" },
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Channel: presence-room\nOccupied: true\nSubscriptions: 15\nUsers: 8",
      },
    ]);
  });

  it("encodes special characters in channel name", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ occupied: false }),
    });

    await client.callTool({
      name: "get_channel_info",
      arguments: { channel: "private-user@domain" },
    });

    expect(mockPusher.get).toHaveBeenCalledWith({
      path: "/channels/private-user%40domain",
      params: {},
    });
  });

  it("handles non-200 API responses", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 404,
      json: async () => ({}),
    });

    const result = await client.callTool({
      name: "get_channel_info",
      arguments: { channel: "nonexistent" },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: 'Pusher API returned status 404 for channel "nonexistent"',
      },
    ]);
  });

  it("handles API exceptions", async () => {
    mockPusher.get.mockRejectedValueOnce(new Error("Connection refused"));

    const result = await client.callTool({
      name: "get_channel_info",
      arguments: { channel: "test" },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to get channel info: Connection refused",
      },
    ]);
  });

  it("returns only channel name when no extra info in response", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({}),
    });

    const result = await client.callTool({
      name: "get_channel_info",
      arguments: { channel: "empty-channel" },
    });

    expect(result.content).toEqual([
      { type: "text", text: "Channel: empty-channel" },
    ]);
  });
});
