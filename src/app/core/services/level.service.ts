import { Injectable, effect, signal } from '@angular/core';
import { Level } from '../models/user.model';

const LEVEL_KEY = 'eduflow.admin-level';
const LEVELS: readonly Level[] = ['SECOND_AS', 'THIRD_AS', 'FOURTH_AS'];

/**
 * The level the admin is currently working on, picked in the header.
 * Admin screens that list level-scoped data (modules, élèves…) filter on it.
 */
@Injectable({ providedIn: 'root' })
export class LevelService {
  readonly current = signal<Level>(readLevel());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(LEVEL_KEY, this.current());
      } catch {
        /* storage unavailable: the choice just won't survive a reload */
      }
    });
  }
}

function readLevel(): Level {
  try {
    const raw = localStorage.getItem(LEVEL_KEY) as Level | null;
    return raw && LEVELS.includes(raw) ? raw : 'SECOND_AS';
  } catch {
    return 'SECOND_AS';
  }
}
