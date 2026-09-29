export type QuizStatus = 'DRAFT' | 'IN_PROGRESS' | 'CLOSED';
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN';

export interface QuizSummary {
  id: number;
  courseId: number;
  courseCode: string;
  title: string;
  status: QuizStatus;
  durationMinutes: number | null;
  opensAt: string | null;
  deadline: string | null;
  maxAttempts: number;
  questionCount: number;
  totalPoints: number;
}

export interface Choice {
  id: number;
  position: number;
  text: string;
  correct: boolean;
}

export interface Question {
  id: number;
  position: number;
  text: string;
  type: QuestionType;
  points: number;
  choices: Choice[];
}

export interface QuizDetail {
  id: number;
  courseId: number;
  courseCode: string;
  title: string;
  description: string | null;
  status: QuizStatus;
  durationMinutes: number | null;
  opensAt: string | null;
  deadline: string | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
  totalPoints: number;
  submissions: number;
  /** null until at least one attempt is handed in. */
  averageScore: number | null;
  questions: Question[];
}

export interface QuizRequest {
  title: string;
  description: string | null;
  durationMinutes: number | null;
  opensAt: string | null;
  deadline: string | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
}

export interface QuestionRequest {
  text: string;
  type: QuestionType;
  points: number;
  choices: { text: string; correct: boolean }[];
  position?: number | null;
}

export const QUIZ_STATUS_LABELS: Record<QuizStatus, string> = {
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En cours',
  CLOSED: 'Clôturé',
};

/** Status pill tone, matching the design (green / red / amber). */
export const QUIZ_STATUS_TONE: Record<QuizStatus, 'green' | 'red' | 'amber'> = {
  DRAFT: 'amber',
  IN_PROGRESS: 'green',
  CLOSED: 'red',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Choix unique',
  MULTIPLE_CHOICE: 'Choix multiples',
  TRUE_FALSE: 'Vrai / Faux',
  OPEN: 'Réponse libre',
};

export { fromLocalInput, toLocalInput } from '../../shared/datetime';
