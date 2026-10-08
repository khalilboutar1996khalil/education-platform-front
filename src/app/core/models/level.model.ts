/** A class year, managed by the admin (GET /levels). `code` is what every level field stores. */
export interface SchoolLevel {
  id: number;
  code: string;
  name: string;
  position: number;
  active: boolean;
}

export interface CreateLevelRequest {
  code: string;
  name: string;
  position: number | null;
}

export interface UpdateLevelRequest {
  name: string;
  position: number;
}
