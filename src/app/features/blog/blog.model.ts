import { User } from '../../core/models/user.model';
import { StoredFile } from '../assignments/assignments.model';

export type PostStatus = 'DRAFT' | 'PUBLISHED';

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  color: string | null;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  /** null on list responses. */
  content: string | null;
  category: BlogCategory;
  author: User;
  cover: StoredFile | null;
  status: PostStatus;
  readMinutes: number;
  viewCount: number;
  /** null while it has never been published. */
  publishedAt: string | null;
}

export interface BlogPostRequest {
  title: string;
  excerpt: string | null;
  content: string;
  categoryId: number;
}

export interface BlogCategoryRequest {
  name: string;
  color: string | null;
}

export const CATEGORY_COLORS = ['#16A34A', '#0D9488', '#65A30D', '#059669', '#0F766E', '#4D7C0F', '#CA8A04', '#DC2626'];
