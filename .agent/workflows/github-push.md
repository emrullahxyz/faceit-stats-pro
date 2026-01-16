---
description: Push the current project to GitHub using GH CLI
---

// turbo-all
# Push to GitHub Workflow

This workflow uses the GitHub CLI (`gh`) to automatically manage the repository.

1. Check if logged in:
   `gh auth status`

2. Check if a repository exists on GitHub for this folder:
   `gh repo view --json url`

3. If repository doesn't exist, create it:
   `gh repo create faceit-stats-pro --public --source=. --remote=origin --push`

4. If it exists but not pushed:
   `git add .`
   `git commit -m "update: repository sync"`
   `git push -u origin main`
