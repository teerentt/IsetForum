export interface Community {
  id: number; name: string; description: string; visibility: 'PUBLIC' | 'PRIVATE';
  creatorId: number; creatorName: string; memberCount: number; createdAt: string;
}
export interface Membership {
  id: number; communityId: number; communityName: string; userId: number; userName: string;
  status: 'PENDING' | 'ACTIVE';
}
export interface Publication {
  id: number; communityId: number; authorId: number; authorName: string; title: string;
  content: string; createdAt: string; updatedAt: string;
}
export interface Comment {
  id: number; publicationId: number; authorId: number; authorName: string;
  content: string; createdAt: string; updatedAt: string;
}
export interface PdfInfo { filename: string; size: number; updatedAt: string; }
export interface RegistrationAuthorization { id: number; email: string; role: 'STUDENT' | 'PROFESSOR'; updatedAt: string; }
export interface ImportReport { imported: number; updated: number; duplicates: number; invalidRows: {row: number; message: string}[]; }
