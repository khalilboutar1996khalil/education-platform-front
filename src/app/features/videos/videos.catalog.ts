/**
 * Videos of the parascolaire books (7ᵉ and 8ᵉ), served as static files from `public/videos/<n>eme/`.
 * Each book belongs to one level: only its students (or an admin working on that level) see it.
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
}

export interface BookChapter {
  num: number;
  title: string;
  /** The chapter's colour, the same as its module « Cahier 7ᵉ » in the app. */
  color: string;
  icon: string;
}

/** Every video: the teacher speaks French, with the Arabic translation as subtitles. */
export const VIDEO_LANGUAGES = '🇫🇷 Voix en français · 🇹🇳 Sous-titres en arabe';

const CHAPTERS_7: readonly BookChapter[] = [
  {
    num: 1,
    title: "Ordinateur et système d'exploitation",
    color: '#1F6FB2',
    icon: '💻',
  },
  { num: 2, title: 'Traitement de textes', color: '#C0392B', icon: '📝' },
  { num: 3, title: "Traitement d'images", color: '#1E8449', icon: '🎨' },
  { num: 4, title: 'Internet et le Web', color: '#7D3C98', icon: '🌐' },
  { num: 5, title: 'Mon projet', color: '#B9770E', icon: '🚀' },
];

const VIDEOS_7: readonly BookVideo[] = [
  {
    code: '7-r1',
    kind: 'RETENIR',
    chapter: 1,
    title: "À retenir · L'ordinateur et moi",
    duration: 106,
    blurb: "L'essentiel du chapitre 1, sous-titré en arabe.",
  },
  {
    code: '7-1-1',
    kind: 'CORRECTION',
    chapter: 1,
    title: 'TP 1.1 · Construire mon arborescence',
    duration: 116,
    blurb: 'Créer des dossiers et des fichiers, copier et déplacer.',
  },
  {
    code: '7-1-2',
    kind: 'CORRECTION',
    chapter: 1,
    title: 'TP 1.2 · Renommer, supprimer, restaurer',
    duration: 80,
    blurb: 'Utiliser la Corbeille sans perdre ses données.',
  },
  {
    code: '7-r2',
    kind: 'RETENIR',
    chapter: 2,
    title: "À retenir · J'écris avec l'ordinateur",
    duration: 116,
    blurb: "L'essentiel du traitement de textes, sous-titré en arabe.",
  },
  {
    code: '7-2-1',
    kind: 'CORRECTION',
    chapter: 2,
    title: 'TP 2.1 · Mon collège',
    duration: 98,
    blurb: 'Saisir, enregistrer, mettre en forme et en page.',
  },
  {
    code: '7-2-2',
    kind: 'CORRECTION',
    chapter: 2,
    title: "TP 2.2 · Ma carte d'identité scolaire",
    duration: 90,
    blurb: 'Insérer un tableau, une image, une bordure, imprimer.',
  },
  {
    code: '7-r3',
    kind: 'RETENIR',
    chapter: 3,
    title: "À retenir · Je dessine avec l'ordinateur",
    duration: 120,
    blurb: "L'essentiel du traitement d'images, sous-titré en arabe.",
  },
  {
    code: '7-3-1',
    kind: 'CORRECTION',
    chapter: 3,
    title: 'TP 3.1 · Le drapeau tunisien',
    duration: 102,
    blurb: 'Formes, remplissage et enregistrement en PNG.',
  },
  {
    code: '7-3-2',
    kind: 'CORRECTION',
    chapter: 3,
    title: "TP 3.2 · Trois versions d'une photo",
    duration: 86,
    blurb: 'Filtre, symétrie, taille et texte, sans toucher à l’original.',
  },
  {
    code: '7-r4',
    kind: 'RETENIR',
    chapter: 4,
    title: 'À retenir · Je surfe sur le Web',
    duration: 129,
    blurb: "L'essentiel d'Internet et du Web, sous-titré en arabe.",
  },
  {
    code: '7-4-1',
    kind: 'CORRECTION',
    chapter: 4,
    title: 'TP 4.1 · Découvrir mon navigateur',
    duration: 85,
    blurb: "Barre d'adresse, Précédent, Actualiser, liens.",
  },
  {
    code: '7-4-2',
    kind: 'CORRECTION',
    chapter: 4,
    title: 'TP 4.2 · Mini-exposé : une ville tunisienne',
    duration: 90,
    blurb: 'Chercher, vérifier, récupérer et citer ses sources.',
  },
  {
    code: '7-r5',
    kind: 'RETENIR',
    chapter: 5,
    title: 'À retenir · Mon grand projet',
    duration: 103,
    blurb: 'Les étapes du projet de fin d’année.',
  },
];

