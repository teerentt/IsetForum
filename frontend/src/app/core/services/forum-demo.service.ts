import { AuthService } from './auth.service';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { canPublish, canRead, Community, ForumState, Person, Publication } from '../models/forum.models';
import { initialState } from '../demo/forum.seed';

const STORAGE_KEY = 'isetforum-demo-v2';

@Injectable({ providedIn: 'root' })
export class ForumDemoService {
  private readonly auth = inject(AuthService);
  readonly person = computed<Person | null>(() => {
    const user = this.auth.user();
    return user ? { id: 'account-' + user.id, name: user.name,
      initials: user.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase(),
      role: user.role === 'PROFESSOR' ? 'professor' : user.role === 'ADMIN' ? 'admin' : 'student' } : null;
  });
  private storageKey = STORAGE_KEY + '-guest';
  readonly storageAvailable = signal(true);
  private readonly state = signal<ForumState>(initialState());
  constructor() {
    effect(() => {
      const person = this.person();
      this.storageKey = STORAGE_KEY + '-' + (person?.id ?? 'guest');
      const state = this.restore();
      if (person && !state.memberships.some(m => m.userId === person.id)) {
        state.memberships.push({ userId: person.id, communityId: 'dev', status: 'active' });
      }
      this.state.set(state);
    });
  }
  readonly communities = computed(() => this.state().communities);
  readonly memberships = computed(() => this.state().memberships);
  readonly posts = computed(() => this.state().posts.filter(p => {
    const community = this.community(p.communityId);
    return !!community && this.canRead(community);
  }));
  readonly requests = computed(() => this.person()?.role === 'admin'
    ? this.memberships().filter(m => m.status === 'pending') : []);

  community(id: string) { return this.communities().find(c => c.id === id); }
  canRead(community: Community) { return canRead(community, this.person(), this.memberships()); }
  canPublish(community: Community) { return canPublish(community, this.person(), this.memberships()); }
  status(id: string) {
    return this.memberships().find(m => m.communityId === id && m.userId === this.person()?.id)?.status;
  }

  join(community: Community): string {
    const person = this.person();
    if (!person) return 'Connectez-vous pour rejoindre une communauté.';
    if (this.status(community.id)) return 'Vous êtes déjà membre ou votre demande est en attente.';
    const status = community.visibility === 'public' ? 'active' : 'pending';
    this.update(s => ({ ...s,
      memberships: [...s.memberships, { userId: person.id, communityId: community.id, status }],
      communities: s.communities.map(c => c.id === community.id && status === 'active' ? { ...c, members: c.members + 1 } : c)
    }));
    return status === 'active' ? `Vous avez rejoint ${community.name}.` : 'Demande envoyée. Un administrateur va l’examiner.';
  }

  leave(community: Community): string {
    const person = this.person();
    if (!person) return 'Veuillez vous connecter.';
    if (community.creatorId === person.id) return 'Le créateur conserve son adhésion à la communauté.';
    const active = this.status(community.id) === 'active';
    this.update(s => ({ ...s,
      memberships: s.memberships.filter(m => !(m.userId === person.id && m.communityId === community.id)),
      communities: s.communities.map(c => c.id === community.id && active ? { ...c, members: Math.max(0, c.members - 1) } : c)
    }));
    return active ? `Vous avez quitté ${community.name}.` : 'Demande d’adhésion annulée.';
  }

  review(userId: string, communityId: string, approve: boolean): boolean {
    if (this.person()?.role !== 'admin') return false;
    const exists = this.memberships().some(m => m.userId === userId && m.communityId === communityId && m.status === 'pending');
    if (!exists) return false;
    this.update(s => ({ ...s,
      memberships: s.memberships.flatMap(m => m.userId === userId && m.communityId === communityId
        ? approve ? [{ ...m, status: 'active' as const }] : [] : [m]),
      communities: s.communities.map(c => c.id === communityId && approve ? { ...c, members: c.members + 1 } : c)
    }));
    return true;
  }

  createCommunity(name: string, description: string, visibility: 'public' | 'private'): Community | null {
    const person = this.person();
    if (!person || !name.trim() || !description.trim()) return null;
    const community: Community = { id: crypto.randomUUID(), name: name.trim(), description: description.trim(), visibility,
      icon: 'users', color: 'purple', members: 1, creatorId: person.id };
    this.update(s => ({ ...s, communities: [...s.communities, community],
      memberships: [...s.memberships, { userId: person.id, communityId: community.id, status: 'active' }] }));
    return community;
  }

  publish(communityId: string, title: string, body: string, tags: string, kind: 'discussion' | 'resource'): boolean {
    const person = this.person();
    const community = this.community(communityId);
    if (!person || !community || !this.canPublish(community) || !title.trim() || !body.trim()) return false;
    const post: Publication = { id: crypto.randomUUID(), communityId, title: title.trim(), body: body.trim(),
      authorId: person.id, author: person.name, initials: person.initials, role: person.role, tags: tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 5),
      createdAt: Date.now(), kind, art: kind === 'resource' ? 'sql' : '', likes: 0, likedBy: [], savedBy: [], comments: [] };
    this.update(s => ({ ...s, posts: [post, ...s.posts] }));
    return true;
  }

  toggle(post: Publication, action: 'likedBy' | 'savedBy'): boolean {
    const person = this.person();
    const community = this.community(post.communityId);
    if (!person || !community || !this.canRead(community)) return false;
    this.update(s => ({ ...s, posts: s.posts.map(p => p.id === post.id ? { ...p,
      [action]: p[action].includes(person.id) ? p[action].filter(id => id !== person.id) : [...p[action], person.id]
    } : p) }));
    return true;
  }

  comment(postId: string, body: string): boolean {
    const person = this.person();
    const post = this.posts().find(p => p.id === postId);
    if (!person || !post || !body.trim()) return false;
    this.update(s => ({ ...s, posts: s.posts.map(p => p.id === postId ? { ...p, comments: [...p.comments,
      { id: crypto.randomUUID(), author: person.name, initials: person.initials, body: body.trim() }] } : p) }));
    return true;
  }

  private update(change: (state: ForumState) => ForumState) {
    this.state.update(change);
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.state())); }
    catch { this.storageAvailable.set(false); }
  }

  private restore(): ForumState {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const data = JSON.parse(raw) as ForumState;
        if (data.version === 1 && Array.isArray(data.communities) && Array.isArray(data.memberships) && Array.isArray(data.posts)
          && data.communities.every(c => typeof c.id === 'string' && typeof c.name === 'string' && ['public', 'private'].includes(c.visibility))
          && data.memberships.every(m => typeof m.userId === 'string' && typeof m.communityId === 'string' && ['active', 'pending'].includes(m.status))
          && data.posts.every(p => typeof p.title === 'string' && typeof p.body === 'string' && Array.isArray(p.tags) && Array.isArray(p.savedBy) && Array.isArray(p.likedBy) && Array.isArray(p.comments))) return data;
      }
    } catch { this.storageAvailable.set(false); }
    return initialState();
  }
}
