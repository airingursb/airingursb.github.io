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
