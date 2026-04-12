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
		if statusOutput == "text" {
			fmt.Println(internal.FormatOverview(raw, lang, statusLimit))
		} else {
			fmt.Println(string(raw))
		}
		return nil
	}

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

func applyLimit(dataType string, raw json.RawMessage, limit int) json.RawMessage {
	switch dataType {
	case "articles", "nowplaying", "channel", "bookmarks":
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
