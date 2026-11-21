// Notify IndexNow search engines (Bing, Yandex, Seznam, Naver…) of the site's sitemap URLs.
// Run after publishing or updating posts:  node scripts/indexnow.mjs   (or pass specific URLs as args)
// The key is public by design: it's served at https://security.njmtech.co.za/15d9bf3194cafc2c9689ac596a3bb988.txt
const HOST = "security.njmtech.co.za";
const KEY = "15d9bf3194cafc2c9689ac596a3bb988";

let urls = process.argv.slice(2);
if (urls.length === 0) {
  const sitemap = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
const keyOk = (await (await fetch(`https://${HOST}/${KEY}.txt`)).text()).trim() === KEY;
if (!keyOk) throw new Error("IndexNow key file isn't live yet; deploy first");

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
// 200 = accepted, 202 = accepted (key validation pending). 4xx = problem with key/URLs.
console.log(`IndexNow: HTTP ${res.status} for ${urls.length} URL(s)`);
for (const u of urls) console.log("  ", u);
if (res.status >= 400) process.exitCode = 1;
