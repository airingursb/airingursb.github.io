package internal

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

var AgentNames = []string{"claude-code", "gemini-cli", "codex", "cursor", "openclaw"}

var agentSkillDirs = map[string]string{
	"claude-code": ".claude/skills",
	"gemini-cli":  ".gemini/skills",
	"codex":       ".codex/skills",
	"cursor":      ".cursor/skills",
	"openclaw":    ".openclaw/skills",
}

type SkillMeta struct {
	Source      string   `json:"source"`
	Repo        string   `json:"repo,omitempty"`
	Version     string   `json:"version"`
	InstalledAt string   `json:"installed_at"`
	Agents      []string `json:"agents"`
}

type SkillsFile struct {
	Installed map[string]*SkillMeta `json:"installed"`
}

func skillsDir() string {
	return filepath.Join(cacheDir(), "skills")
}

func skillPath(name string) string {
	return filepath.Join(skillsDir(), name)
}

func skillsFilePath() string {
	return filepath.Join(cacheDir(), "skills.json")
}

// SkillPathPublic returns the absolute path to a skill directory (for display).
func SkillPathPublic(name string) string {
	return skillPath(name)
}

func agentSkillPath(agent, skillName string) string {
	home, _ := os.UserHomeDir()
	dir, ok := agentSkillDirs[agent]
	if !ok {
		return ""
	}
	return filepath.Join(home, dir, skillName)
}

// ReadSkillsFile reads the skills.json metadata file.
func ReadSkillsFile() (*SkillsFile, error) {
	data, err := os.ReadFile(skillsFilePath())
	if err != nil {
		if os.IsNotExist(err) {
			return &SkillsFile{Installed: make(map[string]*SkillMeta)}, nil
		}
		return nil, err
	}
	var sf SkillsFile
	if err := json.Unmarshal(data, &sf); err != nil {
		return nil, err
	}
	if sf.Installed == nil {
		sf.Installed = make(map[string]*SkillMeta)
	}
	return &sf, nil
}

// WriteSkillsFile writes the skills.json metadata file.
func WriteSkillsFile(sf *SkillsFile) error {
	if err := os.MkdirAll(cacheDir(), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(sf, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(skillsFilePath(), data, 0644)
}

// InstallSkillFromGit clones a git repo into the skills directory.
func InstallSkillFromGit(name, repo string) (string, error) {
	dest := skillPath(name)
	if err := os.MkdirAll(skillsDir(), 0755); err != nil {
		return "", err
	}
	cmd := exec.Command("git", "clone", "--depth", "1", repo, dest)
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("git clone failed: %w", err)
	}
	hash, err := gitHeadHash(dest)
	if err != nil {
		return "unknown", nil
	}
	return hash, nil
}

// InstallSkillFromLocal copies a local directory into the skills directory.
func InstallSkillFromLocal(name, srcPath string) error {
	dest := skillPath(name)
	if err := os.MkdirAll(skillsDir(), 0755); err != nil {
		return err
	}
	cmd := exec.Command("cp", "-r", srcPath, dest)
	return cmd.Run()
}

// UpdateSkillGit pulls latest changes for a git-sourced skill.
func UpdateSkillGit(name string) (oldHash, newHash string, err error) {
	dest := skillPath(name)
	oldHash, _ = gitHeadHash(dest)
	cmd := exec.Command("git", "-C", dest, "pull", "--ff-only")
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return oldHash, oldHash, fmt.Errorf("git pull failed: %w", err)
	}
	newHash, _ = gitHeadHash(dest)
	return oldHash, newHash, nil
}

// LinkSkillToAgent creates a symlink from agent's skill dir to the unified skill dir.
func LinkSkillToAgent(skillName, agent string) error {
	src := skillPath(skillName)
	dst := agentSkillPath(agent, skillName)
	if dst == "" {
		return fmt.Errorf("unknown agent: %s", agent)
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	// Only remove existing symlinks; refuse to overwrite real directories
	if info, err := os.Lstat(dst); err == nil {
		if info.Mode()&os.ModeSymlink != 0 {
			os.Remove(dst)
		} else {
			return fmt.Errorf("%s already exists and is not a symlink — remove it manually first", dst)
		}
	}
	return os.Symlink(src, dst)
}

// UnlinkSkillFromAgent removes the symlink for a skill from an agent's directory.
func UnlinkSkillFromAgent(skillName, agent string) error {
	dst := agentSkillPath(agent, skillName)
	if dst == "" {
		return nil
	}
	return os.Remove(dst)
}

// RemoveSkill removes the skill directory from the unified store.
func RemoveSkill(name string) error {
	return os.RemoveAll(skillPath(name))
}

// ListSkillFiles lists all files in a skill directory (relative paths).
func ListSkillFiles(name string) ([]string, error) {
	var files []string
	root := skillPath(name)
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if info.Name() == ".git" {
				return filepath.SkipDir
			}
			return nil
		}
		rel, _ := filepath.Rel(root, path)
		files = append(files, rel)
		return nil
	})
	return files, err
}

// ResolveSource determines install source: "local", "git", or "registry".
func ResolveSource(input string) string {
	if isLocalPath(input) {
		return "local"
	}
	if isGitURL(input) {
		return "git"
	}
	return "registry"
}

// SkillNameFromInput extracts the skill name from a path or URL.
func SkillNameFromInput(input, source string) string {
	switch source {
	case "local":
		return filepath.Base(input)
	case "git":
		base := filepath.Base(input)
		return strings.TrimSuffix(base, ".git")
	default:
		return input
	}
}

// NowISO returns the current time in ISO 8601 format.
func NowISO() string {
	return time.Now().Format(time.RFC3339)
}

func gitHeadHash(repoPath string) (string, error) {
	cmd := exec.Command("git", "-C", repoPath, "rev-parse", "--short", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

func isLocalPath(input string) bool {
	if strings.HasPrefix(input, "/") || strings.HasPrefix(input, "./") || strings.HasPrefix(input, "../") || strings.HasPrefix(input, "~") {
		return true
	}
	info, err := os.Stat(input)
	return err == nil && info.IsDir()
}

func isGitURL(input string) bool {
	return strings.HasPrefix(input, "https://") || strings.HasPrefix(input, "git@") || strings.HasSuffix(input, ".git")
}
