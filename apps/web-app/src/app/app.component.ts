import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@yoga/platform/auth';
import {
  ZenAvatarComponent,
  ZenConfirmModalComponent,
  ZenIconComponent,
  ZenIconName,
  ZenThemeMode,
  ZenThemeService
} from '@yoga/platform/ui';

@Component({
  selector: 'yoga-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, ZenConfirmModalComponent, ZenIconComponent, ZenAvatarComponent],
  template: `
    @if (!isStandalonePage()) {
      <header class="app-header">
        <div class="brand">
          <a routerLink="/" class="brand-link" title="Về trang chủ An Yên Yoga">
            <img src="/branding/an-yen-logo-v1.png" alt="An Yên Yoga & Wellness" class="brand-logo-img" width="36" height="36" />
            <div class="brand-text">
              <span class="brand-title">AN YÊN</span>
              <span class="brand-sub">YOGA & WELLNESS</span>
            </div>
          </a>
        </div>

        <!-- DESKTOP NAVIGATION MENU -->
        <nav class="desktop-nav" aria-label="Menu điều hướng chính">
            <!-- Học viên: nhóm cá nhân | nhóm danh mục -->
            @if (auth.canAccessStudentPortal()) {
              <a routerLink="/membership/my-passes" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="shield-check" />
                <span>Thẻ Của Tôi</span>
              </a>
              <a routerLink="/membership/history" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="clock" />
                <span>Lịch Sử Tập</span>
              </a>
              <a routerLink="/schedule/courses" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="graduation-cap" />
                <span>Khóa Học</span>
              </a>
              <a routerLink="/schedule/calendar" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="calendar" />
                <span>Lịch & Đặt Chỗ</span>
              </a>
              <span class="nav-divider" aria-hidden="true"></span>
              <a routerLink="/schedule/subjects" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="book" />
                <span>Bộ Môn</span>
              </a>
              <a routerLink="/membership/plans" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="layers" />
                <span>Gói Thẻ Tập</span>
              </a>
              <a routerLink="/branches" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="map-pin" />
                <span>Chi Nhánh</span>
              </a>
            } @else {
              @if (auth.canManageUsers() || auth.isReceptionist()) {
                <a routerLink="/users" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="users" />
                  <span>{{ auth.isReceptionist() ? 'Học Viên' : 'Người Dùng' }}</span>
                </a>
              }
              @if (auth.canManageClasses()) {
                <a routerLink="/schedule/timetable" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="calendar" />
                  <span>Lịch Học</span>
                </a>
              }
              <a routerLink="/schedule/courses" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="graduation-cap" />
                <span>Khóa Học</span>
              </a>
              @if (auth.isSuperAdmin() || auth.isBranchManager()) {
                <a routerLink="/membership/orders" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="shopping-bag" />
                  <span>Đơn Hàng</span>
                </a>
                <a routerLink="/membership/revenue" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="bar-chart" />
                  <span>Doanh Thu</span>
                </a>
              }
              @if (auth.canAccessPos() && !auth.isSuperAdmin() && !auth.isBranchManager()) {
                <a routerLink="/membership/pos" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="credit-card" />
                  <span>Bán Thẻ POS</span>
                </a>
              }
              @if (auth.isInstructor()) {
                <a routerLink="/schedule/check-in" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="check-square" />
                  <span>Điểm Danh</span>
                </a>
              }

              @if (auth.canManageUsers() || auth.canManageClasses() || auth.isSuperAdmin() || auth.isBranchManager() || (auth.canAccessPos() && !auth.isSuperAdmin() && !auth.isBranchManager()) || auth.isInstructor()) {
                <span class="nav-divider" aria-hidden="true"></span>
              }

              @if (auth.canAccessStudentPortal()) {
                <a routerLink="/membership/my-passes" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="shield-check" />
                  <span>Thẻ Của Tôi</span>
                </a>
                <a routerLink="/membership/history" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="clock" />
                  <span>Lịch Sử Tập</span>
                </a>
              }
              @if (auth.canManageClasses()) {
                <a routerLink="/schedule/subjects" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="book" />
                  <span>Bộ Môn</span>
                </a>
              }
              <a routerLink="/membership/plans" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="layers" />
                <span>Gói Thẻ Tập</span>
              </a>
              <a routerLink="/branches" routerLinkActive="active" class="nav-tab">
                <zen-icon class="nav-icon" name="map-pin" />
                <span>Chi Nhánh</span>
              </a>
              @if (!auth.isSuperAdmin() && !auth.isBranchManager() && !auth.isReceptionist() && !auth.isInstructor()) {
                <a routerLink="/schedule/calendar" routerLinkActive="active" class="nav-tab">
                  <zen-icon class="nav-icon" name="calendar" />
                  <span>Lịch & Đặt Chỗ</span>
                </a>
              }
            }
          </nav>

        <div class="user-profile-bar">
          @if (auth.isAuthenticated()) {
            <div class="utility-actions">
              <!-- Chế độ sáng / tối -->
              <button
                type="button"
                class="btn-icon-utility"
                (click)="theme.toggle()"
                [title]="theme.isDark() ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'"
                [attr.aria-label]="theme.isDark() ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'"
              >
                <zen-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="18" />
              </button>

              <!-- Thông báo -->
              <div class="popover-wrapper">
                <button
                  type="button"
                  class="btn-icon-utility"
                  [class.active]="isNotificationsOpen()"
                  (click)="toggleNotifications()"
                  title="Thông báo"
                  aria-label="Xem thông báo"
                >
                  <zen-icon name="bell" [size]="18" />
                  @if (unreadNotificationsCount() > 0) {
                    <span class="notification-badge">{{ unreadNotificationsCount() }}</span>
                  }
                </button>

                @if (isNotificationsOpen()) {
                  <div class="popover-panel notifications-panel" (click)="$event.stopPropagation()">
                    <div class="popover-header">
                      <div class="header-left-title">
                        <h4>Thông Báo</h4>
                        @if (unreadNotificationsCount() > 0) {
                          <span class="new-pill">{{ unreadNotificationsCount() }} mới</span>
                        }
                      </div>
                      <button type="button" class="btn-text-sm" (click)="markAllNotificationsAsRead()">Đã đọc tất cả</button>
                    </div>

                    <div class="notifications-list">
                      <div class="notif-item unread">
                        <div class="notif-icon class-icon"><zen-icon name="clock" [size]="15" /></div>
                        <div class="notif-content">
                          <p class="notif-title">Nhắc nhở ca học hôm nay</p>
                          <p class="notif-desc">Lớp Hatha Yoga Cơ Bản sẽ bắt đầu lúc 18:30 tại CS Quận 1.</p>
                          <span class="notif-time">25 phút trước</span>
                        </div>
                      </div>

                      <div class="notif-item unread">
                        <div class="notif-icon pass-icon"><zen-icon name="check-circle" [size]="15" /></div>
                        <div class="notif-content">
                          <p class="notif-title">Thẻ tập đã sẵn sàng</p>
                          <p class="notif-desc">Hệ thống đã đồng bộ quyền truy cập đa cơ sở cho bạn.</p>
                          <span class="notif-time">2 giờ trước</span>
                        </div>
                      </div>

                      <div class="notif-item">
                        <div class="notif-icon info-icon"><zen-icon name="info" [size]="15" /></div>
                        <div class="notif-content">
                          <p class="notif-title">Chào mừng đến với An Yên</p>
                          <p class="notif-desc">Chúc bạn có những giờ phút rèn luyện an nhiên và tràn đầy năng lượng.</p>
                          <span class="notif-time">Hôm qua</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Cài đặt -->
              <div class="popover-wrapper">
                <button
                  type="button"
                  class="btn-icon-utility"
                  [class.active]="isSettingsOpen()"
                  (click)="toggleSettings()"
                  title="Cài đặt & Tùy chọn"
                  aria-label="Cài đặt tài khoản"
                >
                  <zen-icon name="settings" [size]="18" />
                </button>

                @if (isSettingsOpen()) {
                  <div class="popover-panel settings-panel" (click)="$event.stopPropagation()">
                    <div class="popover-header">
                      <h4>Cài Đặt & Tùy Chọn</h4>
                    </div>

                    <div class="settings-body">
                      <label class="setting-row">
                        <div class="setting-info">
                          <span class="setting-title">Nhắc lịch học qua email</span>
                          <span class="setting-desc">Nhận thông báo trước ca tập 2 tiếng</span>
                        </div>
                        <input
                          type="checkbox"
                          class="toggle-checkbox"
                          [checked]="reminderEnabled()"
                          (change)="reminderEnabled.set(!reminderEnabled())"
                        />
                      </label>

                      <div class="setting-row setting-row--stacked">
                        <div class="setting-info">
                          <span class="setting-title">Giao diện</span>
                          <span class="setting-desc">Chế độ sáng, tối hoặc theo thiết bị</span>
                        </div>
                        <div class="zen-segmented theme-segmented" role="radiogroup" aria-label="Chế độ giao diện">
                          @for (opt of themeOptions; track opt.value) {
                            <button
                              type="button"
                              role="radio"
                              [class.is-active]="theme.mode() === opt.value"
                              [attr.aria-checked]="theme.mode() === opt.value"
                              (click)="theme.setMode(opt.value)"
                            >
                              <zen-icon [name]="opt.icon" [size]="14" />
                              <span>{{ opt.label }}</span>
                            </button>
                          }
                        </div>
                      </div>

                      <div class="setting-divider"></div>

                      @if (auth.canManageClasses()) {
                        <a routerLink="/schedule/manage" (click)="closeAllPopovers()" class="setting-link">
                          <span>{{ (auth.isReceptionist() || auth.isInstructor()) ? 'Danh sách lớp học' : 'Quản lý lớp học' }}</span>
                          <zen-icon name="chevron-right" [size]="15" />
                        </a>
                      }

                      @if (auth.isReceptionist()) {
                        <a routerLink="/users" (click)="closeAllPopovers()" class="setting-link">
                          <span>Danh sách học viên</span>
                          <zen-icon name="chevron-right" [size]="15" />
                        </a>
                      }

                      @if (auth.isSuperAdmin() || auth.isBranchManager()) {
                        <a routerLink="/membership/revenue" (click)="closeAllPopovers()" class="setting-link">
                          <span>Báo cáo doanh thu</span>
                          <zen-icon name="chevron-right" [size]="15" />
                        </a>
                      }

                      @if (auth.canManageClasses()) {
                        <a routerLink="/schedule/subjects" (click)="closeAllPopovers()" class="setting-link">
                          <span>Quản lý bộ môn</span>
                          <zen-icon name="chevron-right" [size]="15" />
                        </a>
                      }

                      <a routerLink="/membership/plans" (click)="closeAllPopovers()" class="setting-link">
                        <span>Danh mục gói thẻ tập</span>
                        <zen-icon name="chevron-right" [size]="15" />
                      </a>

                      <a routerLink="/branches" (click)="closeAllPopovers()" class="setting-link">
                        <span>Hệ thống cơ sở</span>
                        <zen-icon name="chevron-right" [size]="15" />
                      </a>

                      @if (!auth.isSuperAdmin() && !auth.isBranchManager() && !auth.isReceptionist() && !auth.isInstructor()) {
                        <a routerLink="/schedule/calendar" (click)="closeAllPopovers()" class="setting-link">
                          <span>Lịch tập & Đặt chỗ</span>
                          <zen-icon name="chevron-right" [size]="15" />
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            @if (isNotificationsOpen() || isSettingsOpen()) {
              <div class="popover-backdrop" (click)="closeAllPopovers()"></div>
            }

            <div class="header-divider"></div>

            <!-- Khối người dùng -->
            <div class="user-pill" [title]="auth.userFullName()">
              <div class="avatar-wrapper">
                <zen-avatar [name]="auth.userFullName() || 'U'" size="sm" />
                <span class="online-dot" title="Đang trực tuyến"></span>
              </div>
              <div class="user-details">
                <span class="user-name">{{ auth.userFullName() }}</span>
                <span class="role-badge">{{ getRoleLabel(auth.userRole()) }}</span>
              </div>
            </div>

            <button type="button" class="btn-logout" (click)="onLogout()" title="Đăng xuất tài khoản">
              <zen-icon name="log-out" />
              <span class="logout-text">Đăng xuất</span>
            </button>
          } @else {
            <div class="guest-actions">
              <a routerLink="/auth/login" class="zen-btn zen-btn--outline zen-btn--sm btn-login-sm">Đăng Nhập</a>
              <a routerLink="/auth/register" class="zen-btn zen-btn--primary zen-btn--sm btn-register-sm">Đăng Ký Học Viên</a>
            </div>
          }

          <!-- NÚT HAMBURGER MOBILE -->
          <button
            type="button"
            class="btn-mobile-toggle"
            (click)="toggleMobileMenu()"
            [attr.aria-expanded]="isMobileMenuOpen()"
            aria-label="Mở menu điều hướng"
          >
            <span class="bar" [class.open-1]="isMobileMenuOpen()"></span>
            <span class="bar" [class.open-2]="isMobileMenuOpen()"></span>
            <span class="bar" [class.open-3]="isMobileMenuOpen()"></span>
          </button>
        </div>
      </header>

      <!-- MOBILE DRAWER / MENU PANEL -->
      @if (isMobileMenuOpen()) {
        <div class="mobile-backdrop" (click)="closeMobileMenu()"></div>
        <aside class="mobile-drawer" role="dialog" aria-label="Menu di động">
          <div class="drawer-header">
            <div class="drawer-brand">
              <img src="/branding/an-yen-logo-v1.png" alt="An Yên" class="drawer-logo-img" width="32" height="32" />
              <div class="drawer-brand-text">
                <span class="drawer-brand-title">AN YÊN</span>
                <span class="drawer-brand-sub">YOGA & WELLNESS</span>
              </div>
            </div>
            <button type="button" class="btn-close-drawer" (click)="closeMobileMenu()" aria-label="Đóng menu">
              <zen-icon name="close" [size]="18" />
            </button>
          </div>

          @if (auth.isAuthenticated()) {
            <div class="drawer-user-card">
              <zen-avatar [name]="auth.userFullName() || 'U'" />
              <div class="drawer-user-meta">
                <span class="drawer-user-name">{{ auth.userFullName() }}</span>
                <span class="drawer-user-role">{{ getRoleLabel(auth.userRole()) }}</span>
              </div>
            </div>
          }

          <nav class="drawer-nav">
            <div class="drawer-section-title">Điều hướng chính</div>

            @if (auth.canAccessStudentPortal()) {
              <a routerLink="/membership/my-passes" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="shield-check" />
                <span>Thẻ Của Tôi</span>
              </a>
              <a routerLink="/membership/history" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="clock" />
                <span>Lịch Sử Tập</span>
              </a>
              <a routerLink="/schedule/courses" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="graduation-cap" />
                <span>Khóa Học</span>
              </a>
              <a routerLink="/schedule/calendar" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="calendar" />
                <span>Lịch & Đặt Chỗ</span>
              </a>
              <div class="drawer-section-title">Danh mục</div>
              <a routerLink="/schedule/subjects" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="book" />
                <span>Bộ Môn</span>
              </a>
              <a routerLink="/membership/plans" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="layers" />
                <span>Gói Thẻ Tập</span>
              </a>
              <a routerLink="/branches" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="map-pin" />
                <span>Chi Nhánh</span>
              </a>
            } @else {

              @if (auth.canManageUsers() || auth.isReceptionist()) {
                <a routerLink="/users" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="users" />
                  <span>{{ auth.isReceptionist() ? 'Danh Sách Học Viên' : 'Phân Quyền & Người Dùng' }}</span>
                </a>
              }

              @if (auth.canManageClasses()) {
                <a routerLink="/schedule/timetable" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="calendar" />
                  <span>Lịch Học</span>
                </a>
              }

              <a routerLink="/schedule/courses" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="graduation-cap" />
                <span>Khóa Học</span>
              </a>

              @if (auth.isSuperAdmin() || auth.isBranchManager()) {
                <a routerLink="/membership/orders" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="shopping-bag" />
                  <span>Danh Sách Đơn Hàng</span>
                </a>
                <a routerLink="/membership/revenue" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="bar-chart" />
                  <span>Báo Cáo Doanh Thu</span>
                </a>
              }

              @if (auth.canAccessPos() && !auth.isSuperAdmin() && !auth.isBranchManager()) {
                <a routerLink="/membership/pos" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="credit-card" />
                  <span>Quầy Bán Thẻ (POS)</span>
                </a>
              }

              @if (auth.isInstructor()) {
                <a routerLink="/schedule/check-in" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="check-square" />
                  <span>Điểm Danh</span>
                </a>
              }

              @if (auth.canAccessStudentPortal()) {
                <a routerLink="/membership/my-passes" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="shield-check" />
                  <span>Thẻ Của Tôi</span>
                </a>
                <a routerLink="/membership/history" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="clock" />
                  <span>Lịch Sử Tập</span>
                </a>
              }

              @if (auth.canManageClasses()) {
                <a routerLink="/schedule/subjects" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="book" />
                  <span>Bộ Môn</span>
                </a>
              }

              <a routerLink="/membership/plans" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="layers" />
                <span>Gói Thẻ Tập</span>
              </a>

              <a routerLink="/branches" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <zen-icon name="map-pin" />
                <span>Chi Nhánh</span>
              </a>

              @if (!auth.isSuperAdmin() && !auth.isBranchManager() && !auth.isReceptionist() && !auth.isInstructor()) {
                <a routerLink="/schedule/calendar" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                  <zen-icon name="calendar" />
                  <span>Lịch & Đặt Chỗ</span>
                </a>
              }
            }
          </nav>

          <div class="drawer-footer">
            @if (auth.isAuthenticated()) {
              <button type="button" class="zen-btn zen-btn--danger-outline zen-btn--block drawer-btn-logout" (click)="onLogout()">
                <zen-icon name="log-out" />
                <span>Đăng Xuất</span>
              </button>
            } @else {
              <div class="drawer-auth-actions">
                <a routerLink="/auth/login" (click)="closeMobileMenu()" class="zen-btn zen-btn--outline zen-btn--block drawer-btn-login">Đăng Nhập</a>
                <a routerLink="/auth/register" (click)="closeMobileMenu()" class="zen-btn zen-btn--primary zen-btn--block drawer-btn-register">Đăng Ký Học Viên</a>
              </div>
            }
          </div>
        </aside>
      }
    }

    <div class="main-content" [class.management-ui]="!isStandalonePage()" [class.no-header]="isStandalonePage()">
      <router-outlet />
    </div>

    <zen-confirm-modal />
  `,
  styles: [`
    /* ---------- Header ---------- */
    .app-header {
      position: sticky;
      top: 0;
      z-index: var(--z-header);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-lg);
      height: var(--header-height);
      padding: 0 var(--page-padding-x);
      background: var(--glass-bg);
      backdrop-filter: var(--backdrop-blur);
      -webkit-backdrop-filter: var(--backdrop-blur);
      border-bottom: 1px solid var(--color-border);
      font-family: var(--font-sans);
    }

    .brand { display: flex; align-items: center; flex-shrink: 0; }

    .brand-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      border-radius: var(--radius-md);
      transition: opacity var(--duration-fast) ease;
      &:hover { opacity: 0.85; }
    }

    .brand-logo-img {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      object-fit: contain;
    }

    .brand-text { display: flex; flex-direction: column; }

    .brand-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: var(--weight-bold);
      line-height: 1.1;
      letter-spacing: 0.04em;
      color: var(--color-primary);
    }

    .brand-sub {
      margin-top: 2px;
      font-size: var(--text-2xs);
      font-weight: var(--weight-semibold);
      letter-spacing: var(--tracking-eyebrow);
      text-transform: uppercase;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    /* ---------- Desktop nav ---------- */
    .desktop-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .nav-tab {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 36px;
      padding: 0 12px;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      text-decoration: none;
      white-space: nowrap;
      flex-shrink: 0;
      transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease;

      .nav-icon { color: var(--color-text-muted); transition: color var(--duration-fast) ease; }

      &:hover:not(.active) {
        color: var(--color-text-main);
        background: var(--color-surface-hover);
      }

      &.active {
        color: var(--color-primary);
        background: var(--color-primary-soft);
        font-weight: var(--weight-semibold);
        .nav-icon { color: var(--color-primary); }
      }
    }

    .nav-divider {
      width: 1px;
      height: 20px;
      margin: 0 6px;
      background: var(--color-border);
      flex-shrink: 0;
    }

    /* ---------- Right side ---------- */
    .user-profile-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      flex-shrink: 0;
    }

    .utility-actions { display: flex; align-items: center; gap: 4px; }

    .popover-wrapper { position: relative; }

    .btn-icon-utility {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease;

      &:hover { background: var(--color-surface-hover); color: var(--color-primary); }
      &.active { background: var(--color-primary-soft); color: var(--color-primary); }
    }

    /* Chấm đếm nằm ở góc trên-phải, không che icon chuông. */
    .notification-badge {
      position: absolute;
      top: 3px;
      right: 3px;
      transform: translate(40%, -40%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      box-sizing: border-box;
      border: 2px solid var(--color-surface);
      border-radius: var(--radius-full);
      background: var(--color-error-solid);
      color: #ffffff;
      font-size: 10px;
      font-weight: var(--weight-bold);
      line-height: 1;
      pointer-events: none;
    }

    /* ---------- Popovers ---------- */
    .popover-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: var(--z-modal);
      width: 340px;
      max-width: calc(100vw - 32px);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      animation: popoverFadeIn var(--duration-base) var(--ease-spring);
    }
    .settings-panel { width: 300px; }

    .popover-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-sm);
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-border);

      h4 {
        margin: 0;
        font-size: var(--text-base);
        font-weight: var(--weight-semibold);
        color: var(--color-text-main);
      }
    }

    .header-left-title { display: flex; align-items: center; gap: var(--spacing-sm); }

    .new-pill {
      display: inline-flex;
      align-items: center;
      height: 20px;
      padding: 0 8px;
      border-radius: var(--radius-full);
      background: var(--color-error-bg);
      color: var(--color-error);
      font-size: var(--text-2xs);
      font-weight: var(--weight-semibold);
    }

    .btn-text-sm {
      padding: 4px 6px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-secondary);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      cursor: pointer;
      &:hover { background: var(--color-surface-hover); color: var(--color-primary); }
    }

    .notifications-list { max-height: 360px; overflow-y: auto; }

    .notif-item {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border-subtle);
      transition: background-color var(--duration-fast) ease;

      &:last-child { border-bottom: none; }
      &:hover { background: var(--color-surface-hover); }
      &.unread { background: var(--color-surface-sand); }
      &.unread .notif-title::after {
        content: '';
        display: inline-block;
        width: 6px;
        height: 6px;
        margin-left: 6px;
        border-radius: 50%;
        background: var(--color-secondary);
        vertical-align: middle;
      }
    }

    .notif-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      flex-shrink: 0;

      &.class-icon { background: var(--color-warning-bg); color: var(--color-warning); }
      &.pass-icon { background: var(--color-success-bg); color: var(--color-success); }
      &.info-icon { background: var(--color-info-bg); color: var(--color-info); }
    }

    .notif-content { min-width: 0; }
    .notif-title { margin: 0; font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-main); }
    .notif-desc { margin: 2px 0 4px; font-size: var(--text-xs); line-height: var(--leading-normal); color: var(--color-text-muted); }
    .notif-time { font-size: var(--text-2xs); color: var(--color-text-subtle); }

    .settings-body { padding: 6px; }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px;
      border-radius: var(--radius-md);
      cursor: pointer;
      &:hover { background: var(--color-surface-hover); }
    }

    .setting-row--stacked {
      flex-direction: column;
      align-items: stretch;
      cursor: default;
      &:hover { background: transparent; }
    }
    .theme-segmented {
      display: flex;
      button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
    }

    .setting-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .setting-title { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-main); }
    .setting-desc { font-size: var(--text-xs); color: var(--color-text-muted); }

    /* Switch */
    .toggle-checkbox {
      appearance: none;
      -webkit-appearance: none;
      position: relative;
      width: 34px;
      height: 20px;
      margin: 0;
      border-radius: var(--radius-full);
      background: var(--color-border-strong);
      cursor: pointer;
      flex-shrink: 0;
      transition: background-color var(--duration-fast) ease;

      &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-surface);
        box-shadow: var(--shadow-sm);
        transition: transform var(--duration-base) var(--ease-spring);
      }

      &:checked { background: var(--color-primary); }
      &:checked::after { transform: translateX(14px); }
      &:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--color-focus-ring); }
    }

    .setting-divider { height: 1px; margin: 6px 4px; background: var(--color-border); }

    .setting-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 10px;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      text-decoration: none;
      transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease;

      zen-icon { color: var(--color-text-subtle); }
      &:hover { background: var(--color-surface-hover); color: var(--color-primary); }
      &:hover zen-icon { color: var(--color-primary); }
    }

    .popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-header) - 1);
      background: transparent;
    }

    .header-divider {
      width: 1px;
      height: 24px;
      margin: 0 4px;
      background: var(--color-border);
    }

    /* ---------- User pill ---------- */
    .user-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      padding: 2px 4px;
    }

    .avatar-wrapper { position: relative; display: inline-flex; }

    .online-dot {
      position: absolute;
      right: -1px;
      bottom: -1px;
      width: 9px;
      height: 9px;
      border: 2px solid var(--color-surface);
      border-radius: 50%;
      background: var(--color-success);
    }

    .user-details { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }

    .user-name {
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--color-text-main);
    }

    .role-badge { font-size: var(--text-2xs); font-weight: var(--weight-medium); color: var(--color-text-muted); }

    .btn-logout {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      cursor: pointer;
      transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease, border-color var(--duration-fast) ease;

      &:hover { background: var(--color-error-bg); border-color: var(--color-error-border); color: var(--color-error); }
    }

    .guest-actions { display: flex; align-items: center; gap: var(--spacing-sm); }

    /* ---------- Hamburger ---------- */
    .btn-mobile-toggle {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: 38px;
      height: 38px;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      cursor: pointer;

      &:hover { background: var(--color-surface-hover); }

      .bar {
        display: block;
        width: 16px;
        height: 2px;
        border-radius: 2px;
        background: var(--color-text-main);
        transition: transform var(--duration-base) ease, opacity var(--duration-fast) ease;

        &.open-1 { transform: translateY(6px) rotate(45deg); }
        &.open-2 { opacity: 0; }
        &.open-3 { transform: translateY(-6px) rotate(-45deg); }
      }
    }

    /* ---------- Mobile drawer ---------- */
    .mobile-backdrop {
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-modal) - 1);
      background: rgba(16, 28, 24, 0.4);
      backdrop-filter: blur(2px);
      animation: fadeIn var(--duration-base) ease;
    }

    .mobile-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: var(--z-modal);
      display: flex;
      flex-direction: column;
      width: 300px;
      max-width: 86vw;
      background: var(--color-surface);
      border-left: 1px solid var(--color-border);
      box-shadow: var(--shadow-xl);
      font-family: var(--font-sans);
      animation: slideInRight var(--duration-base) var(--ease-spring);
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--header-height);
      padding: 0 var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
    }

    .drawer-brand { display: flex; align-items: center; gap: 10px; }
    .drawer-logo-img { width: 32px; height: 32px; border-radius: var(--radius-sm); object-fit: contain; }
    .drawer-brand-text { display: flex; flex-direction: column; }
    .drawer-brand-title {
      font-family: var(--font-display);
      font-size: var(--text-md);
      font-weight: var(--weight-bold);
      letter-spacing: 0.04em;
      color: var(--color-primary);
    }
    .drawer-brand-sub {
      font-size: var(--text-2xs);
      font-weight: var(--weight-semibold);
      letter-spacing: var(--tracking-eyebrow);
      color: var(--color-text-muted);
    }

    .btn-close-drawer {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
      &:hover { background: var(--color-surface-hover); color: var(--color-text-main); }
    }

    .drawer-user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: var(--spacing-md);
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-variant);
    }

    .drawer-user-meta { display: flex; flex-direction: column; min-width: 0; }
    .drawer-user-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      color: var(--color-text-main);
    }
    .drawer-user-role { font-size: var(--text-xs); color: var(--color-text-muted); }

    .drawer-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .drawer-section-title {
      padding: 8px 10px;
      font-size: var(--text-2xs);
      font-weight: var(--weight-bold);
      letter-spacing: var(--tracking-eyebrow);
      text-transform: uppercase;
      color: var(--color-text-subtle);
    }

    .drawer-nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 40px;
      padding: 0 12px;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      font-size: var(--text-base);
      font-weight: var(--weight-medium);
      text-decoration: none;
      transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease;

      zen-icon { color: var(--color-text-muted); }
      &:hover { background: var(--color-surface-hover); color: var(--color-text-main); }
      &.active {
        background: var(--color-primary-soft);
        color: var(--color-primary);
        font-weight: var(--weight-semibold);
        zen-icon { color: var(--color-primary); }
      }
    }

    .drawer-footer {
      padding: var(--spacing-md);
      border-top: 1px solid var(--color-border);
    }

    .drawer-auth-actions { display: flex; flex-direction: column; gap: var(--spacing-sm); }

    /* ---------- Breakpoints ---------- */
    /* Màn vừa: thu gọn khối người dùng để menu không tràn (Ban Giám Đốc có nhiều mục) */
    @media (max-width: 1535px) {
      .app-header { gap: var(--spacing-md); padding: 0 var(--spacing-md); }
      .user-details, .header-divider { display: none; }
      .btn-logout { width: 36px; padding: 0; justify-content: center; }
      .btn-logout .logout-text { display: none; }
      .nav-tab { padding: 0 10px; }
      .brand-sub { display: none; }
    }

    @media (max-width: 1279px) {
      .desktop-nav { display: none; }
      .btn-mobile-toggle { display: inline-flex; }
      .user-details, .header-divider { display: flex; }
      .brand-sub { display: block; }
    }

    @media (max-width: 640px) {
      .app-header { padding: 0 var(--spacing-md); }
      .brand-sub, .user-details, .header-divider, .btn-logout { display: none; }
      .guest-actions .btn-register-sm { display: none; }
    }

    .main-content {
      min-height: calc(100vh - var(--header-height));
      background: var(--color-background);

      &.no-header { min-height: 100vh; }
    }

    @keyframes popoverFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly currentUrl = signal<string>(this.router.url);

  protected readonly isStandalonePage = computed(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];
    return url === '/' || url === '' || url.startsWith('/auth/');
  });

  protected readonly isMobileMenuOpen = signal(false);
  protected readonly isNotificationsOpen = signal(false);
  protected readonly isSettingsOpen = signal(false);
  protected readonly unreadNotificationsCount = signal(2);
  protected readonly reminderEnabled = signal(true);
  protected readonly theme = inject(ZenThemeService);
  protected readonly themeOptions: { value: ZenThemeMode; label: string; icon: ZenIconName }[] = [
    { value: 'light', label: 'Sáng', icon: 'sun' },
    { value: 'dark', label: 'Tối', icon: 'moon' },
    { value: 'system', label: 'Hệ thống', icon: 'monitor' }
  ];

  constructor() {
    // Chế độ tối chỉ áp dụng cho khu vực quản lý; trang chủ & đăng nhập luôn sáng.
    effect(() => this.theme.apply(!this.isStandalonePage()));

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
        this.isMobileMenuOpen.set(false);
        this.closeAllPopovers();
      }
    });
  }

  getRoleLabel(roleCode: string | null): string {
    switch (roleCode) {
      case 'SUPER_ADMIN':
        return 'Quản Trị Viên';
      case 'BRANCH_MANAGER':
        return 'Quản Lý Cơ Sở';
      case 'RECEPTIONIST':
        return 'Lễ Tân Đón Tiếp';
      case 'INSTRUCTOR':
        return 'Huấn Luyện Viên';
      case 'STUDENT':
        return 'Học Viên';
      default:
        return 'Thành Viên';
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
    this.closeAllPopovers();
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleNotifications(): void {
    this.isNotificationsOpen.update(v => !v);
    this.isSettingsOpen.set(false);
  }

  toggleSettings(): void {
    this.isSettingsOpen.update(v => !v);
    this.isNotificationsOpen.set(false);
  }

  markAllNotificationsAsRead(): void {
    this.unreadNotificationsCount.set(0);
  }

  closeAllPopovers(): void {
    this.isNotificationsOpen.set(false);
    this.isSettingsOpen.set(false);
  }

  onLogout(): void {
    this.closeAllPopovers();
    this.closeMobileMenu();
    this.auth.logout();
    void this.router.navigate(['/auth/login']);
  }
}
