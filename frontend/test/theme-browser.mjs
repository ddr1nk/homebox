// Run after `pnpm build`: node test/theme-browser.mjs
// Uses a local static server and mocked API; never connects to a real collection.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium, expect } from "@playwright/test";

const root = resolve(".output/public");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  let file = resolve(root, "." + new URL(req.url, "http://localhost").pathname);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    res.setHeader("Content-Type", mime[extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await context.addCookies([{ name: "hb.auth.session", value: "true", url: origin }]);
  let settings = { language: "ru", theme: "night", displayLegacyHeader: true };
  await context.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    let body = [];
    if (path === "/users/self/settings") {
      if (route.request().method() === "PUT") settings = route.request().postDataJSON();
      body = { item: settings };
    } else if (path === "/users/self") {
      body = { item: { id: "test-user", name: "Александр", email: "test@example.com", defaultGroupId: "test-group", groupIds: ["test-group"] } };
    } else if (path === "/status") {
      body = { build: { version: "test", commit: "test" }, latest: { version: "test" }, telemetry: false };
    } else if (path === "/groups/all") {
      body = [{ id: "test-group", name: "Дом", currency: "RUB" }];
    } else if (path === "/groups") {
      body = { id: "test-group", name: "Дом", currency: "RUB" };
    } else if (path === "/entities") {
      body = { items: [], total: 0, page: 1, pageSize: 12 };
    }
    await route.fulfill({ json: body });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(origin + "/profile");
  const picker = page.getByRole("combobox", { name: "Тема", exact: true });
  await expect(picker).toHaveText("Классическая");
  await picker.click();
  await page.getByRole("option", { name: "Современная", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-interface-theme", "modern");
  await expect.poll(() => settings.interfaceTheme).toBe("modern");
  assert.equal(settings.theme, "night");
  assert.equal(settings.displayLegacyHeader, true);
  assert.equal(await page.locator("html").evaluate(el => getComputedStyle(el).getPropertyValue("--background-accent").trim()), "240 5% 97%");
  await page.reload();
  await expect(picker).toHaveText("Современная");
  await mkdir(".output/theme-screenshots", { recursive: true });
  await page.screenshot({ path: ".output/theme-screenshots/modern-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await picker.scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".output/theme-screenshots/modern-mobile.png" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await picker.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: "Классическая", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-interface-theme", "classic");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await expect.poll(() => settings.interfaceTheme).toBe("classic");
  assert.deepEqual(errors, []);
  console.log("PASS: theme switching, server save, reload, classic palette restoration, keyboard access and mobile layout");
} finally {
  await browser?.close();
  server.close();
}
