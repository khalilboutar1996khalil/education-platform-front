/** Backend `PageResponse<T>` — exact field set, no `number`/`first`/`empty`. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/** RFC 7807 body as produced by GlobalExceptionHandler. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** Validation failures: a flat field → French message map. */
  errors?: Record<string, string>;
}

/** Normalised transport error handed to components by the error interceptor. */
export interface ApiError {
  status: number;
  /** Already-French message from the server, or a sensible fallback. */
  detail: string;
  fieldErrors: Record<string, string>;
  /** Seconds from the Retry-After header on a 429. */
  retryAfterSeconds?: number;
}