const CHAPTERS_8: readonly BookChapter[] = [
  {
    num: 1,
    title: 'Je protège mon environnement numérique',
    color: '#2563eb',
    icon: '🛡️',
  },
  {
    num: 2,
    title: 'Je communique et je collabore en ligne',
    color: '#059669',
    icon: '✉️',
  },
  {
    num: 3,
    title: 'Je crée des contenus audio et vidéo',
    color: '#db2777',
    icon: '🎙️',
  },
  { num: 4, title: 'Je programme avec Scratch', color: '#ea580c', icon: '🧩' },
];

const VIDEOS_8: readonly BookVideo[] = [
  {
    code: '8-r1',
    kind: 'RETENIR',
    chapter: 1,
    title: 'À retenir · Je protège mon PC',
    duration: 95,
    blurb: 'Logiciels malveillants, hameçonnage, bons réflexes.',
  },
  {
    code: '8-1-1',
    kind: 'CORRECTION',
    chapter: 1,
    title: 'TP 1.1 · Je sécurise mon ordinateur',
    duration: 66,
    blurb: 'Antivirus, pare-feu et mises à jour.',
  },
  {
    code: '8-1-2',
    kind: 'CORRECTION',
    chapter: 1,
    title: "TP 1.2 · Je déjoue l'hameçonnage",
    duration: 65,
    blurb: 'Repérer les pièges et créer une affiche.',
  },
  {
    code: '8-r2',
    kind: 'RETENIR',
    chapter: 2,
    title: 'À retenir · Je communique en ligne',
    duration: 93,
    blurb: 'E-mail, Cc et Cci, nétiquette, e-réputation.',
  },
  {
    code: '8-2-1',
    kind: 'CORRECTION',
    chapter: 2,
    title: 'TP 2.1 · Un e-mail avec pièce jointe',
    duration: 62,
    blurb: 'À, Cc, objet, message poli et pièce jointe.',
  },
  {
    code: '8-2-2',
    kind: 'CORRECTION',
    chapter: 2,
    title: 'TP 2.2 · Nous écrivons à plusieurs',
    duration: 63,
    blurb: 'Document partagé, commentaires et historique.',
  },
  {
    code: '8-r3',
    kind: 'RETENIR',
    chapter: 3,
    title: 'À retenir · Je crée du son et des vidéos',
    duration: 93,
    blurb: 'Podcast, montage, formats et droits.',
  },
  {
    code: '8-3-1',
    kind: 'CORRECTION',
    chapter: 3,
    title: "TP 3.1 · J'enregistre un podcast",
    duration: 64,
    blurb: 'Enregistrer, nettoyer, mixer, exporter en MP3.',
  },
  {
    code: '8-3-2',
    kind: 'CORRECTION',
    chapter: 3,
    title: 'TP 3.2 · Je monte une courte vidéo',
    duration: 58,
    blurb: 'Storyboard, transitions, générique, MP4.',
  },
  {
    code: '8-r4',
    kind: 'RETENIR',
    chapter: 4,
    title: 'À retenir · Je programme avec Scratch',
    duration: 87,
    blurb: 'Algorithme, boucles, variables et modules.',
  },
  {
    code: '8-4-1',
    kind: 'CORRECTION',
    chapter: 4,
    title: 'TP 4.1 · Je programme un quiz',
    duration: 61,
    blurb: 'Variable score et « si… alors… sinon ».',
  },
  {
    code: '8-4-2',
    kind: 'CORRECTION',
    chapter: 4,
    title: 'TP 4.2 · Projet « Attrape les fruits »',
    duration: 64,
    blurb: 'Un jeu complet avec un module.',
  },
];

