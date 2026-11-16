import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Run after restarting Spring Boot to verify the account created by test:browser.
const { email, password } = JSON.parse(await readFile('artifacts/mysql-check-account.json', 'utf8'));
const base = process.env.ISETFORUM_API_URL || 'http://127.0.0.1:8080';
const csrf = await fetch(base + '/api/auth/csrf');
assert.equal(csrf.status, 200);
const token = (await csrf.json()).token;
const cookie = csrf.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-XSRF-TOKEN': token }, body: JSON.stringify({ email, password }) });
assert.equal(login.status, 200);
const user = await login.json();
assert.equal(user.email, email);
assert.equal(user.role, 'STUDENT');
const session = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
const me = await fetch(base + '/api/auth/me', { headers: { Cookie: session } });
assert.equal(me.status, 200);
assert.equal((await me.json()).id, user.id);
console.log('MySQL persistence verified after backend restart: registered student can still authenticate and restore their session.');
