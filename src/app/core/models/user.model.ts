export type Role = 'ADMIN' | 'STUDENT';

/** A level code, e.g. 'SECOND_AS'. The list lives in the database: see LevelCatalog. */
export type Level = string;

export type UserStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED';

export interface User {
  id: number;
  fullName: string;
  /** null for a student who joined by activating a book coupon. */
  email: string | null;
  /** Sign-in name of a book-coupon student, e.g. "amina.bensalem"; null otherwise. */
  username: string | null;
  initials: string;
  role: Role;
  /** null for ADMIN accounts. */
  level: Level | null;
  status: UserStatus;
  locale: string;
  notifyByEmail: boolean;
}

/** What the person types to sign in: their email, or the username a book coupon gave them. */
export function signInId(user: Pick<User, 'email' | 'username'> | null | undefined): string {
  return user?.email ?? user?.username ?? '';
}

/** Roles are fixed in the backend, so the UI owns these strings. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Responsable de la plateforme',
  STUDENT: 'Élève',
};
