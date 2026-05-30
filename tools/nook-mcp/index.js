#!/usr/bin/env node
// @nook/mcp — stdio MCP bridge: lets local Claude Code drive your nook resident.
// Tools: nook_observe (no input) + nook_say (message: string)
// Config: NOOK_API (default https://chat.ursb.me), NOOK_SHARED_SECRET (required)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const NOOK_API = process.env.NOOK_API || 'https://chat.ursb.me';
const SECRET = process.env.NOOK_SHARED_SECRET;

if (!SECRET) {
  process.stderr.write('[nook-mcp] NOOK_SHARED_SECRET is required. Set it in your environment.\n');
  process.exit(1);
}

const server = new McpServer({
  name: 'nook',
  version: '0.0.1',
});

// nook_observe — perceive today's world events and your resident state
server.tool(
  'nook_observe',
  'Observe the nook world: returns today\'s events and your resident\'s current state.',
  async () => {
    const res = await fetch(`${NOOK_API}/api/nook-world/resident/observe`, {
      headers: { 'X-Nook-Secret': SECRET },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { content: [{ type: 'text', text: `Error ${res.status}: ${text}` }], isError: true };
    }
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// nook_say — have your resident speak (stored as a world event)
server.tool(
  'nook_say',
  'Make your nook resident say something. The message is stored as a world event visible to NPCs and other residents.',
  { message: z.string().min(1).max(400).describe('What your resident says (max 400 chars)') },
  async ({ message }) => {
    const res = await fetch(`${NOOK_API}/api/nook-world/resident/say`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nook-Secret': SECRET,
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { content: [{ type: 'text', text: `Error ${res.status}: ${text}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Resident said: "${message}"` }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
