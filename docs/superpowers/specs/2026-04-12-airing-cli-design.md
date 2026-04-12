# Airing CLI Design Spec

## Overview

A Go CLI tool (`airing`) that queries Airing's live status data from https://ursb.me. Designed primarily for AI Agent consumption (as a skill), with human-friendly output as a secondary mode.

Lives in `cli/` directory within the blog monorepo. The blog exposes a static JSON API endpoint at build time; the CLI fetches and formats this data.

## Architecture

```
Blog (Astro, static build)              CLI (Go, single binary)
┌──────────────────────┐               ┌──────────────────┐
│ src/pages/api/        │  HTTP GET     │                  │
│   status.json.ts      │◄────────────│   airing CLI     │
│                       │  JSON resp    │                  │
│ Aggregates:           │──────────────►│ Parse + format   │
│   src/data/*.json     │               │ Cache locally    │
│   data/douban.json    │               │                  │
└──────────────────────┘               └──────────────────┘
```

## Blog-Side: API Endpoint

### File: `src/pages/api/status.json.ts`

Astro static endpoint. At build time, reads all data JSON files and outputs a single aggregated `/api/status.json`.

### Response Schema

```typescript
interface StatusResponse {
  music: {
    totalScrobbles: number
    registeredYear: string
    periods: Array<{
      key: string        // "7day" | "1month" | "12month" | "overall"
      label: string
      total: number
      artists: Array<{ name: string; plays: number; pct: number }>
    }>
  }
  nowplaying: Array<{
    name: string
    artist: string
    album: string
    nowplaying: boolean
    ts: string
  }>
  bookmarks: Array<{
    title: string
    link: string
    domain: string
    tags: string[]
    note: string
    excerpt: string
    created: string
  }>
  highlights: {
    total: number
    highlights: Array<{
      id: string
      text: string
      title: string
      author: string
      date: string
      url: string
    }>
  }
  articles: Array<{
    title: string
    link: string
    date: string
  }>
  books: {
    read: { total: number; items: Array<{ title: string; rating: number; date: string }> }
    reading: { total: number; items: Array<{ title: string }> }
  }
  movies: {
    watched: { total: number; items: Array<{ title: string; rating: number; date: string }> }
  }
  github: {
    login: string
    avatar: string
    bio: string
    followers: number
    following: number
    repos: number
    sinceYear: string
  }
  channel: Array<{
    title: string
    link: string
    date: string
  }>
  vibe: {
    daily: Record<string, {
      cost: number
      tokens: number
      models: string[]
    }>
  }
}
```

## CLI-Side: Go Project

### Directory Structure

```
cli/
├── README.md
├── go.mod                # module: github.com/airingursb/airing-cli
├── go.sum
├── main.go               # Entry point, execute root command
├── cmd/
│   ├── root.go           # Root command: --help, --version, --lang
│   └── status.go         # status subcommand: -t, -n, -o
└── internal/
    ├── client.go          # HTTP client, fetch + cache logic
    ├── formatter.go       # text/json output formatting
    └── i18n.go            # zh/en string tables
```

### Dependencies

