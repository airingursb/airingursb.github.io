# QA Self-Test

Build the project, start a preview server, and verify every item in `tests/checklist.md` using the Playwright browser MCP tools. Report pass/fail for each item before committing.

This skill exists because CSS issues (scoped styles not reaching dynamically injected DOM, dark mode regressions, layout breaks) are invisible to `astro build` — they only show up in a real browser. A white search box on a dark theme once shipped because nobody looked at the page.

## When to Use

Run this **before committing any change that touches UI, styles, layouts, or pages**. When in doubt, run it anyway — it takes under a minute. If you're about to type `git commit` and the change involves anything a user would see, stop and run this first.

## Workflow

### Phase 1: Build & Preview

```
1. npm run build                           # Astro build + Pagefind indexing
2. npx astro preview --port 4321           # Start preview server (background)
3. Wait for server ready (curl localhost:4321 returns 200)
```

If build fails, stop and report the build error. Do not proceed.

### Phase 2: Read Checklist

Read `tests/checklist.md` from the project root. Parse each section and its checkbox items. Each item describes what to verify and how.

### Phase 3: Execute Checks

For each checklist item, use the appropriate Playwright MCP tool:

| Check Type | Tool | How |
|-----------|------|-----|
| **GET** (page loads) | `mcp__playwright__browser_navigate` | Navigate to URL, confirm page loads |
| **DOM** (element exists) | `mcp__playwright__browser_snapshot` | Take snapshot, search for element |
| **DOM** (element NOT exists) | `mcp__playwright__browser_snapshot` | Take snapshot, confirm element absent |
| **CSS** (computed style) | `mcp__playwright__browser_evaluate` | `getComputedStyle(el).property` and assert value |
| **Evaluate** (JS assertion) | `mcp__playwright__browser_evaluate` | Run JS, check return value |
| **Screenshot** | `mcp__playwright__browser_take_screenshot` | Capture for visual review |
| **Click + verify** | `mcp__playwright__browser_click` + snapshot | Click element, verify DOM change |

Execute checks **section by section**. Within a section, you can batch independent checks (e.g., multiple DOM checks on the same page after one navigate).

For each item, record: `PASS`, `FAIL` (with reason), or `SKIP` (if dependency failed).

### Phase 4: Report

Present results as a table:

```
## QA Self-Test Results

| # | Section | Check | Result |
|---|---------|-------|--------|
| 1 | Homepage | GET / returns 200 | PASS |
| 2 | Search | Input bg not white | FAIL — bg is rgb(255,255,255) |
| ...

Summary: 28/30 passed, 2 failed, 0 skipped
```

**If any FAIL:**
- Take a screenshot of each failed page
- Show the failure details (expected vs actual)
- Say: "QA failed. Fix the issues above before committing."
- Do NOT proceed to commit

**If all PASS:**
- Show summary table
- Attach key screenshots (search page, a post detail page)
- Say: "QA passed. Ready to commit."

### Phase 5: Cleanup

Kill the preview server process when done.

## Adding New Checks

When implementing a new feature, add corresponding test items to `tests/checklist.md` under the appropriate section (or create a new section). Each item should follow this format:

```markdown
- [ ] {CHECK_TYPE}: {description of what to verify}
```

Examples:
```markdown
- [ ] GET `/new-page/` returns 200
- [ ] DOM: `.new-component` exists on `/some-page/`
- [ ] CSS: `.element` background-color is not `rgb(255, 255, 255)` in dark mode
- [ ] Evaluate: JSON-LD script contains `@type: BlogPosting`
- [ ] Screenshot: New feature page for visual review
```
