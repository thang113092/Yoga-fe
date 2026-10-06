import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { RegisterComponent } from './register/register.component';

export const IDENTITY_ROUTES: Routes = [
  { path: 'reset-password', component: ResetPasswordComponent, title: 'Khôi phục mật khẩu' },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Đăng nhập - Yoga Center Platform'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Đăng ký Hội viên - Yoga Center Platform'
  }
];
