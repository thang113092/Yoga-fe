import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, LoginReq } from '@yoga/platform/auth';

@Component({
  selector: 'yoga-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly showPassword = signal(false);
  readonly isLoading = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async requestPasswordReset(): Promise<void> {
    if (this.isLoading()) return;
    if (!this.email().trim()) { this.errorMessage.set('Nhập email để khôi phục mật khẩu.'); return; }
    this.isLoading.set(true); this.errorMessage.set(null);
    try { await this.auth.requestPasswordReset(this.email()); this.successMessage.set('Nếu tài khoản tồn tại, bạn sẽ nhận được email khôi phục. Kiểm tra hộp thư và spam.'); }
    catch (err: any) { this.errorMessage.set(err?.message || 'Không gửi được email khôi phục.'); }
    finally { this.isLoading.set(false); }
  }

  async resendConfirmation(): Promise<void> {
    if (this.isLoading()) return;
    if (!this.email().trim()) { this.errorMessage.set('Nhập email trước khi gửi lại xác nhận.'); return; }
    this.isLoading.set(true); this.errorMessage.set(null);
    try { await this.auth.resendConfirmation(this.email()); this.successMessage.set('Nếu email cần xác nhận, bạn sẽ nhận được hướng dẫn. Kiểm tra hộp thư và spam.'); }
    catch (err: any) { this.errorMessage.set(err?.message || 'Không gửi được email xác nhận.'); }
    finally { this.isLoading.set(false); }
  }

  onSubmit(): void {
    if (this.isLoading()) return;
    const p = this.email().trim();
    const pass = this.password();

    if (!p || !pass) {
      this.errorMessage.set('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const req: LoginReq = { email: p, password: pass };

    this.auth.login(req).subscribe({
      next: async () => {
        this.isLoading.set(false);
        if (!this.auth.isAuthenticated()) { this.errorMessage.set("Không xác minh được phiên đăng nhập. Vui lòng thử lại."); return; }
        const role = this.auth.userRole();
        if (role === 'STUDENT') {
          this.router.navigate(['/membership/my-passes']);
        } else if (role === 'RECEPTIONIST') {
          this.router.navigate(['/membership/pos']);
        } else if (role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER') {
          this.router.navigate(['/users']);
        } else {
          this.router.navigate(['/schedule/calendar']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || err?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
        this.errorMessage.set(msg);
      }
    });
  }
}

