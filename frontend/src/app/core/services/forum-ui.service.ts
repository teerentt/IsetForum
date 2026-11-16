import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, authError } from './auth.service';
import { ForumDemoService } from './forum-demo.service';
import { Community, Publication } from '../models/forum.models';
import { DEMO_PEOPLE } from '../demo/forum.seed';

type View = 'feed' | 'communities' | 'resources' | 'saved' | 'admin';
type Modal = 'post' | 'community' | 'detail' | 'event' | null;

@Injectable({ providedIn: 'root' })
export class ForumUiService {
  readonly forum = inject(ForumDemoService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly view = signal<View>('feed');
  readonly query = signal('');
  readonly sort = signal<'latest' | 'popular' | 'following'>('latest');
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
  readonly events = [
    { day: '20', month: 'NOV', title: 'Créer sa première API', community: 'Informatique', time: 'Vendredi · 14 h – 16 h', place: 'Laboratoire innovation · Salle B12', description: 'Un atelier pratique pour découvrir les API REST avec Spring Boot. Apportez votre ordinateur et vos questions. Tous niveaux bienvenus.', start: '20261120T130000Z', end: '20261120T150000Z', color: 'purple' },
    { day: '23', month: 'NOV', title: 'Imaginer. Tester. Créer.', community: 'Design & Créativité', time: 'Lundi · 10 h – 12 h', place: 'Atelier créatif · Salle A04', description: 'Explorez un problème du campus grâce aux croquis, aux prototypes rapides et aux retours du groupe.', start: '20261123T090000Z', end: '20261123T110000Z', color: 'orange' },
    { day: '25', month: 'NOV', title: 'Révisions : algèbre', community: 'Les maths, simplement', time: 'Mercredi · 15 h – 16 h 30', place: 'Bibliothèque · Salle de travail 3', description: 'Une séance de révision sur les vecteurs, matrices et transformations. Apportez un exercice à résoudre ensemble.', start: '20261125T140000Z', end: '20261125T153000Z', color: 'green' },
  ];
  eventIndex = 0;
  readonly joined = computed(() => this.forum.communities().filter(c => this.forum.status(c.id) === 'active'));
  readonly publishable = computed(() => this.forum.communities().filter(c => this.forum.canPublish(c)));
  readonly currentCommunity = computed(() => this.forum.community(this.communityId()));
  readonly filteredCommunities = computed(() => {
    const query = this.query().toLowerCase().trim();
    return this.forum.communities().filter(c => `${c.name} ${c.description}`.toLowerCase().includes(query));
  });
  readonly posts = computed(() => {
    const person = this.forum.person();
    const query = this.query().toLowerCase().trim();
    return this.forum.posts().filter(p =>
      (this.view() !== 'resources' || p.kind === 'resource') &&
      (this.view() !== 'saved' || !!person && p.savedBy.includes(person.id)) &&
      (!this.communityId() || p.communityId === this.communityId()) &&
      (!this.tag() || p.tags.includes(this.tag())) &&
      (this.sort() !== 'following' || this.forum.status(p.communityId) === 'active') &&
      `${p.title} ${p.body} ${p.tags.join(' ')} ${this.forum.community(p.communityId)?.name}`.toLowerCase().includes(query)
    ).sort((a, b) => this.sort() === 'popular'
      ? b.likes + b.likedBy.length - a.likes - a.likedBy.length : b.createdAt - a.createdAt);
  });

  navigate(view: View) {
    void this.router.navigate(['/forum', { feed: 'accueil', communities: 'communautes', resources: 'ressources', saved: 'favoris', admin: 'administration' }[view]]);
    this.view.set(view); this.communityId.set(''); this.query.set(''); this.tag.set(''); this.sort.set('latest'); this.mobileNav.set(false);
  }
  openCommunity(community: Community) {
    this.view.set('feed'); this.query.set(''); this.tag.set(''); this.sort.set('latest');
    this.communityId.set(community.id); this.mobileNav.set(false);
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
  openPost(post: Publication) { this.selectedId.set(post.id); this.openModal('detail'); }
  compose() {
    if (!this.forum.person()) { this.login(); return; }
    if (!this.publishable().length) { this.notify('Rejoignez une communauté publique pour publier.'); this.navigate('communities'); return; }
    this.formTitle = ''; this.formBody = ''; this.formTags = ''; this.formKind = this.view() === 'resources' ? 'resource' : 'discussion';
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
    this.closeModal(); this.navigate(this.formKind === 'resource' ? 'resources' : 'feed'); this.notify('Publication partagée. La discussion peut commencer !');
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
  openEvent(index: number) { this.eventIndex = index; this.openModal('event'); }
  downloadResource(post: Publication) {
    this.download(`${post.title}\nPar ${post.author}\n\n${post.body}\n\nTags: ${post.tags.join(', ')}\n`, `${post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 65)}.txt`, 'text/plain');
  }
  downloadEvent() {
    const event = this.events[this.eventIndex];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IsetForum//Demo//EN', 'BEGIN:VEVENT',
      `UID:campus-${event.start}@example.invalid`, `DTSTAMP:${stamp}`, `DTSTART:${event.start}`, `DTEND:${event.end}`,
      `SUMMARY:${event.title}`, `LOCATION:${event.place}`, `DESCRIPTION:Événement de démonstration IsetForum. ${event.description}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    this.download(text, 'isetforum-evenement-demo.ics', 'text/calendar');
  }
  private download(content: string, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
