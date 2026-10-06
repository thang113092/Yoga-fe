import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthModalComponent } from './auth-modal.component';
import { AuthService } from '@yoga/platform/auth';
import { SupabaseAuthService } from '@yoga/platform/supabase';

describe('AuthModalComponent', () => {
  let component: AuthModalComponent;
  let fixture: ComponentFixture<AuthModalComponent>;

  const mockAuthService = {
    currentUser: () => null,
    currentSession: () => null,
    isLoading: () => false,
    authError: () => null,
    isAuthenticated: () => false,
    signIn: async () => ({ user: null, session: null }),
    signUp: async () => ({ user: null, session: null }),
    signInWithOAuth: async () => {},
    resetPassword: async () => {},
    clearError: () => {}
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        { provide: SupabaseAuthService, useValue: mockAuthService },
        { provide: AuthService, useValue: {restoreSession:async()=>{},isAuthenticated:()=>false,sessionError:()=>null} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthModalComponent);
    component = fixture.componentInstance;
  });

  it('should create auth modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch mode between login and register', () => {
    component.setMode('register');
    expect(component['mode']()).toBe('register');

    component.setMode('login');
    expect(component['mode']()).toBe('login');
  });

  it('should toggle password visibility', () => {
    expect(component['showPassword']()).toBe(false);
    component.togglePasswordVisibility();
    expect(component['showPassword']()).toBe(true);
  });
});
