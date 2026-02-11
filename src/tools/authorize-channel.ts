// src/tools/authorize-channel.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPusherClient } from "../pusher-client.js";

export function registerAuthorizeChannel(server: McpServer) {
  server.tool(
    "authorize_channel",
    "Generate an authorization token for a private or presence channel. Useful when building auth endpoints for Pusher client connections.",
    {
      socketId: z
        .string()
        .min(1)
        .describe("The socket ID from the client connection"),
      channel: z
        .string()
        .min(1)
        .max(200)
        .describe(
          "Private or presence channel name (must start with 'private-' or 'presence-')"
        ),
      presenceData: z
        .object({
          user_id: z.string().min(1).describe("Unique user identifier"),
          user_info: z
            .record(z.unknown())
            .optional()
            .describe("Optional user metadata (name, avatar, etc.)"),
        })
        .optional()
        .describe(
          "Required for presence channels — identifies the connecting user"
        ),
    },
    async ({ socketId, channel, presenceData }) => {
      try {
        if (
          !channel.startsWith("private-") &&
          !channel.startsWith("presence-")
        ) {
          return {
            content: [
              {
                type: "text" as const,
                text: 'Channel must start with "private-" or "presence-" for authorization',
              },
            ],
            isError: true,
          };
        }

        if (channel.startsWith("presence-") && !presenceData) {
          return {
            content: [
              {
                type: "text" as const,
                text: "presenceData is required for presence channels",
              },
            ],
            isError: true,
          };
        }

        const pusher = getPusherClient();
        const auth = pusher.authorizeChannel(socketId, channel, presenceData);

        return {
          content: [
            {
              type: "text" as const,
              text: `Authorization for ${channel}:\n${JSON.stringify(auth, null, 2)}`,
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
              text: `Failed to authorize channel: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
