import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, authError } from './auth.service';
import { ForumDemoService } from './forum-demo.service';
import { Community, Publication } from '../models/forum.models';
import { DEMO_PEOPLE } from '../demo/forum.seed';

type View = 'feed' | 'communities' | 'profile' | 'publication' | 'admin';
type Modal = 'post' | 'community' | null;

@Injectable({ providedIn: 'root' })
export class ForumUiService {
  readonly forum = inject(ForumDemoService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly view = signal<View>('feed');
  readonly query = signal('');
  readonly sort = signal<'latest' | 'popular'>('latest');
  readonly communityTab = signal<'posts' | 'resources'>('posts');
  readonly communityId = signal('');
  readonly tag = signal('');
  readonly modal = signal<Modal>(null);
  readonly selectedId = signal('');
  readonly selectedPost = computed(() => this.forum.posts().find(p => p.id === this.selectedId()));
  readonly mobileNav = signal(false);
  readonly toast = signal('');
  private toastTimer?: ReturnType<typeof setTimeout>;
  formTitle = ''; formBody = ''; formTags = ''; formCommunity = ''; formKind: 'discussion' | 'resource' = 'discussion';
  communityName = ''; communityDescription = ''; communityVisibility: 'public' | 'private' = 'public';
  commentBody = ''; formError = '';
  readonly joined = computed(() => this.forum.communities().filter(c => this.forum.status(c.id) === 'active'));
  readonly publishable = computed(() => this.forum.communities().filter(c => this.forum.canPublish(c)));
  readonly currentCommunity = computed(() => this.forum.community(this.communityId()));
  readonly filteredCommunities = computed(() => {
    const query = this.query().toLowerCase().trim();
    return this.forum.communities().filter(c => `${c.name} ${c.description}`.toLowerCase().includes(query));
  });
  readonly posts = computed(() => {
    const query = this.query().toLowerCase().trim();
    return this.forum.posts().filter(p =>
      (!this.communityId() || this.communityTab() !== 'resources' || p.kind === 'resource') &&
      (!this.communityId() || p.communityId === this.communityId()) &&
      (!this.tag() || p.tags.includes(this.tag())) &&
      `${p.title} ${p.body} ${p.tags.join(' ')} ${this.forum.community(p.communityId)?.name}`.toLowerCase().includes(query)
    ).sort((a, b) => this.sort() === 'popular'
      ? b.likes + b.likedBy.length - a.likes - a.likedBy.length : b.createdAt - a.createdAt);
  });

  navigate(view: View) {
    const paths = { feed: 'accueil', communities: 'communautes', profile: 'profil', publication: 'accueil', admin: 'administration' };
    void this.router.navigate(['/forum', paths[view]]);
    this.view.set(view); this.communityId.set(''); this.communityTab.set('posts');
    this.query.set(''); this.tag.set(''); this.sort.set('latest'); this.mobileNav.set(false);
  }
  openCommunity(community: Community) {
    this.view.set('feed'); this.query.set(''); this.tag.set(''); this.sort.set('latest');
    this.communityId.set(community.id); this.mobileNav.set(false);
    this.communityTab.set('posts');
    void this.router.navigate(['/forum/communautes', community.id]);
  }
  filterTag(tag: string) { this.navigate('feed'); this.tag.set(tag); }
  emptyAction() {
    if (this.query() || this.tag()) { this.query.set(''); this.tag.set(''); }
    else this.navigate('communities');
  }
  openModal(modal: Modal) {
    this.formError = ''; this.modal.set(modal);

  }
  closeModal() { this.modal.set(null); this.commentBody = ''; }
  openPost(post: Publication) {
    this.closeModal(); this.selectedId.set(post.id); this.mobileNav.set(false);
    void this.router.navigate(['/forum/publications', post.id]);
  }
  compose() {
    if (!this.forum.person()) { this.login(); return; }
    if (!this.publishable().length) { this.notify('Rejoignez une communauté publique pour publier.'); this.navigate('communities'); return; }
    this.formTitle = ''; this.formBody = ''; this.formTags = '';
    this.formKind = this.communityId() && this.communityTab() === 'resources' ? 'resource' : 'discussion';
    this.formCommunity = this.publishable().find(c => c.id === this.communityId())?.id ?? this.publishable()[0].id;
    this.openModal('post');
  }
  startCommunity() {
    if (!this.forum.person()) { this.login(); return; }
    this.communityName = ''; this.communityDescription = ''; this.communityVisibility = 'public'; this.openModal('community');
  }
  submitPost() {
    if (!this.forum.publish(this.formCommunity, this.formTitle, this.formBody, this.formTags, this.formKind)) {
      this.formError = 'Ajoutez un titre, un message et choisissez une communauté dont vous êtes membre.'; return;
    }
    this.openPost(this.forum.posts()[0]);
    this.notify('Publication partagée. La discussion peut commencer !');
  }
  submitCommunity() {
    const community = this.forum.createCommunity(this.communityName, this.communityDescription, this.communityVisibility);
    if (!community) { this.formError = 'Ajoutez un nom et une description.'; return; }
    this.closeModal(); this.openCommunity(community); this.notify('Votre communauté est prête. Bienvenue chez vous.');
  }
  membership(community: Community) {
    if (!this.forum.person()) { this.login(); return; }
    this.notify(this.forum.status(community.id) ? this.forum.leave(community) : this.forum.join(community));
  }
  login() { this.closeModal(); void this.router.navigateByUrl('/connexion'); }
  async logout() {
    try {
      await this.auth.logout();
      this.closeModal(); this.toast.set(''); clearTimeout(this.toastTimer); this.selectedId.set('');
      this.navigate('feed'); await this.router.navigateByUrl('/connexion');
    }
    catch (error) { this.notify(authError(error)); }
  }
  toggle(post: Publication, action: 'likedBy' | 'savedBy') {
    if (!this.forum.toggle(post, action)) this.login();
  }
  has(post: Publication, action: 'likedBy' | 'savedBy') { return post[action].includes(this.forum.person()?.id ?? ''); }
  addComment() {
    if (!this.forum.person()) { this.closeModal(); this.login(); return; }
    if (this.forum.comment(this.selectedId(), this.commentBody)) { this.commentBody = ''; this.notify('Votre commentaire a été ajouté.'); }
  }
  review(userId: string, communityId: string, approve: boolean) {
    if (this.forum.review(userId, communityId, approve)) this.notify(approve ? 'Adhésion approuvée.' : 'Demande refusée.');
  }
  personName(id: string) { return DEMO_PEOPLE.find(p => p.id === id)?.name ?? 'Membre IsetForum'; }
  time(date: number) {
    const minutes = Math.max(1, Math.floor((Date.now() - date) / 60000));
    return minutes < 60 ? `il y a ${minutes} min` : minutes < 1440 ? `il y a ${Math.floor(minutes / 60)} h` : `il y a ${Math.floor(minutes / 1440)} j`;
  }
  notify(message: string) {
    clearTimeout(this.toastTimer); this.toast.set(message); this.toastTimer = setTimeout(() => this.toast.set(''), 4500);
  }
  downloadResource(post: Publication) {
    this.download(`${post.title}\nPar ${post.author}\n\n${post.body}\n\nTags: ${post.tags.join(', ')}\n`, `${post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 65)}.txt`, 'text/plain');
  }
  private download(content: string, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
