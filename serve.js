// Lokalny podgląd pod tą samą podścieżką co na GitHub Pages. node serve.js [--dir=dist] [--port=8080]
const http = require('http'), fs = require('fs'), path = require('path'), C = require('./config');
const arg = n => (process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const D = path.resolve(__dirname, arg('dir') || 'dist'), PORT = +(arg('port') || 8080), BP = new URL(C.BASE_URL).pathname;
const T = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif' };
http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') { s.writeHead(302, { Location: BP }); return s.end(); }
  let f = p.startsWith(BP) ? path.join(D, p.slice(BP.length)) : null;
  if (f && !f.startsWith(D)) f = null;
  if (f && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f || !fs.existsSync(f)) { s.writeHead(404, { 'Content-Type': T['.html'] }); return s.end(fs.readFileSync(path.join(D, '404.html'))); }
  s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(s);
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BP}  (katalog ${path.relative(__dirname, D)})`));