- [cobra](https://github.com/spf13/cobra) — CLI framework (industry standard for Go CLIs)
- Standard library only for HTTP, JSON, file I/O

### Command Design

#### Root Command

```
$ airing --help
Airing's personal CLI - query status, manage knowledge, and more.

Usage:
  airing [command]

Available Commands:
  status      Query Airing's live status data
  help        Help about any command

Flags:
  -h, --help           help for airing
  -v, --version        version for airing
  -l, --lang string    output language: zh|en (default "zh")
```

#### status Command

```
$ airing status --help
Query Airing's live status from https://ursb.me

Usage:
  airing status [flags]

Flags:
  -t, --type string      data type filter (default: all)
                         music|nowplaying|bookmarks|highlights|
                         articles|books|movies|github|channel|vibe
  -n, --limit int        max items to return (default 5)
  -o, --output string    output format: json|text (default "json")
      --no-cache         bypass local cache
  -h, --help             help for status
```

### Supported Data Types

| `-t` value    | Source JSON         | Description              |
|---------------|---------------------|--------------------------|
| `music`       | music.json          | Listening stats, top artists |
| `nowplaying`  | nowplaying.json     | Currently/recently played tracks |
| `bookmarks`   | raindrop.json       | Recent bookmarks          |
| `highlights`  | highlights.json     | Web highlights/annotations |
| `articles`    | articles.json       | Recent blog posts         |
| `books`       | douban.json → books | Douban reading (read + reading) |
| `movies`      | douban.json → movies| Douban movies watched     |
| `github`      | github.json         | GitHub profile stats      |
| `channel`     | telegram.json       | Telegram channel updates  |
| `vibe`        | local_data.json     | AI API usage/cost stats   |

### Output Behavior

**`-o json` (default, optimized for Agent consumption):**
- When `-t` specified: returns only that type's data as JSON
- When no `-t`: returns the full status object
- `--lang` has no effect on JSON output

**`-o text` (human-friendly):**
- Formatted with headers and alignment
- `--lang zh` (default): Chinese labels ("正在播放", "书签", "在读")
- `--lang en`: English labels ("Now Playing", "Bookmarks", "Reading")

**`-n` / `--limit`:**
- Applies to array-type data (bookmarks, highlights, articles, nowplaying, channel, books.items, movies.items)
- No effect on scalar data (github, music summary)
- Default: 5

### Output Examples

```bash
# Agent: get current music
$ airing status -t nowplaying
[{"name":"私じゃなかったんだね。","artist":"riria.","album":"軌跡","nowplaying":false,"ts":"1775915170"}]

# Human: text overview
$ airing status -o text
📝 文章: 月刊（第34期）：创造的快乐 (2026.04.05) 等 6 篇
🎵 音乐: 6943 次播放, 最爱: YOASOBI
📑 书签: Maestri · A new kind of terminal app 等 5 条
📖 读书: 在读 4 本, 已读 84 本
🎬 观影: 已看 N 部
💻 GitHub: 1856 followers, 124 repos
📢 频道: 最新 6 条动态
✨ 高亮: 共 4099 条批注
🤖 Vibe: 今日花费 $X, 共 N tokens

# English
$ airing status -o text -l en
📝 Articles: 月刊（第34期）：创造的快乐 (2026.04.05) and 5 more
🎵 Music: 6943 scrobbles, top artist: YOASOBI
...

# Agent: get bookmarks, limit 3
$ airing status -t bookmarks -n 3
[{"title":"Maestri","link":"https://...","created":"2026.04.10"},...]
```

### Caching

- Cache location: `~/.airing/cache.json`
- TTL: 5 minutes
- Structure: `{ "status": { "data": {...}, "fetched_at": "2026-04-12T10:00:00Z" } }`
- `--no-cache` flag bypasses cache and forces fresh fetch
- Cache is per-endpoint (currently only `status`, extensible for future commands)

### Error Handling

- Network failure: print error to stderr, exit code 1. If cached data exists (even expired), use it with a warning.
- Invalid `-t` value: print available types to stderr, exit code 1.
- API returns unexpected schema: print raw response with warning, exit code 1.

### Installation

```bash
# From source (primary)
cd cli && go build -o airing . && cp airing /usr/local/bin/

# Future options
brew install airingursb/tap/airing
go install github.com/airingursb/airing-cli@latest
```

## i18n String Table

Two maps (zh, en) for text-mode labels:

```go
var labels = map[string]map[string]string{
    "zh": {
        "articles":   "文章",
        "music":      "音乐",
        "nowplaying": "正在播放",
        "bookmarks":  "书签",
        "highlights": "高亮",
        "books":      "读书",
        "movies":     "观影",
        "github":     "GitHub",
        "channel":    "频道",
        "vibe":       "Vibe Coding",
    },
    "en": {
        "articles":   "Articles",
        "music":      "Music",
        // ...
    },
}
```

## Future Extensibility

The command group structure supports future additions:

```bash
airing knowledge search -q "prompt engineering"   # Knowledge management
airing sync music                                  # Data sync triggers
airing config set api_url https://custom.url       # Configuration
```

Each new command group is a new file in `cmd/`, registered in `root.go`.
