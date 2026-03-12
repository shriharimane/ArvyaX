const { execFileSync } = require('node:child_process');
const path = require('node:path');

const DB_PATH = path.join(process.cwd(), 'data.sqlite');

function run(sql, params = []) {
  const stmt = params.reduce((acc, value) => {
    const encoded = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
    return acc.replace('?', encoded);
  }, sql);
  execFileSync('sqlite3', [DB_PATH, stmt], { stdio: 'pipe' });
}

function all(sql, params = []) {
  const stmt = params.reduce((acc, value) => {
    const encoded = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
    return acc.replace('?', encoded);
  }, sql);
  const out = execFileSync('sqlite3', ['-json', DB_PATH, stmt], { stdio: 'pipe' }).toString().trim();
  return out ? JSON.parse(out) : [];
}

function initDb() {
  run(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      ambience TEXT NOT NULL,
      text TEXT NOT NULL,
      emotion TEXT,
      keywords TEXT,
      summary TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  run(`
    CREATE TABLE IF NOT EXISTS analysis_cache (
      text_hash TEXT PRIMARY KEY,
      emotion TEXT NOT NULL,
      keywords TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = {
  DB_PATH,
  run,
  all,
  initDb,
};
