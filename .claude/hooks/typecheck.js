// PostToolUse hook: runs tsc --noEmit after any .ts/.tsx edit.
// The project has no test suite, so the type checker is the main safety net.
// Exit 2 feeds the errors back to Claude so it fixes them immediately.
const fs = require("fs");
const { spawnSync } = require("child_process");

let input = {};
try {
    input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
    process.exit(0);
}

const filePath = (input.tool_input && input.tool_input.file_path) || "";
if (!/\.(ts|tsx)$/.test(filePath)) {
    process.exit(0);
}

const result = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
    cwd: input.cwd || process.cwd(),
    shell: true,
    encoding: "utf8",
    timeout: 120000,
});

const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
if (result.status !== 0 && output) {
    // Keep it short: first 30 lines are enough to locate the errors.
    console.error("tsc --noEmit hatalari:\n" + output.split("\n").slice(0, 30).join("\n"));
    process.exit(2);
}

process.exit(0);
