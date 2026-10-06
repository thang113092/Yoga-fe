import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterReq } from '@yoga/platform/auth';
import { ZenSelectComponent } from '@yoga/platform/api';

@Component({
  selector: 'yoga-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ZenSelectComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly genderOptions = [
    { value: '', label: 'Chưa chọn' },
    { value: 'FEMALE', label: 'Nữ' },
    { value: 'MALE', label: 'Nam' },
    { value: 'OTHER', label: 'Khác' }
  ];

  readonly fullName = signal<string>('');
  readonly phone = signal<string>('');
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly email = signal<string>('');
  readonly gender = signal<string>('');
  readonly showPassword = signal(false);
  readonly showConfirmation = signal(false);
  readonly dob = signal<string>('');

  readonly isLoading = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (this.isLoading()) return;
    const name = this.fullName().trim();
    const p = this.phone().trim();
    const pass = this.password();
    const cPass = this.confirmPassword();

    if (!name || !p || !pass || !this.email().trim()) {
      this.errorMessage.set('Vui lòng điền đầy đủ Họ tên, Email, Số điện thoại và Mật khẩu.');
      return;
    }

    if (pass.length < 8 || pass.length > 72) {
      this.errorMessage.set('Mật khẩu phải có độ dài từ 8 đến 72 ký tự.');
      return;
    }

    if (pass !== cPass) {
      this.errorMessage.set('Mật khẩu xác nhận không khớp.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const req: RegisterReq = {
      fullName: name,
      phone: p,
      password: pass,
      email: this.email().trim(),
      gender: this.gender() || undefined,
      dob: this.dob() || undefined
    };

    this.auth.register(req).subscribe({
      next: (result) => {
        if (result.confirmationRequired) { this.isLoading.set(false); this.successMessage.set("Đăng ký thành công. Kiểm tra email để xác nhận tài khoản, sau đó đăng nhập."); return; }
        this.isLoading.set(false);
        if (!this.auth.isAuthenticated()) { this.errorMessage.set("Tài khoản đã tạo nhưng chưa tải được phiên. Vui lòng đăng nhập lại."); return; }
        // Tự động chuyển hướng vào PWA Học viên
        this.router.navigate(['/membership/my-passes']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || err?.message || 'Đăng ký không thành công. Số điện thoại hoặc email có thể đã tồn tại.';
        this.errorMessage.set(msg);
      }
    });
  }
}
