package internal

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	DefaultRegistryURL = "https://ursb.me/api/skills.json"
	RegistryCacheTTL   = 5 * time.Minute
)

type RegistrySkill struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Repo        string   `json:"repo"`
	Keywords    []string `json:"keywords"`
}

type registryData struct {
	Skills []RegistrySkill `json:"skills"`
}

type registryCacheEntry struct {
	Data      registryData `json:"data"`
	FetchedAt time.Time    `json:"fetched_at"`
}

func registryURL() string {
	if u := os.Getenv("AIRING_REGISTRY_URL"); u != "" {
		return u
	}
	return DefaultRegistryURL
}

func registryCachePath() string {
	return cacheDir() + "/registry_cache.json"
}

func readRegistryCache() (*registryCacheEntry, error) {
	data, err := os.ReadFile(registryCachePath())
	if err != nil {
		return nil, err
	}
	var entry registryCacheEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		return nil, err
	}
	return &entry, nil
}

func writeRegistryCache(rd registryData) error {
	if err := os.MkdirAll(cacheDir(), 0755); err != nil {
		return err
	}
	entry := registryCacheEntry{Data: rd, FetchedAt: time.Now()}
	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	return os.WriteFile(registryCachePath(), data, 0644)
}

// FetchRegistry fetches the skill registry, using cache when available.
func FetchRegistry() ([]RegistrySkill, error) {
	if entry, err := readRegistryCache(); err == nil {
		if time.Since(entry.FetchedAt) < RegistryCacheTTL {
			return entry.Data.Skills, nil
		}
	}

	resp, err := http.Get(registryURL())
	if err != nil {
		// Fallback to cache on network error
		if entry, cacheErr := readRegistryCache(); cacheErr == nil {
			return entry.Data.Skills, nil
		}
		return nil, fmt.Errorf("network error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("registry returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read registry: %w", err)
	}

	var rd registryData
	if err := json.Unmarshal(body, &rd); err != nil {
		return nil, fmt.Errorf("failed to parse registry: %w", err)
	}

	_ = writeRegistryCache(rd)
	return rd.Skills, nil
}

// SearchRegistry searches the registry by keyword, matching name, description, and keywords.
func SearchRegistry(skills []RegistrySkill, query string) []RegistrySkill {
	query = strings.ToLower(query)
	var results []RegistrySkill
	for _, s := range skills {
		if matchesQuery(s, query) {
			results = append(results, s)
		}
	}
	return results
}

// ResolveFromRegistry finds a single skill by name or keyword match.
func ResolveFromRegistry(skills []RegistrySkill, query string) *RegistrySkill {
	query = strings.ToLower(query)
	// Exact name match first
	for _, s := range skills {
		if strings.ToLower(s.Name) == query {
			return &s
		}
	}
	// Keyword/description match
	matches := SearchRegistry(skills, query)
	if len(matches) == 1 {
		return &matches[0]
	}
	return nil
}

func matchesQuery(s RegistrySkill, query string) bool {
	if strings.Contains(strings.ToLower(s.Name), query) {
		return true
	}
	if strings.Contains(strings.ToLower(s.Description), query) {
		return true
	}
	for _, kw := range s.Keywords {
		if strings.Contains(strings.ToLower(kw), query) {
			return true
		}
	}
	return false
}
