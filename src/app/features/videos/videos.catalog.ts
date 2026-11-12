/**
 * Videos of the 7ᵉ année parascolaire book, served as static files from `public/videos/7eme/`.
 *
 * The `code` is printed in the book as a QR code pointing at `/v/<code>`, so a code must never
 * change once a book has been printed: add new videos with new codes instead.
 */
import type { Level } from '../../core/models/user.model';

export type VideoKind = 'RETENIR' | 'CORRECTION';

export interface BookVideo {
  code: string;
  kind: VideoKind;
  /** Book chapter number (1 to 5). */
  chapter: number;
  title: string;
  /** Length in seconds. */
  duration: number;
  /** Short line shown under the title. */
  blurb: string;
  /** Spoken language: 'AR' = voix en arabe avec sous-titres français (default 'FR'). */
  voice?: 'FR' | 'AR';
}

export interface BookChapter {
  num: number;
  title: string;
}

export const BOOK_LEVEL_LABEL = '7ᵉ année de base';

/** The level these videos belong to: only its students see them. */
export const BOOK_LEVEL: Level = 'SEVENTH_BASE';

/**
 * Whether the videos show for a level. Pass a student's own level, or for an admin the level picked
 * in the header: an admin working on 8ᵉ or 9ᵉ does not see the 7ᵉ videos either.
 */
export function canSeeBookVideos(level: Level | null | undefined): boolean {
  return level === BOOK_LEVEL;
}

export const BOOK_CHAPTERS: readonly BookChapter[] = [
  { num: 1, title: "Ordinateur et système d'exploitation" },
  { num: 2, title: 'Traitement de textes' },
  { num: 3, title: "Traitement d'images" },
  { num: 4, title: 'Internet et le Web' },
  { num: 5, title: 'Mon projet' },
];

export const BOOK_VIDEOS: readonly BookVideo[] = [
  {
    code: '7-r1',
    kind: 'RETENIR',
    chapter: 1,
    title: "À retenir · L'ordinateur et moi",
    duration: 171,
    blurb: "L'essentiel du chapitre 1, avec les mots clés en arabe.",
  },
  {
    code: '7-1-1',
    kind: 'CORRECTION',
    chapter: 1,
    title: 'TP 1.1 · Construire mon arborescence',
    duration: 152,
    blurb: 'Créer des dossiers et des fichiers, copier et déplacer.',
    voice: 'AR',
  },
  {
    code: '7-1-2',
    kind: 'CORRECTION',
    chapter: 1,
    title: 'TP 1.2 · Renommer, supprimer, restaurer',
    duration: 102,
    blurb: 'Utiliser la Corbeille sans perdre ses données.',
    voice: 'AR',
  },
  {
    code: '7-r2',
    kind: 'RETENIR',
    chapter: 2,
    title: "À retenir · J'écris avec l'ordinateur",
    duration: 175,
    blurb: "L'essentiel du traitement de textes, avec les mots clés en arabe.",
  },
  {
    code: '7-2-1',
    kind: 'CORRECTION',
    chapter: 2,
    title: 'TP 2.1 · Mon collège',
    duration: 123,
    blurb: 'Saisir, enregistrer, mettre en forme et en page.',
    voice: 'AR',
  },
  {
    code: '7-2-2',
    kind: 'CORRECTION',
    chapter: 2,
    title: "TP 2.2 · Ma carte d'identité scolaire",
    duration: 109,
    blurb: 'Insérer un tableau, une image, une bordure, imprimer.',
    voice: 'AR',
  },
  {
    code: '7-r3',
    kind: 'RETENIR',
    chapter: 3,
    title: "À retenir · Je dessine avec l'ordinateur",
    duration: 179,
    blurb: "L'essentiel du traitement d'images, avec les mots clés en arabe.",
  },
  {
    code: '7-3-1',
    kind: 'CORRECTION',
    chapter: 3,
    title: 'TP 3.1 · Le drapeau tunisien',
    duration: 123,
    blurb: 'Formes, remplissage et enregistrement en PNG.',
    voice: 'AR',
  },
  {
    code: '7-3-2',
    kind: 'CORRECTION',
    chapter: 3,
    title: "TP 3.2 · Trois versions d'une photo",
    duration: 102,
    blurb: 'Filtre, symétrie, taille et texte, sans toucher à l’original.',
    voice: 'AR',
  },
  {
    code: '7-r4',
    kind: 'RETENIR',
    chapter: 4,
    title: 'À retenir · Je surfe sur le Web',
    duration: 190,
    blurb: "L'essentiel d'Internet et du Web, avec les mots clés en arabe.",
  },
  {
    code: '7-4-1',
    kind: 'CORRECTION',
    chapter: 4,
    title: 'TP 4.1 · Découvrir mon navigateur',
    duration: 103,
    blurb: "Barre d'adresse, Précédent, Actualiser, liens.",
    voice: 'AR',
  },
  {
    code: '7-4-2',
    kind: 'CORRECTION',
    chapter: 4,
    title: 'TP 4.2 · Mini-exposé : une ville tunisienne',
    duration: 106,
    blurb: 'Chercher, vérifier, récupérer et citer ses sources.',
    voice: 'AR',
  },
  {
    code: '7-r5',
    kind: 'RETENIR',
    chapter: 5,
    title: 'À retenir · Mon grand projet',
    duration: 150,
    blurb: 'Les étapes du projet de fin d’année.',
  },
];

export const VIDEO_KIND_LABELS: Record<VideoKind, string> = {
  RETENIR: 'À retenir',
  CORRECTION: 'Correction de TP',
};

export function videoByCode(
  code: string | null | undefined,
): BookVideo | undefined {
  const wanted = (code ?? '').trim().toLowerCase();
  return BOOK_VIDEOS.find((v) => v.code === wanted);
}

/**
 * Bumped when the files of a kind are replaced (same code, new content), so browsers that cached
 * the old video fetch the new one. The QR codes keep pointing at `/v/<code>` and never change.
 */
const FILE_VERSION: Record<VideoKind, number> = { RETENIR: 1, CORRECTION: 2 };

export function videoSrc(v: BookVideo): string {
  return `/videos/7eme/${v.code}.mp4?v=${FILE_VERSION[v.kind]}`;
}

export function videoPoster(v: BookVideo): string {
  return `/videos/7eme/${v.code}.jpg?v=${FILE_VERSION[v.kind]}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m} min ${String(s).padStart(2, '0')}`;
}