export interface Book {
  /** The number in the QR codes: `/v/<num>` and video codes `<num>-…`. */
  num: string;
  level: Level;
  label: string;
  folder: string;
  chapters: readonly BookChapter[];
  videos: readonly BookVideo[];
}

export const BOOKS: readonly Book[] = [
  {
    num: '7',
    level: 'SEVENTH_BASE',
    label: '7ᵉ année de base',
    folder: '7eme',
    chapters: CHAPTERS_7,
    videos: VIDEOS_7,
  },
  {
    num: '8',
    level: 'EIGHTH_BASE',
    label: '8ᵉ année de base',
    folder: '8eme',
    chapters: CHAPTERS_8,
    videos: VIDEOS_8,
  },
];

/** The book of a level: a student's own level, or for an admin the level picked in the header. */
export function bookForLevel(
  level: Level | null | undefined,
): Book | undefined {
  return BOOKS.find((b) => b.level === level);
}

/** `7`, `8`… (the whole book) or a video code such as `8-2-1`. */
export function bookOfCode(code: string | null | undefined): Book | undefined {
  const wanted = (code ?? '').trim().toLowerCase();
  return BOOKS.find((b) => wanted === b.num || wanted.startsWith(b.num + '-'));
}

/** Whether a level has book videos: the « Vidéos » entry is hidden for the others. */
export function canSeeBookVideos(level: Level | null | undefined): boolean {
  return !!bookForLevel(level);
}

export const VIDEO_KIND_LABELS: Record<VideoKind, string> = {
  RETENIR: 'À retenir',
  CORRECTION: 'Correction de TP',
};

export function videoByCode(
  code: string | null | undefined,
): BookVideo | undefined {
  const wanted = (code ?? '').trim().toLowerCase();
  return bookOfCode(wanted)?.videos.find((v) => v.code === wanted);
}

/**
 * Bumped when the files of a kind are replaced (same code, new content), so browsers that cached
 * the old video fetch the new one. The QR codes keep pointing at `/v/<code>` and never change.
 */
const FILE_VERSION: Record<VideoKind, number> = { RETENIR: 3, CORRECTION: 3 };

function folderOf(v: BookVideo): string {
  return bookOfCode(v.code)?.folder ?? '7eme';
}

export function videoSrc(v: BookVideo): string {
  return `/videos/${folderOf(v)}/${v.code}.mp4?v=${FILE_VERSION[v.kind]}`;
}

export function videoPoster(v: BookVideo): string {
  return `/videos/${folderOf(v)}/${v.code}.jpg?v=${FILE_VERSION[v.kind]}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m} min ${String(s).padStart(2, '0')}`;
}

export function chapterOf(
  v: BookVideo | null | undefined,
): BookChapter | undefined {
  return bookOfCode(v?.code)?.chapters.find((c) => c.num === v?.chapter);
}

export function totalMinutes(videos: readonly BookVideo[]): number {
  return Math.round(videos.reduce((sum, v) => sum + v.duration, 0) / 60);
}

// One list for every book: the codes never collide (7-…, 8-…). The key keeps its first name so
// nothing already remembered is lost.
const WATCHED_KEY = 'ef-videos-7eme-vues';

/**
 * Videos this viewer has watched to the end, kept in this browser only: a small convenience to
 * find where one stopped, never a record of progress. Storage may be unavailable: then nothing is
 * remembered and every video simply shows as not yet watched.
 */
export function readWatched(): Set<string> {
  try {
    const raw = localStorage.getItem(WATCHED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markWatched(code: string): Set<string> {
  const watched = readWatched();
  watched.add(code);
  try {
    localStorage.setItem(WATCHED_KEY, JSON.stringify([...watched]));
  } catch {
    // Private window or blocked storage: the badge just will not persist
  }
  return watched;
}
