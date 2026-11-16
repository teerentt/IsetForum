import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentUser } from '../models/auth.models';
import { AuthService } from './auth.service';
import { ForumDemoService } from './forum-demo.service';

describe('account-scoped forum demo', () => {
  const user = signal<CurrentUser | null>(null);
  let forum: ForumDemoService;
  beforeEach(() => {
    const storage = new Map<string,string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string,value: string) => storage.set(key,value) });
    user.set({ id: 1, name: 'Lina', email: 'lina@isetforum.test', role: 'STUDENT' });
    TestBed.configureTestingModule({ providers: [ForumDemoService, { provide: AuthService, useValue: { user } }] });
    forum = TestBed.inject(ForumDemoService); TestBed.flushEffects();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });
  it('uses the authenticated account and isolates local content across accounts', () => {
    expect(forum.person()?.id).toBe('account-1');
    forum.createCommunity('Mon projet', 'Espace privé.', 'private');
    expect(forum.communities().some(c => c.name === 'Mon projet')).toBe(true);
    user.set({ id: 2, name: 'Sami', email: 'sami@isetforum.test', role: 'PROFESSOR' }); TestBed.flushEffects();
    expect(forum.communities().some(c => c.name === 'Mon projet')).toBe(false);
    user.set({ id: 1, name: 'Lina', email: 'lina@isetforum.test', role: 'STUDENT' }); TestBed.flushEffects();
    expect(forum.communities().some(c => c.name === 'Mon projet')).toBe(true);
  });
  it('keeps pending private content hidden and refuses student approval', () => {
    forum.join(forum.community('ai')!);
    expect(forum.status('ai')).toBe('pending');
    expect(forum.posts().some(p => p.communityId === 'ai')).toBe(false);
    expect(forum.review('account-1','ai',true)).toBe(false);
  });
  it('allows students to create and publish into their own private communities', () => {
    const community = forum.createCommunity('Révisions', 'Ensemble.', 'private')!;
    expect(forum.canPublish(community)).toBe(true);
    expect(forum.publish(community.id,'Bonjour','Un nouveau projet.','','discussion')).toBe(true);
  });
  it('does not expose the previous account content after logout', () => {
    const community = forum.createCommunity('Privé','Description.','private')!;
    forum.publish(community.id,'Mon secret','Contenu local.','','discussion');
    user.set(null); TestBed.flushEffects();
    expect(forum.person()).toBeNull();
    expect(forum.posts().some(p => p.title === 'Mon secret')).toBe(false);
    expect(forum.comment('p1','Non')).toBe(false);
    expect(forum.createCommunity('Visiteur','Non.','public')).toBeNull();
  });
});
