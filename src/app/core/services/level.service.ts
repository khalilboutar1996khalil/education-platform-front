import { Injectable, effect, inject, signal } from '@angular/core';
import { Level } from '../models/user.model';
import { LevelCatalog } from './level-catalog.service';

const LEVEL_KEY = 'eduflow.admin-level';

/**
 * The level the admin is currently working on, picked in the header.
 * Admin screens that list level-scoped data (modules, élèves…) filter on it.
 */
@Injectable({ providedIn: 'root' })
export class LevelService {
  private readonly catalog = inject(LevelCatalog);
  readonly current = signal<Level>(readLevel());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(LEVEL_KEY, this.current());
      } catch {
        /* storage unavailable: the choice just won't survive a reload */
      }
    });
    // A remembered level may since have been removed, and a first visit has none: fall back to
    // the first level in school order once the list is known.
    effect(() => {
      const levels = this.catalog.all();
      if (levels.length && !levels.some((l) => l.code === this.current())) {
        this.current.set(levels[0].code);
      }
    });
  }
}

function readLevel(): Level {
  try {
    return localStorage.getItem(LEVEL_KEY) ?? '';
  } catch {
    return '';
  }
}
