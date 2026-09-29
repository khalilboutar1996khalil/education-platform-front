import { Level, User } from '../../core/models/user.model';

export interface Announcement {
  id: number;
  title: string;
  body: string;
  author: User;
  /** null = the whole level (or section), not one module. */
  courseId: number | null;
  courseCode: string | null;
  /** null = every level. */
  level: Level | null;
  pinned: boolean;
  /** null while it is a draft. */
  publishedAt: string | null;
  /** Frozen at publication. */
  recipientCount: number | null;
}

export interface AnnouncementRequest {
  title: string;
  body: string;
  courseId: number | null;
  level: Level | null;
  pinned: boolean;
}
