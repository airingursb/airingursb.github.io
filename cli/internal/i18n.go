package internal

var Labels = map[string]map[string]string{
	"zh": {
		"articles":    "文章",
		"music":       "音乐",
		"nowplaying":  "正在播放",
		"bookmarks":   "书签",
		"highlights":  "高亮",
		"books":       "读书",
		"movies":      "观影",
		"github":      "GitHub",
		"channel":     "频道",
		"vibe":        "Vibe Coding",
		"overview":    "状态概览",
		"read":        "已读",
		"reading":     "在读",
		"watched":     "已看",
		"scrobbles":   "次播放",
		"topArtist":   "最爱",
		"followers":   "关注者",
		"repos":       "仓库",
		"total":       "共",
		"items":       "条",
		"books_unit":  "本",
		"movies_unit": "部",
		"today_cost":  "今日花费",
		"tokens":      "tokens",
		"more":        "等",
		"last_played": "最近播放",
		"playing":     "正在听",
	},
	"en": {
		"articles":    "Articles",
		"music":       "Music",
		"nowplaying":  "Now Playing",
		"bookmarks":   "Bookmarks",
		"highlights":  "Highlights",
		"books":       "Books",
		"movies":      "Movies",
		"github":      "GitHub",
		"channel":     "Channel",
		"vibe":        "Vibe Coding",
		"overview":    "Status Overview",
		"read":        "read",
		"reading":     "reading",
		"watched":     "watched",
		"scrobbles":   "scrobbles",
		"topArtist":   "top artist",
		"followers":   "followers",
		"repos":       "repos",
		"total":       "total",
		"items":       "items",
		"books_unit":  "books",
		"movies_unit": "movies",
		"today_cost":  "today cost",
		"tokens":      "tokens",
		"more":        "and more",
		"last_played": "last played",
		"playing":     "playing now",
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
