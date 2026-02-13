import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTerminateUser } from "../../src/tools/terminate-user.js";
import { createMockPusherClient } from "../helpers.js";

vi.mock("../../src/pusher-client.js", () => ({
  getPusherClient: vi.fn(),
}));

import { getPusherClient } from "../../src/pusher-client.js";

describe("terminate_user_connections", () => {
  let server: McpServer;
  let client: Client;
  let mockPusher: ReturnType<typeof createMockPusherClient>;

  beforeEach(async () => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    client = new Client({ name: "test-client", version: "1.0.0" });

    mockPusher = createMockPusherClient();
    vi.mocked(getPusherClient).mockReturnValue(mockPusher as any);

    registerTerminateUser(server);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("terminates all connections for a user", async () => {
    const result = await client.callTool({
      name: "terminate_user_connections",
      arguments: { userId: "user-42" },
    });

    expect(mockPusher.terminateUserConnections).toHaveBeenCalledWith(
      "user-42"
    );
    expect(result.content).toEqual([
      {
        type: "text",
        text: 'All connections terminated for user "user-42"',
      },
    ]);
    expect(result.isError).toBeFalsy();
  });

  it("handles API errors", async () => {
    mockPusher.terminateUserConnections.mockRejectedValueOnce(
      new Error("User not found")
    );

    const result = await client.callTool({
      name: "terminate_user_connections",
      arguments: { userId: "nonexistent" },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to terminate user connections: User not found",
      },
    ]);
  });

  it("handles non-Error exceptions", async () => {
    mockPusher.terminateUserConnections.mockRejectedValueOnce(42);

    const result = await client.callTool({
      name: "terminate_user_connections",
      arguments: { userId: "user-1" },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to terminate user connections: Unknown error",
      },
    ]);
  });
});
