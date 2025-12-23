const path = require("path");
const fs = require("fs");
const os = require("os");

function getBetterSqlite3Path() {
    const normalPath = path.join(
        __dirname,
        "node_modules",
        "better-sqlite3",
        "build",
        "Release",
        "better_sqlite3.node"
    );

    if (!process.pkg) {
        return normalPath; // dev env
    }

    // pkg env → extract
    const tmpDir = path.join(os.tmpdir(), "better-sqlite3");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const tmpPath = path.join(tmpDir, "better_sqlite3.node");

    if (!fs.existsSync(tmpPath)) {
        fs.copyFileSync(normalPath, tmpPath);
    }

    return tmpPath;
}

// Force pkg to bundle native binding
require(getBetterSqlite3Path());

// ✅ Always export the real Database constructor
module.exports = require("better-sqlite3");
