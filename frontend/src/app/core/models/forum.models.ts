export type Role = 'student' | 'professor' | 'admin';
export interface Person { id: string; name: string; initials: string; role: Role; }
export interface Community {
  id: string; name: string; description: string; visibility: 'public' | 'private';
  icon: string; color: string; members: number; creatorId: string;
}
export interface Membership { userId: string; communityId: string; status: 'pending' | 'active'; }
export interface Comment { id: string; author: string; initials: string; body: string; }
export interface Publication {
  authorId?: string;
  id: string; communityId: string; author: string; initials: string; role: Role;
  title: string; body: string; tags: string[]; createdAt: number;
  likes: number; likedBy: string[]; savedBy: string[]; comments: Comment[];
  kind: 'discussion' | 'resource'; art: string;
}
export interface ForumState { version: 1; communities: Community[]; memberships: Membership[]; posts: Publication[]; }

// Demo rules mirror the intended backend policy. They are not a security boundary.
export function canRead(community: Community, person: Person | null, memberships: Membership[]): boolean {
  return community.visibility === 'public' || !!person && (
    person.role === 'admin' || memberships.some(m => m.communityId === community.id && m.userId === person.id && m.status === 'active')
  );
}
export function canPublish(community: Community, person: Person | null, memberships: Membership[]): boolean {
  return !!person && canRead(community, person, memberships) && (
    person.role === 'admin' || memberships.some(m => m.communityId === community.id && m.userId === person.id && m.status === 'active')
  );
}
