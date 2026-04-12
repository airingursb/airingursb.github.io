package cmd

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

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
	start := time.Now()
	caller := internal.DetectCaller()

	if statusType != "" && !isValidType(statusType) {
		internal.TrackStatusError("invalid_type", Version)
		return fmt.Errorf("invalid type %q\navailable types: %s", statusType, strings.Join(validTypes, ", "))
	}

	raw, err := internal.FetchStatus(noCache)
	if err != nil {
		errType := "network"
		if strings.Contains(err.Error(), "status") {
			errType = "http_error"
		}
		internal.TrackStatusError(errType, Version)
		return err
	}

	cached := !noCache && time.Since(start) < 50*time.Millisecond

	if statusType == "" {
		if statusOutput == "text" {
			fmt.Println(internal.FormatOverview(raw, lang, statusLimit))
		} else {
			fmt.Println(string(raw))
		}
		internal.TrackStatusQuery(statusType, statusOutput, lang, caller, Version, cached, time.Since(start).Milliseconds())
		return nil
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		internal.TrackStatusError("parse", Version)
		return fmt.Errorf("failed to parse response: %w", err)
	}

	typeData, ok := m[statusType]
	if !ok {
		internal.TrackStatusError("type_not_found", Version)
		return fmt.Errorf("type %q not found in response", statusType)
	}

	if statusOutput == "text" {
		fmt.Println(internal.FormatText(statusType, typeData, lang, statusLimit))
	} else {
		limited := applyLimit(statusType, typeData, statusLimit)
		fmt.Println(string(limited))
	}

	internal.TrackStatusQuery(statusType, statusOutput, lang, caller, Version, cached, time.Since(start).Milliseconds())
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
