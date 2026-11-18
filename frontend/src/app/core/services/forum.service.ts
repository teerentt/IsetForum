import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, authError } from './auth.service';
import { Community, Membership, Publication, Comment, PdfInfo } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ForumService {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly communities = signal<Community[]>([]);
  readonly memberships = signal<Membership[]>([]);
  readonly posts = signal<Publication[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly person = this.auth.user;
  readonly joined = computed(() => this.communities().filter(c => this.status(c.id) === 'ACTIVE'));
  private loadVersion = 0;
  constructor() {
    effect(() => {
      this.auth.user();
      this.communities.set([]); this.memberships.set([]); this.posts.set([]);
      void this.load();
    });
  }
  async load() {
    const version = ++this.loadVersion;
    this.loading.set(true); this.error.set('');
    try {
      const [communities, posts, memberships] = await Promise.all([
        firstValueFrom(this.http.get<Community[]>('/api/communities')),
        firstValueFrom(this.http.get<Publication[]>('/api/publications')),
        this.auth.authenticated() ? firstValueFrom(this.http.get<Membership[]>('/api/memberships/mine')) : Promise.resolve([])
      ]);
      if (version !== this.loadVersion) return;
      this.communities.set(communities); this.posts.set(posts); this.memberships.set(memberships);
    } catch (error) { if (version === this.loadVersion) this.error.set(authError(error)); }
    finally { if (version === this.loadVersion) this.loading.set(false); }
  }
  community(id: number) { return this.communities().find(c => c.id === id); }
  status(id: number) { return this.memberships().find(m => m.communityId === id)?.status; }
  canRead(community: Community) { return community.visibility === 'PUBLIC' || this.person()?.role === 'ADMIN' || this.status(community.id) === 'ACTIVE'; }
  canPublish(community: Community) { return !!this.person() && this.status(community.id) === 'ACTIVE'; }
  canEdit(post: Publication) { return post.authorId === this.person()?.id && this.status(post.communityId) === 'ACTIVE'; }
  initials(name: string) { return name.split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase(); }
  async write<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
    await firstValueFrom(this.http.get('/api/auth/csrf'));
    return firstValueFrom(this.http.request<T>(method, path, { body }));
  }
  publication(id: number) { return firstValueFrom(this.http.get<Publication>('/api/publications/' + id)); }
  comments(id: number) { return firstValueFrom(this.http.get<Comment[]>('/api/publications/' + id + '/comments')); }
  createPost(communityId: number, title: string, content: string) {
    return this.write<Publication>('POST', '/api/communities/' + communityId + '/publications', {title, content});
  }
  updatePost(id: number, title: string, content: string) { return this.write<Publication>('PUT', '/api/publications/' + id, {title, content}); }
  deletePost(id: number) { return this.write<void>('DELETE', '/api/publications/' + id); }
  addComment(id: number, content: string) { return this.write<Comment>('POST', '/api/publications/' + id + '/comments', {content}); }
  updateComment(id: number, content: string) { return this.write<Comment>('PUT', '/api/comments/' + id, {content}); }
  deleteComment(id: number) { return this.write<void>('DELETE', '/api/comments/' + id); }
  join(id: number) { return this.write<Membership>('POST', '/api/communities/' + id + '/membership'); }
  leave(id: number) { return this.write<void>('DELETE', '/api/communities/' + id + '/membership'); }
  createCommunity(name: string, description: string, visibility: 'PUBLIC' | 'PRIVATE') {
    return this.write<Community>('POST', '/api/communities', {name, description, visibility});
  }
  pdf(kind: string, id: number) { return firstValueFrom(this.http.get<PdfInfo | null>('/api/' + kind + '/' + id + '/pdf/metadata')); }
  uploadPdf(kind: string, id: number, file: File) {
    const body = new FormData(); body.append('file', file);
    return this.write<PdfInfo>('PUT', '/api/' + kind + '/' + id + '/pdf', body);
  }
  deletePdf(kind: string, id: number) { return this.write<void>('DELETE', '/api/' + kind + '/' + id + '/pdf'); }
}
