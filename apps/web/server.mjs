import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const port = Number.parseInt(process.env.PORT ?? '5173', 10);
const host = process.env.HOST ?? '0.0.0.0';
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

server.listen(port, host, () => {
  console.log(`RCE CQL web listening on http://${host}:${port}`);
});
