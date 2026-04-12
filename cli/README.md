# Airing CLI

A personal CLI tool for querying Airing's live status data from [ursb.me](https://ursb.me).

Designed for AI Agent consumption (as a skill), with human-friendly text output as a secondary mode.

## Install

```bash
cd cli
go build -o airing .
cp airing /usr/local/bin/
```

## Usage

```bash
# Show help
airing --help
airing status --help

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

## Available Data Types

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

## Flags

### Global Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--lang` | `-l` | `zh` | Output language: `zh` or `en` |
| `--version` | `-v` | | Show version |
| `--help` | `-h` | | Show help |

### Status Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--type` | `-t` | (all) | Data type to query |
| `--limit` | `-n` | `5` | Max items to return |
| `--output` | `-o` | `json` | Output format: `json` or `text` |
| `--no-cache` | | `false` | Bypass 5-min local cache |

## Cache

Responses are cached at `~/.airing/cache.json` with a 5-minute TTL. On network failure, expired cache is used as fallback.

## Data Source

All data comes from the static API endpoint at `https://ursb.me/api/status.json`, which is built from Airing's blog data at deploy time.
