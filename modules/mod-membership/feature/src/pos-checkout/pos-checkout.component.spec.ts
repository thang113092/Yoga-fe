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
    TestBed.configureTestingModule({ imports:[PosCheckoutComponent], providers:[provideExperimentalZonelessChangeDetection(), provideRouter([]), {provide:AuthService,useValue:{ currentUserId: () => 'student-actual', isStudent: () => true, isSuperAdmin: () => false, isAuthenticated: () => true, userRole: () => 'STUDENT', userFullName: () => 'Học viên thực', profile: () => ({ phone: '0901234567' }), branchIds: () => ['b-actual'], canAccessPos: () => false, canAccessCheckIn: () => false, canManageUsers: () => false, logout: vi.fn() }}, {provide:UserApi,useValue:{lookupStudent:vi.fn().mockReturnValue(of({id:'customer-real', fullName:'Người mua'}))}}, {provide:BranchApi,useValue:{getAll:()=>of([{id:'b-actual', name:'Cơ sở', isActive:true}])}}, {provide:MembershipApi,useValue:{getActivePlans:()=>of([plan])}}, {provide:PosApi,useValue:{createOrder,processPayment}}] });
  });
  function page() { const fixture=TestBed.createComponent(PosCheckoutComponent); fixture.detectChanges(); const page=fixture.componentInstance; page['studentPhone']='0901234567'; return page; }
  it('does not fabricate a receipt when the server rejects the order', () => { createOrder.mockReturnValue(throwError(()=>({status:500}))); const component=page(); component.handleCheckout(); expect(component['successReceipt']()).toBeNull(); expect(component['errorMessage']()).toBeTruthy(); expect(processPayment).not.toHaveBeenCalled(); });
  it('uses the resolved customer and current cashier', () => { const component=page(); component.handleCheckout(); expect(createOrder.mock.calls[0][0].studentId).toBe('customer-real'); expect(createOrder.mock.calls[0][0].cashierId).toBe('student-actual'); expect(component['successReceipt']()).not.toBeNull(); });
  it('retries payment with the same order, key and payload', () => { processPayment.mockReturnValueOnce(throwError(()=>({status:0}))); const component=page(); component.handleCheckout(); const first=processPayment.mock.calls[0][0]; component.handleCheckout(); expect(createOrder).toHaveBeenCalledTimes(1); expect(processPayment.mock.calls[1][0]).toEqual(first); });
  it('retries an ambiguous order result with the same creation key', () => { createOrder.mockReturnValueOnce(throwError(()=>({status:0}))); const component=page(); component.handleCheckout(); const firstKey=createOrder.mock.calls[0][1]; component.handleCheckout(); expect(createOrder.mock.calls[1][1]).toBe(firstKey); });
});