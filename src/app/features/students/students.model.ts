import { PaymentMethod } from '../../core/models/auth.model';
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
  /** What the plan cost when asked (DT); null for a level without a plan. */
  price: number | null;
  durationDays: number | null;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  /** Filename of the attached receipt; null when the student sent none. */
  receiptName: string | null;
  /** An existing student extending their access: accepting creates no new account. */
  renewal: boolean;
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
  /** null for a renewal: the student keeps their password. */
  temporaryPassword: string | null;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  D17: 'D17',
  VIREMENT: 'Virement bancaire',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Actif',
  PAUSED: 'En pause',
  PENDING: 'En attente',
  DISABLED: 'Désactivé',
};

export const USER_STATUS_PILL: Record<UserStatus, string> = {
  ACTIVE: 'ef-pill--green',
  PAUSED: 'ef-pill--amber',
  PENDING: 'ef-pill--amber',
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
