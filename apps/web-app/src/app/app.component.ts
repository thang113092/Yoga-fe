import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@yoga/platform/auth';
import { ZenConfirmModalComponent } from '@yoga/platform/ui';

@Component({
  selector: 'yoga-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, ZenConfirmModalComponent],
  template: `
    @if (!isStandalonePage()) {
      <header class="app-header">
        <div class="brand">
          <a routerLink="/" class="brand-link" title="Về trang chủ An Yên Yoga">
            <img src="/branding/an-yen-logo-v1.png" alt="An Yên Yoga & Wellness" class="brand-logo-img" width="38" height="38" />
            <div class="brand-text">
              <span class="brand-title">AN YÊN</span>
              <span class="brand-sub">YOGA & WELLNESS</span>
            </div>
          </a>
        </div>

        <!-- DESKTOP NAVIGATION MENU (CENTERED) -->
        <nav class="desktop-nav" aria-label="Menu điều hướng chính">
            @if (auth.canManageUsers() || auth.isReceptionist()) {
              <a routerLink="/users" routerLinkActive="active" class="nav-tab">
                <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>{{ auth.isReceptionist() ? 'Học Viên' : 'Người Dùng' }}</span>
              </a>
            }
            @if (auth.canManageClasses()) {
              <a routerLink="/schedule/subjects" routerLinkActive="active" class="nav-tab">Bộ môn</a>
              <a routerLink="/schedule/courses" routerLinkActive="active" class="nav-tab">Khóa học</a>
              <a routerLink="/schedule/timetable" routerLinkActive="active" class="nav-tab">Lịch học</a>
            }
            @if (auth.isSuperAdmin() || auth.isBranchManager()) {
              <a routerLink="/membership/orders" routerLinkActive="active" class="nav-tab">
                <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <span>Đơn Hàng</span>
              </a>
              <a routerLink="/membership/revenue" routerLinkActive="active" class="nav-tab">
                <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <span>Doanh Thu</span>
              </a>
            }
            @if (auth.canAccessPos() && !auth.isSuperAdmin() && !auth.isBranchManager()) {
              <a routerLink="/membership/pos" routerLinkActive="active" class="nav-tab">
                <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                  <line x1="6" y1="15" x2="10" y2="15"/>
                </svg>
                <span>Bán Thẻ POS</span>
              </a>
            }
            @if (auth.isInstructor()) {
              <a routerLink="/schedule/check-in" routerLinkActive="active" class="nav-tab">
                <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <span>Điểm Danh</span>
              </a>
            }

            @if (auth.canManageUsers() || auth.canManageClasses() || auth.isSuperAdmin() || auth.isBranchManager() || (auth.canAccessPos() && !auth.isSuperAdmin() && !auth.isBranchManager())) {
              <span class="nav-divider" aria-hidden="true"></span>
            }

            @if (auth.canAccessStudentPortal()) {
              <a routerLink="/membership/my-passes" routerLinkActive="active" class="nav-tab">
                <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                <span>Thẻ Của Tôi</span>
              </a>
              <a routerLink="/membership/history" routerLinkActive="active" class="nav-tab">
                <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Lịch Sử Tập</span>
              </a>
            }
            @if (!auth.canManageClasses()) {<a routerLink="/schedule/courses" routerLinkActive="active" class="nav-tab">Khóa học</a>}
            <a routerLink="/membership/plans" routerLinkActive="active" class="nav-tab">
              <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>Gói Thẻ Tập</span>
            </a>
            @if (!auth.isSuperAdmin() && !auth.isBranchManager() && !auth.isReceptionist() && !auth.isInstructor()) {
              <a routerLink="/schedule/calendar" routerLinkActive="active" class="nav-tab">
                <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Lịch & Đặt Chỗ</span>
              </a>
            }
            <a routerLink="/branches" routerLinkActive="active" class="nav-tab">
              <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>Chi Nhánh</span>
            </a>
          </nav>

        <div class="user-profile-bar">
          @if (auth.isAuthenticated()) {
            <!-- Nút Tiện ích: Thông báo & Cài đặt -->
            <div class="utility-actions">
              <!-- Nút Thông báo -->
              <div class="popover-wrapper">
                <button
                  type="button"
                  class="btn-icon-utility"
                  [class.active]="isNotificationsOpen()"
                  (click)="toggleNotifications()"
                  title="Thông báo"
                  aria-label="Xem thông báo"
                >
                  <svg class="utility-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  @if (unreadNotificationsCount() > 0) {
                    <span class="notification-badge">{{ unreadNotificationsCount() }}</span>
                  }
                </button>

                <!-- Dropdown Thông Báo -->
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
                        <div class="notif-icon class-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                        </div>
                        <div class="notif-content">
                          <p class="notif-title">Nhắc nhở ca học hôm nay</p>
                          <p class="notif-desc">Lớp Hatha Yoga Cơ Bản sẽ bắt đầu lúc 18:30 tại CS Quận 1.</p>
                          <span class="notif-time">25 phút trước</span>
                        </div>
                      </div>

                      <div class="notif-item unread">
                        <div class="notif-icon pass-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        </div>
                        <div class="notif-content">
                          <p class="notif-title">Thẻ tập đã sẵn sàng</p>
                          <p class="notif-desc">Hệ thống đã đồng bộ quyền truy cập đa cơ sở cho bạn.</p>
                          <span class="notif-time">2 giờ trước</span>
                        </div>
                      </div>

                      <div class="notif-item">
                        <div class="notif-icon info-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                        </div>
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

              <!-- Nút Cài đặt -->
              <div class="popover-wrapper">
                <button
                  type="button"
                  class="btn-icon-utility"
                  [class.active]="isSettingsOpen()"
                  (click)="toggleSettings()"
                  title="Cài đặt & Tùy chọn"
                  aria-label="Cài đặt tài khoản"
                >
                  <svg class="utility-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>

                <!-- Dropdown Cài Đặt -->
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

                      <label class="setting-row">
                        <div class="setting-info">
                          <span class="setting-title">Giao diện Zen (Êm dịu)</span>
                          <span class="setting-desc">Tối ưu sắc độ thư giãn thị giác</span>
                        </div>
                        <input
                          type="checkbox"
                          class="toggle-checkbox"
                          [checked]="zenMode()"
                          (change)="zenMode.set(!zenMode())"
                        />
                      </label>

                      <div class="setting-divider"></div>

                      @if (auth.canManageClasses()) {
                        <a routerLink="/schedule/manage" (click)="closeAllPopovers()" class="setting-link">
                          <span>{{ (auth.isReceptionist() || auth.isInstructor()) ? 'Danh sách lớp học' : 'Quản lý lớp học' }}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </a>
                      }

                      @if (auth.isReceptionist()) {
                        <a routerLink="/users" (click)="closeAllPopovers()" class="setting-link">
                          <span>Danh sách học viên</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </a>
                      }

                      @if (auth.isSuperAdmin() || auth.isBranchManager()) {
                        <a routerLink="/membership/revenue" (click)="closeAllPopovers()" class="setting-link">
                          <span>Báo cáo doanh thu</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </a>
                      }

                      <a routerLink="/membership/plans" (click)="closeAllPopovers()" class="setting-link">
                        <span>Danh mục gói thẻ tập</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </a>

                      @if (!auth.isSuperAdmin() && !auth.isBranchManager() && !auth.isReceptionist() && !auth.isInstructor()) {
                        <a routerLink="/schedule/calendar" (click)="closeAllPopovers()" class="setting-link">
                          <span>Lịch tập & Đặt chỗ</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </a>
                      }

                      <a routerLink="/branches" (click)="closeAllPopovers()" class="setting-link">
                        <span>Hệ thống cơ sở</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </a>
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
                <span class="avatar-letter">{{ auth.userFullName() ? auth.userFullName().charAt(0).toUpperCase() : 'U' }}</span>
                <span class="online-dot" title="Đang trực tuyến"></span>
              </div>
              <div class="user-details">
                <span class="user-name">{{ auth.userFullName() }}</span>
                <span class="role-badge">{{ getRoleLabel(auth.userRole()) }}</span>
              </div>
            </div>

            <button type="button" class="btn-logout" (click)="onLogout()" title="Đăng xuất tài khoản">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span class="logout-text">Đăng xuất</span>
            </button>
          } @else {
            <div class="guest-actions">
              <a routerLink="/auth/login" class="btn-login-sm">Đăng Nhập</a>
              <a routerLink="/auth/register" class="btn-register-sm">Đăng Ký Học Viên</a>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          @if (auth.isAuthenticated()) {
            <div class="drawer-user-card">
              <div class="drawer-avatar">
                {{ auth.userFullName() ? auth.userFullName().charAt(0).toUpperCase() : 'U' }}
              </div>
              <div class="drawer-user-meta">
                <span class="drawer-user-name">{{ auth.userFullName() }}</span>
                <span class="drawer-user-role">{{ getRoleLabel(auth.userRole()) }}</span>
              </div>
            </div>
          }

          <nav class="drawer-nav">
            <div class="drawer-section-title">ĐIỀU HƯỚNG CHÍNH</div>

            @if (auth.canManageUsers() || auth.isReceptionist()) {
              <a routerLink="/users" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>{{ auth.isReceptionist() ? 'Danh Sách Học Viên' : 'Phân Quyền & Người Dùng' }}</span>
              </a>
            }

            @if (auth.canManageClasses()) {
              <a routerLink="/schedule/subjects" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">Bộ môn</a>
              <a routerLink="/schedule/courses" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">Khóa học</a>
              <a routerLink="/schedule/timetable" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">Lịch học</a>
            }

            @if (auth.isSuperAdmin() || auth.isBranchManager()) {
              <a routerLink="/membership/orders" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <span>Danh Sách Đơn Hàng</span>
              </a>
              <a routerLink="/membership/revenue" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <span>Báo Cáo Doanh Thu</span>
              </a>
            }

            @if (auth.canAccessPos() && !auth.isSuperAdmin() && !auth.isBranchManager()) {
              <a routerLink="/membership/pos" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                  <line x1="6" y1="15" x2="10" y2="15"/>
                </svg>
                <span>Quầy Bán Thẻ (POS)</span>
              </a>
            }

            @if (auth.isInstructor()) {
              <a routerLink="/schedule/check-in" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <span>Điểm Danh</span>
              </a>
            }

            @if (auth.canAccessStudentPortal()) {
              <a routerLink="/membership/my-passes" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                <span>Thẻ Của Tôi</span>
              </a>
              <a routerLink="/membership/history" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Lịch Sử Tập</span>
              </a>
            }

            @if (!auth.canManageClasses()) {<a routerLink="/schedule/courses" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">Khóa học</a>}
            <a routerLink="/membership/plans" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>Gói Thẻ Tập</span>
            </a>

            @if (!auth.isSuperAdmin() && !auth.isBranchManager() && !auth.isReceptionist() && !auth.isInstructor()) {
              <a routerLink="/schedule/calendar" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Lịch & Đặt Chỗ</span>
              </a>
            }

            <a routerLink="/branches" (click)="closeMobileMenu()" routerLinkActive="active" class="drawer-nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>Hệ Thống Cơ Sở</span>
            </a>
          </nav>

          <div class="drawer-footer">
            @if (auth.isAuthenticated()) {
              <button type="button" class="drawer-btn-logout" (click)="onLogout()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Đăng Xuất</span>
              </button>
            } @else {
              <div class="drawer-auth-actions">
                <a routerLink="/auth/login" (click)="closeMobileMenu()" class="drawer-btn-login">Đăng Nhập</a>
                <a routerLink="/auth/register" (click)="closeMobileMenu()" class="drawer-btn-register">Đăng Ký Học Viên</a>
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
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 2rem;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(20, 70, 52, 0.08);
      box-shadow: 0 2px 14px -3px rgba(20, 70, 52, 0.05);
      position: sticky;
      top: 0;
      z-index: 100;
      min-height: 64px;
      gap: 1.5rem;

      .brand {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        flex: 1;
        min-width: 0;

        .brand-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;

          &:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }
        }

        .brand-logo-img {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          object-fit: contain;
          box-shadow: 0 2px 6px rgba(20, 70, 52, 0.08);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
          font-size: 1.125rem;
          font-weight: 700;
          color: #144634;
          letter-spacing: 0.05em;
          line-height: 1.1;
        }

        .brand-sub {
          font-family: var(--font-sans);
          font-size: 0.53rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #536961;
          text-transform: uppercase;
          margin-top: 2px;
        }
      }

      /* Desktop Navigation - Center Aligned & Minimalist Zen (No Active Background) */
      .desktop-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex-shrink: 0;
        background: transparent;
        border: none;
        padding: 0;
        box-shadow: none;

        .nav-tab {
          font-size: 0.84rem;
          font-weight: 500;
          color: #4e675d;
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 8px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          position: relative;
          background: transparent;

          .nav-icon {
            width: 15px;
            height: 15px;
            color: #728c80;
            transition: all 0.2s ease;
            flex-shrink: 0;
          }

          &:hover:not(.active) {
            color: #144634;
            background: rgba(20, 70, 52, 0.035);
            transform: translateY(-1px);

            .nav-icon {
              color: #0f766e;
            }
          }

          &.active {
            color: #144634;
            font-weight: 600;
            background: transparent !important;
            box-shadow: none !important;

            .nav-icon {
              color: #0f766e;
            }

            &::after {
              content: '';
              position: absolute;
              bottom: 0px;
              left: 10px;
              right: 10px;
              height: 2.5px;
              background: #0f766e;
              border-radius: 9999px;
              box-shadow: 0 1.5px 4px rgba(15, 118, 110, 0.35);
            }
          }
        }

        .nav-divider {
          width: 1px;
          height: 18px;
          background: rgba(20, 70, 52, 0.12);
          margin: 0 4px;
          flex-shrink: 0;
        }
      }

      .user-profile-bar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex: 1;
        min-width: 0;
        gap: 0.75rem;
        position: relative;
        flex-shrink: 0;

        .utility-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;

          .popover-wrapper {
            position: relative;

            .btn-icon-utility {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border: 1px solid rgba(20, 70, 52, 0.12);
              background: #ffffff;
              color: #4b6358;
              display: grid;
              place-items: center;
              cursor: pointer;
              position: relative;
              transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

              &:hover, &.active {
                background: #f0fdfa;
                color: #0f766e;
                border-color: rgba(15, 118, 110, 0.3);
                box-shadow: 0 2px 8px rgba(15, 118, 110, 0.12);
              }

              .notification-badge {
                position: absolute;
                top: -2px;
                right: -2px;
                min-width: 16px;
                height: 16px;
                background: #e11d48;
                color: #ffffff;
                font-size: 0.6rem;
                font-weight: 700;
                border-radius: 9999px;
                display: grid;
                place-items: center;
                border: 2px solid #ffffff;
                padding: 0 3px;
              }
            }

            .popover-panel {
              position: absolute;
              top: calc(100% + 12px);
              right: -30px;
              width: 320px;
              background: #ffffff;
              border: 1px solid rgba(20, 70, 52, 0.1);
              border-radius: 16px;
              box-shadow: 0 16px 36px -6px rgba(20, 70, 52, 0.14), 0 4px 12px rgba(0, 0, 0, 0.04);
              z-index: 1000;
              animation: popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
              overflow: hidden;

              &.settings-panel {
                right: -10px;
                width: 290px;
              }

              .popover-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: #fafcfb;
                border-bottom: 1px solid rgba(20, 70, 52, 0.07);

                h4 {
                  margin: 0;
                  font-size: 0.875rem;
                  font-weight: 700;
                  color: #144634;
                }

                .header-left-title {
                  display: flex;
                  align-items: center;
                  gap: 8px;

                  .new-pill {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #0f766e;
                    background: rgba(15, 118, 110, 0.1);
                    padding: 1px 7px;
                    border-radius: 9999px;
                  }
                }

                .btn-text-sm {
                  background: none;
                  border: none;
                  font-size: 0.72rem;
                  font-weight: 600;
                  color: #0f766e;
                  cursor: pointer;
                  padding: 2px 4px;

                  &:hover {
                    text-decoration: underline;
                  }
                }
              }

              .notifications-list {
                max-height: 300px;
                overflow-y: auto;

                .notif-item {
                  display: flex;
                  gap: 12px;
                  padding: 12px 16px;
                  border-bottom: 1px solid rgba(20, 70, 52, 0.05);
                  transition: background 0.18s ease;

                  &:last-child {
                    border-bottom: none;
                  }

                  &:hover {
                    background: #fbfdfc;
                  }

                  &.unread {
                    background: #f0fdf9;

                    .notif-title {
                      font-weight: 700;
                      color: #144634;
                    }
                  }

                  .notif-icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: grid;
                    place-items: center;
                    flex-shrink: 0;

                    &.class-icon {
                      background: #e0f2fe;
                      color: #0284c7;
                    }

                    &.pass-icon {
                      background: #dcfce7;
                      color: #16a34a;
                    }

                    &.info-icon {
                      background: #fef3c7;
                      color: #d97706;
                    }
                  }

                  .notif-content {
                    flex: 1;

                    .notif-title {
                      font-size: 0.8rem;
                      font-weight: 600;
                      color: #1e293b;
                      margin: 0 0 2px;
                    }

                    .notif-desc {
                      font-size: 0.75rem;
                      color: #64748b;
                      margin: 0 0 4px;
                      line-height: 1.35;
                    }

                    .notif-time {
                      font-size: 0.68rem;
                      color: #94a3b8;
                    }
                  }
                }
              }

              .settings-body {
                padding: 14px 16px;

                .setting-row {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 12px;
                  padding: 8px 0;
                  cursor: pointer;

                  .setting-info {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;

                    .setting-title {
                      font-size: 0.8125rem;
                      font-weight: 600;
                      color: #144634;
                    }

                    .setting-desc {
                      font-size: 0.72rem;
                      color: #64748b;
                    }
                  }

                  .toggle-checkbox {
                    width: 17px;
                    height: 17px;
                    accent-color: #0f766e;
                    cursor: pointer;
                  }
                }

                .setting-divider {
                  height: 1px;
                  background: rgba(20, 70, 52, 0.08);
                  margin: 10px 0;
                }

                .setting-link {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 8px 0;
                  color: #334155;
                  font-size: 0.8125rem;
                  font-weight: 500;
                  text-decoration: none;
                  transition: color 0.18s ease;

                  &:hover {
                    color: #0f766e;
                  }

                  svg {
                    color: #94a3b8;
                  }
                }
              }
            }
          }
        }

        .popover-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: transparent;
        }

        .header-divider {
          width: 1px;
          height: 22px;
          background: rgba(20, 70, 52, 0.12);
        }

        .user-pill {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 3px 12px 3px 4px;
          border-radius: 9999px;
          background: rgba(20, 70, 52, 0.03);
          border: 1px solid rgba(20, 70, 52, 0.08);
          box-shadow: 0 1px 2px rgba(20, 70, 52, 0.02);
          transition: background-color 0.2s ease, border-color 0.2s ease;

          &:hover {
            background: rgba(20, 70, 52, 0.05);
            border-color: rgba(20, 70, 52, 0.12);
          }

          .avatar-wrapper {
            position: relative;
            display: inline-flex;

            .avatar-letter {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: linear-gradient(135deg, #144634 0%, #0d9488 100%);
              color: #ffffff;
              display: grid;
              place-items: center;
              font-size: 0.84rem;
              font-weight: 700;
              flex-shrink: 0;
              box-shadow: 0 2px 6px rgba(13, 148, 136, 0.2);
            }

            .online-dot {
              position: absolute;
              bottom: 0;
              right: 0;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #22c55e;
              border: 1.5px solid #ffffff;
            }
          }

          .user-details {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 1px;

            .user-name {
              font-size: 0.84rem;
              font-weight: 600;
              color: #144634;
              max-width: 140px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.2;
              letter-spacing: -0.01em;
            }

            .role-badge {
              font-size: 0.625rem;
              font-weight: 500;
              color: #0f766e;
              line-height: 1.15;
              letter-spacing: 0.02em;
              white-space: nowrap;
            }
          }
        }

        .btn-logout {
          background: transparent;
          border: 1px solid rgba(20, 70, 52, 0.14);
          color: #536961;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: inline-flex;
          align-items: center;
          gap: 6px;

          &:hover {
            background: #fef2f2;
            color: #dc2626;
            border-color: #fecaca;
            transform: translateY(-1px);
          }
        }

        .guest-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .btn-login-sm {
            padding: 7px 14px;
            font-size: 0.8125rem;
            font-weight: 600;
            color: #475569;
            text-decoration: none;
            border-radius: 9999px;
            border: 1px solid #cbd5e1;
            transition: all 0.2s ease;

            &:hover {
              background: var(--color-background);
              color: #0f172a;
            }
          }

          .btn-register-sm {
            padding: 7px 14px;
            font-size: 0.8125rem;
            font-weight: 600;
            color: #ffffff;
            background: #144634;
            text-decoration: none;
            border-radius: 9999px;
            transition: all 0.2s ease;

            &:hover {
              background: #0d2f23;
              box-shadow: 0 2px 8px rgba(20, 70, 52, 0.25);
            }
          }
        }

        /* Nút Hamburger Mobile */
        .btn-mobile-toggle {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 36px;
          height: 36px;
          background: rgba(20, 70, 52, 0.05);
          border: 1px solid rgba(20, 70, 52, 0.1);
          border-radius: 8px;
          cursor: pointer;
          gap: 4px;
          padding: 0;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(20, 70, 52, 0.09);
          }

          .bar {
            width: 18px;
            height: 2px;
            background: #144634;
            border-radius: 2px;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);

            &.open-1 {
              transform: translateY(6px) rotate(45deg);
            }
            &.open-2 {
              opacity: 0;
              transform: scale(0);
            }
            &.open-3 {
              transform: translateY(-6px) rotate(-45deg);
            }
          }
        }
      }
    }

    /* Mobile Drawer */
    .mobile-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(19, 42, 36, 0.45);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    .mobile-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(340px, 86vw);
      background: #ffffff;
      z-index: 1001;
      box-shadow: -8px 0 32px rgba(20, 70, 52, 0.16);
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);

      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid rgba(20, 70, 52, 0.08);

        .drawer-brand {
          display: flex;
          align-items: center;
          gap: 10px;

          .drawer-logo-img {
            width: 32px;
            height: 32px;
            border-radius: 6px;
          }

          .drawer-brand-text {
            display: flex;
            flex-direction: column;

            .drawer-brand-title {
              font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
              font-size: 1rem;
              font-weight: 700;
              color: #144634;
              letter-spacing: 0.05em;
            }

            .drawer-brand-sub {
              font-size: 0.5rem;
              font-weight: 700;
              letter-spacing: 0.1em;
              color: #536961;
            }
          }
        }

        .btn-close-drawer {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(20, 70, 52, 0.1);
          background: #fafcfb;
          color: #4b6358;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: #f1f4f3;
            color: #144634;
          }
        }
      }

      .drawer-user-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 1rem 1.5rem;
        background: rgba(20, 70, 52, 0.03);
        border-bottom: 1px solid rgba(20, 70, 52, 0.06);

        .drawer-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #144634 0%, #0d9488 100%);
          color: #ffffff;
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 0.95rem;
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
        }

        .drawer-user-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .drawer-user-name {
            font-size: 0.875rem;
            font-weight: 600;
            color: #144634;
          }

          .drawer-user-role {
            font-size: 0.7rem;
            color: #0f766e;
            font-weight: 500;
          }
        }
      }

      .drawer-nav {
        flex: 1;
        overflow-y: auto;
        padding: 1rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .drawer-section-title {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #8da499;
          padding: 8px 12px 4px;
        }

        .drawer-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          text-decoration: none;
          color: #4b6358;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.18s ease;

          svg {
            color: #688377;
            transition: color 0.18s ease;
          }

          &:hover {
            background: rgba(20, 70, 52, 0.04);
            color: #144634;

            svg {
              color: #0f766e;
            }
          }

          &.active {
            background: rgba(15, 118, 110, 0.09);
            color: #0f766e;
            font-weight: 600;

            svg {
              color: #0f766e;
            }
          }
        }
      }

      .drawer-footer {
        padding: 1.25rem 1.5rem;
        border-top: 1px solid rgba(20, 70, 52, 0.08);
        background: #fafcfb;

        .drawer-btn-logout {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #dc2626;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;

          &:hover {
            background: #fee2e2;
          }
        }

        .drawer-auth-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;

          .drawer-btn-login {
            display: block;
            text-align: center;
            padding: 10px;
            border-radius: 10px;
            border: 1px solid #cbd5e1;
            color: #334155;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
          }

          .drawer-btn-register {
            display: block;
            text-align: center;
            padding: 10px;
            border-radius: 10px;
            background: #144634;
            color: #ffffff;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
          }
        }
      }
    }

    /* Breakpoints */
    @media (max-width: 1120px) {
      .app-header {
        padding: 0.65rem 1.25rem;

        .desktop-nav {
          display: none;
        }

        .user-profile-bar {
          .btn-logout .logout-text {
            display: none;
          }

          .btn-mobile-toggle {
            display: flex;
          }
        }
      }
    }

    @media (max-width: 640px) {
      .app-header {
        padding: 0.5rem 1rem;

        .brand-sub {
          display: none;
        }

        .user-profile-bar {
          .user-details {
            display: none;
          }

          .header-divider {
            display: none;
          }

          .btn-logout {
            display: none;
          }
        }
      }
    }

    .main-content {
      min-height: calc(100vh - 65px);
      background: var(--color-background);

      &.no-header {
        min-height: 100vh;
      }
    }

    @keyframes popoverFadeIn {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
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
  protected readonly zenMode = signal(false);

  constructor() {
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
