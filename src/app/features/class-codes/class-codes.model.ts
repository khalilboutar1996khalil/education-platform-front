import { Level } from '../../core/models/user.model';

export interface ClassCode {
  id: number;
  code: string;
  level: Level;
  label: string | null;
  active: boolean;
}

export interface ClassCodeRequest {
  code: string;
  level: Level;
  label: string | null;
}
