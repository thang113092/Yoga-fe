import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, NotificationApi, NotificationInbox, relativeTimeVi } from '@yoga/platform/auth';
import { AppComponent, buildNavGroups } from './app.component';

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

  it('groups the Super Admin menu and opens a group to show its links', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/users');
    fixture.detectChanges();
    // Route thử nghiệm cũng render AppComponent bên trong, nên chỉ xét thanh menu ngoài cùng.
    const compiled = (fixture.nativeElement as HTMLElement).querySelector('.desktop-nav') as HTMLElement;

    const topLevel = Array.from(compiled.querySelectorAll(':scope > .nav-tab, :scope .nav-group-btn'))
      .map(el => el.textContent?.trim());
    expect(topLevel).toEqual(['Lịch Học', 'Video', 'Kinh Doanh', 'Quản Trị']);
    expect(compiled.querySelector('.nav-tab .nav-icon svg')).toBeTruthy();

    // Trang /users thuộc nhóm Quản Trị → nút nhóm được tô sáng.
    const groupButtons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.nav-group-btn'));
    const admin = groupButtons.find(b => b.textContent?.includes('Quản Trị'))!;
    expect(admin.classList).toContain('active');
    expect(compiled.querySelector('.nav-group-panel')).toBeNull();

    groupButtons.find(b => b.textContent?.includes('Kinh Doanh'))!.click();
    fixture.detectChanges();
    const hrefs = Array.from(compiled.querySelectorAll('.nav-group-panel a')).map(a => a.getAttribute('href'));
    expect(hrefs).toEqual(['/membership/orders', '/membership/plans', '/membership/revenue', '/membership/online-report']);

    // Mở nhóm khác thì nhóm cũ đóng; Esc đóng tất cả.
    admin.click();
    fixture.detectChanges();
    expect(compiled.querySelectorAll('.nav-group-panel').length).toBe(1);
    expect(Array.from(compiled.querySelectorAll('.nav-group-panel a')).map(a => a.getAttribute('href'))).toContain('/schedule/payroll');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(compiled.querySelector('.nav-group-panel')).toBeNull();
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

describe('buildNavGroups', () => {
  const role = (overrides: Partial<Record<string, boolean>>) => {
    const flags: Record<string, boolean> = {
      canAccessStudentPortal: false, isSuperAdmin: false, isBranchManager: false, isReceptionist: false,
      isInstructor: false, canManageUsers: false, canManageClasses: false, canAccessPos: false, ...overrides
    };
    return Object.fromEntries(Object.entries(flags).map(([k, v]) => [k, () => v])) as unknown as Parameters<typeof buildNavGroups>[0];
  };
  const summary = (groups: ReturnType<typeof buildNavGroups>) =>
    groups.map(g => `${g.label}: ${g.items.map(i => i.label).join(', ')}`);

  it('keeps every Branch Manager page reachable in four groups', () => {
    const groups = buildNavGroups(role({ isBranchManager: true, canManageUsers: true, canManageClasses: true, canAccessPos: true }));
    expect(summary(groups)).toEqual([
      'Lịch Học: Lịch Học, Lớp Online, Khóa Học, Bộ Môn',
      'Video: Video',
      'Kinh Doanh: Đơn Hàng, Gói Thẻ Tập, Doanh Thu, Báo Cáo Online',
      'Quản Trị: Người Dùng, Thù Lao HLV, Chi Nhánh'
    ]);
  });

  it('gives instructors check-in, video and payroll', () => {
    const groups = buildNavGroups(role({ isInstructor: true }));
    expect(summary(groups)).toEqual([
      'Lịch Học: Khóa Học, Điểm Danh',
      'Video: Video',
      'Kinh Doanh: Gói Thẻ Tập',
      'Quản Trị: Thù Lao HLV, Chi Nhánh'
    ]);
  });

  it('gives receptionists students and the POS counter', () => {
    const groups = buildNavGroups(role({ isReceptionist: true, canAccessPos: true }));
    expect(summary(groups)).toEqual([
      'Lịch Học: Khóa Học',
      'Kinh Doanh: Bán Thẻ POS, Gói Thẻ Tập',
      'Quản Trị: Học Viên, Chi Nhánh'
    ]);
  });

  it('groups the student portal into personal and explore menus', () => {
    const groups = buildNavGroups(role({ canAccessStudentPortal: true }));
    expect(summary(groups)).toEqual([
      'Của Tôi: Thẻ Của Tôi, Lịch Sử Tập',
      'Lịch & Đặt Chỗ: Lịch & Đặt Chỗ',
      'Khóa Học: Khóa Học',
      'Thư Viện Video: Thư Viện Video',
      'Khám Phá: Bộ Môn, Gói Thẻ Tập, Chi Nhánh'
    ]);
  });
});
