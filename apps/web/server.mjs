import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const port = Number.parseInt(process.env.PORT ?? '5173', 10);
const host = process.env.HOST ?? '0.0.0.0';
const apiOrigin = process.env.API_ORIGIN ?? 'http://api:3000';
const root = resolve(import.meta.dirname, 'dist');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

function safePath(urlPath) {
  const requested = normalize(decodeURIComponent(urlPath.split('?')[0] ?? '/')).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  const resolved = resolve(root, `.${requested}`);
  return resolved === root || resolved.startsWith(`${root}${sep}`) ? resolved : null;
}

async function serveFile(response, filePath) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error('not-file');
  }
  response.writeHead(200, {
    'Content-Length': fileStat.size,
    'Content-Type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  if (request.url?.startsWith('/api/')) {
    await proxyApi(request, response);
    return;
  }

  const target = safePath(request.url ?? '/');
  if (!target) {
    response.writeHead(400).end('Bad request');
    return;
  }

  try {
    await serveFile(response, target);
  } catch {
    try {
      await serveFile(response, join(root, 'index.html'));
    } catch {
      response.writeHead(404).end('Not found');
    }
  }
});

async function proxyApi(request, response) {
  const upstream = new URL(request.url ?? '/', apiOrigin);
  try {
    const proxyResponse = await fetch(upstream, {
      method: request.method,
      headers: request.headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request,
      duplex: 'half',
    });
    response.writeHead(proxyResponse.status, Object.fromEntries(proxyResponse.headers.entries()));
    if (proxyResponse.body) {
      for await (const chunk of proxyResponse.body) {
        response.write(chunk);
      }
    }
    response.end();
  } catch {
    response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ code: 'API_PROXY_FAILED', message: 'API unavailable' }));
  }
}

server.listen(port, host, () => {
  console.log(`RCE CQL web listening on http://${host}:${port}`);
});
