import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Creates only its own verification content. --read-only checks it after restart.
const base = process.env.ISETFORUM_API_URL || 'http://127.0.0.1:8080';
const password = process.env.DEV_SEED_PASSWORD || 'IsetForumDev!2026';
const reportFile = new URL('../backend/target/sprint3-verification.json', import.meta.url);
function session() { return { cookies: new Map() }; }
async function request(client, path, method = 'GET', body, expected = 200) {
  if (method !== 'GET') await request(client, '/api/auth/csrf');
  const headers = { Cookie: [...client.cookies].map(([key, value]) => key + '=' + value).join('; ') };
  if (method !== 'GET') headers['X-XSRF-TOKEN'] = decodeURIComponent(client.cookies.get('XSRF-TOKEN') || '');
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const result = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  for (const cookie of result.headers.getSetCookie()) {
    const value = cookie.split(';')[0], separator = value.indexOf('=');
    client.cookies.set(value.slice(0, separator), value.slice(separator + 1));
  }
  const text = await result.text();
  assert.equal(result.status, expected, method + ' ' + path + ': ' + text);
  return text ? JSON.parse(text) : null;
}
async function login(email) {
  const client = session();
  await request(client, '/api/auth/login', 'POST', { email, password });
  return client;
}
const guest = session();
const student = await login('etudiant@isetforum.test');
const professor = await login('professeur@isetforum.test');
const admin = await login('admin@isetforum.test');
if (process.argv.includes('--read-only')) {
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal((await request(guest, '/api/publications/' + report.publicationId)).title, 'Publication persistante');
  assert.ok((await request(guest, '/api/publications/' + report.publicationId + '/comments')).some(c => c.id === report.commentId));
  await request(guest, '/api/publications/' + report.privatePublicationId, 'GET', undefined, 401);
  await request(student, '/api/publications/' + report.privatePublicationId);
  console.log('Persistance MySQL vérifiée après redémarrage : publications, commentaires et adhésion privée.');
} else {
  const suffix = Date.now();
  const community = await request(student, '/api/communities', 'POST', {
    name: 'Sprint 3 public ' + suffix, description: 'Vérification de la persistance.', visibility: 'PUBLIC'
  }, 201);
  const publication = await request(student, '/api/communities/' + community.id + '/publications', 'POST', {
    title: 'Publication persistante', content: 'Ce contenu doit survivre au redémarrage.'
  }, 201);
  const comment = await request(student, '/api/publications/' + publication.id + '/comments', 'POST', { content: 'Commentaire persistant.' }, 201);
  const privateCommunity = await request(professor, '/api/communities', 'POST', {
    name: 'Sprint 3 privé ' + suffix, description: 'Vérification des permissions.', visibility: 'PRIVATE'
  }, 201);
  const privatePublication = await request(professor, '/api/communities/' + privateCommunity.id + '/publications', 'POST', {
    title: 'Publication privée', content: 'Réservée aux membres actifs.'
  }, 201);
  const pending = await request(student, '/api/communities/' + privateCommunity.id + '/membership', 'POST', undefined, 201);
  await request(student, '/api/publications/' + privatePublication.id, 'GET', undefined, 403);
  await request(student, '/api/admin/communities', 'GET', undefined, 403);
  await request(admin, '/api/admin/membership-requests/' + pending.id + '/approve', 'POST');
  await request(student, '/api/publications/' + privatePublication.id);
  await request(student, '/api/publications/' + privatePublication.id + '/comments', 'POST', { content: 'Accès approuvé.' }, 201);
  await mkdir(new URL('../backend/target/', import.meta.url), { recursive: true });
  await writeFile(reportFile, JSON.stringify({
    communityId: community.id, publicationId: publication.id, commentId: comment.id,
    privateCommunityId: privateCommunity.id, privatePublicationId: privatePublication.id
  }, null, 2));
  console.log('API MySQL vérifiées. Les deux communautés de test sont conservées ; relancer avec --read-only après redémarrage.');
}
