// PreToolUse hook: blocks Edit/Write on .env files (secrets live there).
// .env.example is allowed — it contains no real keys.
const fs = require("fs");

let input = {};
try {
    input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
    process.exit(0);
}

const filePath = (input.tool_input && input.tool_input.file_path) || "";
const base = filePath.replace(/\\/g, "/").split("/").pop() || "";

if (/^\.env(\..+)?$/.test(base) && base !== ".env.example") {
    console.error(
        `${base} korumali bir dosyadir (API anahtarlari icerir). ` +
        `Degisiklik gerekiyorsa kullaniciya soyle, elle duzenlesin.`
    );
    process.exit(2);
}

process.exit(0);
