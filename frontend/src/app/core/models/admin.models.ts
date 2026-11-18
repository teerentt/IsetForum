export interface AdminCommunity {
  id: number; name: string; description: string; visibility: 'PUBLIC' | 'PRIVATE';
  creatorId: number; creatorName: string; memberCount: number; createdAt: string;
}
export interface CommunityInput { name: string; description: string; visibility: 'PUBLIC' | 'PRIVATE'; }
export interface MembershipRequest {
  id: number; userId: number; userName: string; communityId: number;
  communityName: string; status: 'PENDING' | 'ACTIVE'; requestedAt: string;
}
