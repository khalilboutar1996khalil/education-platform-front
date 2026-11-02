import { Level } from '../../core/models/user.model';

/** One print run: a coupon per copy of the book, for one level. */
export interface CouponBatch {
  id: number;
  level: Level;
  quantity: number;
  label: string | null;
  /** Activations the admin accepted. */
  redeemed: number;
  /** Activations waiting for the admin's decision. */
  pending: number;
  createdAt: string;
}

export interface Coupon {
  id: number;
  /** Printed in clear next to the QR code, e.g. "3-0042". */
  serial: string;
  /** Under the scratch-off panel, 8 characters without the dash. */
  code: string;
  redeemed: boolean;
  /** Activated, waiting for the admin to accept the student. */
  pending: boolean;
  redeemedAt: string | null;
  redeemedByName: string | null;
  redeemedByUsername: string | null;
}

/** A book activation waiting for the admin: accept to let the student in, refuse to free the code. */
export interface PendingActivation {
  couponId: number;
  serial: string;
  batchId: number;
  batchLabel: string | null;
  level: Level;
  studentName: string;
  username: string;
  requestedAt: string;
}

export interface CreateCouponBatchRequest {
  level: Level;
  quantity: number;
  label: string | null;
}

/** "K7P2QX9M" is printed and shown as "K7P2-QX9M": easier to copy from paper. */
export function formatCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
