// Petit serveur local pour essayer l'appli et lancer les tests : node outils/serveur.mjs  puis ouvrir http://localhost:8080
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = +(process.env.PORT || 8080);
const TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".md": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8"};
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = normalize(join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try { const body = await readFile(file); res.writeHead(200, {"Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache"}).end(body); }
  catch { res.writeHead(404).end("introuvable"); }
}).listen(port, () => console.log(`Floussi : http://localhost:${port}`));
