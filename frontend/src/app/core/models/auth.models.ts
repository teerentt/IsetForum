export type AccountRole = 'STUDENT' | 'PROFESSOR' | 'ADMIN';
export interface CurrentUser { id: number; name: string; email: string; role: AccountRole; }
export interface Registration { name: string; email: string; password: string; }
