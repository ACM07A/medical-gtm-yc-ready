// Browser automation — drives the LOCAL Edge/Chrome via puppeteer-core (no Chromium download).
// Free, runs on this machine. For JS-rendered pages, screenshots, and deeper public-page scraping.
import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CANDIDATES = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
export function browserPath() { return CANDIDATES.find((p) => existsSync(p)) || null; }

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// One browser kept open for a batch (efficient). fn gets { nav(url)->text, links(url)->hrefs }.
export async function session(fn) {
  const executablePath = browserPath();
  if (!executablePath) throw new Error("no local Edge/Chrome found");
  const browser = await puppeteer.launch({ executablePath, headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    const nav = async (url) => { try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 }); return await page.evaluate(() => document.body.innerText || ""); } catch { return ""; } };
    const links = async (url) => { try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 }); return await page.evaluate(() => [...document.querySelectorAll("a")].map((a) => a.href).filter((h) => /^https?:\/\//.test(h))); } catch { return []; } };
    return await fn({ nav, links });
  } finally { await browser.close(); }
}

// STEALTH session — non-headless, uses a REAL browser profile so search engines see a human session,
// not a bot (headless mode is what triggers Google/Bing/DDG CAPTCHAs). Runs on the user's own desktop.
// Set STEALTH_PROFILE_DIR to a copy of your Edge/Chrome "User Data" to reuse a logged-in session.
// Note: the browser must not already be running on that profile (profile lock). Falls back gracefully.
export async function stealthSession(fn) {
  const executablePath = browserPath();
  if (!executablePath) throw new Error("no local Edge/Chrome found");
  const userDataDir = process.env.STEALTH_PROFILE_DIR || undefined;
  const browser = await puppeteer.launch({
    executablePath, headless: false, userDataDir,
    args: ["--disable-blink-features=AutomationControlled", "--no-first-run", "--no-default-browser-check", "--start-maximized"],
    defaultViewport: null,
  });
  try {
    const page = (await browser.pages())[0] || await browser.newPage();
    await page.setUserAgent(UA);
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, "webdriver", { get: () => undefined }); });
    const nav = async (url) => { try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); await new Promise(r => setTimeout(r, 900)); return await page.evaluate(() => document.body.innerText || ""); } catch { return ""; } };
    return await fn({ nav, page });
  } finally { await browser.close(); }
}

export async function withPage(fn) {
  const executablePath = browserPath();
  if (!executablePath) throw new Error("no local Edge/Chrome found");
  const browser = await puppeteer.launch({ executablePath, headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36");
    return await fn(page);
  } finally { await browser.close(); }
}

// Render a JS-heavy page to text (fallback to fetch handled by caller).
export async function renderText(url) {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return (await page.evaluate(() => document.body.innerText || "")).slice(0, 8000);
  });
}

// Screenshot a page (tangible proof of browser automation; e.g. a rendered landing page).
export async function screenshot(url, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  return withPage(async (page) => {
    await page.setViewport({ width: 1200, height: 900 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await page.screenshot({ path: outPath, fullPage: true });
    return outPath;
  });
}
