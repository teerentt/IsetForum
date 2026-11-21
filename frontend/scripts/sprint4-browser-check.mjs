import assert from 'node:assert/strict';
import { createServer, request as upstreamRequest } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const root = resolve('dist/isetforum/browser');
const backend = process.env.ISETFORUM_API_URL || 'http://127.0.0.1:8080';
const mailpit = process.env.ISETFORUM_MAILPIT_URL || 'http://127.0.0.1:8025';
const password = 'IsetForumDev!2026';
const reportPath = resolve('artifacts/sprint4-verification.json');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
const server = createServer(async (request, response) => {
  if (request.url.startsWith('/api/')) {
    const upstream = upstreamRequest(new URL(request.url, backend), {method:request.method,headers:{...request.headers,host:new URL(backend).host}}, result => { response.writeHead(result.statusCode,result.headers); result.pipe(response); });
    upstream.on('error', () => { response.writeHead(503,{'Content-Type':'application/json'}); response.end('{"message":"Serveur indisponible"}'); });
    request.pipe(upstream); return;
  }
  try {
    const path = resolve(root, '.' + new URL(request.url,'http://localhost').pathname);
    if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const file = extname(path) ? path : resolve(root,'index.html');
    response.setHeader('Content-Type',types[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(Number(process.env.ISETFORUM_BROWSER_PORT || 4300),'127.0.0.1',resolve));
const url = 'http://127.0.0.1:' + server.address().port;
let browser;
const errors = [];
const pdf = await readFile(resolve('../docs/examples/document.pdf'));
const pdfHash = createHash('sha256').update(pdf).digest('hex');
async function api(client, path, method='GET', data, expected=200) {
  const headers = {};
  if (method !== 'GET') headers['X-XSRF-TOKEN'] = (await (await client.get(url+'/api/auth/csrf')).json()).token;
  const response = await client.fetch(url+path,{method,data,headers});
  assert.equal(response.status(),expected,method+' '+path+': '+await response.text());
  return response;
}
async function login(page, email) {
  await page.goto(url+'/connexion');
  await page.getByLabel('Adresse e-mail',{exact:true}).fill(email);
  await page.getByLabel('Mot de passe',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Se connecter',exact:true}).click();
  await page.getByRole('heading',{name:'Le fil du campus',exact:true}).waitFor();
}
async function confirmationMessage(email, previousId) {
  for (let attempt=0; attempt<30; attempt++) {
    const response = await fetch(mailpit+'/api/v1/search?query='+encodeURIComponent('to:'+email));
    assert.ok(response.ok,'Mailpit doit être démarré');
    const data = await response.json();
    const message = data.messages.find(message => message.ID !== previousId);
    if (message) return await (await fetch(mailpit+'/api/v1/message/'+message.ID)).json();
    await new Promise(resolve=>setTimeout(resolve,300));
  }
  throw new Error('Aucun e-mail de confirmation reçu dans Mailpit pour '+email);
}
async function register(page, email, name) {
  await page.goto(url+'/inscription');
  await page.getByLabel('Nom complet').fill(name);
  await page.getByLabel('Adresse e-mail',{exact:true}).fill(email);
  await page.locator('#password').fill(password);
  await page.getByLabel('Confirmer le mot de passe').fill(password);
  await page.getByRole('button',{name:'Créer mon compte',exact:true}).click();
  await page.getByRole('heading',{name:'Confirmez votre adresse.',exact:true}).waitFor();
  await page.goto(url+'/connexion');
  await page.getByLabel('Adresse e-mail',{exact:true}).fill(email);
  await page.getByLabel('Mot de passe',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Se connecter',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Confirmez votre adresse e-mail'}).waitFor();
  let message = await confirmationMessage(email);
  let token = message.Text.match(/token=([A-Za-z0-9_-]+)/)[1];
  if (email.startsWith('etudiant.')) {
    await api(page.request,'/api/auth/resend-confirmation','POST',{email},429);
    // Real SMTP resend after the one-minute server throttle; process yields while waiting.
    await page.waitForTimeout(61000);
    await api(page.request,'/api/auth/resend-confirmation','POST',{email});
    const replacement = await confirmationMessage(email, message.ID);
    await api(page.request,'/api/auth/confirm','POST',{token},400);
    token = replacement.Text.match(/token=([A-Za-z0-9_-]+)/)[1];
    message = replacement;
  }
  const mailPage = await page.context().newPage();
  await mailPage.goto(mailpit+'/view/'+message.ID);
  const link = mailPage.locator('a[href*="/confirmation?token="]');
  assert.equal(new URL(await link.getAttribute('href')).origin,url,'FRONTEND_URL doit correspondre au serveur de test : '+url);
  await link.evaluate(anchor => anchor.setAttribute('target','_blank'));
  const [confirmationPage] = await Promise.all([mailPage.waitForEvent('popup'),link.click()]);
  await confirmationPage.getByText('Votre compte est confirmé. Vous pouvez vous connecter.',{exact:true}).waitFor();
  await confirmationPage.close(); await mailPage.close();
  await api(page.request,'/api/auth/confirm','POST',{token},400);
  await login(page,email);
}
async function checkPdf(client, path) {
  const response = await api(client,path);
  assert.match(response.headers()['content-type'],/application\/pdf/);
  assert.equal(createHash('sha256').update(await response.body()).digest('hex'),pdfHash);
}
try {
  browser = await chromium.launch({channel:process.env.CAMPUS_BROWSER_CHANNEL || 'msedge',headless:true});
  const admin = await browser.newContext({viewport:{width:1500,height:1128}});
  const student = await browser.newContext({viewport:{width:1500,height:1128}});
  const outside = await browser.newContext({viewport:{width:1500,height:1128}});
  const guest = await browser.newContext({viewport:{width:1500,height:1128}});
  const page = await admin.newPage(), studentPage = await student.newPage(), outsidePage = await outside.newPage();
  for (const p of [page,studentPage,outsidePage]) p.on('pageerror',error => errors.push(error.message));
  await mkdir('artifacts',{recursive:true});
  if (process.argv.includes('--clean-check')) {
    await login(page,'admin@isetforum.test');
    assert.deepEqual(await (await api(admin.request,'/api/admin/communities')).json(),[]);
    assert.deepEqual(await (await api(admin.request,'/api/admin/registration-authorizations')).json(),[]);
    assert.deepEqual(await (await api(admin.request,'/api/publications')).json(),[]);
    await page.locator('.main-nav').getByRole('button',{name:'Administration',exact:true}).click();
    await page.getByRole('heading',{name:'Aucune communauté',exact:true}).waitFor();
    await page.getByRole('button',{name:'Inscriptions autorisées',exact:true}).click();
    await page.getByRole('cell',{name:'Aucune autorisation. Importez un fichier pour ouvrir les inscriptions.',exact:true}).waitFor();
    await page.screenshot({path:'artifacts/sprint4-clean-admin.png',fullPage:true});
    console.log('Passed: clean primary database, initial admin login, empty real communities, feed and authorizations.');
  } else if (process.argv.includes('--read-only')) {
    const report = JSON.parse(await readFile(reportPath,'utf8'));
    await login(studentPage,report.studentEmail);
    await studentPage.goto(url+'/forum/publications/'+report.publicationId);
    await studentPage.getByRole('heading',{name:report.title,exact:true}).waitFor();
    await studentPage.getByText('Commentaire conservé après redémarrage.',{exact:true}).waitFor();
    await checkPdf(student.request,'/api/publications/'+report.publicationId+'/pdf');
    await checkPdf(student.request,'/api/communities/'+report.communityId+'/pdf');
    await login(outsidePage,report.professorEmail);
    await api(outside.request,'/api/publications/'+report.publicationId+'/pdf','GET',undefined,403);
    console.log('Passed: MySQL persistence after restart, confirmed accounts, memberships, comments and both PDF bytes.');
  } else {
    const suffix = Date.now().toString();
    const studentEmail = 'etudiant.'+suffix+'@isetforum.test', professorEmail = 'prof.'+suffix+'@isetforum.test';
    const workbookPath = resolve('artifacts/inscriptions-'+suffix+'.xlsx');
    execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve('scripts/create-test-workbook.ps1'),'-OutputPath',workbookPath,'-Suffix',suffix]);
    await login(page,'admin@isetforum.test');
    await page.locator('.main-nav').getByRole('button',{name:'Administration',exact:true}).click();
    await page.getByRole('button',{name:'Inscriptions autorisées',exact:true}).click();
    await page.getByLabel('Fichier Excel').setInputFiles(workbookPath);
    const importResponse = page.waitForResponse(response => response.url().endsWith('/api/admin/registration-authorizations/import'));
    await page.getByRole('button',{name:'Importer le fichier',exact:true}).click();
    const imported = await importResponse;
    assert.equal(imported.status(),200,await imported.text());
    await page.getByText('2 ajoutées · 0 mises à jour · 0 doublons · 0 lignes invalides',{exact:true}).waitFor();
    await page.reload();
    await page.getByRole('button',{name:'Inscriptions autorisées',exact:true}).click();
    await page.getByRole('cell',{name:studentEmail,exact:true}).waitFor();
    await page.screenshot({path:'artifacts/sprint4-admin-import.png',fullPage:true});
    await studentPage.goto(url+'/inscription');
    await studentPage.getByLabel('Nom complet').fill('Compte non autorisé');
    await studentPage.getByLabel('Adresse e-mail',{exact:true}).fill('absent.'+suffix+'@isetforum.test');
    await studentPage.locator('#password').fill(password);
    await studentPage.getByLabel('Confirmer le mot de passe').fill(password);
    await studentPage.getByRole('button',{name:'Créer mon compte',exact:true}).click();
    await studentPage.getByRole('alert').filter({hasText:'pas autorisée'}).waitFor();
    await register(studentPage,studentEmail,'Étudiant du sprint 4');
    await register(outsidePage,professorEmail,'Enseignant extérieur');
    assert.equal((await (await api(outside.request,'/api/auth/me')).json()).role,'PROFESSOR');
    await api(student.request,'/api/admin/registration-authorizations','GET',undefined,403);
    await outsidePage.goto(url+'/forum/administration');
    await outsidePage.getByRole('heading',{name:'Le fil du campus',exact:true}).waitFor();
    await page.locator('.tabs').getByRole('button',{name:'Communautés',exact:true}).click();
    await page.getByRole('button',{name:'Créer une communauté',exact:true}).click();
    const communityName = 'Atelier privé '+suffix;
    await page.getByLabel('Nom de la communauté').fill(communityName);
    await page.getByLabel('Description',{exact:true}).fill('Un espace privé pour préparer les projets de fin d’études.');
    await page.getByLabel('Visibilité',{exact:true}).selectOption('PRIVATE');
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.getByText('Communauté enregistrée.',{exact:true}).waitFor();
    const community = (await (await api(admin.request,'/api/admin/communities')).json()).find(c => c.name === communityName);
    let card = page.locator('.community-admin-card').filter({hasText:communityName});
    await card.getByRole('button',{name:'Consulter',exact:true}).click();
    await page.locator('app-pdf-attachment input[type=file]').setInputFiles({name:'communaute.pdf',mimeType:'application/pdf',buffer:pdf});
    await page.getByRole('link',{name:'communaute.pdf ↓',exact:true}).waitFor();
    await api(guest.request,'/api/communities/'+community.id+'/pdf','GET',undefined,401);
    await api(outside.request,'/api/communities/'+community.id+'/pdf','GET',undefined,403);
    await studentPage.locator('.main-nav').getByRole('button',{name:'Communautés',exact:true}).click();
    await studentPage.getByRole('button',{name:communityName,exact:true}).click();
    await studentPage.getByRole('button',{name:'Rejoindre la communauté',exact:true}).click();
    await studentPage.getByText('Votre demande attend l’approbation d’un administrateur.',{exact:true}).waitFor();
    await api(student.request,'/api/communities/'+community.id+'/pdf','GET',undefined,403);
    await page.getByRole('button',{name:/Demandes d’adhésion/}).click();
    await page.getByRole('button',{name:'Actualiser',exact:true}).click();
    await page.locator('.request-card').filter({hasText:communityName}).getByRole('button',{name:'Approuver',exact:true}).click();
    await page.getByText('Adhésion approuvée.',{exact:true}).waitFor();
    await studentPage.reload();
    await studentPage.getByRole('link',{name:'communaute.pdf ↓',exact:true}).waitFor();
    await studentPage.getByRole('button',{name:'Publier',exact:true}).click();
    const title = 'Notre premier projet partagé '+suffix;
    await studentPage.getByLabel('Votre titre').fill(title);
    await studentPage.getByLabel('Votre message').fill('Nous préparons un projet ensemble. Le document joint présente notre point de départ.');
    await studentPage.getByLabel('PDF facultatif').setInputFiles({name:'projet.pdf',mimeType:'application/pdf',buffer:pdf});
    await studentPage.getByRole('button',{name:'Partager avec la communauté',exact:true}).click();
    await studentPage.getByRole('heading',{name:title,exact:true}).waitFor();
    const publicationId = Number(studentPage.url().split('/').pop());
    await studentPage.getByRole('link',{name:'projet.pdf ↓',exact:true}).waitFor();
    await studentPage.getByLabel('Votre commentaire',{exact:true}).fill('Commentaire conservé après redémarrage.');
    await studentPage.getByRole('button',{name:'Publier le commentaire',exact:true}).click();
    await studentPage.getByText('Commentaire conservé après redémarrage.',{exact:true}).waitFor();
    await studentPage.reload();
    await studentPage.getByRole('heading',{name:title,exact:true}).waitFor();
    await checkPdf(student.request,'/api/publications/'+publicationId+'/pdf');
    await api(outside.request,'/api/publications/'+publicationId+'/pdf','GET',undefined,403);
    await api(guest.request,'/api/publications/'+publicationId+'/pdf','GET',undefined,401);
    await studentPage.locator('app-pdf-attachment input[type=file]').setInputFiles({name:'faux.pdf',mimeType:'application/pdf',buffer:Buffer.from('pas un PDF')});
    await studentPage.locator('app-pdf-attachment').getByRole('alert').filter({hasText:'véritable PDF'}).waitFor();
    await checkPdf(student.request,'/api/publications/'+publicationId+'/pdf');
    await studentPage.locator('app-pdf-attachment input[type=file]').setInputFiles({name:'projet-final.pdf',mimeType:'application/pdf',buffer:pdf});
    await studentPage.getByRole('link',{name:'projet-final.pdf ↓',exact:true}).waitFor();
    await studentPage.getByRole('button',{name:'Modifier la publication',exact:true}).click();
    await studentPage.getByLabel('Contenu',{exact:true}).fill('Version mise à jour depuis Angular.');
    await studentPage.getByRole('button',{name:'Enregistrer la publication',exact:true}).click();
    await studentPage.getByText('Version mise à jour depuis Angular.',{exact:true}).waitFor();
    await studentPage.screenshot({path:'artifacts/sprint4-discussion-light.png',fullPage:true});
    await studentPage.getByRole('button',{name:'Activer le mode sombre',exact:true}).click();
    await studentPage.screenshot({path:'artifacts/sprint4-discussion-dark.png',fullPage:true});
    await studentPage.locator('.main-nav').getByRole('button',{name:'Fil du campus',exact:true}).click();
    await studentPage.locator('.post-card').filter({hasText:title}).waitFor();
    await studentPage.getByRole('searchbox',{name:'Rechercher dans le forum',exact:true}).fill('introuvable-'+suffix);
    await studentPage.getByRole('heading',{name:'Aucun résultat',exact:true}).waitFor();
    await studentPage.getByRole('button',{name:'Effacer la recherche',exact:true}).click();
    await studentPage.screenshot({path:'artifacts/sprint4-feed-dark.png',fullPage:true});
    assert.equal(await studentPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    // Public content remains readable without a session.
    const publicCommunity = await (await api(admin.request,'/api/admin/communities','POST',{name:'Public '+suffix,description:'Contenus ouverts au campus.',visibility:'PUBLIC'},201)).json();
    const publicPost = await (await api(admin.request,'/api/communities/'+publicCommunity.id+'/publications','POST',{title:'Bienvenue sur le campus',content:'Une publication accessible à tous.'},201)).json();
    await checkPdf(student.request,'/api/communities/'+community.id+'/pdf');
    const guestPage = await guest.newPage(); guestPage.on('pageerror',error=>errors.push(error.message));
    await guestPage.goto(url+'/forum/publications/'+publicPost.id);
    await guestPage.getByRole('heading',{name:'Bienvenue sur le campus',exact:true}).waitFor();
    await guestPage.goto(url+'/forum/publications/'+publicationId);
    await guestPage.getByRole('alert').filter({hasText:'Veuillez vous connecter'}).waitFor();
    // A separate community is deleted through the administrator screen.
    await page.locator('.tabs').getByRole('button',{name:'Communautés',exact:true}).click();
    await page.getByRole('button',{name:'Créer une communauté',exact:true}).click();
    await page.getByLabel('Nom de la communauté').fill('À supprimer '+suffix);
    await page.getByLabel('Description',{exact:true}).fill('Données du test de suppression.');
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await page.getByText('Communauté enregistrée.',{exact:true}).waitFor();
    card = page.locator('.community-admin-card').filter({hasText:'À supprimer '+suffix});
    await card.getByRole('button',{name:'Supprimer',exact:true}).click();
    await page.getByRole('button',{name:'Confirmer la suppression',exact:true}).click();
    await page.getByText('Communauté et contenus associés supprimés.',{exact:true}).waitFor();
    // Revoking an authorization does not disable an existing account.
    await page.getByRole('button',{name:'Inscriptions autorisées',exact:true}).click();
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('row').filter({hasText:professorEmail}).getByRole('button',{name:'Retirer',exact:true}).click();
    await page.getByText('Autorisation retirée.',{exact:true}).waitFor();
    await api(outside.request,'/api/auth/me');
    await writeFile(reportPath,JSON.stringify({studentEmail,professorEmail,communityId:community.id,publicationId,title},null,2));
    console.log('Passed: Excel import, denied registration, both roles, confirmation/replay, private approval, real Angular publication/PDF/comment, invalid and replaced PDF, guest and outsider refusals, admin CRUD, theme and refresh persistence.');
  }
  assert.deepEqual(errors,[],'Browser runtime errors');
} catch (error) {
  const lastPage = browser?.contexts()[0]?.pages()[0];
  if (lastPage) {
    await lastPage.screenshot({path:'artifacts/sprint4-failure.png',fullPage:true});
    console.error('Visible alerts:',await lastPage.getByRole('alert').allTextContents());
  }
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
