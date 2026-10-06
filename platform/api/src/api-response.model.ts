export interface ApiResponse<T> {
  readonly code: string;
  readonly success: boolean;
  readonly message: string;
  readonly data: T;
  readonly timestamp: string;
}
