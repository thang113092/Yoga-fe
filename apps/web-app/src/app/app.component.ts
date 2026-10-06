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
              <span class="brand-sub">WELLNESS PLATFORM</span>
            </div>
          </a>
        </div>

        <nav class="nav">
          @if (auth.canManageUsers() || auth.isReceptionist()) {
            <a routerLink="/users" routerLinkActive="active" class="nav-tab highlight-tab">
              {{ auth.isReceptionist() ? 'Danh Sách Học Viên' : 'Phân Quyền & Người Dùng' }}
            </a>
          }
          @if (auth.canManageClasses()) {
            <a routerLink="/schedule/manage" routerLinkActive="active" class="nav-tab highlight-tab">
              {{ auth.isReceptionist() ? 'Danh Sách Lớp Học' : 'Quản Lý Lớp Học' }}
            </a>
          }
          @if (auth.isSuperAdmin() || auth.isBranchManager()) {
            <a routerLink="/membership/revenue" routerLinkActive="active" class="nav-tab highlight-tab">
              Báo Cáo Doanh Thu
            </a>
          }
          @if (auth.canAccessPos() && !auth.isSuperAdmin() && !auth.isBranchManager()) {
            <a routerLink="/membership/pos" routerLinkActive="active" class="nav-tab">
              Quầy Bán Thẻ (POS)
            </a>
          }
          @if (auth.canAccessCheckIn() && !auth.isSuperAdmin() && !auth.isBranchManager()) {
            <a routerLink="/schedule/check-in" routerLinkActive="active" class="nav-tab">
              Điểm Danh QR
            </a>
          }
          @if (auth.canAccessStudentPortal()) {
            <a routerLink="/membership/my-passes" routerLinkActive="active" class="nav-tab">
              Thẻ Của Tôi
            </a>
          }
          <a routerLink="/membership/plans" routerLinkActive="active" class="nav-tab">
            Gói Thẻ Tập
          </a>
          @if (!auth.isSuperAdmin() && !auth.isBranchManager() && !auth.isReceptionist()) {
            <a routerLink="/schedule/calendar" routerLinkActive="active" class="nav-tab">
              Lịch & Đặt Chỗ
            </a>
          }
          <a routerLink="/branches" routerLinkActive="active" class="nav-tab">
            Chi Nhánh
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
                  <svg class="utility-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                      <div class="header-left">
                        <h4>Thông báo</h4>
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
                          <p class="notif-desc">Hệ thống đã đồng bộ quyền truy cập đa chi nhánh cho bạn.</p>
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
                  <svg class="utility-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>

                <!-- Dropdown Cài Đặt -->
                @if (isSettingsOpen()) {
                  <div class="popover-panel settings-panel" (click)="$event.stopPropagation()">
                    <div class="popover-header">
                      <h4>Cài đặt & Tùy chọn</h4>
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
                          <span>{{ auth.isReceptionist() ? 'Danh sách lớp & ca học' : 'Quản lý lớp & ca học' }}</span>
                          <span class="arrow">›</span>
                        </a>
                      }

                      @if (auth.isReceptionist()) {
                        <a routerLink="/users" (click)="closeAllPopovers()" class="setting-link">
                          <span>Danh sách học viên</span>
                          <span class="arrow">›</span>
                        </a>
                      }

                      @if (auth.isSuperAdmin() || auth.isBranchManager()) {
                        <a routerLink="/membership/revenue" (click)="closeAllPopovers()" class="setting-link">
                          <span>Báo cáo & Tổng hợp doanh thu</span>
                          <span class="arrow">›</span>
                        </a>
                      }

                      <a routerLink="/membership/plans" (click)="closeAllPopovers()" class="setting-link">
                        <span>Danh mục gói thẻ tập</span>
                        <span class="arrow">›</span>
                      </a>

                      @if (!auth.isSuperAdmin() && !auth.isBranchManager() && !auth.isReceptionist()) {
                        <a routerLink="/schedule/calendar" (click)="closeAllPopovers()" class="setting-link">
                          <span>Lịch tập & Đặt chỗ</span>
                          <span class="arrow">›</span>
                        </a>
                      }

                      <a routerLink="/branches" (click)="closeAllPopovers()" class="setting-link">
                        <span>Hệ thống chi nhánh An Yên</span>
                        <span class="arrow">›</span>
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

            <div class="user-pill">
              <div class="avatar-wrapper">
                <span class="avatar-letter">{{ auth.userFullName() ? auth.userFullName().charAt(0).toUpperCase() : 'U' }}</span>
                <span class="online-dot" title="Đang trực tuyến"></span>
              </div>
              <div class="user-details">
                <span class="user-name">{{ auth.userFullName() }}</span>
                <span class="role-supplementary">
                  {{ getRoleLabel(auth.userRole()) }}
                </span>
              </div>
            </div>

            <button type="button" class="btn-logout" (click)="onLogout()" title="Đăng xuất tài khoản">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Đăng xuất</span>
            </button>
          } @else {
            <div class="guest-actions">
              <a routerLink="/auth/login" class="btn-login-sm">Đăng Nhập</a>
              <a routerLink="/auth/register" class="btn-register-sm">Đăng Ký Học Viên</a>
            </div>
          }
        </div>
      </header>
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
      padding: 0.65rem 1.75rem;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(20, 70, 52, 0.1);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
      flex-wrap: wrap;
      gap: 1rem;
      position: sticky;
      top: 0;
      z-index: 100;

      .brand {
        display: flex;
        align-items: center;

        .brand-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          transition: opacity 0.2s ease;

          &:hover {
            opacity: 0.85;
          }
        }

        .brand-logo-img {
          width: 38px;
          height: 38px;
          border-radius: 6px;
          object-fit: contain;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-family: var(--font-sans);
          font-size: 17px;
          font-weight: 700;
          color: #144634;
          letter-spacing: 0.5px;
          line-height: 1.1;
        }

        .brand-sub {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: #536961;
          text-transform: uppercase;
          margin-top: 1px;
        }
      }

      .nav {
        display: flex;
        align-items: center;
        gap: 3px;
        background: #f1f4f3;
        border: 1px solid rgba(20, 70, 52, 0.08);
        padding: 3px 5px;
        border-radius: 9999px;

        .nav-tab {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #536961;
          text-decoration: none;
          padding: 6px 14px;
          border-radius: 9999px;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;

          &:hover:not(.active) {
            color: #144634;
            background: rgba(255, 255, 255, 0.7);
          }

          &.active {
            background: #ffffff;
            color: #0f766e;
            font-weight: 600;
            box-shadow: 0 1px 4px rgba(20, 70, 52, 0.08), 0 0 0 1px rgba(15, 118, 110, 0.12);
          }

          &.highlight-tab {
            color: #0f766e;
            font-weight: 600;

            &.active {
              background: #ffffff;
              color: #0f766e;
              box-shadow: 0 1px 4px rgba(20, 70, 52, 0.08), 0 0 0 1px rgba(15, 118, 110, 0.12);
            }
          }
        }
      }

      .user-profile-bar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        position: relative;

        .utility-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;

          .popover-wrapper {
            position: relative;

            .btn-icon-utility {
              width: 34px;
              height: 34px;
              border-radius: 50%;
              border: 1px solid rgba(20, 70, 52, 0.12);
              background: #ffffff;
              color: #536961;
              display: grid;
              place-items: center;
              cursor: pointer;
              position: relative;
              transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

              &:hover, &.active {
                background: #f0fdfa;
                color: #0f766e;
                border-color: rgba(15, 118, 110, 0.3);
                box-shadow: 0 2px 8px rgba(15, 118, 110, 0.12);
              }

              .notification-badge {
                position: absolute;
                top: -3px;
                right: -3px;
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
              top: calc(100% + 10px);
              right: -40px;
              width: 320px;
              background: #ffffff;
              border: 1px solid rgba(20, 70, 52, 0.1);
              border-radius: 16px;
              box-shadow: 0 12px 32px -4px rgba(20, 70, 52, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04);
              z-index: 1000;
              animation: popoverFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
              overflow: hidden;

              &.settings-panel {
                right: -20px;
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

                .header-left {
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

                  .arrow {
                    font-size: 1.1rem;
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
          padding: 2px 4px;

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
            gap: 1px;

            .user-name {
              font-size: 0.85rem;
              font-weight: 600;
              color: #144634;
              max-width: 140px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.2;
            }

            .role-supplementary {
              font-size: 0.65rem;
              font-weight: 400;
              color: #688377;
              line-height: 1;
              background: transparent;
              border: none;
              padding: 0;
              margin: 0;
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
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 5px;

          &:hover {
            background: #fef2f2;
            color: #dc2626;
            border-color: #fecaca;
          }
        }

        .guest-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .btn-login-sm {
            padding: 9px 14px;
            font-size: 0.8125rem;
            font-weight: 600;
            color: #475569;
            text-decoration: none;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            transition: all 0.2s ease;

            &:hover {
              background: var(--color-background);
              color: #0f172a;
            }
          }

          .btn-register-sm {
            padding: 9px 14px;
            font-size: 0.8125rem;
            font-weight: 600;
            color: #ffffff;
            background: var(--color-primary);
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.2s ease;

            &:hover {
              background: var(--color-primary-hover);
            }
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

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });
  }

  getRoleLabel(roleCode: string | null): string {
    switch (roleCode) {
      case 'SUPER_ADMIN':
        return 'Tối Cao (Super Admin)';
      case 'BRANCH_MANAGER':
        return 'Quản Lý Chi Nhánh';
      case 'RECEPTIONIST':
        return 'Lễ Tân';
      case 'INSTRUCTOR':
        return 'Huấn Luyện Viên';
      case 'STUDENT':
        return 'Học Viên';
      default:
        return 'Thành Viên';
    }
  }

  protected readonly isNotificationsOpen = signal(false);
  protected readonly isSettingsOpen = signal(false);
  protected readonly unreadNotificationsCount = signal(2);
  protected readonly reminderEnabled = signal(true);
  protected readonly zenMode = signal(false);

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
    this.auth.logout();
    void this.router.navigate(['/auth/login']);
  }
}



