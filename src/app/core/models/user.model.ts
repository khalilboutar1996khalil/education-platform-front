export type Role = 'ADMIN' | 'STUDENT';

/** Matches the backend `Level` enum exactly — the wire values are the constant names. */
export type Level =
  | 'SEVENTH_BASE'
  | 'EIGHTH_BASE'
  | 'NINTH_BASE'
  | 'SECOND_AS'
  | 'THIRD_AS'
  | 'FOURTH_AS';

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

/** The backend has a label() helper but never serialises it, so the UI owns these strings. */
export const LEVEL_LABELS: Record<Level, string> = {
  SEVENTH_BASE: '7ᵉ année de base informatique',
  EIGHTH_BASE: '8ᵉ année de base informatique',
  NINTH_BASE: '9ᵉ année de base informatique',
  SECOND_AS: '2ᵉ AS informatique',
  THIRD_AS: '3ᵉ AS informatique',
  FOURTH_AS: '4ᵉ AS informatique',
};

/** School order: collège first, then lycée. */
export const LEVEL_OPTIONS: ReadonlyArray<{ value: Level; label: string }> = [
  { value: 'SEVENTH_BASE', label: LEVEL_LABELS.SEVENTH_BASE },
  { value: 'EIGHTH_BASE', label: LEVEL_LABELS.EIGHTH_BASE },
  { value: 'NINTH_BASE', label: LEVEL_LABELS.NINTH_BASE },
  { value: 'SECOND_AS', label: LEVEL_LABELS.SECOND_AS },
  { value: 'THIRD_AS', label: LEVEL_LABELS.THIRD_AS },
  { value: 'FOURTH_AS', label: LEVEL_LABELS.FOURTH_AS },
];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Responsable de la plateforme',
  STUDENT: 'Élève',
};
