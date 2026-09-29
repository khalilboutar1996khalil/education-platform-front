import { User } from '../../core/models/user.model';

export type AssignmentType = 'TP' | 'DEVOIR';
export type WorkMode = 'INDIVIDUAL' | 'PAIR';
export type AssignmentStatus = 'DRAFT' | 'OPEN' | 'CLOSED';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'LATE' | 'GRADED';

export interface StoredFile {
  id: number;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
}

export interface AssignmentSummary {
  id: number;
  courseId: number;
  courseCode: string;
  title: string;
  type: AssignmentType;
  mode: WorkMode;
  deadline: string | null;
  maxPoints: number;
  status: AssignmentStatus;
  allowLate: boolean;
  acceptingSubmissions: boolean;
  /** Student only. */
  mySubmissionStatus: SubmissionStatus | null;
  myGrade: number | null;
}

export interface AssignmentDetail {
  id: number;
  courseId: number;
  courseCode: string;
  title: string;
  instructions: string | null;
  type: AssignmentType;
  mode: WorkMode;
  deadline: string | null;
  maxPoints: number;
  status: AssignmentStatus;
  allowLate: boolean;
  acceptingSubmissions: boolean;
  brief: StoredFile | null;
}

export interface AssignmentRequest {
  title: string;
  instructions: string | null;
  type: AssignmentType;
  mode: WorkMode;
  deadline: string | null;
  maxPoints: number;
  allowLate: boolean;
}

export interface Submission {
  id: number;
  assignmentId: number;
  assignmentTitle: string;
  student: User;
  partner: User | null;
  comment: string | null;
  status: SubmissionStatus;
  submittedAt: string | null;
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
  files: StoredFile[];
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  DRAFT: 'Brouillon',
  OPEN: 'Ouvert',
  CLOSED: 'Clôturé',
};

export const ASSIGNMENT_STATUS_TONE: Record<AssignmentStatus, 'green' | 'red' | 'amber'> = {
  DRAFT: 'amber',
  OPEN: 'green',
  CLOSED: 'red',
};

export const TYPE_LABELS: Record<AssignmentType, string> = { TP: 'TP', DEVOIR: 'Devoir' };
export const MODE_LABELS: Record<WorkMode, string> = { INDIVIDUAL: 'individuel', PAIR: 'binôme' };

/** Handed in and waiting for a mark. */
export function isPending(s: Submission): boolean {
  return s.status === 'SUBMITTED' || s.status === 'LATE';
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}
