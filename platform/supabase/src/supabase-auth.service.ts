import { computed, inject, Injectable, signal } from '@angular/core';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import type { SignInPayload, SignUpPayload } from './supabase-auth.models';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly supabase = inject(SupabaseService);

  private readonly userState = signal<User | null>(null);
  private readonly sessionState = signal<Session | null>(null);
  private readonly loadingState = signal<boolean>(false);
  private readonly errorState = signal<string | null>(null);

  // Public Signals
  readonly currentUser = computed(() => this.userState());
  readonly currentSession = computed(() => this.sessionState());
  readonly isLoading = computed(() => this.loadingState());
  readonly authError = computed(() => this.errorState());
  readonly isAuthenticated = computed(() => !!this.userState());

  readonly userFullName = computed(() => {
    const user = this.userState();
    if (!user) return '';
    return (
      user.user_metadata?.['full_name'] ||
      user.user_metadata?.['name'] ||
      user.email?.split('@')[0] ||
      'Thành viên'
    );
  });

  readonly userEmail = computed(() => this.userState()?.email ?? '');

  constructor() {
    this.initAuth();
  }

  private async initAuth(): Promise<void> {
    try {
      const client = this.supabase.client;
      const { data } = await client.auth.getSession();
      if (data.session) {
        this.sessionState.set(data.session);
        this.userState.set(data.session.user);
      }

      client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        this.sessionState.set(session);
        this.userState.set(session?.user ?? null);
      });
    } catch (err: unknown) {
      console.warn('Lỗi khởi tạo Supabase auth session:', err);
    }
  }

  async signUp(payload: SignUpPayload): Promise<{ user: User | null; session: Session | null }> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const { data, error } = await this.supabase.client.auth.signUp({
        email: payload.email.trim(),
        password: payload.password,
        options: {
          data: {
            full_name: payload.fullName.trim(),
            phone: payload.phone?.trim() ?? ''
          }
        }
      });

      if (error) {
        const friendlyMessage = this.mapSupabaseErrorMessage(error.message);
        this.errorState.set(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      this.userState.set(data.user);
      this.sessionState.set(data.session);
      return data;
    } catch (err: unknown) {
      if (!this.errorState()) {
        this.errorState.set(this.normalizeError(err));
      }
      throw err;
    } finally {
      this.loadingState.set(false);
    }
  }

  async signIn(payload: SignInPayload): Promise<{ user: User | null; session: Session | null }> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email: payload.email.trim(),
        password: payload.password
      });

      if (error) {
        const friendlyMessage = this.mapSupabaseErrorMessage(error.message);
        this.errorState.set(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      this.userState.set(data.user);
      this.sessionState.set(data.session);
      return data;
    } catch (err: unknown) {
      if (!this.errorState()) {
        this.errorState.set(this.normalizeError(err));
      }
      throw err;
    } finally {
      this.loadingState.set(false);
    }
  }

  async signInWithOAuth(provider: 'google' | 'github'): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const { error } = await this.supabase.client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        const friendlyMessage = this.mapSupabaseErrorMessage(error.message);
        this.errorState.set(friendlyMessage);
        throw new Error(friendlyMessage);
      }
    } catch (err: unknown) {
      if (!this.errorState()) {
        this.errorState.set(this.normalizeError(err));
      }
      throw err;
    } finally {
      this.loadingState.set(false);
    }
  }

  async resetPassword(email: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const { error } = await this.supabase.client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        const friendlyMessage = this.mapSupabaseErrorMessage(error.message);
        this.errorState.set(friendlyMessage);
        throw new Error(friendlyMessage);
      }
    } catch (err: unknown) {
      if (!this.errorState()) {
        this.errorState.set(this.normalizeError(err));
      }
      throw err;
    } finally {
      this.loadingState.set(false);
    }
  }

  async signOut(): Promise<void> {
    this.loadingState.set(true);
    try {
      await this.supabase.client.auth.signOut();
      this.userState.set(null);
      this.sessionState.set(null);
      this.errorState.set(null);
    } catch (err: unknown) {
      console.warn('Lỗi khi đăng xuất Supabase:', err);
    } finally {
      this.loadingState.set(false);
    }
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private mapSupabaseErrorMessage(msg: string): string {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Địa chỉ email này đã được đăng ký trong hệ thống. Vui lòng chọn Đăng nhập.';
    }
    if (lower.includes('password should be at least')) {
      return 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư đến của bạn để xác thực.';
    }
    if (lower.includes('rate limit') || lower.includes('too many requests')) {
      return 'Thao tác quá thường xuyên. Vui lòng thử lại sau ít phút.';
    }
    if (lower.includes('network') || lower.includes('failed to fetch')) {
      return 'Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối mạng.';
    }
    return msg;
  }

  private normalizeError(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return 'Đã xảy ra sự cố không xác định khi xác thực.';
  }
}
