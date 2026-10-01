import { Injectable, effect, signal } from '@angular/core';

const MOTION_KEY = 'eduflow.reduce-motion';

/**
 * The API exposes no preferences field, so appearance lives entirely client-side.
 * Move these to the server if they should follow a user across devices.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly reduceMotion = signal(readFlag(MOTION_KEY, false));

  constructor() {
    // Light only. Clears a dark theme saved by an earlier version so nobody gets stuck in it.
    document.documentElement.dataset['theme'] = 'light';
    try {
      localStorage.removeItem('eduflow.theme');
    } catch {
      // Storage blocked: nothing to clean up.
    }

    effect(() => {
      const reduced = this.reduceMotion();
      document.documentElement.dataset['reduceMotion'] = String(reduced);
      writeFlag(MOTION_KEY, reduced);
    });
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
