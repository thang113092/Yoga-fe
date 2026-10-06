import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { CheckInApi } from '@yoga/mod-schedule/data-access';
import { QrScannerComponent } from './qr-scanner.component';
describe('Check-in kiosk', () => {
  const processCheckIn=vi.fn();
  beforeEach(()=>{processCheckIn.mockReset().mockReturnValue(of({bookingCode:'BK-real',checkedInAt:new Date().toISOString()}));TestBed.configureTestingModule({imports:[QrScannerComponent],providers:[provideExperimentalZonelessChangeDetection(),{provide:AuthService,useValue:{ currentUserId: () => 'student-actual', isStudent: () => true, isSuperAdmin: () => false, isAuthenticated: () => true, userRole: () => 'STUDENT', userFullName: () => 'Học viên thực', profile: () => ({ phone: '0901234567' }), branchIds: () => ['b-actual'], canAccessPos: () => false, canAccessCheckIn: () => false, canManageUsers: () => false, logout: vi.fn() }},{provide:BranchApi,useValue:{getAll:()=>of([{id:'b-actual',isActive:true}])}},{provide:CheckInApi,useValue:{processCheckIn}}]});});
  it('renders the named ngModel control without a form registration error', async()=>{const fixture=TestBed.createComponent(QrScannerComponent); fixture.detectChanges(); await fixture.whenStable(); expect(fixture.nativeElement.querySelector('input[name="qrInput"]')).toBeTruthy();});
  it('uses current staff and selected branch',()=>{const fixture=TestBed.createComponent(QrScannerComponent); fixture.detectChanges(); fixture.componentInstance.qrInput.set('BK-123'); fixture.componentInstance.submitCheckIn(); expect(processCheckIn.mock.calls[0][0]).toMatchObject({checkedInBy:'student-actual',branchId:'b-actual'});});
  it('renders API errors',()=>{processCheckIn.mockReturnValue(throwError(()=>({error:{message:'Sai chi nhánh'}})));const fixture=TestBed.createComponent(QrScannerComponent);fixture.detectChanges();fixture.componentInstance.qrInput.set('BK-123');fixture.componentInstance.submitCheckIn();fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Sai chi nhánh');});
});