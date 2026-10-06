import { provideExperimentalZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@yoga/platform/auth';
import { of } from 'rxjs';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { describe, it, expect, vi } from 'vitest';

const auth = () => ({
  isAuthenticated: signal(false), login: vi.fn(),
  register: vi.fn(() => of({ confirmationRequired: true }))
});

for (const [name, component] of [['login', LoginComponent], ['register', RegisterComponent]] as const) {
  describe(name + ' form', () => {
    it('renders ngModel controls without missing-name errors', async () => {
      TestBed.configureTestingModule({ imports: [component], providers: [
        provideExperimentalZonelessChangeDetection(), provideRouter([]),
        { provide: AuthService, useValue: auth() }
      ] });
      const fixture = TestBed.createComponent(component);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('input[type="email"]')).toBeTruthy();
    });
  });
}

it('toggles password visibility without submitting the login form', async () => {
  const service = auth();
  TestBed.configureTestingModule({ imports: [LoginComponent], providers: [
    provideExperimentalZonelessChangeDetection(), provideRouter([]),
    { provide: AuthService, useValue: service }
  ] });
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  fixture.nativeElement.querySelector('.password-toggle').click();
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('#passInput').type).toBe('text');
  expect(service.login).not.toHaveBeenCalled();
  fixture.nativeElement.querySelector('.password-toggle').click();
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('#passInput').type).toBe('password');
});

it('replaces registration form with confirmation guidance when email verification is required', async () => {
  const service = auth();
  TestBed.configureTestingModule({ imports: [RegisterComponent], providers: [
    provideExperimentalZonelessChangeDetection(), provideRouter([]),
    { provide: AuthService, useValue: service }
  ] });
  const fixture = TestBed.createComponent(RegisterComponent);
  fixture.componentInstance.fullName.set('Test Member');
  fixture.componentInstance.phone.set('0912345678');
  fixture.componentInstance.email.set('member@example.com');
  fixture.componentInstance.password.set('test-password');
  fixture.componentInstance.confirmPassword.set('test-password');
  fixture.componentInstance.onSubmit();
  fixture.detectChanges();
  expect(service.register).toHaveBeenCalledOnce();
  expect(fixture.nativeElement.querySelector('form')).toBeNull();
  expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('member@example.com');
  expect(fixture.nativeElement.querySelector('.primary-button').getAttribute('href')).toBe('/auth/login');
});
