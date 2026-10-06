import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@yoga/platform/auth';

@Component({
  selector: 'yoga-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `<main class="login-page-container"><section class="form-card">
    <h1>Đặt mật khẩu mới</h1><p>Mở trang này từ email khôi phục tài khoản.</p>
    @if (error()) { <p role="alert">{{ error() }}</p> }
    @if (success()) { <p role="status">{{ success() }}</p><a routerLink="/auth/login">Đăng nhập</a> }
    @else { <form (ngSubmit)="submit()">
      <div class="form-group"><label for="newPassword">Mật khẩu mới</label>
        <input id="newPassword" name="newPassword" class="form-control" type="password" autocomplete="new-password" required minlength="8" maxlength="72" [ngModel]="password()" (ngModelChange)="password.set($event)" /></div>
      <div class="form-group"><label for="confirmPassword">Xác nhận mật khẩu</label>
        <input id="confirmPassword" name="confirmPassword" class="form-control" type="password" autocomplete="new-password" required [ngModel]="confirmation()" (ngModelChange)="confirmation.set($event)" /></div>
      <button class="btn-login-submit" type="submit" [disabled]="loading()">{{ loading() ? 'Đang lưu…' : 'Lưu mật khẩu' }}</button>
    </form> }
  </section></main>`,
  styleUrls: ['../login/login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  readonly password = signal('');
  readonly confirmation = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  async submit(): Promise<void> {
    if (this.loading()) return;
    if (this.password().length < 8 || this.password().length > 72 || this.password() !== this.confirmation()) {
      this.error.set('Nhập mật khẩu từ 8 đến 72 ký tự và xác nhận trùng khớp.'); return;
    }
    this.loading.set(true); this.error.set(null);
    try { await this.auth.updatePassword(this.password()); this.success.set('Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.'); }
    catch (err: any) { this.error.set(err?.message || 'Liên kết khôi phục không hợp lệ hoặc đã hết hạn.'); }
    finally { this.loading.set(false); }
  }
}
