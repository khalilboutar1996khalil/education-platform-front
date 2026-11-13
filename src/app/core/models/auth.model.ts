import { Level, User } from './user.model';

/** Backend rule: @Size(min = 10, max = 100). */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 100;

export interface LoginRequest {
  /** An email address, or the username of a book-coupon student. */
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface LoginResponse {
  tokens: TokenPair;
  user: User;
}

export interface RefreshRequest {
  refreshToken: string;
}

/** Self-registration: the student picks their own level. */
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  level: Level;
}

/** Fallback for a student with no class code. The API answers 202 with an empty body every time. */
export interface SubmitAccessRequest {
  fullName: string;
  email: string;
  level: Level;
  message?: string;
  /** Required when the level has a yearly plan. */
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
}

/** How a student says they paid; the admin checks it before accepting. */
export type PaymentMethod = 'D17' | 'VIREMENT';

export interface UpdateProfileRequest {
  fullName: string;
  notifyByEmail: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** What activating a book returns: no session, the account waits for the admin. */
export interface RedeemCouponResponse {
  fullName: string;
  /** What the student signs in with once accepted. */
  username: string;
  level: Level;
}

/** Activating a book: the serial comes from the QR code, the code from the scratch-off panel. */
export interface RedeemCouponRequest {
  serial: string;
  code: string;
  firstName: string;
  lastName: string;
  password: string;
}
