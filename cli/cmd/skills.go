package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/airingursb/airing-cli/internal"
	"github.com/spf13/cobra"
)

var agentFlag string

var skillsCmd = &cobra.Command{
	Use:   "skills",
	Short: "Manage agent skills",
	Long:  "Install, uninstall, update and search skills for AI agents.",
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

var skillsInstallCmd = &cobra.Command{
	Use:   "install <name|url|path>",
	Short: "Install a skill",
	Args:  cobra.ExactArgs(1),
	RunE:  runSkillsInstall,
}

var skillsUninstallCmd = &cobra.Command{
	Use:   "uninstall <name>",
	Short: "Uninstall a skill",
	Args:  cobra.ExactArgs(1),
	RunE:  runSkillsUninstall,
}

var skillsUpdateCmd = &cobra.Command{
	Use:   "update <name>",
	Short: "Update a skill",
	Args:  cobra.ExactArgs(1),
	RunE:  runSkillsUpdate,
}

var skillsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List installed skills",
	RunE:  runSkillsList,
}

var skillsInfoCmd = &cobra.Command{
	Use:   "info <name>",
	Short: "Show skill details",
	Args:  cobra.ExactArgs(1),
	RunE:  runSkillsInfo,
}

var skillsSearchCmd = &cobra.Command{
	Use:   "search <keyword>",
	Short: "Search skills in registry",
	Args:  cobra.ExactArgs(1),
	RunE:  runSkillsSearch,
}

func init() {
	skillsInstallCmd.Flags().StringVar(&agentFlag, "agent", "", "comma-separated agent list (skip interactive selection)")
	skillsCmd.AddCommand(skillsInstallCmd)
	skillsCmd.AddCommand(skillsUninstallCmd)
	skillsCmd.AddCommand(skillsUpdateCmd)
	skillsCmd.AddCommand(skillsListCmd)
	skillsCmd.AddCommand(skillsInfoCmd)
	skillsCmd.AddCommand(skillsSearchCmd)
	rootCmd.AddCommand(skillsCmd)
}

func runSkillsInstall(cmd *cobra.Command, args []string) error {
	input := args[0]
	source := internal.ResolveSource(input)

	// Check if already installed (early check for registry/git by name)
	sf, err := internal.ReadSkillsFile()
	if err != nil {
		return err
	}

	var skillName, repo, subdir, version string

	switch source {
	case "local":
		skillName = internal.SkillNameFromInput(input, source)
		if _, exists := sf.Installed[skillName]; exists {
			return fmt.Errorf("%s %s", skillName, internal.L(lang, "skill_already"))
		}
		fmt.Fprintf(os.Stderr, "📦 %s %s...\n", internal.L(lang, "skill_copying"), input)
		if err := internal.InstallSkillFromLocal(skillName, input); err != nil {
			return fmt.Errorf("failed to copy: %w", err)
		}
		version = "local"

	case "git":
		skillName = internal.SkillNameFromInput(input, source)
		if _, exists := sf.Installed[skillName]; exists {
			return fmt.Errorf("%s %s", skillName, internal.L(lang, "skill_already"))
		}
		repo = input
		fmt.Fprintf(os.Stderr, "📦 %s\n", internal.L(lang, "skill_cloning"))
		version, err = internal.InstallSkillFromGit(skillName, repo, "")
		if err != nil {
			return err
		}

	case "registry":
		fmt.Fprintf(os.Stderr, "🔍 %s\n", internal.L(lang, "skill_resolving"))
		skills, err := internal.FetchRegistry()
		if err != nil {
			return err
		}
		found := internal.ResolveFromRegistry(skills, input)
		if found == nil {
			return fmt.Errorf("%s: %s", internal.L(lang, "skill_not_found"), input)
		}
		skillName = found.Name
		repo = found.Repo
		subdir = found.Path
		if _, exists := sf.Installed[skillName]; exists {
			return fmt.Errorf("%s %s", skillName, internal.L(lang, "skill_already"))
		}
		fmt.Fprintf(os.Stderr, "✅ %s: %s (%s)\n", internal.L(lang, "skill_found"), found.Name, found.Description)
		fmt.Fprintf(os.Stderr, "📦 %s\n", internal.L(lang, "skill_cloning"))
		version, err = internal.InstallSkillFromGit(skillName, repo, found.Path)
		if err != nil {
			return err
		}
	}

	// Select agents
	agents, err := selectAgents()
	if err != nil {
		internal.RemoveSkill(skillName)
		return err
	}

	// Create symlinks
	for _, agent := range agents {
		if err := internal.LinkSkillToAgent(skillName, agent); err != nil {
			fmt.Fprintf(os.Stderr, "warning: failed to link to %s: %v\n", agent, err)
			continue
		}
		fmt.Fprintf(os.Stderr, "🔗 %s %s\n", internal.L(lang, "skill_linked"), agent)
	}

	// Save metadata
	sf.Installed[skillName] = &internal.SkillMeta{
		Source:      source,
		Repo:        repo,
		Path:        subdir,
		Version:     version,
		InstalledAt: internal.NowISO(),
		Agents:      agents,
	}
	if err := internal.WriteSkillsFile(sf); err != nil {
		return err
	}

	fmt.Fprintf(os.Stderr, "✅ %s %s (%d agents)\n", internal.L(lang, "skill_installed"), skillName, len(agents))
	internal.TrackSkillInstall(skillName, source, agents, Version)
	return nil
}

