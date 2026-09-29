import { Injectable, effect, signal } from '@angular/core';

const THEME_KEY = 'eduflow.theme';
const MOTION_KEY = 'eduflow.reduce-motion';

/**
 * The API exposes no preferences field, so appearance lives entirely client-side.
 * Move these to the server if they should follow a user across devices.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly darkMode = signal(readFlag(THEME_KEY, false));
  readonly reduceMotion = signal(readFlag(MOTION_KEY, false));

  constructor() {
    effect(() => {
      const dark = this.darkMode();
      document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
      writeFlag(THEME_KEY, dark);
    });

    effect(() => {
      const reduced = this.reduceMotion();
      document.documentElement.dataset['reduceMotion'] = String(reduced);
      writeFlag(MOTION_KEY, reduced);
    });
  }

  toggleDarkMode(): void {
    this.darkMode.update((v) => !v);
  }

  toggleReduceMotion(): void {
    this.reduceMotion.update((v) => !v);
  }
}

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Private browsing or blocked storage — appearance just won't persist.
  }
}
