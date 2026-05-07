---
name: brainstorming should prefer AskUserQuestion for bounded choices
description: In brainstorming, bounded user decisions should preferentially use AskUserQuestion rather than text A/B/C options.
type: feedback
originSessionId: ab98d4e2-6c47-4011-8676-d9beda36f03c
---
In `/brainstorming`, when the next step depends on bounded user choices, prefer `AskUserQuestion` over plain text A/B/C options.

**Why:** The user wants real option selection to be handled by the interaction tool rather than relying on prompt-shaped text choices.

**How to apply:** When there are 2-4 concrete choices, use `AskUserQuestion` first; keep plain-text option lists only as a fallback when the tool is unavailable or clearly not the right interaction shape.
