'use strict';

/**
 * pkg bundles JS but sqlite3 loads its native addon via `bindings()`, which
 * probes paths pkg does not populate. Copy the packed .node to a real temp
 * path and short-circuit `require('bindings')` only for sqlite3-binding.
 */
if (!process.pkg) {
  return;
}

const fs = require('fs');
const path = require('path');
const os = require('os');
const Module = require('module');

function resolveBindingSrc() {
  const inSnapshot = path.join(__dirname, 'pkg-native', 'node_sqlite3.node');
  if (fs.existsSync(inSnapshot)) {
    return inSnapshot;
  }
  const besideExe = path.join(path.dirname(process.execPath), 'pkg-native', 'node_sqlite3.node');
  if (fs.existsSync(besideExe)) {
    return besideExe;
  }
  return null;
}

const bindingSrc = resolveBindingSrc();
if (!bindingSrc) {
  console.error(
    'Missing pkg-native/node_sqlite3.node inside the exe or next to zk-agent.exe.\n' +
      'Rebuild using: npm run pkg:win (uses "pkg ." so package.json "pkg".assets are applied).\n' +
      'Using only "pkg production.js" skips those assets — do not use that for this project.\n' +
      'Or copy pkg-native\\node_sqlite3.node next to zk-agent.exe (under a pkg-native subfolder).'
  );
  process.exit(1);
}

const tmpDir = path.join(os.tmpdir(), 'zk-agent-sqlite3');
const tmpBinding = path.join(tmpDir, 'node_sqlite3.node');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
fs.copyFileSync(bindingSrc, tmpBinding);

/** Load .node from a temp path without dynamic require() — pkg cannot bundle variable require(). */
function loadSqlite3NativeAddon(absolutePath) {
  const mod = { exports: {} };
  process.dlopen(mod, absolutePath);
  return mod.exports;
}

let sqlite3BindingExports = null;
function getSqlite3Binding() {
  if (!sqlite3BindingExports) {
    sqlite3BindingExports = loadSqlite3NativeAddon(path.resolve(tmpBinding));
  }
  return sqlite3BindingExports;
}

const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (
    id === 'bindings' &&
    this.filename &&
    (this.filename.includes('sqlite3-binding.js') ||
      this.filename.includes('sqlite3-binding'))
  ) {
    const realBindings = origRequire.apply(this, arguments);
    return function wrappedBindings(opts) {
      const name = typeof opts === 'string' ? opts : opts && opts.bindings;
      if (
        name === 'node_sqlite3.node' ||
        name === 'node_sqlite3' ||
        (typeof name === 'string' && name.replace(/\.node$/i, '') === 'node_sqlite3')
      ) {
        return getSqlite3Binding();
      }
      return realBindings.apply(this, arguments);
    };
  }
  return origRequire.apply(this, arguments);
};
