// src/tools/get-presence-users.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPusherClient } from "../pusher-client.js";

export function registerGetPresenceUsers(server: McpServer) {
  server.tool(
    "get_presence_users",
    "List all users currently connected to a presence channel. Only works with channels that start with 'presence-'.",
    {
      channel: z
        .string()
        .min(1)
        .max(200)
        .startsWith("presence-", {
          message: "Channel must be a presence channel (starts with 'presence-')",
        })
        .describe("Presence channel name (must start with 'presence-')"),
    },
    async ({ channel }) => {
      try {
        const pusher = getPusherClient();

        const response = await pusher.get({
          path: `/channels/${encodeURIComponent(channel)}/users`,
          params: {},
        });

        if (response.status !== 200) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Pusher API returned status ${response.status} for channel "${channel}"`,
              },
            ],
            isError: true,
          };
        }

        const body = (await response.json()) as {
          users: Array<{ id: string }>;
        };
        const users = body.users || [];

        if (users.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No users connected to ${channel}`,
              },
            ],
          };
        }

        const userList = users.map((u) => `  ${u.id}`).join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `Users on ${channel} (${users.length}):\n${userList}`,
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
              text: `Failed to get presence users: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
