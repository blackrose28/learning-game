# .mlai

This folder belongs to ML AI Code. It keeps the agent's files for this project next to your code.

| Path | What it holds | In git |
| --- | --- | --- |
| plans/ | One Markdown file per finished Plan-mode run. Build one with "Switch to Guided" or `mlai --mode guided "Build the plan in .mlai/plans/<file>"`. | Ignored by default |
| memory/ | Facts the agent saved for this project ("remember ..."). /memories lists them; /memories off turns memory off. | Ignored |
| settings.json | Shared project settings (/config --project). | Commit it |
| settings.local.json | Settings for this machine only. | Ignored |
| mcp.json | MCP servers for this project (/mcp). | Commit it |
| MEMORY.md | Project notes every session reads. | Commit it |
| policy.yml, hooks.json, agents/ | Permission rules, hooks and custom agents, when you add them. | Commit them |

To share plans with your team, delete the `plans/` line in .mlai/.gitignore.
