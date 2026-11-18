import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { AdminService } from '../../core/services/admin.service';
import { authError } from '../../core/services/auth.service';
import { AdminCommunity, CommunityInput, MembershipRequest } from '../../core/models/admin.models';
@Component({ selector: 'app-admin', standalone: true, imports: [FormsModule, DatePipe], templateUrl: './admin.component.html', styleUrl: './admin.component.css' })
export class AdminComponent implements OnInit {
  readonly ui = inject(ForumUiService);
  private readonly api = inject(AdminService);
  readonly tab = signal<'communities' | 'requests'>('communities');
  readonly communities = signal<AdminCommunity[]>([]);
  readonly requests = signal<MembershipRequest[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly editing = signal(false);
  readonly selected = signal<AdminCommunity | null>(null);
  readonly deleting = signal<AdminCommunity | null>(null);
  editId: number | null = null;
  input: CommunityInput = { name: '', description: '', visibility: 'PUBLIC' };
  ngOnInit() {
    this.ui.view.set('admin'); this.ui.communityId.set(''); this.ui.query.set(''); void this.load();
  }
  async load() {
    this.loading.set(true); this.error.set('');
    try {
      const [communities, requests] = await Promise.all([this.api.communities(), this.api.requests()]);
      this.communities.set(communities); this.requests.set(requests);
    } catch (error) { this.showError(error); }
    finally { this.loading.set(false); }
  }
  create() {
    this.editId = null; this.input = { name: '', description: '', visibility: 'PUBLIC' };
    this.error.set(''); this.message.set(''); this.selected.set(null); this.deleting.set(null); this.editing.set(true);
  }
  async view(community: AdminCommunity, edit = false) {
    this.busy.set(true); this.error.set(''); this.message.set(''); this.editing.set(false); this.deleting.set(null);
    try {
      const detail = await this.api.community(community.id);
      this.selected.set(detail);
      if (edit) {
        this.editId = detail.id;
        this.input = { name: detail.name, description: detail.description, visibility: detail.visibility };
        this.editing.set(true);
      }
    } catch (error) { this.showError(error); }
    finally { this.busy.set(false); }
  }
  async save() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    const input = { ...this.input, name: this.input.name.trim(), description: this.input.description.trim() };
    try {
      if (this.editId === null) await this.api.create(input);
      else await this.api.update(this.editId, input);
      this.editing.set(false); this.selected.set(null);
      this.message.set('Communauté enregistrée.'); await this.load();
    } catch (error) { this.showError(error); }
    finally { this.busy.set(false); }
  }
  confirmDelete(community: AdminCommunity) {
    this.deleting.set(community); this.editing.set(false); this.selected.set(null); this.error.set(''); this.message.set('');
  }
  async remove() {
    const community = this.deleting();
    if (!community || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.api.delete(community.id); this.deleting.set(null);
      this.message.set('Communauté et contenus associés supprimés.'); await this.load();
    } catch (error) { this.showError(error); }
    finally { this.busy.set(false); }
  }
  async review(request: MembershipRequest, approve: boolean) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    try {
      await this.api.review(request.id, approve);
      this.message.set(approve ? 'Adhésion approuvée.' : 'Demande refusée.'); await this.load();
    } catch (error) { this.showError(error); }
    finally { this.busy.set(false); }
  }
  private showError(error: unknown) {
    const fields = error instanceof HttpErrorResponse ? error.error?.fields : null;
    this.error.set(fields ? Object.values(fields).join(' ') : authError(error));
  }
}
