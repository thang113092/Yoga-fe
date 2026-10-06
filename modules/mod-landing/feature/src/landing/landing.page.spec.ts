import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { MembershipApi } from '@yoga/mod-membership/data-access';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { LandingPage } from './landing.page';

describe('LandingPage', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUserId: () => 'student-actual',
            isStudent: () => true,
            isSuperAdmin: () => false,
            isAuthenticated: () => true,
            userRole: () => 'STUDENT',
            userFullName: () => 'Học viên thực',
            profile: () => ({ phone: '0901234567' }),
            branchIds: () => ['b-actual'],
            canAccessPos: () => false,
            canAccessCheckIn: () => false,
            canManageUsers: () => false,
            logout: vi.fn()
          }
        },
        {
          provide: MembershipApi,
          useValue: {
            getActivePlans: () => of([])
          }
        },
        {
          provide: BranchApi,
          useValue: {
            getAll: () => of([
              {
                id: 'b-live-1',
                code: 'HCM-Q1',
                name: 'An Yên Signature Quận 1',
                address: '12 Lê Duẩn, Bến Nghé, Quận 1',
                phone: '0901 234 567',
                isActive: true,
                createdAt: '2026-01-01'
              }
            ])
          }
        }
      ]
    })
  );

  it('routes registration to the backend auth screen', () => {
    const fixture = TestBed.createComponent(LandingPage);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.openAuthModal('register');
    expect(navigate).toHaveBeenCalledWith(['/auth/register']);
  });

  it('toggles the FAQ', () => {
    const page = TestBed.createComponent(LandingPage).componentInstance;
    page.toggleFaq('faq-2');
    expect(page['activeFaqId']()).toBe('faq-2');
    page.toggleFaq('faq-2');
    expect(page['activeFaqId']()).toBeNull();
  });

  it('loads real branches from BranchApi on init', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const branches = fixture.componentInstance['branches']();
    expect(branches.length).toBe(1);
    expect(branches[0].name).toBe('An Yên Signature Quận 1');
    expect(branches[0].code).toBe('HCM-Q1');
  });
});