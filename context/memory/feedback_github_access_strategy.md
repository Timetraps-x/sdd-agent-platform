---
name: github access strategy
description: Prefer raw file URLs for repository file contents, gh CLI for repo/issue/PR metadata, and HTML page scraping only as a fallback.
type: feedback
---
Prefer raw GitHub file URLs for reading repository file contents, use gh CLI for repository metadata / issues / PRs, and use HTML page scraping only as a fallback.

**Why:** This keeps fetched content cleaner, reduces token/context waste, and still preserves convenient metadata access when raw files are not the right source.

**How to apply:** When reading a README or source file, try raw.githubusercontent.com first with a main/master fallback. When checking repo summary, branches, issues, or PR state, prefer gh if available. Only scrape GitHub HTML when raw/gh are unavailable or insufficient.
