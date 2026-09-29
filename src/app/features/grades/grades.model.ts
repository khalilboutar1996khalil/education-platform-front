import { User } from '../../core/models/user.model';

export type GradeKind = 'QUIZ' | 'ASSIGNMENT' | 'MANUAL';

export interface Grade {
  id: number;
  courseId: number;
  courseCode: string;
  kind: GradeKind;
  label: string;
  score: number;
  maxScore: number;
  outOfTwenty: number;
  weight: number;
  recordedAt: string;
}

export interface GradebookRow {
  student: User;
  grades: Grade[];
  /** Weighted, out of 20; null while the student has no marks. */
  average: number | null;
}

export interface ManualGradeRequest {
  studentId: number;
  label: string;
  score: number;
  maxScore: number;
  weight: number;
}

export const GRADE_KIND_LABELS: Record<GradeKind, string> = {
  QUIZ: 'Quiz',
  ASSIGNMENT: 'TP / devoir',
  MANUAL: 'Saisie',
};

export type Band = 'good' | 'mid' | 'low';

/** The design's 80 % / 60 % thresholds, on a /20 scale. */
export function bandOf(outOfTwenty: number): Band {
  return outOfTwenty >= 16 ? 'good' : outOfTwenty >= 12 ? 'mid' : 'low';
}

const MARK = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export function formatMark(value: number): string {
  return MARK.format(value);
}

/** Accepts "14,5" as well as "14.5"; null when the text is not a number. */
export function parseMark(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t || !/^\d+(\.\d+)?$/.test(t)) {
    return null;
  }
  return Number(t);
}
