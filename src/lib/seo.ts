import { execFileSync } from 'node:child_process';
import path from 'node:path';

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

// One `git log` pass over content sources at first call; first time a path
// appears in the (newest-first) log is its last-modified commit date.
let gitDates: Map<string, string> | null = null;

export function getGitLastModified(repoRelativePath: string): Date | undefined {
  if (!gitDates) {
    gitDates = new Map();
    try {
      // A shallow clone collapses every file onto HEAD's date — worse than no
      // signal at all, so bail and let callers fall back to the publish date.
      const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf-8' }).trim();
      if (shallow === 'true') return undefined;
      const out = execFileSync('git', ['-c', 'core.quotepath=false', 'log', '--format=@%cI', '--name-only', '--', 'src/content', 'public/immersive'], {
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
    } catch (error) {
      // Git may be unavailable in an exported source tree; callers retain their
      // publication-date fallback for command failures, not programming errors.
      if (!(error instanceof Error) || !('status' in error || 'code' in error)) throw error;
    }
  }
  const normalizedPath = path.relative(process.cwd(), path.resolve(repoRelativePath)).split(path.sep).join('/');
  const iso = gitDates.get(normalizedPath);
  return iso ? new Date(iso) : undefined;
}
