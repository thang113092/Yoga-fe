import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  LANDING_BRANCHES,
  LANDING_FAQS,
  LANDING_FEATURES,
  LANDING_PACKAGES,
  LANDING_STATS,
  LANDING_TESTIMONIALS,
  BranchPreview,
  PricingPackage
} from '@yoga/mod-landing/data-access';
import { MembershipApi, MembershipPlan } from '@yoga/mod-membership/data-access';
import { BranchApi, Branch } from '@yoga/mod-branch/data-access';
import { AuthService } from '@yoga/platform/auth';

@Component({
  selector: 'yoga-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly membershipApi = inject(MembershipApi, { optional: true });
  private readonly branchApi = inject(BranchApi, { optional: true });

  // Content Data
  protected readonly stats = LANDING_STATS;
  protected readonly features = LANDING_FEATURES;
  protected readonly packages = signal<PricingPackage[]>([...LANDING_PACKAGES]);
  protected readonly branches = signal<BranchPreview[]>([...LANDING_BRANCHES]);
  protected readonly testimonials = LANDING_TESTIMONIALS;
  protected readonly faqs = LANDING_FAQS;

  // UI State Signals
  protected readonly isMobileMenuOpen = signal<boolean>(false);
  protected readonly activeFaqId = signal<string | null>('faq-1');
  protected readonly userToastMessage = signal<string | null>(null);
  protected readonly isLoadingPlans = signal<boolean>(true);
  protected readonly isLoadingBranches = signal<boolean>(true);

  ngOnInit(): void {
    if (this.membershipApi) {
      this.membershipApi.getActivePlans().subscribe({
        next: (plans) => {
          if (plans && plans.length > 0) {
            const mapped: PricingPackage[] = plans.map((p, idx) => ({
              id: p.id,
              name: p.name,
              type: p.planType === 'SESSION_BASED' ? 'SESSION' : (p.planType === 'TIME_BASED' ? 'TIME_BASED' : 'COMBO'),
              scope: p.isAllBranches ? 'ALL_BRANCH' : 'SINGLE_BRANCH',
              price: p.price,
              durationDays: p.durationDays ?? undefined,
              sessionCount: p.totalSessions ?? undefined,
              subtitle: p.description || (p.isAllBranches ? 'Thẻ tập luyện trên toàn hệ thống An Yên' : 'Thẻ tập linh hoạt tại cơ sở đăng ký'),
              highlights: this.generatePlanHighlights(p),
              isPopular: idx === 1,
              ctaText: this.isAuthenticated() ? 'Đăng Ký Gói Này' : 'Bắt Đầu Ngay'
            }));
            this.packages.set(mapped);
          }
          this.isLoadingPlans.set(false);
        },
        error: () => {
          this.isLoadingPlans.set(false);
        }
      });
    } else {
      this.isLoadingPlans.set(false);
    }

    if (this.branchApi) {
      this.branchApi.getAll().subscribe({
        next: (branchList) => {
          if (branchList && branchList.length > 0) {
            const activeBranches = branchList.filter(b => b.isActive !== false);
            const targetBranches = activeBranches.length > 0 ? activeBranches : branchList;
            const mapped: BranchPreview[] = targetBranches.map((b, idx) => ({
              id: b.id,
              name: b.name,
              code: b.code,
              address: b.address,
              phone: b.phone || '1900 6868',
              openHours: '05:30 - 21:30 (T2 - CN)',
              roomCount: 3,
              maxCapacity: 100,
              features: ['Không gian chuẩn Zen', 'Thảm tập & Locker cao cấp', 'Check-in QR cá nhân'],
              tag: idx === 0 ? 'Cơ Sở Nổi Bật' : (b.code.includes('HN') ? 'Hà Nội' : (b.code.includes('DN') ? 'Đà Nẵng' : 'TP. Hồ Chí Minh'))
            }));
            this.branches.set(mapped);
          }
          this.isLoadingBranches.set(false);
        },
        error: () => {
          this.isLoadingBranches.set(false);
        }
      });
    } else {
      this.isLoadingBranches.set(false);
    }
  }

  private generatePlanHighlights(p: MembershipPlan): string[] {
    const list: string[] = [];
    if (p.isAllBranches) {
      list.push('Tập luyện tại tất cả chi nhánh trong hệ thống An Yên');
    } else {
      list.push('Áp dụng tập luyện tại cơ sở đăng ký');
    }

    if (p.totalSessions) {
      list.push(`${p.totalSessions} buổi học Yoga & Thiền có giáo viên hướng dẫn`);
    } else if (p.durationDays) {
      list.push(`Không giới hạn số lượt tập trong ${p.durationDays} ngày`);
    }

    list.push('Miễn phí sử dụng thảm tập cao cấp & tủ locker điện tử');
    list.push('Điểm danh 1-chạm bằng mã QR cá nhân trên điện thoại');
    list.push('Được đặt chỗ trước các ca học trực tuyến');
    return list;
  }

  // Derived State
  protected readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  protected readonly userFullName = computed(() => this.auth.userFullName());
  protected readonly userRole = computed(() => this.auth.userRole());

  openAuthModal(mode: 'login' | 'register' = 'login'): void {
    this.isMobileMenuOpen.set(false);
    if (mode === 'register') {
      void this.router.navigate(['/auth/register']);
    } else {
      void this.router.navigate(['/auth/login']);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(prev => !prev);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleFaq(faqId: string): void {
    this.activeFaqId.update(current => (current === faqId ? null : faqId));
  }

  handlePackageSelect(_pkg: PricingPackage): void {
    if (this.isAuthenticated()) {
      if (this.auth.canAccessPos()) {
        void this.router.navigate(['/membership/pos']);
      } else {
        void this.router.navigate(['/membership/my-passes']);
      }
    } else {
      void this.router.navigate(['/auth/register']);
    }
  }

  handleSignOut(): void {
    this.auth.logout();
    this.showToast('Bạn đã đăng xuất tài khoản thành công.');
  }

  navigateToDashboard(): void {
    if (this.auth.canManageUsers()) {
      void this.router.navigate(['/users']);
    } else if (this.auth.canAccessPos()) {
      void this.router.navigate(['/membership/pos']);
    } else if (this.auth.canAccessCheckIn()) {
      void this.router.navigate(['/schedule/check-in']);
    } else if (this.auth.isStudent()) {
      void this.router.navigate(['/membership/my-passes']);
    } else {
      void this.router.navigate(['/schedule/calendar']);
    }
  }

  navigateToBranches(): void {
    void this.router.navigate(['/branches']);
  }

  navigateToSchedule(): void {
    void this.router.navigate(['/schedule/calendar']);
  }

  scrollToSection(sectionId: string): void {
    this.isMobileMenuOpen.set(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private showToast(msg: string): void {
    this.userToastMessage.set(msg);
    setTimeout(() => {
      this.userToastMessage.set(null);
    }, 4500);
  }
}

