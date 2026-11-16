import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Vérification réelle des API. Crée deux communautés de test sans modifier les données existantes.
const base = process.env.ISETFORUM_API_URL || 'http://127.0.0.1:8080';
const password = process.env.DEV_SEED_PASSWORD || 'IsetForumDev!2026';
const reportFile = new URL('../target/sprint2-verification.json', import.meta.url);

function session() { return { cookies: new Map() }; }

async function request(session, path, method = 'GET', body) {
  // Les écritures utilisent toujours un jeton CSRF frais, y compris après connexion.
  if (method !== 'GET') await request(session, '/api/auth/csrf');
  const headers = { Cookie: [...session.cookies].map(([key, value]) => `${key}=${value}`).join('; ') };
  if (method !== 'GET') headers['X-XSRF-TOKEN'] = decodeURIComponent(session.cookies.get('XSRF-TOKEN') || '');
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  for (const cookie of response.headers.getSetCookie()) {
    const value = cookie.split(';')[0];
    const separator = value.indexOf('=');
    session.cookies.set(value.slice(0, separator), value.slice(separator + 1));
  }
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

async function login(email) {
  const client = session();
  const result = await request(client, '/api/auth/login', 'POST', { email, password });
  assert.equal(result.status, 200, 'La connexion au compte de développement doit fonctionner.');
  return client;
}

const guest = session();
if (process.argv.includes('--read-only')) {
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const publicCommunity = await request(guest, `/api/communities/${report.publicId}`);
  const privateCommunity = await request(guest, `/api/communities/${report.privateId}`);
  assert.equal(publicCommunity.status, 200);
  assert.equal(privateCommunity.status, 200);
  assert.equal(privateCommunity.data.visibility, 'PRIVATE');
  assert.equal(privateCommunity.data.memberCount, 1);
  console.log('Persistance MySQL vérifiée : les deux communautés sont conservées après redémarrage.');
  process.exit(0);
}

const student = await login('etudiant@isetforum.test');
const professor = await login('professeur@isetforum.test');
const admin = await login('admin@isetforum.test');
const suffix = Date.now();

// Un étudiant crée une communauté privée et en devient le premier membre.
const privateResult = await request(student, '/api/communities', 'POST', {
  name: `Atelier privé Sprint 2 — ${suffix}`, description: 'Communauté de vérification du Sprint 2.', visibility: 'PRIVATE'
});
assert.equal(privateResult.status, 201);
const privateId = privateResult.data.id;
assert.equal(privateResult.data.memberCount, 1);
assert.equal((await request(guest, `/api/communities/${privateId}`)).status, 200);
assert.equal((await request(guest, `/api/communities/${privateId}/members`)).status, 401);

// Un enseignant extérieur demande son adhésion et reste exclu tant qu’elle est en attente.
const pending = await request(professor, `/api/communities/${privateId}/membership`, 'POST');
assert.equal(pending.status, 201);
assert.equal(pending.data.status, 'PENDING');
const requestId = pending.data.id;
assert.equal((await request(professor, `/api/communities/${privateId}/members`)).status, 403);
assert.equal((await request(student, `/api/admin/membership-requests/${requestId}/approve`, 'POST')).status, 403);
assert.equal((await request(professor, `/api/communities/${privateId}/membership`, 'POST')).status, 409);

const requests = await request(admin, '/api/admin/membership-requests');
assert.equal(requests.status, 200);
assert.ok(requests.data.some(item => item.id === requestId));
const approved = await request(admin, `/api/admin/membership-requests/${requestId}/approve`, 'POST');
assert.equal(approved.status, 200);
assert.equal(approved.data.status, 'ACTIVE');
assert.equal((await request(professor, `/api/communities/${privateId}/members`)).status, 200);
assert.equal((await request(professor, `/api/communities/${privateId}`, 'PUT', {
  name: 'Modification interdite', description: 'Un membre ne peut pas modifier la communauté.', visibility: 'PRIVATE'
})).status, 403);

// Quitter retire l’accès. Un refus supprime la demande et permet de recommencer.
assert.equal((await request(professor, `/api/communities/${privateId}/membership`, 'DELETE')).status, 204);
assert.equal((await request(professor, `/api/communities/${privateId}/members`)).status, 403);
const second = await request(professor, `/api/communities/${privateId}/membership`, 'POST');
assert.equal((await request(admin, `/api/admin/membership-requests/${second.data.id}/reject`, 'POST')).status, 204);
assert.equal((await request(professor, `/api/communities/${privateId}/membership`)).status, 404);
assert.equal((await request(professor, `/api/communities/${privateId}/membership`, 'POST')).status, 201);
assert.equal((await request(professor, `/api/communities/${privateId}/membership`, 'DELETE')).status, 204);
assert.equal((await request(student, `/api/communities/${privateId}/membership`, 'DELETE')).status, 409);

// Une communauté publique accueille immédiatement un utilisateur inscrit.
const publicResult = await request(professor, '/api/communities', 'POST', {
  name: `Atelier public Sprint 2 — ${suffix}`, description: 'Adhésion publique de vérification.', visibility: 'PUBLIC'
});
assert.equal(publicResult.status, 201);
const publicId = publicResult.data.id;
const joined = await request(student, `/api/communities/${publicId}/membership`, 'POST');
assert.equal(joined.status, 201);
assert.equal(joined.data.status, 'ACTIVE');
assert.equal((await request(guest, `/api/communities/${publicId}/members`)).status, 200);
const mine = await request(student, '/api/memberships/mine');
assert.ok(mine.data.some(item => item.communityId === publicId && item.status === 'ACTIVE'));
assert.equal((await request(student, `/api/communities/${publicId}/membership`, 'DELETE')).status, 204);

await mkdir(new URL('../target/', import.meta.url), { recursive: true });
await writeFile(reportFile, JSON.stringify({ publicId, privateId }, null, 2));
console.log('Sprint 2 vérifié sur MySQL : création, accès public/privé, adhésion, doublons, approbation, refus et départ.');
console.log(`Communautés de test conservées : ${publicId} (publique) et ${privateId} (privée).`);
