import { Level } from '../../core/models/user.model';

export interface CourseSummary {
  id: number;
  code: string;
  title: string;
  description: string | null;
  level: Level;
  color: string | null;
  chapterCount: number;
  lessonCount: number;
  /** The signed-in student's progress; null for the admin. */
  progressPercent: number | null;
  /** Class average at this level; null for a student. */
  classAveragePercent: number | null;
}

export type LessonType = 'VIDEO' | 'PDF' | 'QUIZ' | 'TASK';

export interface Lesson {
  id: number;
  position: number;
  title: string;
  type: LessonType;
  durationMinutes: number | null;
  contentUrl: string | null;
  content: string | null;
  /** Always false for the admin. */
  completed: boolean;
}

export interface Chapter {
  id: number;
  position: number;
  title: string;
  summary: string | null;
  lessons: Lesson[];
}

export interface CourseDetail {
  id: number;
  code: string;
  title: string;
  description: string | null;
  level: Level;
  color: string | null;
  chapters: Chapter[];
}

export interface CourseRequest {
  code: string;
  title: string;
  description: string | null;
  level: Level;
  color: string | null;
}

export interface ChapterRequest {
  title: string;
  summary: string | null;
  position?: number | null;
}

export interface LessonRequest {
  title: string;
  type: LessonType;
  durationMinutes: number | null;
  contentUrl: string | null;
  content: string | null;
  position?: number | null;
}

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  VIDEO: 'Vidéo',
  PDF: 'Document PDF',
  QUIZ: 'Quiz',
  TASK: 'TP / projet',
};

/** Palette offered when creating a module; also the fallback when a module has none. */
export const COURSE_COLORS = ['#16A34A', '#0D9488', '#65A30D', '#059669', '#15803D', '#4D7C0F'];

/** Dark → colour gradient for card covers, derived from the module colour. */
export function coverFor(color: string | null, index: number): string {
  const c = color || COURSE_COLORS[index % COURSE_COLORS.length];
  return `linear-gradient(135deg, color-mix(in srgb, ${c} 45%, #052E16), ${c})`;
}

export function formatMinutes(total: number): string {
  if (!total) {
    return '—';
  }
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h${m ? ' ' + String(m).padStart(2, '0') + 'm' : ''}` : `${m}m`;
}
