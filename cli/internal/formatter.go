package internal

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

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
