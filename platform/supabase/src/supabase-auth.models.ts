import type { Session, User } from '@supabase/supabase-js';

export interface SignUpPayload {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
  readonly phone?: string;
}

export interface SignInPayload {
  readonly email: string;
  readonly password: string;
}

export interface AuthState {
  readonly user: User | null;
  readonly session: Session | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}
