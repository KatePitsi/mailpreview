// MailScope Proxy Server — Node.js
// Run: node server.js
// Then open: http://localhost:3333

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3333;
const API_KEY = '3ca6dc0f84ac2eeff8427fc5b6133928';

function mailtrapRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers — allow all origins so browser can call localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Api-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Serve the main HTML app
  if (pathname === '/' || pathname === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html); return;
  }

  // Proxy all /api/* requests to Mailtrap
  if (pathname.startsWith('/api/') || pathname.startsWith('/sandbox-api/')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        // Route sandbox send calls to sandbox.api.mailtrap.io
        const isSandboxSend = pathname.startsWith('/sandbox-api/');
        const host = isSandboxSend ? 'sandbox.api.mailtrap.io' : 'mailtrap.io';
        const apiPath = isSandboxSend ? pathname.replace('/sandbox-api/', '/api/') : pathname;

        const options = {
          hostname: host,
          path: apiPath + (parsed.search || ''),
          method: req.method,
          headers: {
            'Api-Token': API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'MailScope/1.0'
          }
        };

        const result = await mailtrapRequest(options, body || null);
        const contentType = result.headers['content-type'] || 'application/json';
        res.writeHead(result.status, { 'Content-Type': contentType });
        res.end(result.body);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║   MailScope Proxy Server running!     ║');
  console.log('  ║                                       ║');
  console.log(`  ║   Open: http://localhost:${PORT}         ║`);
  console.log('  ║                                       ║');
  console.log('  ║   Press Ctrl+C to stop                ║');
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');
});
