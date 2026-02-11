// src/tools/terminate-user.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPusherClient } from "../pusher-client.js";

export function registerTerminateUser(server: McpServer) {
  server.tool(
    "terminate_user_connections",
    "Disconnect all connections for a specific user. Useful for moderation or security — forces a user offline across all channels.",
    {
      userId: z
        .string()
        .min(1)
        .describe("The user ID to disconnect from all channels"),
    },
    async ({ userId }) => {
      try {
        const pusher = getPusherClient();
        await pusher.terminateUserConnections(userId);

        return {
          content: [
            {
              type: "text" as const,
              text: `All connections terminated for user "${userId}"`,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to terminate user connections: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
