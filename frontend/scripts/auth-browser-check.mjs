import assert from 'node:assert/strict';
import { createServer, request as upstreamRequest } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

// This suite requires the dev backend and exercises actual database accounts.
const root = resolve('dist/isetforum/browser');
const backend = process.env.ISETFORUM_API_URL || 'http://127.0.0.1:8080';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  if (request.url.startsWith('/api/')) {
    const upstream = upstreamRequest(new URL(request.url, backend), { method: request.method, headers: { ...request.headers, host: new URL(backend).host } }, result => {
      response.writeHead(result.statusCode, result.headers); result.pipe(response);
    });
    upstream.on('error', () => { response.writeHead(503, { 'Content-Type': 'application/json' }); response.end('{"message":"Backend unavailable"}'); });
    request.pipe(upstream); return;
  }
  try {
    const path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const file = extname(path) ? path : resolve(root, 'index.html');
    response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = process.env.ISETFORUM_FRONTEND_URL || `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: process.env.CAMPUS_BROWSER_CHANNEL || 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  assert.equal((await page.goto(url)).status(), 200);
  await page.getByRole('heading', { name: /Heureux de vous/ }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/login-desktop.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  const logo = page.locator('.auth-logo img');
  assert.ok(await logo.evaluate(image => image.complete && image.naturalWidth > 0), 'Le logo ISET doit être chargé.');

  // Show a useful backend outage message, with no fixture-based login fallback.
  await page.route('**/api/auth/csrf', route => route.abort());
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('etudiant@isetforum.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('IsetForumDev!2026');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Connexion au serveur impossible' }).waitFor();
  await page.unroute('**/api/auth/csrf');

  // Wrong credentials, then actual student login, session cookie, and refresh.
  await page.getByLabel('Mot de passe', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'incorrect' }).waitFor();
  const login = async email => {
    await page.getByLabel('Adresse e-mail', { exact: true }).fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill('IsetForumDev!2026');
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await page.locator('.post-card').first().waitFor();
  };
  await login('etudiant@isetforum.test');
  assert.equal((await context.cookies()).find(c => c.name === 'JSESSIONID').httpOnly, true);
  assert.equal((await page.request.get(url + '/api/auth/me').then(r => r.json())).name, 'Lina Ben Ali');
  assert.equal(await page.locator('.post-card').count(), 5);
  await page.reload();
  await page.locator('.post-card').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'artifacts/forum-desktop.png', fullPage: true });
  assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).fontSize), '16px');
  assert.ok(await page.locator('.post-card h2').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 20));
  assert.equal(await page.locator('.discovery-sidebar, .composer, .post-art').count(), 0);
  await page.screenshot({ path: 'artifacts/forum-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Activer le mode sombre', exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.screenshot({ path: 'artifacts/forum-dark.png', fullPage: true });
  await page.reload();
  await page.locator('.post-card').first().waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.getByRole('button', { name: 'Activer le mode clair', exact: true }).click();

  // Forum fixtures remain functional under the real authenticated identity.
  await page.getByRole('searchbox').fill('Spring Boot');
  await page.locator('.post-card').first().waitFor();
  await page.locator('.save-button').first().click();
  await page.locator('.main-nav').getByRole('button', { name: 'Mon profil', exact: true }).click();
  await page.getByRole('button', { name: 'Mes favoris', exact: true }).click();
  await page.locator('.post-card').first().waitFor();
  assert.equal(await page.locator('.post-card').count(), 1);
  await page.locator('.post-card .title-button').click();
  await page.getByLabel('Votre commentaire').fill('Merci pour cette fiche !');
  await page.getByRole('button', { name: 'Publier le commentaire' }).click();
  await page.getByText('Merci pour cette fiche !', { exact: true }).waitFor();
  assert.match(page.url(), /forum\/publications\/p1$/);
  await page.reload();
  await page.getByText('Merci pour cette fiche !', { exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/publication-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Retour au fil', exact: false }).click();
  await page.locator('.main-nav').getByRole('button', { name: 'Communautés', exact: true }).click();
  await page.locator('.community-card').first().waitFor();
  await page.screenshot({ path: 'artifacts/communities-desktop.png', fullPage: true });
  await page.locator('.community-card').getByRole('button', { name: 'Cercle de recherche IA', exact: true }).click();
  await page.getByRole('heading', { name: 'Un espace réservé aux membres' }).waitFor();
  await page.screenshot({ path: 'artifacts/private-community.png', fullPage: true });
  assert.equal(await page.getByText('Cercle de lecture : comprendre les mécanismes d’attention', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Demander à rejoindre', exact: true }).click();
  await page.getByText('Votre demande attend l’approbation d’un administrateur.', { exact: true }).waitFor();

  // Students can still create private demo communities and publish as members.
  await page.locator('.main-nav').getByRole('button', { name: 'Communautés', exact: true }).click();
  await page.locator('.list-toolbar').getByRole('button', { name: 'Créer une communauté', exact: true }).click();
  await page.getByLabel('Nom de la communauté').fill('Atelier de test');
  await page.getByLabel('De quoi parle-t-on ?').fill('Une communauté privée de démonstration.');
  await page.getByRole('radio', { name: /Privée/ }).check();
  await page.getByRole('button', { name: 'Créer la communauté', exact: true }).click();
  await page.locator('.create-post').click();
  await page.getByLabel('Votre titre').fill('Notre projet de test');
  await page.getByLabel('Votre message').fill('Un premier message dans notre espace privé.');
  await page.getByRole('button', { name: 'Partager avec la communauté', exact: true }).click();
  await page.getByRole('heading', { name: 'Notre projet de test', exact: true }).waitFor();
  const privatePostUrl = page.url();
  await page.locator('.main-nav').getByRole('button', { name: 'Mon profil', exact: true }).click();
  await page.locator('.post-card .title-button').filter({ hasText: 'Notre projet de test' }).waitFor();
  await page.getByRole('button', { name: 'Mes favoris', exact: true }).click();
  assert.equal(await page.locator('.post-card').count(), 1);
  await page.reload();
  await page.locator('.post-card .title-button').filter({ hasText: 'Spring Boot' }).waitFor();
  await page.screenshot({ path: 'artifacts/profile-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Créer une publication', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/profile-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.locator('.main-nav').getByRole('button', { name: 'Communautés', exact: true }).click();
  await page.locator('.community-card').getByRole('button', { name: 'Informatique', exact: true }).click();
  await page.getByRole('button', { name: 'Ressources', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.post-card').length === 1);
  assert.equal(await page.locator('.post-card').count(), 1);
  await page.screenshot({ path: 'artifacts/resources-desktop.png', fullPage: true });
  await page.locator('.post-card .title-button').click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger les notes (.txt)', exact: true }).click();
  assert.match((await downloadEvent).suggestedFilename(), /\.txt$/);

  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.getByRole('heading', { name: /Heureux de vous/ }).waitFor();
  assert.equal((await page.request.get(url + '/api/auth/me')).status(), 401);

  // Teacher and administrator accounts are real seeded roles, not a profile picker.
  await login('professeur@isetforum.test');
  assert.equal((await page.request.get(url + '/api/auth/me').then(r => r.json())).role, 'PROFESSOR');
  assert.equal(await page.locator('.main-nav').getByRole('button', { name: 'Administration', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.getByRole('heading', { name: /Heureux de vous/ }).waitFor();
  await login('admin@isetforum.test');
  await page.locator('.main-nav').getByRole('button', { name: 'Administration', exact: true }).click();
  await page.getByRole('button', { name: 'Approuver', exact: true }).click();
  await page.getByRole('heading', { name: 'Tout est à jour.' }).waitFor();
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.getByRole('heading', { name: /Heureux de vous/ }).waitFor();

  // Registration writes a fresh database account and returns to login.
  const email = `browser-${Date.now()}@isetforum.test`;
  await page.getByRole('link', { name: 'Rejoindre IsetForum' }).click();
  await page.getByLabel('Nom complet').waitFor();
  await page.screenshot({ path: 'artifacts/register-desktop.png', fullPage: true });
  await page.getByLabel('Nom complet').fill('Étudiant Navigateur');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(email);
  await page.locator('#password').fill('IsetForumDev!2026');
  await page.getByLabel('Confirmer le mot de passe').fill('IsetForumDev!2026');
  await page.getByRole('button', { name: 'Créer mon compte étudiant' }).click();
  await page.getByText('Votre compte a été créé. Vous pouvez vous connecter.', { exact: true }).waitFor();
  await login(email);
  assert.equal((await page.request.get(url + '/api/auth/me').then(r => r.json())).role, 'STUDENT');
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.getByRole('heading', { name: /Heureux de vous/ }).waitFor();

  // Mobile login and public browsing; protected routes redirect to login.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('');
  await page.screenshot({ path: 'artifacts/login-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('link', { name: 'Continuer en visiteur' }).click();
  await page.locator('.post-card').first().waitFor();
  await page.getByRole('searchbox').fill('algèbre');
  await page.locator('.post-card .title-button').filter({ hasText: 'algèbre' }).waitFor();
  assert.equal(await page.locator('.post-card').count(), 1);
  await page.getByRole('searchbox').fill('');
  assert.equal(await page.getByText('Notre projet de test', { exact: true }).count(), 0);
  await page.screenshot({ path: 'artifacts/forum-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile feed overflows horizontally');
  assert.ok(await page.locator('.topbar').evaluate(el => el.getBoundingClientRect().height < 150), 'Mobile header should stay on two rows');
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Afficher la navigation', exact: true }).click();
  await page.locator('.main-nav').getByRole('button', { name: 'Communautés', exact: true }).click();
  await page.getByRole('heading', { name: 'Communautés', exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/communities-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.goto(privatePostUrl);
  await page.getByRole('heading', { name: 'Publication indisponible' }).waitFor();
  assert.equal(await page.getByText('Un premier message dans notre espace privé.', { exact: true }).count(), 0);
  await page.goto(url + '/forum/publications/inconnue');
  await page.getByRole('heading', { name: 'Publication indisponible' }).waitFor();
  await page.goto(url + '/forum/profil');
  await page.getByRole('heading', { name: /Heureux de vous/ }).waitFor();
  await page.goto(url + '/forum/favoris');
  await page.getByRole('heading', { name: /Heureux de vous/ }).waitFor();
  assert.deepEqual(errors, [], 'Browser runtime errors');
  await mkdir('artifacts', { recursive: true });
  const { writeFile } = await import('node:fs/promises');
  await writeFile('artifacts/mysql-check-account.json', JSON.stringify({ email, password: 'IsetForumDev!2026' }));
  console.log('Passed: real MySQL registration, all three roles, session refresh/logout, errors, guest browsing, forum interactions, private demo access, and mobile layouts.');
  console.log('Screenshots: artifacts/login-desktop.png, login-mobile.png, forum-desktop.png, forum-mobile.png');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
