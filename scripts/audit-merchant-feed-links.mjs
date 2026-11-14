import { readFile } from "node:fs/promises";

const feedPath = new URL("../public/google-merchant-feed.xml", import.meta.url);
const feed = await readFile(feedPath, "utf8");
const items = [...feed.matchAll(/<item>[\s\S]*?<g:id>([\s\S]*?)<\/g:id>[\s\S]*?<g:link>([\s\S]*?)<\/g:link>[\s\S]*?<g:image_link>([\s\S]*?)<\/g:image_link>[\s\S]*?<\/item>/g)]
  .map((match) => ({
    id: match[1].trim(),
    link: match[2].replaceAll("&amp;", "&").trim(),
    imageLink: match[3].replaceAll("&amp;", "&").trim(),
  }));

const concurrency = 24;
const results = new Array(items.length);
let cursor = 0;

async function inspect(item) {
  const response = await fetch(item.link, {
    method: "GET",
    redirect: "manual",
    headers: { "user-agent": "K4MerchantFeedAudit/1.0" },
  });
  const baseLink = item.link.replace(/-sketch\/?$/, "");
  let baseStatus = null;
  if (response.status >= 400) {
    const baseResponse = await fetch(baseLink, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "K4MerchantFeedAudit/1.0" },
    });
    baseStatus = baseResponse.status;
  }
  return { ...item, status: response.status, baseLink, baseStatus };
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= items.length) return;
    try {
      results[index] = await inspect(items[index]);
    } catch (error) {
      results[index] = { ...items[index], status: 0, error: error.message };
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

const failures = results.filter((result) => result.status < 200 || result.status >= 400);
console.log(JSON.stringify({
  checked: items.length,
  failures: failures.length,
  results: failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
