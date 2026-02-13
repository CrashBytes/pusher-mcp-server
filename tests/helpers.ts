import { vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Creates a mock Pusher client with all methods stubbed.
 */
export function createMockPusherClient() {
  return {
    trigger: vi.fn().mockResolvedValue({}),
    triggerBatch: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    }),
    authorizeChannel: vi.fn().mockReturnValue({
      auth: "test-app-key:auth-signature",
      channel_data: '{"user_id":"123"}',
    }),
    terminateUserConnections: vi.fn().mockResolvedValue({}),
    config: {
      appId: "test-app-id",
      key: "test-key",
      secret: "test-secret",
      cluster: "us2",
      useTLS: true,
    },
  };
}

/**
 * Registers a tool on a McpServer and extracts the handler for direct testing.
 * Uses InMemoryTransport to connect and call the tool via the MCP protocol.
 */
export function createTestServer(): McpServer {
  return new McpServer({
    name: "test-pusher-server",
    version: "1.0.0",
  });
}
