import { execSync } from 'node:child_process';

/**
 * Plain-text excerpt from raw markdown, for meta description fallback
 * when a post has no hand-written frontmatter description.
 */
export function makeExcerpt(markdown: string, maxLen = 150): string {
  const text = markdown
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*(import|export)\s.*$/gm, ' ')
    .replace(/[#>*`~_|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen).trim()}…` : text;
}

// One `git log` pass over src/content at first call; first time a path
// appears in the (newest-first) log is its last-modified commit date.
let gitDates: Map<string, string> | null = null;

export function getGitLastModified(repoRelativePath: string): Date | undefined {
  if (!gitDates) {
    gitDates = new Map();
    try {
      // A shallow clone collapses every file onto HEAD's date — worse than no
      // signal at all, so bail and let callers fall back to the publish date.
      const shallow = execSync('git rev-parse --is-shallow-repository', { encoding: 'utf-8' }).trim();
      if (shallow === 'true') return undefined;
      const out = execSync('git log --format=@%cI --name-only -- src/content', {
        encoding: 'utf-8',
        maxBuffer: 64 * 1024 * 1024,
      });
      let currentDate = '';
      for (const line of out.split('\n')) {
        if (line.startsWith('@')) {
          currentDate = line.slice(1);
        } else if (line && !gitDates.has(line)) {
          gitDates.set(line, currentDate);
        }
      }
    } catch {
      // Not a git checkout (e.g. shallow CI without history) — fall back silently.
    }
  }
  const iso = gitDates.get(repoRelativePath);
  return iso ? new Date(iso) : undefined;
}
