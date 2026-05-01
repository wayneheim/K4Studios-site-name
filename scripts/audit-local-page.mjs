#!/usr/bin/env node

const targetUrl =
  process.argv[2] ||
  "http://127.0.0.1:8787/Blog/what-is-historically-themed-photography";

function count(pattern, text) {
  return [...text.matchAll(pattern)].length;
}

function firstMatch(pattern, text) {
  return text.match(pattern)?.[1] || "";
}

function boolLine(label, passed, detail = "") {
  const status = passed ? "PASS" : "FAIL";
  console.log(`${status} ${label}${detail ? `: ${detail}` : ""}`);
  return passed;
}

async function main() {
  console.log(`Auditing ${targetUrl}`);
  console.log("Start the local server separately, for example:");
  console.log("  npx wrangler dev --port 8787");
  console.log("");

  let response;
  try {
    response = await fetch(targetUrl, {
      headers: { "User-Agent": "K4 local source audit" },
    });
  } catch (error) {
    console.error(`FAIL fetch: ${error.message}`);
    process.exit(1);
  }

  const html = await response.text();
  let ok = true;

  ok = boolLine("HTTP status", response.ok, String(response.status)) && ok;

  const title = firstMatch(/<title>(.*?)<\/title>/is, html);
  const canonical = firstMatch(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i, html);
  const description = firstMatch(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i, html);

  ok = boolLine("title", title.length > 0, title) && ok;
  ok = boolLine("canonical", canonical === "https://www.k4studios.com/Blog/what-is-historically-themed-photography", canonical) && ok;
  ok = boolLine("meta description", description.length > 0, description) && ok;

  ok = boolLine("exactly one H1", count(/<h1\b/gi, html) === 1, String(count(/<h1\b/gi, html))) && ok;
  ok = boolLine("has main", /<main\b/i.test(html)) && ok;
  ok = boolLine("has article", /<article\b/i.test(html)) && ok;
  ok = boolLine("crawlable definition", html.includes("Historically themed photography is contemporary fine art photography")) && ok;
  ok = boolLine("Facing History link", html.includes("Facing History - historically themed fine art photography")) && ok;
  ok = boolLine("Glossary link", html.includes('href="/Glossary"')) && ok;

  const headOpen = html.indexOf("<head");
  const headClose = html.indexOf("</head>");
  const bodyOpen = html.search(/<body\b/i);
  const jsonLdMatches = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']/gi)];

  ok = boolLine("JSON-LD count", jsonLdMatches.length >= 3, String(jsonLdMatches.length)) && ok;
  for (const [index, match] of jsonLdMatches.entries()) {
    const position = match.index ?? -1;
    const inHead = position > headOpen && position < headClose;
    const floating = position > headClose && position < bodyOpen;
    ok = boolLine(`JSON-LD ${index + 1} valid placement`, inHead || position > bodyOpen, `inHead=${inHead} floating=${floating}`) && ok;
  }

  const forbidden = [
    "Vite",
    "/@vite",
    "astro-dev-toolbar",
    "data-astro-source-file",
    "data-astro-source-loc",
    "data-vite-dev-id",
    "Â© Wayne Heim",
  ];

  for (const marker of forbidden) {
    ok = boolLine(`no ${marker}`, !html.includes(marker)) && ok;
  }

  process.exit(ok ? 0 : 1);
}

main();
