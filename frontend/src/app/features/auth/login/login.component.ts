import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, authError } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({ selector: 'app-login', standalone: true, imports: [FormsModule, RouterLink, IconComponent, AuthLayoutComponent], templateUrl: './login.component.html', styleUrl: './login.component.css' })
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly busy = signal(false); readonly error = signal(''); readonly showPassword = signal(false);
  readonly registered = this.route.snapshot.queryParamMap.get('inscrit') === '1';
  email = this.route.snapshot.queryParamMap.get('email') ?? ''; password = '';
  async submit() {
    if (this.busy()) return;
    this.error.set(''); this.busy.set(true);
    try { await this.auth.login(this.email, this.password); await this.router.navigateByUrl('/forum/accueil'); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); }
  }
}
