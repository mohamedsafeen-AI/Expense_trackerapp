import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, 'dist');
const port = 8080;

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  try {
    const parsed = new url.URL(req.url, `http://${req.headers.host}`);
    let pathname = parsed.pathname;

    if (pathname === '/' || pathname === '') pathname = '/index.html';

    // SPA fallback
    const fullPath = path.join(root, pathname);

    if (!fs.existsSync(fullPath)) {
      const fallback = path.join(root, 'index.html');
      if (fs.existsSync(fallback)) {
        pathname = '/index.html';
      }
    }


    const finalPath = path.join(root, pathname);
    if (!fs.existsSync(finalPath)) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const contentType = getContentType(finalPath);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(finalPath).pipe(res);
  } catch (err) {
    res.statusCode = 500;
    res.end('Server Error');
  }
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});

