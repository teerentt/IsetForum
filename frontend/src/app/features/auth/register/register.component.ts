import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authError } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({ selector: 'app-register', standalone: true, imports: [FormsModule, RouterLink, IconComponent, AuthLayoutComponent], templateUrl: './register.component.html', styleUrl: './register.component.css' })
export class RegisterComponent {
  private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly busy = signal(false); readonly error = signal(''); readonly showPassword = signal(false);
  name = ''; email = ''; password = ''; confirmation = '';
  async submit() {
    if (this.busy()) return;
    this.error.set('');
    if (this.password !== this.confirmation) { this.error.set('Les mots de passe ne correspondent pas.'); return; }
    if (new TextEncoder().encode(this.password).length > 72) { this.error.set('Le mot de passe dépasse la limite de 72 octets.'); return; }
    this.busy.set(true);
    try { await this.auth.register({ name: this.name, email: this.email, password: this.password }); await this.router.navigate(['/confirmation'], { queryParams: { email: this.email.trim() } }); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); }
  }
}
