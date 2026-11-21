// A deliberately MISCONFIGURED local site for end-to-end testing of the scanner.
// Run: node scripts/weak-test-server.mjs   (listens on http://localhost:4010)
// Pass the verification token as VERIFY_TOKEN=... to serve the ownership file.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 4010);
const HOME = `<!doctype html><html><head>
<meta name="generator" content="WordPress 5.8.1">
<script src="/wp-includes/js/jquery/jquery.min.js?ver=1.12.4"></script>
</head><body><h1>Weak Test Shop</h1><img src="http://insecure-cdn.example/logo.png"></body></html>`;

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader("Server", "Apache/2.4.29 (Ubuntu)");
  res.setHeader("X-Powered-By", "PHP/7.2.24");
  if (req.headers.origin) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  switch (url.pathname) {
    case "/":
      res.setHeader("Set-Cookie", ["PHPSESSID=abc123; path=/", "wp_lang=en; path=/"]);
      res.setHeader("content-type", "text/html");
      return res.end(HOME);
    case "/.env":
      return res.end("APP_ENV=production\nDB_PASSWORD=hunter2\nPAYFAST_KEY=secret\n");
    case "/.git/HEAD":
      return res.end("ref: refs/heads/main\n");
    case "/wp-json/wp/v2/users":
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify([{ id: 1, slug: "admin" }, { id: 2, slug: "shopmanager" }]));
    case "/xmlrpc.php":
      res.statusCode = 405;
      return res.end("XML-RPC server accepts POST requests only.");
    case "/.well-known/njmtech-security-verify.txt":
      if (process.env.VERIFY_TOKEN) return res.end(`njmtech-verify=${process.env.VERIFY_TOKEN}`);
    // fallthrough
    default:
      res.statusCode = 404;
      return res.end("Not found");
  }
}).listen(PORT, () => console.log(`weak test server on http://localhost:${PORT}`));
