import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService, UserApi } from '@yoga/platform/auth';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { MembershipApi, PosApi } from '@yoga/mod-membership/data-access';
import { PosCheckoutComponent } from './pos-checkout.component';
describe('POS checkout', () => {
  const plan={ id:'plan', name:'Gói', price:100, isActive:true };
  let createOrder: ReturnType<typeof vi.fn>; let processPayment: ReturnType<typeof vi.fn>;
  const order={orderId:'order', membershipCode:'MB-real'};
  beforeEach(() => {
    createOrder=vi.fn().mockReturnValue(of(order)); processPayment=vi.fn().mockReturnValue(of({orderId:'order', paymentStatus:'SUCCESS'}));
    TestBed.configureTestingModule({ imports:[PosCheckoutComponent], providers:[provideExperimentalZonelessChangeDetection(), provideRouter([]), {provide:AuthService,useValue:{ currentUserId: () => 'student-actual', isStudent: () => true, isSuperAdmin: () => false, isAuthenticated: () => true, userRole: () => 'STUDENT', userFullName: () => 'Học viên thực', profile: () => ({ phone: '0901234567' }), branchIds: () => ['b-actual'], canAccessPos: () => false, canAccessCheckIn: () => false, canManageUsers: () => false, logout: vi.fn() }}, {provide:UserApi,useValue:{lookupStudent:vi.fn().mockReturnValue(of({id:'customer-real', fullName:'Người mua'})), searchStudents:vi.fn().mockReturnValue(of([{ id: 'customer-real', fullName: 'Người mua', phone: '0901234567', email: 'mua@test.com' }]))}}, {provide:BranchApi,useValue:{getAll:()=>of([{id:'b-actual', name:'Cơ sở', isActive:true}])}}, {provide:MembershipApi,useValue:{getActivePlans:()=>of([plan])}}, {provide:PosApi,useValue:{createOrder,processPayment}}] });
  });
  function page() { const fixture=TestBed.createComponent(PosCheckoutComponent); fixture.detectChanges(); const page=fixture.componentInstance; page['studentPhone']='0901234567'; return page; }
  it('does not fabricate a receipt when the server rejects the order', () => { createOrder.mockReturnValue(throwError(()=>({status:500}))); const component=page(); component.handleCheckout(); expect(component['successReceipt']()).toBeNull(); expect(component['errorMessage']()).toBeTruthy(); expect(processPayment).not.toHaveBeenCalled(); });
  it('uses the resolved customer and current cashier', () => { const component=page(); component.handleCheckout(); expect(createOrder.mock.calls[0][0].studentId).toBe('customer-real'); expect(createOrder.mock.calls[0][0].cashierId).toBe('student-actual'); expect(component['successReceipt']()).not.toBeNull(); });
  it('retries payment with the same order, key and payload', () => { processPayment.mockReturnValueOnce(throwError(()=>({status:0}))); const component=page(); component.handleCheckout(); const first=processPayment.mock.calls[0][0]; component.handleCheckout(); expect(createOrder).toHaveBeenCalledTimes(1); expect(processPayment.mock.calls[1][0]).toEqual(first); });
  it('retries an ambiguous order result with the same creation key', () => { createOrder.mockReturnValueOnce(throwError(()=>({status:0}))); const component=page(); component.handleCheckout(); const firstKey=createOrder.mock.calls[0][1]; component.handleCheckout(); expect(createOrder.mock.calls[1][1]).toBe(firstKey); });
  it('auto populates student information when searching by email', () => {
    const userApi = TestBed.inject(UserApi);
    (userApi.lookupStudent as any).mockReturnValue(of({ id: 's-email', fullName: 'Học viên Mail', phone: '0988776655', email: 'hv@test.com' }));
    const fixture = TestBed.createComponent(PosCheckoutComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.onEmailChange('hv@test.com');
    component.triggerLookup('email');
    expect(component['studentName']).toBe('Học viên Mail');
    expect(component['studentPhone']).toBe('0988776655');
    expect(component['studentLookupStatus']()).toBe('found');
  });
  it('auto populates student information when searching by phone', () => {
    const userApi = TestBed.inject(UserApi);
    (userApi.lookupStudent as any).mockReturnValue(of({ id: 's-phone', fullName: 'Học viên Phone', phone: '0911223344', email: 'phone@test.com' }));
    const fixture = TestBed.createComponent(PosCheckoutComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.onPhoneChange('0911223344');
    component.triggerLookup('phone');
    expect(component['studentName']).toBe('Học viên Phone');
    expect(component['studentEmail']).toBe('phone@test.com');
    expect(component['studentLookupStatus']()).toBe('found');
  });
  it('allows searching students and selecting from dropdown suggestions', () => {
    const userApi = TestBed.inject(UserApi);
    const mockStudent = { id: 's-search', fullName: 'Lê Hoàng Nam', phone: '0933221100', email: 'nam@an-yen.vn', isActive: true, createdAt: '2026-01-01', roleId: 'r1', roleCode: 'STUDENT', roleName: 'Học viên' };
    (userApi.searchStudents as any).mockReturnValue(of([mockStudent]));
    const fixture = TestBed.createComponent(PosCheckoutComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.executeStudentSearch('Hoàng Nam');
    expect(component['searchResults']().length).toBe(1);
    expect(component['isSearchDropdownOpen']()).toBe(true);

    component.selectStudentFromSearch(mockStudent);
    expect(component['studentName']).toBe('Lê Hoàng Nam');
    expect(component['studentPhone']).toBe('0933221100');
    expect(component['studentEmail']).toBe('nam@an-yen.vn');
    expect(component['resolvedStudent']()?.id).toBe('s-search');
    expect(component['isSearchDropdownOpen']()).toBe(false);
  });
  it('resets all student fields upon resetForm', () => {
    const component = page();
    component['studentEmail'] = 'test@yoga.vn';
    component['studentName'] = 'Test';
    component['searchQuery'] = 'Test';
    component.resetForm();
    expect(component['studentPhone']).toBe('');
    expect(component['studentEmail']).toBe('');
    expect(component['studentName']).toBe('');
    expect(component['searchQuery']).toBe('');
    expect(component['resolvedStudent']()).toBeNull();
  });
});