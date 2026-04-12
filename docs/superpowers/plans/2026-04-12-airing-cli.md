# Airing CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Go CLI tool (`airing`) that queries live status data from https://ursb.me, plus the Astro API endpoint that serves it.

**Architecture:** Blog-side: a single Astro static endpoint (`/api/status.json`) aggregates all `src/data/*.json` and `data/douban.json` at build time. CLI-side: a Go binary using cobra, fetches the endpoint, caches locally, formats as JSON or text with zh/en i18n.

**Tech Stack:** Astro (TypeScript) for the API endpoint; Go + cobra for the CLI.

---

### Task 1: Astro API Endpoint

**Files:**
- Create: `src/pages/api/status.json.ts`

- [ ] **Step 1: Create the API endpoint file**

Create `src/pages/api/status.json.ts` that imports all data JSON files and returns them as a single aggregated response:

```typescript
import type { APIContext } from 'astro';
import articles from '../../data/articles.json';
import music from '../../data/music.json';
import nowplaying from '../../data/nowplaying.json';
import raindrop from '../../data/raindrop.json';
import highlights from '../../data/highlights.json';
import github from '../../data/github.json';
import channel from '../../data/telegram.json';
import douban from '../../../data/douban.json';
import localData from '../../data/local_data.json';

export async function GET(_context: APIContext) {
  const data = {
    articles,
    music: {
      totalScrobbles: music.totalScrobbles,
      registeredYear: music.registeredYear,
      periods: music.periods,
    },
    nowplaying,
    bookmarks: raindrop.bookmarks,
    highlights: {
      total: highlights.total,
      highlights: highlights.highlights,
    },
    github,
    channel,
    books: douban.books,
    movies: douban.movies,
    vibe: localData.vibeCoding,
  };

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
```

- [ ] **Step 2: Test the endpoint locally**

Run: `npm run build && ls dist/api/`

Expected: `status.json` file exists in `dist/api/`.

Verify contents: `cat dist/api/status.json | python3 -m json.tool | head -20`

Expected: valid JSON with `articles`, `music`, `nowplaying`, `bookmarks`, `highlights`, `github`, `channel`, `books`, `movies`, `vibe` keys.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/status.json.ts
git commit -m "feat(api): add /api/status.json endpoint aggregating all data sources"
```

---

### Task 2: Go Project Scaffold + Root Command

**Files:**
- Create: `cli/go.mod`
- Create: `cli/main.go`
- Create: `cli/cmd/root.go`

- [ ] **Step 1: Initialize Go module**

```bash
cd cli
go mod init github.com/airingursb/airing-cli
```

- [ ] **Step 2: Add cobra dependency**

```bash
cd cli
go get github.com/spf13/cobra@latest
```

- [ ] **Step 3: Create main.go**

Create `cli/main.go`:

```go
package main

import (
	"os"

	"github.com/airingursb/airing-cli/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
```

- [ ] **Step 4: Create root command**

Create `cli/cmd/root.go`:

```go
package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var (
	version = "0.1.0"
	lang    string
)

var rootCmd = &cobra.Command{
	Use:   "airing",
	Short: "Airing's personal CLI",
	Long:  "Airing's personal CLI - query status, manage knowledge, and more.",
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&lang, "lang", "l", "zh", "output language: zh|en")
	rootCmd.Version = version
	rootCmd.SetVersionTemplate(fmt.Sprintf("airing version %s\n", version))
}
```

- [ ] **Step 5: Verify it compiles and runs**

```bash
cd cli && go build -o airing . && ./airing --help
```

Expected output includes:
```
Airing's personal CLI - query status, manage knowledge, and more.

Usage:
  airing [command]
```

```bash
./airing --version
```

Expected: `airing version 0.1.0`

- [ ] **Step 6: Commit**

```bash
git add cli/go.mod cli/go.sum cli/main.go cli/cmd/root.go
git commit -m "feat(cli): scaffold Go project with root command and cobra"
```

---

### Task 3: HTTP Client with Caching

**Files:**
- Create: `cli/internal/client.go`

- [ ] **Step 1: Create the HTTP client with cache**

Create `cli/internal/client.go`:

```go
package internal

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

const (
	StatusURL = "https://ursb.me/api/status.json"
	CacheTTL  = 5 * time.Minute
)

