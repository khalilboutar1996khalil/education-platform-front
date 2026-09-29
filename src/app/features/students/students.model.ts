import { Level, User, UserStatus } from '../../core/models/user.model';

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AccessRequest {
  id: number;
  fullName: string;
  email: string;
  level: Level;
  message: string | null;
  status: AccessRequestStatus;
  reviewedBy: User | null;
  reviewedAt: string | null;
  createdUser: User | null;
  decisionNote: string | null;
  submittedAt: string;
}

export interface InviteStudentRequest {
  fullName: string;
  email: string;
  level: Level;
}

/** Also the shape of a password reset. The temporary password is shown once: no mail is sent, so the admin hands it over. */
export interface InviteStudentResponse {
  user: User;
  temporaryPassword: string;
}

export interface ApprovedAccessResponse {
  request: AccessRequest;
  temporaryPassword: string;
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Actif',
  PAUSED: 'En pause',
  DISABLED: 'Désactivé',
};

export const USER_STATUS_PILL: Record<UserStatus, string> = {
  ACTIVE: 'ef-pill--green',
  PAUSED: 'ef-pill--amber',
  DISABLED: 'ef-pill--red',
};

export const REQUEST_STATUS_LABELS: Record<AccessRequestStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Acceptée',
  REJECTED: 'Refusée',
};

export const REQUEST_STATUS_PILL: Record<AccessRequestStatus, string> = {
  PENDING: 'ef-pill--amber',
  APPROVED: 'ef-pill--green',
  REJECTED: 'ef-pill--red',
};
