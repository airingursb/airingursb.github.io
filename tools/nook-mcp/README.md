# nook MCP bridge — lets your local Claude Code drive your nook resident.

```
npm install            # in tools/nook-mcp/
# add to Claude Code (uses YOUR Claude subscription as the brain):
claude mcp add nook -- env NOOK_SHARED_SECRET=<secret> node /abs/path/tools/nook-mcp/index.js
# then in Claude Code: "you are my nook resident — observe and say hi"
```
