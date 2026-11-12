import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, NotificationApi, NotificationInbox, relativeTimeVi } from '@yoga/platform/auth';
import { AppComponent } from './app.component';

describe('AppComponent Header Menu', () => {
  const authenticated = signal(true);
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
  let notificationApiMock: {
    mine: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
    markAllRead: ReturnType<typeof vi.fn>;
  };
  const inbox = (): NotificationInbox => ({
    unread: 1,
    items: [
      {
        id: 'n1', type: 'MEMBERSHIP_EXPIRING', title: 'Thẻ sắp hết hạn', body: 'Thẻ của bạn hết hạn sau 3 ngày.',
        link: '/membership/plans', createdAt: new Date(Date.now() - 25 * 60_000).toISOString(), read: false
      },
      {
        id: 'n2', type: 'SYSTEM', title: 'Chào mừng', body: null, link: null,
        createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString(), read: true
      }
    ]
  });

  beforeEach(() => {
    authenticated.set(true);
    authMock = {
      isAuthenticated: () => authenticated(),
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
      logout: vi.fn(() => authenticated.set(false))
    };
    notificationApiMock = {
      mine: vi.fn().mockImplementation(() => of(inbox())),
      markRead: vi.fn().mockReturnValue(of(undefined)),
      markAllRead: vi.fn().mockReturnValue(of(undefined))
    };

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([
          { path: 'users', component: AppComponent },
          { path: 'branches', component: AppComponent },
          { path: 'membership/plans', component: AppComponent },
          { path: 'auth/login', component: AppComponent }
        ]),
        { provide: AuthService, useValue: authMock },
        { provide: NotificationApi, useValue: notificationApiMock }
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

    const firstTabIcon = navTabs[0].querySelector('.nav-icon svg');
    expect(firstTabIcon).toBeTruthy();

    const hrefs = Array.from(navTabs).map(a => a.getAttribute('href'));
    expect(hrefs).toContain('/membership/online-report');
    expect(hrefs).toContain('/schedule/payroll');
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

  it('loads real notifications when authenticated and renders them in the bell popover', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await TestBed.inject(Router).navigateByUrl('/users');
    fixture.detectChanges();
    expect(notificationApiMock.mine).toHaveBeenCalledWith(20);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notification-badge')?.textContent?.trim()).toBe('1');

    fixture.componentInstance.toggleNotifications();
    fixture.detectChanges();
    const items = compiled.querySelectorAll('.notif-item');
    expect(items.length).toBe(2);
    expect(items[0].classList.contains('unread')).toBe(true);
    expect(items[0].querySelector('.notif-icon')?.classList.contains('class-icon')).toBe(true);
    expect(items[0].querySelector('.notif-time')?.textContent?.trim()).toBe('25 phút trước');
    expect(items[1].classList.contains('unread')).toBe(false);
    expect(items[1].querySelector('.notif-time')?.textContent?.trim()).toBe('3 giờ trước');
  });

  it('marks a notification read and navigates to its link on click', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/users');
    fixture.detectChanges();
    fixture.componentInstance.toggleNotifications();
    fixture.detectChanges();

    const navigate = vi.spyOn(router, 'navigateByUrl');
    (fixture.nativeElement.querySelector('.notif-item') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(notificationApiMock.markRead).toHaveBeenCalledWith('n1');
    expect(navigate).toHaveBeenCalledWith('/membership/plans');
    expect(fixture.componentInstance['unreadNotificationsCount']()).toBe(0);
    expect(fixture.componentInstance['notifications']()[0].read).toBe(true);
  });

  it('marks all notifications read, shows empty state, and clears on logout', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await TestBed.inject(Router).navigateByUrl('/users');
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.markAllNotificationsAsRead();
    expect(notificationApiMock.markAllRead).toHaveBeenCalled();
    expect(comp['unreadNotificationsCount']()).toBe(0);
    expect(comp['notifications']().every(n => n.read)).toBe(true);

    const callsBefore = notificationApiMock.mine.mock.calls.length;
    comp.onLogout();
    fixture.detectChanges();
    expect(comp['notifications']()).toEqual([]);

    notificationApiMock.mine.mockReturnValue(of({ items: [], unread: 0 }));
    authenticated.set(true);
    await TestBed.inject(Router).navigateByUrl('/users');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(notificationApiMock.mine.mock.calls.length).toBeGreaterThan(callsBefore);
    comp.toggleNotifications();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.notif-empty')?.textContent).toContain('Chưa có thông báo');
  });

  it('formats relative time in Vietnamese', () => {
    const now = Date.parse('2026-11-12T10:00:00Z');
    expect(relativeTimeVi('2026-11-12T09:59:40Z', now)).toBe('Vừa xong');
    expect(relativeTimeVi('2026-11-12T09:35:00Z', now)).toBe('25 phút trước');
    expect(relativeTimeVi('2026-11-11T08:00:00Z', now)).toBe('Hôm qua');
    expect(relativeTimeVi('2026-11-08T10:00:00Z', now)).toBe('4 ngày trước');
  });
});
