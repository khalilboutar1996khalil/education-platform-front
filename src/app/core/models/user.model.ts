export type Role = 'ADMIN' | 'STUDENT';

/** A level code, e.g. 'SECOND_AS'. The list lives in the database: see LevelCatalog. */
export type Level = string;

export type UserStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED';

export interface User {
  id: number;
  fullName: string;
  email: string;
  initials: string;
  role: Role;
  /** null for ADMIN accounts. */
  level: Level | null;
  status: UserStatus;
  locale: string;
  notifyByEmail: boolean;
}

/** Roles are fixed in the backend, so the UI owns these strings. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Responsable de la plateforme',
  STUDENT: 'Élève',
};
