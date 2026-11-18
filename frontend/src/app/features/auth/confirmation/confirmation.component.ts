import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, authError } from '../../../core/services/auth.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
@Component({selector:'app-confirmation',standalone:true,imports:[FormsModule,RouterLink,AuthLayoutComponent],templateUrl:'./confirmation.component.html',styleUrl:'./confirmation.component.css'})
export class ConfirmationComponent implements OnInit {
  private readonly auth = inject(AuthService); private readonly route = inject(ActivatedRoute);
  readonly busy = signal(false); readonly error = signal(''); readonly message = signal(''); readonly confirmed = signal(false);
  email = this.route.snapshot.queryParamMap.get('email') ?? '';
  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) void this.confirm(token);
  }
  async confirm(token: string) {
    this.busy.set(true); this.error.set('');
    try { const result = await this.auth.confirm(token); this.message.set(result.message); this.confirmed.set(true); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); history.replaceState(null, '', '/confirmation'); }
  }
  async resend() {
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { this.message.set((await this.auth.resend(this.email)).message); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); }
  }
}
