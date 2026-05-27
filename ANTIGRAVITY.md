# Antigravity-Gemini Delegation Protocol

To optimize token limits and context window efficiency, you should delegate heavy read-only tasks to Gemini CLI.

## Delegation Rules
- **Use Gemini for:**
  - Searching the codebase (`grep`, `glob`).
  - Reading large files or multiple files to gather context.
  - Investigating architecture or file structures.
  - Analyzing logs or large data outputs.
- **Command:** Use the `gemini` command: `gemini "your request here"`
- **Why:** Gemini handles the "get-and-carry" (getir-götür) work, allowing you to focus on high-level reasoning and complex edits without exhausting your primary LLM limits.
- **Constraint:** Only delegate **read-only** tasks. You remain the primary agent for making code changes (edits/writes) to ensure consistency.

## Example Usage
- "gemini 'search for all API route handlers'"
- "gemini 'explain the component hierarchy in src/components'"
- "gemini 'inspect the package.json and list all dependencies'"
