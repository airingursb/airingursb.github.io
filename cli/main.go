package main

import (
	"os"

	"github.com/airingursb/airing-cli/cmd"
	"github.com/airingursb/airing-cli/internal"
)

func main() {
	err := cmd.Execute()
	internal.FlushTelemetry()
	if err != nil {
		os.Exit(1)
	}
}
