const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { initDb, run, all } = require('./db');
const { analyzeWithCache } = require('./analysis');

const PORT = Number(process.env.PORT || 3000);

initDb();

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

const requestCounts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const minute = 60_000;
  const maxRequests = 120;
  const data = requestCounts.get(ip) || { count: 0, start: now };
  if (now - data.start > minute) {
    requestCounts.set(ip, { count: 1, start: now });
    return false;
  }
  data.count += 1;
  requestCounts.set(ip, data);
  return data.count > maxRequests;
}

function serveStatic(req, res) {
  const file = req.url === '/' ? 'index.html' : req.url.slice(1);
  const filePath = path.join(process.cwd(), 'public', file);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const type = file.endsWith('.html') ? 'text/html' : 'text/plain';
  res.writeHead(200, { 'Content-Type': type });
  res.end(fs.readFileSync(filePath));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (rateLimited(req.socket.remoteAddress || 'unknown')) {
    return sendJson(res, 429, { error: 'Too many requests' });
  }

  if (req.method === 'POST' && req.url === '/api/journal') {
    try {
      const { userId, ambience, text } = await parseBody(req);
      if (!userId || !ambience || !text) return sendJson(res, 400, { error: 'userId, ambience, text are required' });
      const analysis = await analyzeWithCache(text);
      run(
        'INSERT INTO journal_entries (user_id, ambience, text, emotion, keywords, summary) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, ambience, text, analysis.emotion, JSON.stringify(analysis.keywords), analysis.summary],
      );
      return sendJson(res, 201, { success: true, analysis });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (req.method === 'GET' && req.url.startsWith('/api/journal/insights/')) {
    const userId = decodeURIComponent(req.url.split('/').pop());
    const total = all('SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?', [userId])[0]?.count || 0;
    const topEmotion =
      all(
        'SELECT emotion, COUNT(*) as c FROM journal_entries WHERE user_id = ? GROUP BY emotion ORDER BY c DESC LIMIT 1',
        [userId],
      )[0]?.emotion || null;
    const mostUsedAmbience =
      all(
        'SELECT ambience, COUNT(*) as c FROM journal_entries WHERE user_id = ? GROUP BY ambience ORDER BY c DESC LIMIT 1',
        [userId],
      )[0]?.ambience || null;

    const recent = all('SELECT keywords FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [userId]);
    const recentKeywords = [...new Set(recent.flatMap((r) => JSON.parse(r.keywords || '[]')))].slice(0, 5);

    return sendJson(res, 200, {
      totalEntries: total,
      topEmotion,
      mostUsedAmbience,
      recentKeywords,
    });
  }

  if (req.method === 'GET' && req.url.startsWith('/api/journal/')) {
    const userId = decodeURIComponent(req.url.split('/').pop());
    const entries = all(
      'SELECT id, user_id as userId, ambience, text, emotion, keywords, summary, created_at as createdAt FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    ).map((entry) => ({ ...entry, keywords: JSON.parse(entry.keywords || '[]') }));
    return sendJson(res, 200, entries);
  }

  if (req.method === 'POST' && req.url === '/api/journal/analyze') {
    try {
      const { text } = await parseBody(req);
      if (!text) return sendJson(res, 400, { error: 'text is required' });
      const analysis = await analyzeWithCache(text);
      return sendJson(res, 200, analysis);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index.html'))) {
    return serveStatic(req, res);
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
