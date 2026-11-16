import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CurrentUser, Registration } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly account = signal<CurrentUser | null>(null);
  readonly user = this.account.asReadonly();
  readonly authenticated = computed(() => !!this.user());
  readonly ready = signal(false);
  readonly unavailable = signal(false);
  private initialization?: Promise<void>;

  initialize(): Promise<void> {
    return this.initialization ??= this.restore();
  }

  private async restore() {
    try {
      this.account.set(await firstValueFrom(this.http.get<CurrentUser>('/api/auth/me')));
      this.unavailable.set(false);
    } catch (error) {
      this.account.set(null);
      this.unavailable.set(!(error instanceof HttpErrorResponse) || error.status !== 401);
    } finally { this.ready.set(true); }
  }

  private async csrf() {
    await firstValueFrom(this.http.get('/api/auth/csrf'));
  }

  async login(email: string, password: string) {
    await this.csrf();
    const user = await firstValueFrom(this.http.post<CurrentUser>('/api/auth/login', { email: email.trim(), password }));
    // The server clears the CSRF token on authentication; get a fresh cookie.
    await this.csrf();
    this.account.set(user);
    this.unavailable.set(false);
  }

  async register(data: Registration) {
    await this.csrf();
    return firstValueFrom(this.http.post<CurrentUser>('/api/auth/register', { ...data, name: data.name.trim(), email: data.email.trim() }));
  }

  async logout() {
    await this.csrf();
    await firstValueFrom(this.http.post('/api/auth/logout', {}));
    this.account.set(null);
    // Cookie is refreshed before the next login/registration request.
  }

  expire() { this.account.set(null); }
}

export function authError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || error.status === 0 || error.status >= 500) {
    return 'Connexion au serveur impossible. Vérifiez que Spring Boot et MySQL sont démarrés, puis réessayez.';
  }
  if (error.status === 403) return 'Votre session de sécurité a expiré. Veuillez réessayer.';
  return error.error?.message ?? 'Une erreur est survenue. Veuillez réessayer.';
}
