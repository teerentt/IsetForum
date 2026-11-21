import assert from 'node:assert/strict';
import { createServer, request as upstreamRequest } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

// Run against a local dev server populated with the optional showcase profile.
const backend = process.env.ISETFORUM_API_URL || 'http://127.0.0.1:8080';
const root = resolve('dist/isetforum/browser');
const images = resolve('../docs/images');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  if (request.url.startsWith('/api/')) {
    const upstream = upstreamRequest(new URL(request.url, backend), {
      method: request.method, headers: { ...request.headers, host: new URL(backend).host }
    }, result => { response.writeHead(result.statusCode, result.headers); result.pipe(response); });
    upstream.on('error', () => response.writeHead(503).end('Backend indisponible'));
    request.pipe(upstream);
    return;
  }
  try {
    const path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const file = extname(path) ? path : resolve(root, 'index.html');
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});

let browser;
try {
  await mkdir(images, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function capture(name) {
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: resolve(images, name), fullPage: false, animations: 'disabled' });
  }
  await page.goto(url + '/connexion');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).waitFor();
  await capture('login.png');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(process.env.ISETFORUM_CAPTURE_EMAIL || 'admin@isetforum.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill(process.env.ISETFORUM_CAPTURE_PASSWORD || 'IsetForumDev!2026');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.locator('.post-card').first().waitFor();
  const geometry = await page.evaluate(() => {
    const bounds = selector => document.querySelector(selector).getBoundingClientRect();
    const frame = bounds('.app-layout');
    return {
      leftInset: frame.left,
      rightInset: document.documentElement.clientWidth - frame.right,
      leftGap: bounds('.main-content').left - bounds('app-sidebar').right,
      rightGap: bounds('.context-sidebar').left - bounds('.main-content').right,
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  });
  assert.ok(geometry.leftInset > 0);
  assert.ok(Math.abs(geometry.leftInset - geometry.rightInset) <= 1);
  assert.ok(geometry.leftGap > 0);
  assert.ok(Math.abs(geometry.leftGap - geometry.rightGap) <= 1);
  assert.equal(geometry.scrollWidth, geometry.width);
  await capture('forum-light.png');
  await page.getByRole('button', { name: 'Activer le mode sombre', exact: true }).click();
  await capture('forum-dark.png');
  await page.locator('.post-card .title-button').first().click();
  await page.locator('.publication').waitFor();
  await page.locator('app-pdf-attachment .loading').waitFor({ state: 'hidden' });
  await capture('sprint4-discussion-dark.png');
  await page.getByRole('button', { name: 'Activer le mode clair', exact: true }).click();
  await page.locator('.main-nav').getByRole('button', { name: 'Administration', exact: true }).click();
  await page.getByRole('button', { name: 'Inscriptions autorisées', exact: true }).click();
  await page.getByRole('table').waitFor();
  await capture('sprint4-admin-import.png');
  assert.deepEqual(errors, []);
  console.log('5 captures desktop 1920 × 1080 (16:9), sans défilement complet.');
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise(resolve => server.close(resolve));
}
