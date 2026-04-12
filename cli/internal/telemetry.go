package internal

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"golang.org/x/term"
)

var wg sync.WaitGroup

const (
	umamiURL   = "https://analytics.ursb.me/api/send"
	websiteID  = "6088bc9f-f2ca-471c-abea-dc55d491ee61"
	installFile = ".installed"
)

type umamiPayload struct {
	Type    string    `json:"type"`
	Payload umamiData `json:"payload"`
}

type umamiData struct {
	Website  string `json:"website"`
	URL      string `json:"url"`
	Name     string `json:"name,omitempty"`
	Data     any    `json:"data,omitempty"`
	Hostname string `json:"hostname"`
	Language string `json:"language"`
}

// installedPath returns the path to the install marker file.
func installedPath() string {
	return filepath.Join(cacheDir(), installFile)
}

// readInstalledVersion reads the version stored in the install marker.
func readInstalledVersion() string {
	data, err := os.ReadFile(installedPath())
	if err != nil {
		return ""
	}
	return string(data)
}

// writeInstalledVersion writes the current version to the install marker.
func writeInstalledVersion(version string) {
	_ = os.MkdirAll(cacheDir(), 0755)
	_ = os.WriteFile(installedPath(), []byte(version), 0644)
}

// DetectCaller returns "agent" if stdout is not a terminal, "terminal" otherwise.
func DetectCaller() string {
	if term.IsTerminal(int(os.Stdout.Fd())) {
		return "terminal"
	}
	return "agent"
}

// FlushTelemetry waits for all pending telemetry events to be sent.
// Call before os.Exit to avoid dropping events.
func FlushTelemetry() {
	wg.Wait()
}

// CheckInstallOrUpdate sends cli_install or cli_update event if needed.
// Should be called once at startup.
func CheckInstallOrUpdate(currentVersion string) {
	prev := readInstalledVersion()
	if prev == "" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			send("cli_install", map[string]string{
				"version": currentVersion,
				"os":      runtime.GOOS,
				"arch":    runtime.GOARCH,
			})
		}()
	} else if prev != currentVersion {
		wg.Add(1)
		go func() {
			defer wg.Done()
			send("cli_update", map[string]string{
				"from_version": prev,
				"to_version":   currentVersion,
				"os":           runtime.GOOS,
			})
		}()
	}
	writeInstalledVersion(currentVersion)
}

// TrackInvoke sends a cli_invoke event.
func TrackInvoke(command, dataType, output, lang, caller, version string, cached bool, durationMs int64) {
	if dataType == "" {
		dataType = "all"
	}
	wg.Add(1)
	go func() {
		defer wg.Done()
		send("cli_invoke", map[string]any{
			"command":     command,
			"type":        dataType,
			"output":      output,
			"lang":        lang,
			"caller":      caller,
			"cached":      cached,
			"duration_ms": durationMs,
			"version":     version,
		})
	}()
}

// TrackError sends a cli_error event.
func TrackError(command, errorType, version string) {
	wg.Add(1)
	go func() {
		defer wg.Done()
		send("cli_error", map[string]string{
			"command":    command,
			"error_type": errorType,
			"version":    version,
		})
	}()
}

// send fires a single Umami event. Runs async (called via goroutine).
// Silently fails — telemetry must never block or break the CLI.
func send(eventName string, data any) {
	payload := umamiPayload{
		Type: "event",
		Payload: umamiData{
			Website:  websiteID,
			URL:      "/cli",
			Name:     eventName,
			Data:     data,
			Hostname: "cli.ursb.me",
			Language: "go",
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return
	}

	client := &http.Client{Timeout: 3 * time.Second}
	req, err := http.NewRequest("POST", umamiURL, bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) airing-cli/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return
	}
	resp.Body.Close()
}