type cacheEntry struct {
	Data      json.RawMessage `json:"data"`
	FetchedAt time.Time       `json:"fetched_at"`
}

type cacheFile struct {
	Status cacheEntry `json:"status"`
}

func cacheDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".airing")
}

func cachePath() string {
	return filepath.Join(cacheDir(), "cache.json")
}

func readCache() (*cacheEntry, error) {
	data, err := os.ReadFile(cachePath())
	if err != nil {
		return nil, err
	}
	var cf cacheFile
	if err := json.Unmarshal(data, &cf); err != nil {
		return nil, err
	}
	return &cf.Status, nil
}

func writeCache(raw json.RawMessage) error {
	if err := os.MkdirAll(cacheDir(), 0755); err != nil {
		return err
	}
	cf := cacheFile{
		Status: cacheEntry{Data: raw, FetchedAt: time.Now()},
	}
	data, err := json.Marshal(cf)
	if err != nil {
		return err
	}
	return os.WriteFile(cachePath(), data, 0644)
}

// FetchStatus fetches /api/status.json, using cache unless noCache is true.
// On network failure, falls back to expired cache with a stderr warning.
func FetchStatus(noCache bool) (json.RawMessage, error) {
	if !noCache {
		if entry, err := readCache(); err == nil {
			if time.Since(entry.FetchedAt) < CacheTTL {
				return entry.Data, nil
			}
		}
	}

	resp, err := http.Get(StatusURL)
	if err != nil {
		// Fall back to expired cache
		if entry, cacheErr := readCache(); cacheErr == nil {
			fmt.Fprintf(os.Stderr, "warning: network error, using cached data from %s\n", entry.FetchedAt.Format(time.RFC3339))
			return entry.Data, nil
		}
		return nil, fmt.Errorf("network error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	raw := json.RawMessage(body)
	_ = writeCache(raw)

	return raw, nil
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd cli && go build ./...
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cli/internal/client.go
git commit -m "feat(cli): add HTTP client with 5-min cache and network fallback"
```

---

### Task 4: i18n String Table

**Files:**
- Create: `cli/internal/i18n.go`

- [ ] **Step 1: Create the i18n labels**

Create `cli/internal/i18n.go`:

```go
package internal

var Labels = map[string]map[string]string{
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
		"overview":   "状态概览",
		"read":       "已读",
		"reading":    "在读",
		"watched":    "已看",
		"scrobbles":  "次播放",
		"topArtist":  "最爱",
		"followers":  "关注者",
		"repos":      "仓库",
		"total":      "共",
		"items":      "条",
		"books_unit": "本",
		"movies_unit":"部",
		"today_cost": "今日花费",
		"tokens":     "tokens",
		"more":       "等",
		"last_played":"最近播放",
		"playing":    "正在听",
	},
	"en": {
		"articles":   "Articles",
		"music":      "Music",
		"nowplaying": "Now Playing",
		"bookmarks":  "Bookmarks",
		"highlights": "Highlights",
		"books":      "Books",
		"movies":     "Movies",
		"github":     "GitHub",
		"channel":    "Channel",
		"vibe":       "Vibe Coding",
		"overview":   "Status Overview",
		"read":       "read",
		"reading":    "reading",
		"watched":    "watched",
		"scrobbles":  "scrobbles",
		"topArtist":  "top artist",
		"followers":  "followers",
		"repos":      "repos",
		"total":      "total",
		"items":      "items",
		"books_unit": "books",
		"movies_unit":"movies",
		"today_cost": "today cost",
		"tokens":     "tokens",
		"more":       "and more",
		"last_played":"last played",
		"playing":    "playing now",
	},
}

func L(lang, key string) string {
	if m, ok := Labels[lang]; ok {
		if v, ok := m[key]; ok {
			return v
		}
	}
	return key
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd cli && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add cli/internal/i18n.go
git commit -m "feat(cli): add zh/en i18n string table"
```

---

### Task 5: Text Formatter

**Files:**
- Create: `cli/internal/formatter.go`

- [ ] **Step 1: Create the text formatter**

Create `cli/internal/formatter.go`. This handles text-mode output for each data type and the overview summary.

```go
package internal

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

// FormatText formats a single data type as human-readable text.
func FormatText(dataType string, raw json.RawMessage, lang string, limit int) string {
	switch dataType {
	case "articles":
		return fmtArticles(raw, lang, limit)
	case "music":
		return fmtMusic(raw, lang)
	case "nowplaying":
		return fmtNowPlaying(raw, lang, limit)
	case "bookmarks":
		return fmtBookmarks(raw, lang, limit)
	case "highlights":
		return fmtHighlights(raw, lang, limit)
	case "books":
		return fmtBooks(raw, lang, limit)
	case "movies":
		return fmtMovies(raw, lang, limit)
	case "github":
		return fmtGitHub(raw, lang)
	case "channel":
		return fmtChannel(raw, lang, limit)
	case "vibe":
		return fmtVibe(raw, lang)
	default:
		return string(raw)
	}
}

// FormatOverview produces a one-line-per-type summary.
func FormatOverview(fullData json.RawMessage, lang string, limit int) string {
	var m map[string]json.RawMessage
	if err := json.Unmarshal(fullData, &m); err != nil {
		return "error: " + err.Error()
	}

	types := []string{"articles", "music", "nowplaying", "bookmarks", "highlights", "books", "movies", "github", "channel", "vibe"}
	icons := map[string]string{
		"articles": "📝", "music": "🎵", "nowplaying": "🎧",
		"bookmarks": "📑", "highlights": "✨", "books": "📖",
		"movies": "🎬", "github": "💻", "channel": "📢", "vibe": "🤖",
	}

	var lines []string
	for _, t := range types {
		raw, ok := m[t]
		if !ok {
			continue
		}
		icon := icons[t]
		label := L(lang, t)
		summary := summarize(t, raw, lang, limit)
		lines = append(lines, fmt.Sprintf("%s %s: %s", icon, label, summary))
	}
	return strings.Join(lines, "\n")
}

func summarize(dataType string, raw json.RawMessage, lang string, limit int) string {
	switch dataType {
	case "articles":
		var items []struct{ Title, Date string }
		json.Unmarshal(raw, &items)
		if len(items) == 0 {
			return "-"
		}
		rest := len(items) - 1
		if lang == "zh" {
			return fmt.Sprintf("%s (%s) %s %d 篇", items[0].Title, items[0].Date, L(lang, "more"), rest)
		}
		return fmt.Sprintf("%s (%s) and %d more", items[0].Title, items[0].Date, rest)

	case "music":
		var d struct {
			TotalScrobbles int `json:"totalScrobbles"`
			Periods        []struct {
				Key     string
				Artists []struct{ Name string }
			}
		}
		json.Unmarshal(raw, &d)
		top := "-"
		for _, p := range d.Periods {
			if p.Key == "overall" && len(p.Artists) > 0 {
				top = p.Artists[0].Name
				break
			}
		}
		return fmt.Sprintf("%d %s, %s: %s", d.TotalScrobbles, L(lang, "scrobbles"), L(lang, "topArtist"), top)

	case "nowplaying":
		var items []struct {
			Name       string
			Artist     string
			NowPlaying bool `json:"nowplaying"`
		}
		json.Unmarshal(raw, &items)
		if len(items) == 0 {
			return "-"
		}
		t := items[0]
		status := L(lang, "last_played")
		if t.NowPlaying {
			status = L(lang, "playing")
		}
		return fmt.Sprintf("%s - %s (%s)", t.Name, t.Artist, status)

	case "bookmarks":
		var items []struct{ Title string }
		json.Unmarshal(raw, &items)
		if len(items) == 0 {
			return "-"
		}
		rest := len(items) - 1
		if rest > 0 {
			return fmt.Sprintf("%s %s %d %s", items[0].Title, L(lang, "more"), rest, L(lang, "items"))
		}
		return items[0].Title

	case "highlights":
		var d struct{ Total int }
		json.Unmarshal(raw, &d)
		return fmt.Sprintf("%s %d %s", L(lang, "total"), d.Total, L(lang, "items"))

	case "books":
		var d struct {
			Read    struct{ Total int }
			Reading struct{ Total int }
		}
		json.Unmarshal(raw, &d)
		return fmt.Sprintf("%s %d %s, %s %d %s",
			L(lang, "reading"), d.Reading.Total, L(lang, "books_unit"),
			L(lang, "read"), d.Read.Total, L(lang, "books_unit"))

	case "movies":
		var d struct {
			Watched struct{ Total int }
		}
		json.Unmarshal(raw, &d)
		return fmt.Sprintf("%s %d %s", L(lang, "watched"), d.Watched.Total, L(lang, "movies_unit"))

	case "github":
		var d struct {
			Followers int
			Repos     int
		}
		json.Unmarshal(raw, &d)
		return fmt.Sprintf("%d %s, %d %s", d.Followers, L(lang, "followers"), d.Repos, L(lang, "repos"))

	case "channel":
		var items []struct{ Title string }
		json.Unmarshal(raw, &items)
		if len(items) == 0 {
			return "-"
		}
		title := items[0].Title
		if len(title) > 40 {
			title = title[:40] + "..."
		}
		return fmt.Sprintf("%s (%d %s)", title, len(items), L(lang, "items"))

	case "vibe":
		var d struct {
			Daily map[string]struct {
				Cost   float64
				Tokens int
			}
		}
		json.Unmarshal(raw, &d)
		// Find latest date
		var latest string
		for k := range d.Daily {
			if k > latest {
				latest = k
			}
		}
		if latest == "" {
			return "-"
		}
		entry := d.Daily[latest]
		return fmt.Sprintf("%s $%.2f, %d %s (%s)", L(lang, "today_cost"), entry.Cost, entry.Tokens, L(lang, "tokens"), latest)

	default:
		return "-"
	}
}

func fmtArticles(raw json.RawMessage, lang string, limit int) string {
	var items []struct {
		Title string `json:"title"`
		Link  string `json:"link"`
		Date  string `json:"date"`
	}
	json.Unmarshal(raw, &items)
	if limit > 0 && limit < len(items) {
		items = items[:limit]
	}
	var lines []string
	lines = append(lines, fmt.Sprintf("📝 %s", L(lang, "articles")))
	for _, a := range items {
		lines = append(lines, fmt.Sprintf("  %s (%s)\n  %s", a.Title, a.Date, a.Link))
	}
	return strings.Join(lines, "\n")
}

func fmtMusic(raw json.RawMessage, lang string) string {
	var d struct {
		TotalScrobbles int `json:"totalScrobbles"`
		Periods        []struct {
			Key     string `json:"key"`
			Label   string `json:"label"`
			Total   int    `json:"total"`
			Artists []struct {
				Name  string  `json:"name"`
				Plays int     `json:"plays"`
				Pct   float64 `json:"pct"`
			} `json:"artists"`
		} `json:"periods"`
	}
	json.Unmarshal(raw, &d)

	var lines []string
	lines = append(lines, fmt.Sprintf("🎵 %s (%d %s)", L(lang, "music"), d.TotalScrobbles, L(lang, "scrobbles")))
	for _, p := range d.Periods {
		lines = append(lines, fmt.Sprintf("  [%s] %d %s", p.Label, p.Total, L(lang, "scrobbles")))
		for i, a := range p.Artists {
			if i >= 3 {
				break
			}
			lines = append(lines, fmt.Sprintf("    %s: %d (%.0f%%)", a.Name, a.Plays, a.Pct*100))
		}
	}
	return strings.Join(lines, "\n")
}

func fmtNowPlaying(raw json.RawMessage, lang string, limit int) string {
	var items []struct {
		Name       string `json:"name"`
		Artist     string `json:"artist"`
		Album      string `json:"album"`
		NowPlaying bool   `json:"nowplaying"`
	}
	json.Unmarshal(raw, &items)
	if limit > 0 && limit < len(items) {
		items = items[:limit]
	}
	var lines []string
	lines = append(lines, fmt.Sprintf("🎧 %s", L(lang, "nowplaying")))
	for _, t := range items {
		status := L(lang, "last_played")
		if t.NowPlaying {
			status = L(lang, "playing")
		}
		lines = append(lines, fmt.Sprintf("  %s - %s (%s) [%s]", t.Name, t.Artist, t.Album, status))
	}
	return strings.Join(lines, "\n")
}

func fmtBookmarks(raw json.RawMessage, lang string, limit int) string {
	var items []struct {
		Title   string `json:"title"`
		Link    string `json:"link"`
		Created string `json:"created"`
	}
	json.Unmarshal(raw, &items)
	if limit > 0 && limit < len(items) {
		items = items[:limit]
	}
	var lines []string
	lines = append(lines, fmt.Sprintf("📑 %s", L(lang, "bookmarks")))
	for _, b := range items {
		lines = append(lines, fmt.Sprintf("  %s (%s)\n  %s", b.Title, b.Created, b.Link))
	}
	return strings.Join(lines, "\n")
}

func fmtHighlights(raw json.RawMessage, lang string, limit int) string {
	var d struct {
		Total      int `json:"total"`
		Highlights []struct {
			Text   string `json:"text"`
			Title  string `json:"title"`
			Author string `json:"author"`
			URL    string `json:"url"`
		} `json:"highlights"`
	}
	json.Unmarshal(raw, &d)
	items := d.Highlights
	if limit > 0 && limit < len(items) {
		items = items[:limit]
	}
	var lines []string
	lines = append(lines, fmt.Sprintf("✨ %s (%s %d %s)", L(lang, "highlights"), L(lang, "total"), d.Total, L(lang, "items")))
	for _, h := range items {
		text := h.Text
		if len(text) > 80 {
			text = text[:80] + "..."
		}
		lines = append(lines, fmt.Sprintf("  \"%s\"\n  — %s (%s)", text, h.Author, h.Title))
	}
	return strings.Join(lines, "\n")
}

func fmtBooks(raw json.RawMessage, lang string, limit int) string {
	var d struct {
		Read struct {
			Total int `json:"total"`
			Items []struct {
				Title  string `json:"title"`
				Rating int    `json:"rating"`
				Date   string `json:"date"`
			} `json:"items"`
		} `json:"read"`
		Reading struct {
			Total int `json:"total"`
			Items []struct {
				Title string `json:"title"`
			} `json:"items"`
		} `json:"reading"`
	}
	json.Unmarshal(raw, &d)

	var lines []string
	lines = append(lines, fmt.Sprintf("📖 %s", L(lang, "books")))
	lines = append(lines, fmt.Sprintf("  %s (%d):", L(lang, "reading"), d.Reading.Total))
	for _, b := range d.Reading.Items {
		lines = append(lines, fmt.Sprintf("    %s", b.Title))
	}
	readItems := d.Read.Items
	if limit > 0 && limit < len(readItems) {
		readItems = readItems[:limit]
	}
	lines = append(lines, fmt.Sprintf("  %s (%d):", L(lang, "read"), d.Read.Total))
	for _, b := range readItems {
		stars := strings.Repeat("★", b.Rating) + strings.Repeat("☆", 5-b.Rating)
		lines = append(lines, fmt.Sprintf("    %s %s (%s)", b.Title, stars, b.Date))
	}
	return strings.Join(lines, "\n")
}

func fmtMovies(raw json.RawMessage, lang string, limit int) string {
	var d struct {
		Watched struct {
			Total int `json:"total"`
			Items []struct {
				Title  string `json:"title"`
				Rating int    `json:"rating"`
				Date   string `json:"date"`
			} `json:"items"`
		} `json:"watched"`
	}
	json.Unmarshal(raw, &d)
	items := d.Watched.Items
	if limit > 0 && limit < len(items) {
		items = items[:limit]
	}
	var lines []string
	lines = append(lines, fmt.Sprintf("🎬 %s (%s %d %s)", L(lang, "movies"), L(lang, "watched"), d.Watched.Total, L(lang, "movies_unit")))
	for _, m := range items {
		stars := strings.Repeat("★", m.Rating) + strings.Repeat("☆", 5-m.Rating)
		lines = append(lines, fmt.Sprintf("  %s %s (%s)", m.Title, stars, m.Date))
	}
	return strings.Join(lines, "\n")
}

func fmtGitHub(raw json.RawMessage, lang string) string {
	var d struct {
		Login     string `json:"login"`
		Bio       string `json:"bio"`
		Followers int    `json:"followers"`
		Following int    `json:"following"`
		Repos     int    `json:"repos"`
		SinceYear string `json:"sinceYear"`
	}
	json.Unmarshal(raw, &d)
	var lines []string
	lines = append(lines, fmt.Sprintf("💻 %s (@%s)", L(lang, "github"), d.Login))
	lines = append(lines, fmt.Sprintf("  %s", d.Bio))
	lines = append(lines, fmt.Sprintf("  %d %s · %d %s · since %s", d.Followers, L(lang, "followers"), d.Repos, L(lang, "repos"), d.SinceYear))
	return strings.Join(lines, "\n")
}

func fmtChannel(raw json.RawMessage, lang string, limit int) string {
	var items []struct {
		Title string `json:"title"`
		Link  string `json:"link"`
		Date  string `json:"date"`
	}
	json.Unmarshal(raw, &items)
	if limit > 0 && limit < len(items) {
		items = items[:limit]
	}
	var lines []string
	lines = append(lines, fmt.Sprintf("📢 %s", L(lang, "channel")))
	for _, c := range items {
		title := c.Title
		if len(title) > 60 {
			title = title[:60] + "..."
		}
		lines = append(lines, fmt.Sprintf("  %s (%s)\n  %s", title, c.Date, c.Link))
	}
	return strings.Join(lines, "\n")
}

func fmtVibe(raw json.RawMessage, lang string) string {
	var d struct {
		Daily map[string]struct {
			Cost   float64  `json:"cost"`
			Tokens int      `json:"tokens"`
			Models []string `json:"models"`
		} `json:"daily"`
	}
	json.Unmarshal(raw, &d)

	// Sort dates descending, show last 5
	var dates []string
	for k := range d.Daily {
		dates = append(dates, k)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(dates)))
	if len(dates) > 5 {
		dates = dates[:5]
	}

	var lines []string
	lines = append(lines, fmt.Sprintf("🤖 %s", L(lang, "vibe")))
	for _, date := range dates {
		entry := d.Daily[date]
		models := strings.Join(entry.Models, ", ")
		lines = append(lines, fmt.Sprintf("  %s: $%.2f, %d tokens [%s]", date, entry.Cost, entry.Tokens, models))
	}
	return strings.Join(lines, "\n")
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd cli && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add cli/internal/formatter.go
git commit -m "feat(cli): add text formatter with overview and per-type formatting"
```

---

### Task 6: Status Command

**Files:**
- Create: `cli/cmd/status.go`

- [ ] **Step 1: Create the status command**

Create `cli/cmd/status.go`:

```go
package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/airingursb/airing-cli/internal"
	"github.com/spf13/cobra"
)

var (
	statusType   string
	statusLimit  int
	statusOutput string
	noCache      bool
)

var validTypes = []string{
	"music", "nowplaying", "bookmarks", "highlights",
	"articles", "books", "movies", "github", "channel", "vibe",
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Query Airing's live status data",
	Long:  "Query Airing's live status from https://ursb.me",
	RunE:  runStatus,
}

func init() {
	statusCmd.Flags().StringVarP(&statusType, "type", "t", "", "data type: "+strings.Join(validTypes, "|"))
	statusCmd.Flags().IntVarP(&statusLimit, "limit", "n", 5, "max items to return")
	statusCmd.Flags().StringVarP(&statusOutput, "output", "o", "json", "output format: json|text")
	statusCmd.Flags().BoolVar(&noCache, "no-cache", false, "bypass local cache")
	rootCmd.AddCommand(statusCmd)
}

func runStatus(cmd *cobra.Command, args []string) error {
	if statusType != "" && !isValidType(statusType) {
		fmt.Fprintf(os.Stderr, "error: invalid type %q\navailable types: %s\n", statusType, strings.Join(validTypes, ", "))
		os.Exit(1)
	}

	raw, err := internal.FetchStatus(noCache)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	if statusType == "" {
		// Full data
		if statusOutput == "text" {
			fmt.Println(internal.FormatOverview(raw, lang, statusLimit))
		} else {
			fmt.Println(string(raw))
		}
		return nil
	}

	// Extract single type
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		fmt.Fprintf(os.Stderr, "error: failed to parse response: %v\n", err)
		os.Exit(1)
	}

	typeData, ok := m[statusType]
	if !ok {
		fmt.Fprintf(os.Stderr, "error: type %q not found in response\n", statusType)
		os.Exit(1)
	}

	if statusOutput == "text" {
		fmt.Println(internal.FormatText(statusType, typeData, lang, statusLimit))
	} else {
		// JSON output: apply limit for array types
		limited := applyLimit(statusType, typeData, statusLimit)
		fmt.Println(string(limited))
	}
	return nil
}

func isValidType(t string) bool {
	for _, v := range validTypes {
		if v == t {
			return true
		}
	}
	return false
}

// applyLimit trims array-type data to the given limit for JSON output.
func applyLimit(dataType string, raw json.RawMessage, limit int) json.RawMessage {
	switch dataType {
	case "articles", "nowplaying", "channel":
		var items []json.RawMessage
		if err := json.Unmarshal(raw, &items); err != nil {
			return raw
		}
		if limit > 0 && limit < len(items) {
			items = items[:limit]
		}
		out, _ := json.Marshal(items)
		return out

	case "bookmarks":
		var items []json.RawMessage
		if err := json.Unmarshal(raw, &items); err != nil {
			return raw
		}
		if limit > 0 && limit < len(items) {
			items = items[:limit]
		}
		out, _ := json.Marshal(items)
		return out

	case "highlights":
		var d struct {
			Total      int               `json:"total"`
			Highlights []json.RawMessage `json:"highlights"`
		}
		if err := json.Unmarshal(raw, &d); err != nil {
			return raw
		}
		if limit > 0 && limit < len(d.Highlights) {
			d.Highlights = d.Highlights[:limit]
		}
		out, _ := json.Marshal(d)
		return out

	default:
		return raw
	}
}
```

- [ ] **Step 2: Build and test help output**

```bash
cd cli && go build -o airing . && ./airing status --help
```

Expected output includes:
```
Query Airing's live status from https://ursb.me

Usage:
  airing status [flags]

Flags:
  -t, --type string      data type: music|nowplaying|bookmarks|...
  -n, --limit int        max items to return (default 5)
  -o, --output string    output format: json|text (default "json")
      --no-cache         bypass local cache
  -h, --help             help for status
```

- [ ] **Step 3: Test with live API (requires the endpoint to be deployed)**

For local testing before deploy, create a quick test by building the Astro site and serving it:

```bash
cd cli && ./airing status -t github
```

Expected: JSON output with github data (or network error if not deployed yet — that's OK, we'll test after deploy).

- [ ] **Step 4: Commit**

```bash
git add cli/cmd/status.go
git commit -m "feat(cli): add status command with type filter, limit, and output format"
```

---

### Task 7: README

**Files:**
- Create: `cli/README.md`

- [ ] **Step 1: Write README**

Create `cli/README.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add cli/README.md
git commit -m "docs(cli): add README with usage examples and flag reference"
```

---

### Task 8: End-to-End Test

**Files:** None (manual verification)

- [ ] **Step 1: Build the Astro site and verify API output**

```bash
npm run build
cat dist/api/status.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(list(d.keys()))"
```

Expected: `['articles', 'music', 'nowplaying', 'bookmarks', 'highlights', 'github', 'channel', 'books', 'movies', 'vibe']`

- [ ] **Step 2: Build the CLI**

```bash
cd cli && go build -o airing .
```

- [ ] **Step 3: Test all data types against a local server**

Start a local server from the built site:

```bash
cd dist && python3 -m http.server 4321 &
```

Temporarily test with localhost (modify StatusURL or use env var — but for the plan we test after deploy). If already deployed:

```bash
./airing status -t github
./airing status -t music -o text
./airing status -t books -o text -l en
./airing status -t bookmarks -n 2
./airing status -o text
./airing status --help
./airing --help
./airing --version
```

Verify:
- `github` returns JSON with login, followers, repos
- `music -o text` shows formatted music stats with Chinese labels
- `books -o text -l en` shows books with English labels
- `bookmarks -n 2` returns exactly 2 items
- Overview text shows all 10 types
- `--help` outputs match the design spec

- [ ] **Step 4: Test error cases**

```bash
./airing status -t invalid
```

Expected: error message listing valid types, exit code 1.

- [ ] **Step 5: Test caching**

```bash
./airing status -t github           # first call: fetches
./airing status -t github           # second call: should be instant (cached)
./airing status -t github --no-cache # bypasses cache
```

- [ ] **Step 6: Install to PATH**

```bash
cd cli && go build -o airing . && cp airing /usr/local/bin/
airing status -t github
```

- [ ] **Step 7: Final commit if any fixes needed**

```bash
git add -A cli/ src/pages/api/
git commit -m "fix(cli): adjustments from e2e testing"
```

(Skip this step if no fixes are needed.)
