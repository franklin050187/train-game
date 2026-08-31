const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3010);
const ROOT = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url || "/", "http://x").pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.normalize(path.join(ROOT, pathname));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      const alt = path.join(ROOT, pathname.endsWith(".html") ? path.basename(pathname) : pathname + ".html");
      if (alt !== file) {
        fs.readFile(alt, (err2, buf2) => {
          if (err2) { res.writeHead(404); res.end("not found"); return; }
          const ext = path.extname(alt);
          res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
          res.end(buf2);
        });
      } else {
        res.writeHead(404); res.end("not found");
      }
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(buf);
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`static server on :${PORT} -> ${ROOT}`));