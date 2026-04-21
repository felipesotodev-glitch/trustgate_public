import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { Readable } from 'node:stream';

const PORT = Number.parseInt(process.env.PORT ?? '80', 10);
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:8080';
const DEMO_CLIENT_KEY = process.env.DEMO_CLIENT_KEY ?? '';
const WEB_ROOT = join(process.cwd(), 'public');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "frame-ancestors 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN'
};

function withSecurityHeaders(headers = {}) {
  return { ...SECURITY_HEADERS, ...headers };
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, withSecurityHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
  res.end(JSON.stringify(body));
}

function resolveBundledAsset(requestPath) {
  const normalizedPath = requestPath.replace(/\\/g, '/');
  const aliases = new Map([
    ['/styles.css', { prefix: 'styles-', extension: '.css' }],
    ['/main.js', { prefix: 'main-', extension: '.js' }],
    ['/polyfills.js', { prefix: 'polyfills-', extension: '.js' }]
  ]);
  const alias = aliases.get(normalizedPath);
  if (!alias) return null;
  const matchedFile = readdirSync(WEB_ROOT).find(
    (name) => name.startsWith(alias.prefix) && name.endsWith(alias.extension)
  );
  return matchedFile ? join(WEB_ROOT, matchedFile) : null;
}

function resolveStaticFile(pathname) {
  const normalized = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const normalizedPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  const candidate = join(WEB_ROOT, normalized);

  if (existsSync(candidate) && !statSync(candidate).isDirectory()) {
    return candidate;
  }

  const bundledAsset = resolveBundledAsset(normalizedPath);
  if (bundledAsset) return bundledAsset;

  if (extname(normalizedPath)) return null;

  return join(WEB_ROOT, 'index.html');
}

async function proxyRequest(req, res, pathname, search) {
  const upstreamUrl = new URL(`${pathname}${search}`, BACKEND_INTERNAL_URL);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(','));
    }
  }

  headers.delete('host');
  headers.delete('expect');
  headers.delete('connection');

  const hasBody = !['GET', 'HEAD'].includes(req.method ?? 'GET');
  const response = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? 'half' : undefined
  });

  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'transfer-encoding') {
      responseHeaders[key] = value;
    }
  });

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(key)) {
      responseHeaders[key] = value;
    }
  }

  res.writeHead(response.status, responseHeaders);

  if (response.body) {
    Readable.fromWeb(response.body).pipe(res);
    return;
  }
  res.end();
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const { pathname, search } = url;

    // Health check para Railway
    if (pathname === '/railway-health') {
      res.writeHead(200, withSecurityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
      res.end('ok');
      return;
    }

    // Ruta pública de configuración para demos (no requiere autenticación)
    if (pathname === '/api/public-config' && req.method === 'GET') {
      sendJson(res, 200, { demoClientKey: DEMO_CLIENT_KEY });
      return;
    }

    // Proxy hacia el backend para /api/ y /health
    if (pathname === '/health' || pathname.startsWith('/api/')) {
      await proxyRequest(req, res, pathname, search);
      return;
    }

    // Archivos estáticos
    const filePath = resolveStaticFile(pathname);
    if (!filePath) {
      res.writeHead(404, withSecurityHeaders({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }));
      res.end('Not found');
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    const isHtml = ext === '.html';

    res.writeHead(200, withSecurityHeaders({
      'Content-Type': contentType,
      'Cache-Control': isHtml ? 'no-store, must-revalidate' : 'public, max-age=31536000, immutable'
    }));

    createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('TrustGate Public server error:', error);
    sendJson(res, 502, { error: 'server_error', message: 'No fue posible atender la solicitud.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TrustGate Public listening on port ${PORT}`);
  console.log(`Backend target: ${BACKEND_INTERNAL_URL}`);
  console.log(`Demo client key configured: ${DEMO_CLIENT_KEY ? 'yes' : 'no'}`);
});
