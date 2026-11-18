import assert from 'node:assert/strict';

// Called with a real administrator session. All created content belongs to this test.
export async function checkAdmin(page, browser, url) {
  const student = await browser.newContext();
  const guest = await browser.newContext();
  async function api(client, path, method = 'GET', data, expected = 200) {
    const headers = {};
    if (method !== 'GET') {
      const csrf = await client.get(url + '/api/auth/csrf');
      headers['X-XSRF-TOKEN'] = (await csrf.json()).token;
    }
    const response = await client.fetch(url + path, { method, data, headers });
    assert.equal(response.status(), expected, method + ' ' + path + ': ' + await response.text());
    return response.status() === 204 ? null : response.json();
  }
  const name = 'Atelier administration ' + Date.now();
  let communityId;
  try {
    await page.route('**/api/admin/communities', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Service indisponible"}' }));
    await page.reload();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('.community-admin-card').count(), 0);
    await page.unroute('**/api/admin/communities');
    await page.getByRole('button', { name: 'Actualiser les données', exact: true }).click();
    await api(student.request, '/api/auth/login', 'POST', { email: 'etudiant@isetforum.test', password: 'IsetForumDev!2026' });
    await api(student.request, '/api/admin/communities', 'GET', undefined, 403);
    await api(guest.request, '/api/admin/communities', 'GET', undefined, 401);
    await page.getByRole('button', { name: 'Créer une communauté', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Enregistrer', exact: true }).isDisabled(), true);
    await page.getByLabel('Nom de la communauté').fill(name);
    await page.getByLabel('Description', { exact: true }).fill('Communauté de vérification MySQL.');
    await page.getByLabel('Visibilité', { exact: true }).selectOption('PRIVATE');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.getByText('Communauté enregistrée.', { exact: true }).waitFor();
    const list = await api(page.request, '/api/admin/communities');
    communityId = list.find(c => c.name === name).id;
    const card = () => page.locator('.community-admin-card').filter({ hasText: name });
    await card().getByRole('button', { name: 'Consulter', exact: true }).click();
    await page.locator('.admin-detail').getByText('Communauté de vérification MySQL.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Fermer le détail' }).click();
    await api(student.request, '/api/communities/' + communityId + '/membership', 'POST', undefined, 201);
    await page.getByRole('button', { name: /Demandes d’adhésion/ }).click();
    await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
    let pending = page.locator('.request-card').filter({ hasText: name });
    await pending.getByRole('button', { name: 'Approuver', exact: true }).click();
    await page.getByText('Adhésion approuvée.', { exact: true }).waitFor();
    assert.equal((await api(student.request, '/api/communities/' + communityId + '/membership')).status, 'ACTIVE');
    const publication = await api(student.request, '/api/communities/' + communityId + '/publications', 'POST', { title: 'Publication réelle', content: 'Contenu stocké dans MySQL.' }, 201);
    const comment = await api(student.request, '/api/publications/' + publication.id + '/comments', 'POST', { content: 'Commentaire réel.' }, 201);
    await api(guest.request, '/api/publications/' + publication.id, 'GET', undefined, 401);
    await api(student.request, '/api/communities/' + communityId + '/membership', 'DELETE', undefined, 204);
    await api(student.request, '/api/communities/' + communityId + '/membership', 'POST', undefined, 201);
    await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
    pending = page.locator('.request-card').filter({ hasText: name });
    await pending.getByRole('button', { name: 'Refuser', exact: true }).click();
    await page.getByText('Demande refusée.', { exact: true }).waitFor();
    await api(student.request, '/api/communities/' + communityId + '/membership', 'GET', undefined, 404);
    await page.locator('.tabs').getByRole('button', { name: 'Communautés', exact: true }).click();
    await card().getByRole('button', { name: 'Modifier', exact: true }).click();
    await page.getByLabel('Description', { exact: true }).fill('Description modifiée et persistée.');
    await page.getByLabel('Visibilité', { exact: true }).selectOption('PUBLIC');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.getByText('Communauté enregistrée.', { exact: true }).waitFor();
    await page.reload();
    await card().getByRole('button', { name: 'Consulter', exact: true }).click();
    await page.locator('.admin-detail').getByText('Description modifiée et persistée.', { exact: true }).waitFor();
    await api(guest.request, '/api/publications/' + publication.id);
    await page.screenshot({ path: 'artifacts/admin-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'artifacts/admin-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1080 });
    await card().getByRole('button', { name: 'Supprimer', exact: true }).click();
    await page.locator('.delete-confirmation').getByRole('button', { name: 'Annuler', exact: true }).click();
    await api(page.request, '/api/admin/communities/' + communityId);
    await card().getByRole('button', { name: 'Supprimer', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmer la suppression', exact: true }).click();
    await page.getByText('Communauté et contenus associés supprimés.', { exact: true }).waitFor();
    await api(guest.request, '/api/publications/' + publication.id, 'GET', undefined, 404);
    await api(guest.request, '/api/publications/' + publication.id + '/comments', 'GET', undefined, 404);
    await api(student.request, '/api/comments/' + comment.id, 'DELETE', undefined, 404);
    await api(student.request, '/api/auth/me');
    communityId = null;
  } finally {
    if (communityId) await api(page.request, '/api/admin/communities/' + communityId, 'DELETE', undefined, 204);
    await student.close(); await guest.close();
  }
}
