import { Level } from '../../core/models/user.model';

export type { CourseSummary } from '../courses/courses.model';

export interface DayCount {
  /** ISO date, e.g. 2026-09-28 */
  day: string;
  count: number;
}

export interface LevelCount {
  level: Level;
  count: number;
}

export interface Deadline {
  kind: 'QUIZ' | 'ASSIGNMENT';
  id: number;
  title: string;
  courseCode: string;
  deadline: string;
}

export type ActivityType = 'SUBMISSION_HANDED_IN' | 'SUBMISSION_GRADED' | 'QUIZ_FINISHED' | 'ANNOUNCEMENT_PUBLISHED';

export interface Activity {
  id: number;
  type: ActivityType;
  summary: string;
  actorName: string | null;
  courseCode: string | null;
  occurredAt: string;
}

/** GET /dashboard/me: the signed-in student's own figures. */
export interface StudentDashboard {
  courses: number;
  lessonsCompleted: number;
  totalLessons: number;
  /** Lessons finished across every module of the student's level. */
  progressPercent: number;
  /** Out of 20; null until something has been marked. */
  overallAverage: number | null;
  assignmentsToHandIn: number;
  quizzesOpen: number;
  unreadNotifications: number;
  upcomingDeadlines: Deadline[];
}

export interface AdminDashboard {
  activeStudents: number;
  courses: number;
  quizzesInProgress: number;
  openAssignments: number;
  submissionsAwaitingMarking: number;
  /** The last seven days, oldest first, zero-filled. */
  weeklySubmissions: DayCount[];
  upcomingDeadlines: Deadline[];
  studentsByLevel: LevelCount[];
  coursesByLevel: LevelCount[];
}
