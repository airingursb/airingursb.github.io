# Airing CLI

A personal CLI tool for querying Airing's live status data and managing AI agent skills.

Designed for AI Agent consumption (as a skill), with human-friendly text output as a secondary mode.

## Install

### Homebrew (recommended)

```bash
brew install airingursb/tap/airing
```

Upgrade:

```bash
brew update && brew upgrade airingursb/tap/airing
```

### Build from source

```bash
cd cli
go build -o airing .
cp airing /usr/local/bin/
```

## Commands

### status

Query Airing's live status data from [ursb.me](https://ursb.me).

```bash
# Query all status (JSON, for agents)
airing status

# Query specific data type
airing status -t music
airing status -t nowplaying
airing status -t bookmarks
airing status -t books
airing status -t github

# Human-friendly text output
airing status -o text
airing status -t books -o text

# English output
airing status -o text -l en

# Limit results
airing status -t bookmarks -n 3

# Bypass cache
airing status -t nowplaying --no-cache
```

#### Available Data Types

| Type | Description |
|------|-------------|
| `music` | Last.fm listening statistics |
| `nowplaying` | Currently/recently played tracks |
| `bookmarks` | Raindrop.io bookmarks |
| `highlights` | Readwise highlights |
| `articles` | Recent blog posts |
| `books` | Douban reading (read + reading) |
| `movies` | Douban movies watched |
| `github` | GitHub profile stats |
| `channel` | Telegram channel updates |
| `vibe` | AI API usage and cost |

#### Status Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--type` | `-t` | (all) | Data type to query |
| `--limit` | `-n` | `5` | Max items to return |
| `--output` | `-o` | `json` | Output format: `json` or `text` |
| `--no-cache` | | `false` | Bypass 5-min local cache |

### skills

Manage AI agent skills. Install, uninstall, update and search skills for multiple agents (Claude Code, Gemini CLI, Codex, Cursor, OpenClaw).

Skills are stored in `~/.airing/skills/` and symlinked to each agent's skill directory.

```bash
# Install a skill from registry
airing skills install khazix-writer

# Install from git URL
airing skills install https://github.com/airingursb/skill-khazix-writer

# Install from local path
airing skills install ./my-skill

# Non-interactive install (skip agent selection)
airing skills install khazix-writer --agent claude-code,gemini-cli

# List installed skills
airing skills list

# Show skill details
airing skills info khazix-writer

# Update a skill
airing skills update khazix-writer

# Search registry
airing skills search write

# Uninstall a skill
airing skills uninstall khazix-writer
```

#### Install Sources

| Source | Example | Resolution |
|--------|---------|-----------|
| Registry | `airing skills install writing` | Lookup by name/keyword from `ursb.me/api/skills.json` |
| Git URL | `airing skills install https://github.com/...` | `git clone --depth 1` |
| Local path | `airing skills install ./my-skill` | Copy directory |

#### Supported Agents

| Agent | Skill directory |
|-------|----------------|
| claude-code | `~/.claude/skills/<name>/` |
| gemini-cli | `~/.gemini/skills/<name>/` |
| codex | `~/.codex/skills/<name>/` |
| cursor | `~/.cursor/skills/<name>/` |
| openclaw | `~/.openclaw/skills/<name>/` |

#### Skills Flags

| Flag | Description |
|------|-------------|
| `--agent` | Comma-separated agent list (skip interactive selection) |

## Global Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--lang` | `-l` | `zh` | Output language: `zh` or `en` |
| `--version` | `-v` | | Show version |
| `--help` | `-h` | | Show help |

## Cache

Responses are cached at `~/.airing/cache.json` with a 5-minute TTL. On network failure, expired cache is used as fallback. Registry data is cached at `~/.airing/registry_cache.json` with the same TTL.

## Data Source

- Status data: `https://ursb.me/api/status.json`
- Skills registry: `https://ursb.me/api/skills.json`
