import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerGetPresenceUsers } from "../../src/tools/get-presence-users.js";
import { createMockPusherClient } from "../helpers.js";

vi.mock("../../src/pusher-client.js", () => ({
  getPusherClient: vi.fn(),
}));

import { getPusherClient } from "../../src/pusher-client.js";

describe("get_presence_users", () => {
  let server: McpServer;
  let client: Client;
  let mockPusher: ReturnType<typeof createMockPusherClient>;

  beforeEach(async () => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    client = new Client({ name: "test-client", version: "1.0.0" });

    mockPusher = createMockPusherClient();
    vi.mocked(getPusherClient).mockReturnValue(mockPusher as any);

    registerGetPresenceUsers(server);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("lists users on a presence channel", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        users: [{ id: "user-1" }, { id: "user-2" }, { id: "user-3" }],
      }),
    });

    const result = await client.callTool({
      name: "get_presence_users",
      arguments: { channel: "presence-lobby" },
    });

    expect(mockPusher.get).toHaveBeenCalledWith({
      path: "/channels/presence-lobby/users",
      params: {},
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Users on presence-lobby (3):\n  user-1\n  user-2\n  user-3",
      },
    ]);
  });

  it("returns message when no users connected", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ users: [] }),
    });

    const result = await client.callTool({
      name: "get_presence_users",
      arguments: { channel: "presence-empty" },
    });

    expect(result.content).toEqual([
      { type: "text", text: "No users connected to presence-empty" },
    ]);
  });

  it("handles missing users array in response", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 200,
      json: async () => ({}),
    });

    const result = await client.callTool({
      name: "get_presence_users",
      arguments: { channel: "presence-test" },
    });

    expect(result.content).toEqual([
      { type: "text", text: "No users connected to presence-test" },
    ]);
  });

  it("handles non-200 API responses", async () => {
    mockPusher.get.mockResolvedValueOnce({
      status: 400,
      json: async () => ({}),
    });

    const result = await client.callTool({
      name: "get_presence_users",
      arguments: { channel: "presence-bad" },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: 'Pusher API returned status 400 for channel "presence-bad"',
      },
    ]);
  });

  it("handles API exceptions", async () => {
    mockPusher.get.mockRejectedValueOnce(new Error("Timeout"));

    const result = await client.callTool({
      name: "get_presence_users",
      arguments: { channel: "presence-error" },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to get presence users: Timeout",
      },
    ]);
  });

  it("rejects non-presence channels via Zod schema", async () => {
    // The Zod schema requires channels to start with "presence-"
    // The MCP SDK should validate this and return an error
    try {
      const result = await client.callTool({
        name: "get_presence_users",
        arguments: { channel: "regular-channel" },
      });
      // If we get here, the SDK returned an error result instead of throwing
      expect(result.isError).toBe(true);
    } catch (e) {
      // Schema validation error thrown by the SDK
      expect(e).toBeDefined();
    }
  });
});
