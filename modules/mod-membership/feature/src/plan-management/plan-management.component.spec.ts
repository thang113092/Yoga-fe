import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZenInputComponent } from '@yoga/platform/ui';
import { MembershipApi, MembershipPlan } from '@yoga/mod-membership/data-access';
import { PlanManagementComponent } from './plan-management.component';

describe('PlanManagementComponent', () => {
  const mockPlans: MembershipPlan[] = [
    {
      id: 'plan-1',
      code: 'PLAN_ALL_12M',
      name: 'Thẻ Kim Cương Toàn Chuỗi 12 Tháng',
      description: 'Tập không giới hạn',
      price: 15000000,
      planType: 'TIME_BASED',
      durationDays: 365,
      isAllBranches: true,
      isActive: true
    },
    {
      id: 'plan-2',
      code: 'PLAN_SINGLE_10S',
      name: 'Thẻ 10 Buổi Cơ Sở',
      description: '10 buổi',
      price: 1800000,
      planType: 'SESSION_BASED',
      totalSessions: 10,
      isAllBranches: false,
      isActive: true
    }
  ];

  let membershipApiMock: {
    getAllPlans: ReturnType<typeof vi.fn>;
    getActivePlans: ReturnType<typeof vi.fn>;
    createPlan: ReturnType<typeof vi.fn>;
    updatePlan: ReturnType<typeof vi.fn>;
    deletePlan: ReturnType<typeof vi.fn>;
  };

  let authMock: {
    isSuperAdmin: ReturnType<typeof vi.fn>;
    userFullName: ReturnType<typeof vi.fn>;
    userRole: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    membershipApiMock = {
      getAllPlans: vi.fn().mockReturnValue(of(mockPlans)),
      getActivePlans: vi.fn().mockReturnValue(of(mockPlans)),
      createPlan: vi.fn().mockReturnValue(of(mockPlans[0])),
      updatePlan: vi.fn().mockReturnValue(of(mockPlans[0])),
      deletePlan: vi.fn().mockReturnValue(of(undefined))
    };

    authMock = {
      isSuperAdmin: vi.fn().mockReturnValue(true),
      userFullName: vi.fn().mockReturnValue('Super Admin'),
      userRole: vi.fn().mockReturnValue('SUPER_ADMIN'),
      isAuthenticated: vi.fn().mockReturnValue(true)
    };

    TestBed.configureTestingModule({
      imports: [PlanManagementComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        { provide: MembershipApi, useValue: membershipApiMock },
        { provide: AuthService, useValue: authMock }
      ]
    });
  });

  it('loads all plans for SUPER_ADMIN on init', () => {
    const fixture = TestBed.createComponent(PlanManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(membershipApiMock.getAllPlans).toHaveBeenCalledWith(true);
    expect(component['plans']().length).toBe(2);
  });

  it('filters plans by scope correctly', () => {
    const fixture = TestBed.createComponent(PlanManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['filterScope'].set('ALL_BRANCHES');
    expect(component['filteredPlans']().length).toBe(1);
    expect(component['filteredPlans']()[0].code).toBe('PLAN_ALL_12M');

    component['filterScope'].set('SINGLE_BRANCH');
    expect(component['filteredPlans']().length).toBe(1);
    expect(component['filteredPlans']()[0].code).toBe('PLAN_SINGLE_10S');
  });

  it('allows SUPER_ADMIN to submit a new plan', () => {
    const fixture = TestBed.createComponent(PlanManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openCreateModal();
    expect(component['isModalOpen']()).toBe(true);

    component['formCode'].set('PLAN_NEW');
    component['formName'].set('Gói Thử Nghiệm');
    component['formPrice'].set(2000000);
    component.submitPlan();

    expect(membershipApiMock.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PLAN_NEW',
        name: 'Gói Thử Nghiệm',
        price: 2000000
      })
    );
    expect(component['isModalOpen']()).toBe(false);
  });

  it('prevents non-SUPER_ADMIN from opening create modal and loads only active plans', () => {
    authMock.isSuperAdmin.mockReturnValue(false);
    authMock.userRole.mockReturnValue('STUDENT');

    const fixture = TestBed.createComponent(PlanManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(membershipApiMock.getActivePlans).toHaveBeenCalled();

    component.openCreateModal();
    expect(component['isModalOpen']()).toBe(false);
  });

  it('populates form signals and modal inputs when openEditModal is called', async () => {
    const fixture = TestBed.createComponent(PlanManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openEditModal(mockPlans[0]);
    fixture.detectChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['isEditing']()).toBe(true);
    expect(component['formCode']()).toBe('PLAN_ALL_12M');
    expect(component['formName']()).toBe('Thẻ Kim Cương Toàn Chuỗi 12 Tháng');
    expect(component['formDescription']()).toBe('Tập không giới hạn');
    expect(component['formPrice']()).toBe(15000000);
    expect(component['formPlanType']()).toBe('TIME_BASED');
    expect(component['formDurationDays']()).toBe(365);
    expect(component['formIsAllBranches']()).toBe(true);
    expect(component['formIsActive']()).toBe(true);

    const zenInputs = fixture.debugElement.queryAll(By.directive(ZenInputComponent));
    const codeInput = zenInputs.find(zi => zi.componentInstance.id === 'pCode')?.nativeElement.querySelector('input') as HTMLInputElement;
    const nameInput = zenInputs.find(zi => zi.componentInstance.id === 'pName')?.nativeElement.querySelector('input') as HTMLInputElement;
    const priceInput = fixture.nativeElement.querySelector('#pPrice') as HTMLInputElement;
    const durationInput = fixture.nativeElement.querySelector('#pDuration') as HTMLInputElement;
    const descTextarea = fixture.nativeElement.querySelector('#pDesc') as HTMLTextAreaElement;

    expect(codeInput.value).toBe('PLAN_ALL_12M');
    expect(nameInput.value).toBe('Thẻ Kim Cương Toàn Chuỗi 12 Tháng');
    expect(Number(priceInput.value)).toBe(15000000);
    expect(Number(durationInput.value)).toBe(365);
    expect(descTextarea.value).toBe('Tập không giới hạn');
  });
});
