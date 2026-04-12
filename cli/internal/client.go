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
	DefaultStatusURL = "https://ursb.me/api/status.json"
	CacheTTL         = 5 * time.Minute
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

func statusURL() string {
	if u := os.Getenv("AIRING_API_URL"); u != "" {
		return u
	}
	return DefaultStatusURL
}

func FetchStatus(noCache bool) (json.RawMessage, error) {
	if !noCache {
		if entry, err := readCache(); err == nil {
			if time.Since(entry.FetchedAt) < CacheTTL {
				return entry.Data, nil
			}
		}
	}

	resp, err := http.Get(statusURL())
	if err != nil {
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
