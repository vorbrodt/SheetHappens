# CLAUDE.md

@AGENTS.md

## Issue Tracking

Work for this repo is tracked in Jira via the Atlassian MCP server.

- **Jira site:** vorbrodt.atlassian.net
- **Default project:** SheetHappens (key: `KAN`)
- No Confluence spaces are in use for this project.

When asked to look up, create, or update issues without a specific key given, assume the `KAN` project. Reference specific issues by key (e.g. `KAN-12`) whenever possible — it's unambiguous on its own. If work should go to a different project, say so explicitly in the request.

## Git Workflow

- Never push directly to `main`. All changes go through a feature branch and a pull request.
- Always open the PR and stop — the user is the only one who approves and merges. Do not merge, even if asked to "push" or "finish up," unless the user explicitly says to merge/merge without review.
- Do not present "push to main" as an option alongside "open a PR" when asking how to proceed — only the PR path is offered by default.
