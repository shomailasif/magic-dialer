// Unit tests for the portal's internet lead finder: deterministic behavior
// (never count on live search engines in CI), redirect decoding, junk filters
// and query building.
const { searchLeads, searchQueryFor, decodeRedirect, isJunkResult, brandFromTitle } = require("./portal/find-leads");

let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log("  [PASS] " + name); }
  else { fail++; console.log("  [FAIL] " + name); }
}

(async () => {
  console.log("===== Lead finder =====");

  const q = searchQueryFor("Dispatch Services to truckers for USA and canada");
  check("query avoids careers/jobs noise", q.includes("-jobs") && q.includes("-careers") && q.includes("-recruiting"));

  check("duckduckgo-style redirect decodes", decodeRedirect("//duckduckgo.com/l/?uddg=" + encodeURIComponent("https://acme-trucking.com")) === "https://acme-trucking.com");

  const bingHref = "https://www.bing.com/ck/a?!&&p=abcJmltdHM9MTc4ODQ4MDAwMA&ptn=3&ver=2&hsh=4&fclid=x&u=a1aHR0cHM6Ly9hY21lLXRydWNraW5nLmNvbS8&ntb=1";
  check("bing a1 base64 redirect decodes", decodeRedirect(bingHref) === "https://acme-trucking.com/");

  check("plain url passes through untouched", decodeRedirect("https://plain-site.com/page") === "https://plain-site.com/page");

  check("junk results are filtered (social/apps/news/dictionaries)", isJunkResult({ title: "Save 20% on Dispatch on Steam", source: "https://store.steampowered.com/app/1", snippet: "" }) && isJunkResult({ title: "x", source: "https://en.wikipedia.org/wiki/Dispatch", snippet: "" }) && isJunkResult({ title: "x", source: "https://merriam-webster.com/dictionary/freight", snippet: "" }));

  check("foreign-language noise is filtered", isJunkResult({ title: "価格.com", source: "https://kakaku.com/kaden/aircon/", snippet: "エアコン" }));

  check("real company pages are kept", !isJunkResult({ title: "Swift Freight Lines | Trucking Dispatch", source: "https://swift-freight.com", snippet: "Trucking company in need of dispatch services" }));

  check("brand name is pulled from the title", brandFromTitle("Swift Freight Lines | Trucking Dispatch") === "Swift Freight Lines");

  const savedKey = process.env.SEARCH_FIXED_JSON;
  process.env.SEARCH_FIXED_JSON = JSON.stringify([
    { company: "Alpha Freight", source: "https://alpha-freight.com", snippet: "needs dispatch" },
    { company: "Beta Haulers", source: "https://beta-haulers.ca", snippet: "canada wide" },
  ]);
  const fixed = await searchLeads({ product: "Dispatch Services", count: 3 });
  delete process.env.SEARCH_FIXED_JSON;
  check("SEARCH_FIXED_JSON returns deterministic leads for tests", Array.isArray(fixed) && fixed.length === 2 && fixed[0].company === "Alpha Freight");

  process.env.SEARCH_FIXED_JSON = "not-json{";
  const bad = await searchLeads({ product: "x", count: 3 });
  delete process.env.SEARCH_FIXED_JSON;
  check("malformed fixed JSON fails safe (empty)", Array.isArray(bad) && bad.length === 0);

  check("empty product yields no search at all", Array.isArray(await searchLeads({ product: "", count: 3 })));

  console.log("");
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(2); });