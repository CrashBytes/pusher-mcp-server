#!/usr/bin/env node
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTriggerEvent } from "./tools/trigger-event.js";
import { registerTriggerBatchEvents } from "./tools/trigger-batch-events.js";
import { registerListChannels } from "./tools/list-channels.js";
import { registerGetChannelInfo } from "./tools/get-channel-info.js";
import { registerGetPresenceUsers } from "./tools/get-presence-users.js";
import { registerAuthorizeChannel } from "./tools/authorize-channel.js";
import { registerTerminateUser } from "./tools/terminate-user.js";

const server = new McpServer({
  name: "pusher-channels",
  version: "1.0.0",
});

// Register all tools
registerTriggerEvent(server);
registerTriggerBatchEvents(server);
registerListChannels(server);
registerGetChannelInfo(server);
registerGetPresenceUsers(server);
registerAuthorizeChannel(server);
registerTerminateUser(server);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pusher MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
