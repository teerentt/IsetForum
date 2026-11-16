import { describe, expect, it } from 'vitest';
import { canPublish, canRead } from './forum.models';
import { initialState, DEMO_PEOPLE as PEOPLE } from '../demo/forum.seed';

describe('community access policy', () => {
  const state = initialState();
  const publicCommunity = state.communities.find(c => c.id === 'dev')!;
  const privateCommunity = state.communities.find(c => c.id === 'ai')!;
  const [student, professor, admin] = PEOPLE;

  it('allows guests and registered users to read public content', () => {
    for (const person of [null, student, professor, admin]) {
      expect(canRead(publicCommunity, person, [])).toBe(true);
    }
  });
  it('keeps private content hidden from guests, outsiders, and pending applicants', () => {
    expect(canRead(privateCommunity, null, state.memberships)).toBe(false);
    expect(canRead(privateCommunity, student, [])).toBe(false);
    expect(canRead(privateCommunity, student, state.memberships)).toBe(false);
  });
  it('grants access after approval and removes it after leaving', () => {
    const memberships = [{ userId: student.id, communityId: privateCommunity.id, status: 'active' as const }];
    expect(canRead(privateCommunity, student, memberships)).toBe(true);
    expect(canPublish(privateCommunity, student, memberships)).toBe(true);
    expect(canRead(privateCommunity, student, [])).toBe(false);
  });
  it('does not treat membership of a different community as access', () => {
    const memberships = [{ userId: student.id, communityId: 'dev', status: 'active' as const }];
    expect(canRead(privateCommunity, student, memberships)).toBe(false);
  });
  it('requires active membership to publish even in a public community', () => {
    expect(canPublish(publicCommunity, null, state.memberships)).toBe(false);
    expect(canPublish(publicCommunity, student, [])).toBe(false);
    expect(canPublish(publicCommunity, student, state.memberships)).toBe(true);
  });
  it('allows platform admins to moderate private content without membership', () => {
    expect(canRead(privateCommunity, admin, [])).toBe(true);
    expect(canPublish(privateCommunity, admin, [])).toBe(true);
  });
  it('does not give professors automatic access to every private community', () => {
    expect(canRead(privateCommunity, professor, [])).toBe(false);
  });
});
