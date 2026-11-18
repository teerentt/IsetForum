import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ForumService } from './forum.service';
import { AuthService } from './auth.service';
import { CurrentUser } from '../models/auth.models';

describe('forum connecté au serveur', () => {
  let forum: ForumService; let http: HttpTestingController;
  const user = signal<CurrentUser | null>(null);
  function initial(communities: unknown[] = [], posts: unknown[] = []) {
    http.expectOne('/api/communities').flush(communities);
    http.expectOne('/api/publications').flush(posts);
  }
  beforeEach(() => {
    user.set(null);
    TestBed.configureTestingModule({providers:[provideHttpClient(), provideHttpClientTesting(),
      {provide:AuthService,useValue:{user, authenticated:()=>!!user()}}]});
    forum = TestBed.inject(ForumService); http = TestBed.inject(HttpTestingController); TestBed.flushEffects();
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });
  it('utilise les résultats réels sans créer de données de démonstration', async () => {
    initial(); await vi.waitFor(() => expect(forum.loading()).toBe(false));
    expect(forum.communities()).toEqual([]); expect(forum.posts()).toEqual([]);
  });
  it('signale une panne serveur sans repli fictif', async () => {
    http.expectOne('/api/communities').flush({}, {status:503,statusText:'Unavailable'});
    http.expectOne('/api/publications').flush([]);
    await vi.waitFor(() => expect(forum.loading()).toBe(false));
    expect(forum.error()).toContain('Connexion au serveur impossible');
    expect(forum.posts()).toEqual([]);
  });
  it('ne laisse pas une ancienne réponse privée repeupler un écran déconnecté', async () => {
    initial(); await vi.waitFor(() => expect(forum.loading()).toBe(false));
    user.set({id:1,name:'Compte',email:'compte@exemple.tn',role:'STUDENT'}); TestBed.flushEffects();
    const communities = http.expectOne('/api/communities'), posts = http.expectOne('/api/publications'), memberships = http.expectOne('/api/memberships/mine');
    user.set(null); TestBed.flushEffects();
    initial(); await vi.waitFor(() => expect(forum.loading()).toBe(false));
    communities.flush([{id:9,name:'Privé'}]); posts.flush([{id:9,title:'Confidentiel'}]); memberships.flush([]);
    await new Promise(resolve => setTimeout(resolve,0));
    expect(forum.posts()).toEqual([]); expect(forum.memberships()).toEqual([]);
  });
  it('demande CSRF avant une publication et conserve l’identifiant serveur', async () => {
    initial(); await vi.waitFor(() => expect(forum.loading()).toBe(false));
    const pending = forum.createPost(4,'Titre','Texte');
    http.expectOne('/api/auth/csrf').flush({token:'token'});
    await vi.waitFor(() => {
      const request = http.expectOne('/api/communities/4/publications');
      expect(request.request.body).toEqual({title:'Titre',content:'Texte'});
      request.flush({id:83});
    });
    expect((await pending).id).toBe(83);
  });
  it('ne donne aucun droit de publication à un administrateur extérieur', async () => {
    initial(); await vi.waitFor(() => expect(forum.loading()).toBe(false));
    user.set({id:1,name:'Admin',email:'admin@exemple.tn',role:'ADMIN'}); TestBed.flushEffects();
    initial(); http.expectOne('/api/memberships/mine').flush([]);
    await vi.waitFor(() => expect(forum.loading()).toBe(false));
    expect(forum.canPublish({id:1,visibility:'PRIVATE'} as never)).toBe(false);
    expect(forum.canRead({id:1,visibility:'PRIVATE'} as never)).toBe(true);
  });
});
