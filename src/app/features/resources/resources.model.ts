import { Level } from '../../core/models/user.model';
import { StoredFile } from '../assignments/assignments.model';

export type ResourceType = 'PDF' | 'VIDEO' | 'ZIP' | 'LINK';

export interface Resource {
  id: number;
  title: string;
  description: string | null;
  type: ResourceType;
  /** null = every module. */
  courseId: number | null;
  courseCode: string | null;
  /** null = every level. */
  level: Level | null;
  /** null for a LINK. */
  file: StoredFile | null;
  externalUrl: string | null;
  downloadCount: number;
}

export interface ResourceRequest {
  title: string;
  description: string | null;
  type: ResourceType;
  courseId: number | null;
  level: Level | null;
  externalUrl: string | null;
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  VIDEO: 'Vidéo de cours',
  PDF: 'Document PDF',
  ZIP: 'Archive (codes sources…)',
  LINK: 'Lien externe',
};

export const RESOURCE_SHORT: Record<ResourceType, string> = {
  VIDEO: 'Vidéo',
  PDF: 'PDF',
  ZIP: 'ZIP',
  LINK: 'Lien',
};

/** Tile colour and icon per type, from the design's resource cards. */
export const RESOURCE_LOOK: Record<ResourceType, { color: string; icon: string }> = {
  PDF: { color: '#15803D', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6' },
  VIDEO: {
    color: '#0F766E',
    icon: 'M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z',
  },
  ZIP: { color: '#3F6212', icon: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4' },
  LINK: {
    color: '#065F46',
    icon: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  },
};

/** What the file input accepts for each uploadable type. */
export const RESOURCE_ACCEPT: Record<Exclude<ResourceType, 'LINK'>, string> = {
  PDF: 'application/pdf,.pdf',
  VIDEO: 'video/*',
  ZIP: '.zip,.rar,.7z,.tar,.gz,application/zip',
};
