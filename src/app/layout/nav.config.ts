import { Role } from '../core/models/user.model';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Single-path SVG outlines, lifted from the design mockup. */
const ICONS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  quiz: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8',
  check: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM3 10h18M9 16l2 2 4-4',
  folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  pen: 'M11 4H4v16h16v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  key: 'M21 2l-2 2m-7.6 7.6a5 5 0 1 1-7 7 5 5 0 0 1 7-7zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  gear:
    'M12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
} as const;

const ADMIN_NAV: NavGroup[] = [
  { title: "Vue d'ensemble", items: [{ path: 'dashboard', label: 'Tableau de bord', icon: ICONS.grid }] },
  {
    title: 'Enseignement',
    items: [
      { path: 'courses', label: 'Modules', icon: ICONS.book },
      { path: 'quizzes', label: 'Quiz', icon: ICONS.quiz },
      { path: 'assignments', label: 'TP & devoirs', icon: ICONS.file },
      { path: 'corrections', label: 'Corrections', icon: ICONS.check },
      { path: 'resources', label: 'Ressources', icon: ICONS.folder },
    ],
  },
  {
    title: 'Classe',
    items: [
      { path: 'students', label: 'Élèves', icon: ICONS.users },
      { path: 'grades', label: 'Notes', icon: ICONS.chart },
      { path: 'class-codes', label: 'Codes de classe', icon: ICONS.key },
    ],
  },
  {
    title: 'Communication',
    items: [
      { path: 'announcements', label: 'Annonces', icon: ICONS.bell },
      { path: 'blog', label: 'Blog', icon: ICONS.pen },
    ],
  },
  {
    title: 'Système',
    items: [
      { path: 'levels', label: 'Niveaux', icon: ICONS.layers },
      { path: 'settings', label: 'Paramètres', icon: ICONS.gear },
    ],
  },
];

const STUDENT_NAV: NavGroup[] = [
  { title: "Vue d'ensemble", items: [{ path: 'dashboard', label: 'Tableau de bord', icon: ICONS.grid }] },
  {
    title: 'Apprentissage',
    items: [
      { path: 'courses', label: 'Mes modules', icon: ICONS.book },
      { path: 'quizzes', label: 'Quiz', icon: ICONS.quiz },
      { path: 'assignments', label: 'TP & devoirs', icon: ICONS.file },
      { path: 'resources', label: 'Ressources', icon: ICONS.folder },
      { path: 'grades', label: 'Mes notes', icon: ICONS.chart },
    ],
  },
  {
    title: 'Actualités',
    items: [
      { path: 'announcements', label: 'Annonces', icon: ICONS.bell },
      { path: 'blog', label: 'Blog', icon: ICONS.pen },
    ],
  },
  { title: 'Compte', items: [{ path: 'settings', label: 'Paramètres', icon: ICONS.gear }] },
];

export function navFor(role: Role | undefined): NavGroup[] {
  return role === 'ADMIN' ? ADMIN_NAV : STUDENT_NAV;
}

/** Header title per route segment, mirroring the mockup's `titles` map. */
export const PAGE_TITLES: Record<string, { admin: string; student: string }> = {
  dashboard: { admin: 'Tableau de bord', student: 'Mon espace' },
  courses: { admin: 'Modules', student: 'Mes modules' },
  quizzes: { admin: 'Quiz', student: 'Quiz' },
  assignments: { admin: 'TP & devoirs', student: 'TP & devoirs' },
  corrections: { admin: 'Corrections', student: 'Corrections' },
  resources: { admin: 'Ressources', student: 'Ressources' },
  students: { admin: 'Élèves', student: 'Élèves' },
  grades: { admin: 'Notes', student: 'Mes notes' },
  'class-codes': { admin: 'Codes de classe', student: 'Codes de classe' },
  levels: { admin: 'Niveaux', student: 'Niveaux' },
  announcements: { admin: 'Annonces', student: 'Annonces' },
  blog: { admin: 'Blog', student: 'Blog' },
  settings: { admin: 'Paramètres', student: 'Paramètres' },
};
