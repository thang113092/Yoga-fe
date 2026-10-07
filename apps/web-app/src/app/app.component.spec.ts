import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@yoga/platform/auth';
import { AppComponent } from './app.component';

describe('AppComponent Header Menu', () => {
  let authMock: {
    isAuthenticated: () => boolean;
    userFullName: () => string;
    userRole: () => string;
    canManageUsers: () => boolean;
    canManageClasses: () => boolean;
    isSuperAdmin: () => boolean;
    isBranchManager: () => boolean;
    isReceptionist: () => boolean;
    isInstructor: () => boolean;
    canAccessPos: () => boolean;
    canAccessCheckIn: () => boolean;
    canAccessStudentPortal: () => boolean;
    logout: () => void;
  };

  beforeEach(() => {
    authMock = {
      isAuthenticated: () => true,
      userFullName: () => 'Nguyễn Minh Tâm',
      userRole: () => 'SUPER_ADMIN',
      canManageUsers: () => true,
      canManageClasses: () => true,
      isSuperAdmin: () => true,
      isBranchManager: () => false,
      isReceptionist: () => false,
      isInstructor: () => false,
      canAccessPos: () => true,
      canAccessCheckIn: () => true,
      canAccessStudentPortal: () => false,
      logout: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([
          { path: 'users', component: AppComponent },
          { path: 'branches', component: AppComponent }
        ]),
        { provide: AuthService, useValue: authMock }
      ]
    });
  });

  it('renders brand identity with Playfair serif and correct role label', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/users');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const brandTitle = compiled.querySelector('.brand-title');
    expect(brandTitle?.textContent?.trim()).toBe('AN YÊN');

    const roleBadge = compiled.querySelector('.role-badge');
    expect(roleBadge?.textContent?.trim()).toBe('Quản Trị Viên');
  });

  it('renders navigation tabs with SVG icons for Super Admin', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/users');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const navTabs = compiled.querySelectorAll('.desktop-nav .nav-tab');
    expect(navTabs.length).toBeGreaterThan(0);

    const firstTabIcon = navTabs[0].querySelector('svg.nav-icon');
    expect(firstTabIcon).toBeTruthy();
  });

  it('toggles mobile menu drawer', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component['isMobileMenuOpen']()).toBe(false);
    component.toggleMobileMenu();
    expect(component['isMobileMenuOpen']()).toBe(true);

    component.closeMobileMenu();
    expect(component['isMobileMenuOpen']()).toBe(false);
  });
});
