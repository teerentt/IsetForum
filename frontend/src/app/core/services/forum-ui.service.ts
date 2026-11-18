import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, authError } from './auth.service';
import { ForumService } from './forum.service';
import { Community, Publication } from '../models/api.models';
@Injectable({providedIn:'root'})
export class ForumUiService {
  readonly forum = inject(ForumService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly view = signal<'feed'|'communities'|'profile'|'publication'|'admin'>('feed');
  readonly query = signal('');
  readonly communityId = signal(0);
  readonly feedFilter = signal<'all'|'joined'>('all');
  readonly modal = signal<'post'|'community'|null>(null);
  readonly mobileNav = signal(false);
  readonly busy = signal(false);
  readonly toast = signal('');
  private timer?: ReturnType<typeof setTimeout>;
  readonly joined = this.forum.joined;
  readonly publishable = this.forum.joined;
  readonly posts = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.forum.posts().filter(p => (!this.communityId() || p.communityId === this.communityId())
      && (this.feedFilter() !== 'joined' || this.forum.status(p.communityId) === 'ACTIVE')
      && (p.title + ' ' + p.content + ' ' + p.authorName).toLowerCase().includes(query));
  });
  readonly filteredCommunities = computed(() => this.forum.communities().filter(c => (c.name + ' ' + c.description).toLowerCase().includes(this.query().trim().toLowerCase())));
  navigate(view: 'feed'|'communities'|'profile'|'admin') {
    this.query.set(''); this.communityId.set(0); this.feedFilter.set('all'); this.mobileNav.set(false);
    void this.router.navigate(['/forum', {feed:'accueil',communities:'communautes',profile:'profil',admin:'administration'}[view]]);
  }
  openCommunity(community: Community) {
    this.query.set(''); this.feedFilter.set('all'); this.mobileNav.set(false);
    void this.router.navigate(['/forum/communautes', community.id]);
  }
  openPost(post: Publication) { this.closeModal(); void this.router.navigate(['/forum/publications', post.id]); }
  compose() {
    if (!this.auth.authenticated()) { this.login(); return; }
    if (!this.publishable().length) { this.notify('Rejoignez une communauté pour publier.'); this.navigate('communities'); return; }
    this.modal.set('post');
  }
  startCommunity() { if (!this.auth.authenticated()) this.login(); else this.modal.set('community'); }
  closeModal() { if (!this.busy()) this.modal.set(null); }
  async membership(community: Community) {
    if (!this.auth.authenticated()) { this.login(); return; }
    if (this.busy()) return;
    this.busy.set(true);
    try {
      if (this.forum.status(community.id)) await this.forum.leave(community.id);
      else await this.forum.join(community.id);
      await this.forum.load(); this.notify('Votre adhésion a été actualisée.');
    } catch (error) { this.notify(authError(error)); }
    finally { this.busy.set(false); }
  }
  login() { this.modal.set(null); void this.router.navigateByUrl('/connexion'); }
  async logout() {
    try { await this.auth.logout(); this.modal.set(null); this.navigate('feed'); await this.router.navigateByUrl('/connexion'); }
    catch (error) { this.notify(authError(error)); }
  }
  notify(message: string) { clearTimeout(this.timer); this.toast.set(message); this.timer = setTimeout(() => this.toast.set(''), 6000); }
}