func runSkillsUninstall(cmd *cobra.Command, args []string) error {
	name := args[0]
	sf, err := internal.ReadSkillsFile()
	if err != nil {
		return err
	}
	meta, exists := sf.Installed[name]
	if !exists {
		return fmt.Errorf("%s: %s", internal.L(lang, "skill_not_found"), name)
	}

	fmt.Fprintf(os.Stderr, "🗑  %s\n", internal.L(lang, "skill_removing_link"))
	for _, agent := range meta.Agents {
		internal.UnlinkSkillFromAgent(name, agent)
		fmt.Fprintf(os.Stderr, "   ✓ %s\n", agent)
	}

	internal.RemoveSkill(name)
	delete(sf.Installed, name)
	if err := internal.WriteSkillsFile(sf); err != nil {
		return err
	}

	fmt.Fprintf(os.Stderr, "✅ %s %s\n", internal.L(lang, "skill_removed"), name)
	internal.TrackSkillUninstall(name, Version)
	return nil
}

func runSkillsUpdate(cmd *cobra.Command, args []string) error {
	name := args[0]
	sf, err := internal.ReadSkillsFile()
	if err != nil {
		return err
	}
	meta, exists := sf.Installed[name]
	if !exists {
		return fmt.Errorf("%s: %s", internal.L(lang, "skill_not_found"), name)
	}

	if meta.Source == "local" {
		return fmt.Errorf("%s", internal.L(lang, "skill_local_no_update"))
	}

	fmt.Fprintf(os.Stderr, "🔄 %s\n", internal.L(lang, "skill_updating"))
	oldHash, newHash, err := internal.UpdateSkillGit(name, meta.Repo, meta.Path)
	if err != nil {
		return err
	}

	if oldHash == newHash {
		fmt.Fprintf(os.Stderr, "✅ %s %s\n", name, internal.L(lang, "skill_up_to_date"))
		return nil
	}

	meta.Version = newHash
	if err := internal.WriteSkillsFile(sf); err != nil {
		return err
	}

	fmt.Fprintf(os.Stderr, "✅ %s %s (%s → %s)\n", internal.L(lang, "skill_updated"), name, oldHash, newHash)
	agentList := strings.Join(meta.Agents, ", ")
	fmt.Fprintf(os.Stderr, "   Symlinks unchanged (%s)\n", agentList)
	internal.TrackSkillUpdate(name, oldHash, newHash, Version)
	return nil
}

func runSkillsList(cmd *cobra.Command, args []string) error {
	sf, err := internal.ReadSkillsFile()
	if err != nil {
		return err
	}
	if len(sf.Installed) == 0 {
		fmt.Println(internal.L(lang, "skill_no_skills"))
		return nil
	}

	fmt.Printf("%-20s %-10s %s\n",
		internal.L(lang, "skill_name"),
		internal.L(lang, "skill_source"),
		internal.L(lang, "skill_agents"))
	for name, meta := range sf.Installed {
		agents := strings.Join(meta.Agents, ", ")
		fmt.Printf("%-20s %-10s %s\n", name, meta.Source, agents)
	}
	return nil
}

func runSkillsInfo(cmd *cobra.Command, args []string) error {
	name := args[0]
	sf, err := internal.ReadSkillsFile()
	if err != nil {
		return err
	}
	meta, exists := sf.Installed[name]
	if !exists {
		return fmt.Errorf("%s: %s", internal.L(lang, "skill_not_found"), name)
	}

	home, _ := os.UserHomeDir()
	path := strings.Replace(internal.SkillPathPublic(name), home, "~", 1)

	sourceDisplay := meta.Source
	if meta.Repo != "" {
		sourceDisplay = fmt.Sprintf("%s (%s)", meta.Source, meta.Repo)
	}

	files, _ := internal.ListSkillFiles(name)
	fileList := strings.Join(files, ", ")

	fmt.Printf("%s:       %s\n", internal.L(lang, "skill_source"), sourceDisplay)
	fmt.Printf("%s:      %s\n", internal.L(lang, "skill_version"), meta.Version)
	fmt.Printf("%s:  %s\n", internal.L(lang, "skill_installed_at"), meta.InstalledAt[:10])
	fmt.Printf("%s:     %s\n", internal.L(lang, "skill_agents"), strings.Join(meta.Agents, ", "))
	fmt.Printf("%s:       %s\n", internal.L(lang, "skill_path"), path)
	fmt.Printf("%s:      %s\n", internal.L(lang, "skill_files"), fileList)
	return nil
}

func runSkillsSearch(cmd *cobra.Command, args []string) error {
	keyword := args[0]
	skills, err := internal.FetchRegistry()
	if err != nil {
		return err
	}
	results := internal.SearchRegistry(skills, keyword)

	internal.TrackSkillSearch(keyword, len(results), Version)

	if len(results) == 0 {
		fmt.Println(internal.L(lang, "skill_search_no_result"))
		return nil
	}

	fmt.Printf("%-20s %s\n", internal.L(lang, "skill_name"), internal.L(lang, "skill_description"))
	for _, s := range results {
		fmt.Printf("%-20s %s\n", s.Name, s.Description)
	}
	return nil
}

func selectAgents() ([]string, error) {
	if agentFlag != "" {
		return strings.Split(agentFlag, ","), nil
	}
	defaults := make([]bool, len(internal.AgentNames))
	for i := range defaults {
		defaults[i] = true
	}
	indices, err := internal.MultiSelect(
		internal.L(lang, "skill_select_agents"),
		internal.AgentNames,
		defaults,
	)
	if err != nil {
		return nil, err
	}
	var agents []string
	for _, i := range indices {
		agents = append(agents, internal.AgentNames[i])
	}
	if len(agents) == 0 {
		return nil, fmt.Errorf("no agents selected")
	}
	return agents, nil
}
