# Pusher Channels MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI agents the ability to send realtime messages, query channels, and manage users through [Pusher Channels](https://pusher.com/channels).

## Tools

| Tool | Description |
|------|-------------|
| `trigger_event` | Send an event to one or more channels |
| `trigger_batch_events` | Send up to 10 events in a single API call |
| `list_channels` | List active channels with optional prefix filter |
| `get_channel_info` | Get subscription/user count for a channel |
| `get_presence_users` | List users connected to a presence channel |
| `authorize_channel` | Generate auth tokens for private/presence channels |
| `terminate_user_connections` | Disconnect all connections for a user |

## Prerequisites

- Node.js 18 or later
- A [Pusher Channels](https://pusher.com) account (free tier available)

## Installation

```bash
npm install -g @crashbytes/pusher-mcp-server
```

Or clone and build from source:

```bash
git clone https://github.com/CrashBytes/pusher-mcp-server.git
cd pusher-mcp-server
npm install
npm run build
```

## Configuration

You need four environment variables from your [Pusher dashboard](https://dashboard.pusher.com):

| Variable | Description |
|----------|-------------|
| `PUSHER_APP_ID` | Your Pusher app ID |
| `PUSHER_KEY` | Your Pusher app key |
| `PUSHER_SECRET` | Your Pusher app secret |
| `PUSHER_CLUSTER` | Your Pusher cluster (e.g. `us2`, `eu`, `ap1`) |

## Usage with Claude Desktop

Add the following to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pusher": {
      "command": "node",
      "args": ["/path/to/pusher-mcp-server/build/index.js"],
      "env": {
        "PUSHER_APP_ID": "your_app_id",
        "PUSHER_KEY": "your_app_key",
        "PUSHER_SECRET": "your_app_secret",
        "PUSHER_CLUSTER": "us2"
      }
    }
  }
}
```

If installed globally via npm:

```json
{
  "mcpServers": {
    "pusher": {
      "command": "pusher-mcp-server",
      "env": {
        "PUSHER_APP_ID": "your_app_id",
        "PUSHER_KEY": "your_app_key",
        "PUSHER_SECRET": "your_app_secret",
        "PUSHER_CLUSTER": "us2"
      }
    }
  }
}
```

## Usage with Claude Code

```bash
claude mcp add pusher -- node /path/to/pusher-mcp-server/build/index.js
```

Set the environment variables in your shell before running, or configure them in your Claude Code MCP settings.

## Example Prompts

Once configured, you can ask Claude things like:

- "Send a 'deploy-complete' event to the notifications channel with the message 'v2.1.0 deployed'"
- "Show me all active presence channels"
- "How many users are on the presence-lobby channel?"
- "Disconnect user abc123 from all channels"

## Development

```bash
npm install
npm run dev          # Run with tsx (hot reload)
npm run build        # Compile TypeScript
npm run type-check   # Check types without emitting
```

## Tutorial

For a step-by-step guide on building this server from scratch, see the full tutorial on [CrashBytes](https://crashbytes.com/tutorials/building-pusher-channels-mcp-server-realtime-ai-2026).

## License

MIT
