import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZenInputComponent } from '@yoga/platform/ui';
import { MembershipApi, MembershipPlan, PosApi, SelfCheckoutApi } from '@yoga/mod-membership/data-access';
import { BranchApi } from '@yoga/mod-branch/data-access';
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
    isStudent: ReturnType<typeof vi.fn>;
    currentUserId: ReturnType<typeof vi.fn>;
    userHomeBranchId: ReturnType<typeof vi.fn>;
  };
  let getStudentOrders: ReturnType<typeof vi.fn>;
  let selfCheckoutMock: Record<string, ReturnType<typeof vi.fn>>;

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
      isAuthenticated: vi.fn().mockReturnValue(true),
      isStudent: vi.fn().mockReturnValue(false),
      currentUserId: vi.fn().mockReturnValue('student-1'),
      userHomeBranchId: vi.fn().mockReturnValue('b-1')
    };
    getStudentOrders = vi.fn().mockReturnValue(of([]));
    selfCheckoutMock = {
      getQuote: vi.fn().mockReturnValue(of({ currentMembership: null, credit: 0, totalAmount: 1800000, issue: null })),
      startOnlinePayment: vi.fn(), cancelOrder: vi.fn().mockReturnValue(of(undefined))
    };

    TestBed.configureTestingModule({
      imports: [PlanManagementComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        { provide: MembershipApi, useValue: membershipApiMock },
        { provide: AuthService, useValue: authMock },
        { provide: PosApi, useValue: { getStudentOrders: (...a: unknown[]) => getStudentOrders(...a) } },
        { provide: SelfCheckoutApi, useValue: selfCheckoutMock },
        { provide: BranchApi, useValue: { getAll: () => of([{ id: 'b-1', name: 'Cơ sở 1', isActive: true }]) } }
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

  it('creates an online plan and lists it under the Online filter', () => {
    const fixture = TestBed.createComponent(PlanManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openCreateModal();
    expect(component['formAccessScope']()).toBe('STUDIO');
    component['formCode'].set('ONLINE_8S');
    component['formName'].set('Online 8 buổi');
    component['formAccessScope'].set('ONLINE');
    component.submitPlan();
    expect(membershipApiMock.createPlan).toHaveBeenCalledWith(expect.objectContaining({ code: 'ONLINE_8S', accessScope: 'ONLINE' }));

    component['plans'].set([...mockPlans, { ...mockPlans[1], id: 'plan-3', code: 'ONLINE_8S', accessScope: 'ONLINE' }]);
    component['filterAccess'].set('ONLINE');
    expect(component['filteredPlans']().map(p => p.code)).toEqual(['ONLINE_8S']);
    component['filterAccess'].set('STUDIO');
    expect(component['filteredPlans']().map(p => p.code)).toEqual(['PLAN_ALL_12M', 'PLAN_SINGLE_10S']);
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

  function signInStudent(): void {
    authMock.isSuperAdmin.mockReturnValue(false);
    authMock.userRole.mockReturnValue('STUDENT');
    authMock.isStudent.mockReturnValue(true);
  }

  function buttons(fixture: { nativeElement: HTMLElement }, label: string): HTMLButtonElement[] {
    return [...fixture.nativeElement.querySelectorAll('button')].filter(b => b.textContent?.includes(label)) as HTMLButtonElement[];
  }

  it('lets a student buy an active plan online, and staff do not see the button', async () => {
    const staff = TestBed.createComponent(PlanManagementComponent);
    staff.detectChanges();
    expect(buttons(staff, 'Mua thẻ').length).toBe(0);
    staff.destroy();

    signInStudent();
    const fixture = TestBed.createComponent(PlanManagementComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getStudentOrders).toHaveBeenCalledWith('student-1');
    const buy = buttons(fixture, 'Mua thẻ');
    expect(buy.length).toBe(2);
    buy[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance['purchasePlan']()?.id).toBe('plan-2');
    expect(fixture.nativeElement.querySelector('yoga-plan-purchase')).toBeTruthy();
  });

  it("shows the student's pending order and blocks buying another plan until it is paid or cancelled", async () => {
    signInStudent();
    getStudentOrders.mockReturnValue(of([
      { orderId: 'o-paid', status: 'PAID', totalAmount: 1, items: [{ itemType: 'MEMBERSHIP_PLAN', itemName: 'Cũ' }], payments: [] },
      { orderId: 'o-course', status: 'PENDING', totalAmount: 1, items: [{ itemType: 'COURSE_CLASS', itemName: 'Khóa' }], payments: [] },
      { orderId: 'o-1', status: 'PENDING', totalAmount: 1800000, branchName: 'Cơ sở 1', items: [{ itemType: 'MEMBERSHIP_PLAN', itemName: 'Thẻ 10 Buổi Cơ Sở' }], payments: [] }
    ]));
    const fixture = TestBed.createComponent(PlanManagementComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('chờ thanh toán');
    expect(buttons(fixture, 'Mua thẻ').every(b => b.disabled)).toBe(true);

    selfCheckoutMock['startOnlinePayment'].mockReturnValue(of({ id: 'l-1', orderId: 'o-1', status: 'CREATED', amount: 1800000, providerOrderCode: 100001,
      qrPayload: '000201', checkoutUrl: null, expiresAt: new Date(Date.now() + 600_000).toISOString() }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    buttons(fixture, 'Tiếp tục thanh toán')[0].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/membership/checkout', 'o-1'], {});
    fixture.destroy();
  });
});
