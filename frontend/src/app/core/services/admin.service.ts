import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminCommunity, CommunityInput, MembershipRequest } from '../models/admin.models';
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  communities() { return firstValueFrom(this.http.get<AdminCommunity[]>('/api/admin/communities')); }
  community(id: number) { return firstValueFrom(this.http.get<AdminCommunity>('/api/admin/communities/' + id)); }
  requests() { return firstValueFrom(this.http.get<MembershipRequest[]>('/api/admin/membership-requests')); }
  private async csrf() { await firstValueFrom(this.http.get('/api/auth/csrf')); }
  async create(input: CommunityInput) {
    await this.csrf();
    return firstValueFrom(this.http.post<AdminCommunity>('/api/admin/communities', input));
  }
  async update(id: number, input: CommunityInput) {
    await this.csrf();
    return firstValueFrom(this.http.put<AdminCommunity>('/api/admin/communities/' + id, input));
  }
  async delete(id: number) {
    await this.csrf();
    await firstValueFrom(this.http.delete('/api/admin/communities/' + id));
  }
  async review(id: number, approve: boolean) {
    await this.csrf();
    await firstValueFrom(this.http.post('/api/admin/membership-requests/' + id + (approve ? '/approve' : '/reject'), {}));
  }
}
