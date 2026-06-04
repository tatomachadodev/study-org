import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'public');
const port = Number(process.env.PORT || 3070);
const apiUrl = (process.env.API_URL || 'http://95.111.238.203:3071').replace(/\/+$/, '');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function resolveAssetPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const assetPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const requestedPath = normalize(join(root, assetPath));

  if (!requestedPath.startsWith(root)) {
    return null;
  }

  return existsSync(requestedPath) ? requestedPath : join(root, 'index.html');
}

createServer(async (req, res) => {
  try {
    if (req.url === '/env.js') {
      send(res, 200, `globalThis.__env = { API_URL: ${JSON.stringify(apiUrl)} };\n`, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/javascript; charset=utf-8',
      });
      return;
    }

    const filePath = resolveAssetPath(req.url || '/');

    if (!filePath) {
      send(res, 403, 'Forbidden');
      return;
    }

    const body = await readFile(filePath);
    const extension = extname(filePath);
    const isIndex = filePath.endsWith('index.html');

    send(res, 200, body, {
      'Cache-Control': isIndex ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
    });
  } catch {
    send(res, 404, 'Not found');
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Frontend listening on 0.0.0.0:${port}`);
});
