import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@yoga/platform/auth';
import { SupabaseAuthService } from '@yoga/platform/supabase';

export type AuthModalMode = 'login' | 'register' | 'forgot';

@Component({
  selector: 'yoga-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthModalComponent {
  protected readonly auth = inject(SupabaseAuthService);

  // Inputs & Outputs
  readonly isOpen = input<boolean>(false);
  readonly initialMode = input<AuthModalMode>('login');

  readonly closed = output<void>();
  readonly authenticated = output<void>();

  // State Signals
  protected readonly mode = signal<AuthModalMode>('login');
  protected readonly showPassword = signal<boolean>(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly localError = signal<string | null>(null);

  // Form Fields
  protected loginEmail = '';
  protected loginPassword = '';

  protected regFullName = '';
  protected regPhone = '';
  protected regEmail = '';
  protected regPassword = '';
  protected regConfirmPassword = '';

  protected forgotEmail = '';

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isOpen()) {
      this.closeModal();
    }
  }

  setMode(newMode: AuthModalMode): void {
    this.mode.set(newMode);
    this.auth.clearError();
    this.localError.set(null);
    this.successMessage.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(prev => !prev);
  }

  closeModal(): void {
    this.auth.clearError();
    this.localError.set(null);
    this.successMessage.set(null);
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  private readonly backendAuth = inject(AuthService);

  async handleLogin(): Promise<void> {
    this.localError.set(null);
    this.auth.clearError();

    if (!this.loginEmail || !this.loginPassword) {
      this.localError.set('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    try {
      await this.auth.signIn({
        email: this.loginEmail,
        password: this.loginPassword
      });
      await this.backendAuth.restoreSession();
      if (!this.backendAuth.isAuthenticated()) { this.localError.set(this.backendAuth.sessionError() || "Không tải được hồ sơ."); return; }
      this.authenticated.emit();
      this.closeModal();
    } catch {
      // Error handled by SupabaseAuthService authError signal
    }
  }

  async handleRegister(): Promise<void> {
    this.localError.set(null);
    this.auth.clearError();
    this.successMessage.set(null);

    if (!this.regFullName.trim()) {
      this.localError.set('Vui lòng nhập Họ và tên.');
      return;
    }
    if (!this.regEmail.trim()) {
      this.localError.set('Vui lòng nhập địa chỉ Email.');
      return;
    }
    if (!this.regPassword || this.regPassword.length < 8) {
      this.localError.set('Mật khẩu phải có độ dài tối thiểu 8 ký tự.');
      return;
    }
    if (this.regPassword !== this.regConfirmPassword) {
      this.localError.set('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      const result = await this.auth.signUp({
        email: this.regEmail,
        password: this.regPassword,
        fullName: this.regFullName,
        phone: this.regPhone
      });

      if (result.session) {
        await this.backendAuth.restoreSession();
        if (!this.backendAuth.isAuthenticated()) { this.localError.set(this.backendAuth.sessionError() || "Không tải được hồ sơ."); return; }
        // Logged in immediately
        this.authenticated.emit();
        this.closeModal();
      } else {
        // Confirmation email sent
        this.successMessage.set(
          'Đăng ký thành công! Vui lòng kiểm tra hộp thư email của bạn để xác nhận tài khoản trước khi đăng nhập.'
        );
      }
    } catch {
      // Error handled by SupabaseAuthService
    }
  }

  async handleForgotPassword(): Promise<void> {
    this.localError.set(null);
    this.auth.clearError();
    this.successMessage.set(null);

    if (!this.forgotEmail.trim()) {
      this.localError.set('Vui lòng nhập địa chỉ Email của bạn.');
      return;
    }

    try {
      await this.auth.resetPassword(this.forgotEmail);
      this.successMessage.set(
        'Đã gửi liên kết khôi phục mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư!'
      );
    } catch {
      // Error handled by SupabaseAuthService
    }
  }

  async handleGoogleLogin(): Promise<void> {
    try {
      await this.auth.signInWithOAuth('google');
    } catch {
      // Error handled by SupabaseAuthService
    }
  }
}
