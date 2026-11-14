import { Level } from '../../core/models/user.model';

/** The yearly plan of one level. */
export interface Plan {
  id: number;
  level: Level;
  levelName: string;
  /** Dinars. */
  price: number;
  durationDays: number;
  active: boolean;
}

export interface PlanRequest {
  price: number;
  durationDays?: number;
  active: boolean;
}

/** Where students send the money; every field is optional. */
export interface PaymentSettings {
  d17Number: string | null;
  bankName: string | null;
  rib: string | null;
  accountHolder: string | null;
  instructions: string | null;
}

/** What the public form shows. */
export interface Offer {
  plans: Plan[];
  payment: PaymentSettings;
}

/** "100 DT", "99,500 DT". */
export function formatDinars(price: number | null | undefined): string {
  if (price == null) {
    return '';
  }
  const text = Number.isInteger(price)
    ? String(price)
    : price.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return `${text} DT`;
}

/** "1 an" for 365 days, otherwise "N jours". */
export function formatDuration(days: number | null | undefined): string {
  if (days == null) {
    return '';
  }
  return days === 365 ? '1 an' : `${days} jours`;
}

/** "30/06/2027". */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Today in Tunisia as an ISO date, the zone access ends are counted in. */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date());
}

const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

/** Why a file cannot be sent as a receipt, or null when it can. */
export function receiptProblem(file: File): string | null {
  if (!RECEIPT_TYPES.includes(file.type)) {
    return 'Le reçu doit être une photo (JPG, PNG) ou un PDF.';
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return 'Le reçu ne peut pas dépasser 5 Mo.';
  }
  return null;
}
