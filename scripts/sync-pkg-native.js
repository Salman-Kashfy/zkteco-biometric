'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const destDir = path.join(root, 'pkg-native');
const dest = path.join(destDir, 'node_sqlite3.node');

const candidates = [
  path.join(root, 'node_modules', 'sqlite3', 'build', 'Release', 'node_sqlite3.node'),
  path.join(
    root,
    'node_modules',
    'sqlite3',
    'lib',
    'binding',
    `node-v${process.versions.modules}-${process.platform}-${process.arch}`,
    'node_sqlite3.node'
  ),
];

let src = null;
for (const p of candidates) {
  if (fs.existsSync(p)) {
    src = p;
    break;
  }
}

if (!src) {
  const bindingRoot = path.join(root, 'node_modules', 'sqlite3', 'lib', 'binding');
  if (fs.existsSync(bindingRoot)) {
    for (const name of fs.readdirSync(bindingRoot)) {
      const p = path.join(bindingRoot, name, 'node_sqlite3.node');
      if (fs.existsSync(p)) {
        src = p;
        break;
      }
    }
  }
}

if (!src) {
  console.error(
    'Could not find node_sqlite3.node under node_modules/sqlite3. Run npm install and npm rebuild sqlite3, then try again.'
  );
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
fs.copyFileSync(src, dest);
console.log('sync-pkg-native:', src, '->', dest);
console.log('Node ABI (for pkg target):', process.versions.modules, process.platform, process.arch);

// pkg --targets node18-win-x64 embeds Node 18 (NODE_MODULE_VERSION 108).
if (process.versions.modules !== '108') {
  console.warn(
    '\nWARNING: Current Node ABI is ' +
      process.versions.modules +
      ', but node18-win-x64 expects 108 (Node 18.x).\n' +
      'Use Node 18 to install/rebuild sqlite3, then run this script again, or the exe may fail when loading SQLite.\n'
  );
}
