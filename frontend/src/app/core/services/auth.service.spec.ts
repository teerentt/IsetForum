import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

const student = { id: 7, name: 'Lina', email: 'lina@isetforum.test', role: 'STUDENT' };
describe('database authentication client', () => {
  let auth: AuthService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), AuthService] });
    auth = TestBed.inject(AuthService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { try { http?.verify(); } finally { TestBed.resetTestingModule(); } });
  it('restores the server session without browser-local credentials', async () => {
    const pending = auth.initialize();
    http.expectOne('/api/auth/me').flush(student);
    await pending;
    expect(auth.user()?.id).toBe(7);
    expect(auth.ready()).toBe(true);
  });
  it('treats 401 as guest and unavailable server as an outage', async () => {
    const pending = auth.initialize();
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    await pending;
    expect(auth.user()).toBeNull(); expect(auth.unavailable()).toBe(false);
  });
  it('fetches CSRF before login and refreshes it after success', async () => {
    const pending = auth.login('lina@isetforum.test', 'Password!2026');
    http.expectOne('/api/auth/csrf').flush({ token: 'before' });
    await vi.waitFor(() => http.expectOne('/api/auth/login').flush(student));
    await vi.waitFor(() => http.expectOne('/api/auth/csrf').flush({ token: 'after' }));
    await pending;
    expect(auth.authenticated()).toBe(true);
  });
  it('does not use a demo identity when login fails', async () => {
    const pending = auth.login('lina@isetforum.test', 'wrong');
    http.expectOne('/api/auth/csrf').flush({ token: 'token' });
    const rejection = expect(pending).rejects.toBeDefined();
    await vi.waitFor(() => http.expectOne('/api/auth/login').flush({ message: 'Incorrect' }, { status: 401, statusText: 'Unauthorized' }));
    await rejection;
    expect(auth.user()).toBeNull();
  });
});
