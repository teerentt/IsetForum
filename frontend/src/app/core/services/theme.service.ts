import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<'dark' | 'light'>('light');

  initialize() {
    try {
      if (localStorage.getItem('isetforum-theme') === 'dark') this.theme.set('dark');
    } catch { /* Le thème reste utilisable sans stockage local. */ }
    this.apply();
  }

  toggle() {
    this.theme.update(theme => theme === 'dark' ? 'light' : 'dark');
    this.apply();
    try { localStorage.setItem('isetforum-theme', this.theme()); }
    catch { /* Le choix reste valable pour la session. */ }
  }

  private apply() { this.document.documentElement.dataset['theme'] = this.theme(); }
}
