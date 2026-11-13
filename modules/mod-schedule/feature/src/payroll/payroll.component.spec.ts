import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZenConfirmService, ZenToastService } from '@yoga/platform/ui';
import { PayRatePolicy, PayrollApi, PayrollPreview, ScheduleApi } from '@yoga/mod-schedule/data-access';
import { buildPayrollCsv, PayrollComponent } from './payroll.component';

const preview: PayrollPreview = {
  year: 2026,
  month: 11,
  branchId: null,
  total: 960_000,
  unpricedSessions: 1,
  instructors: [
    {
      instructorId: 'i1', instructorName: 'Lan Anh', studioSessions: 2, onlineSessions: 1, hybridSessions: 0,
      attended: 12, onlineAttended: 3, unpricedSessions: 0, total: 960_000,
      lines: [
        { scheduleId: 's1', startTime: '2026-11-02T11:30:00Z', deliveryMode: 'IN_PERSON', className: 'Hatha, cơ bản', branchId: 'b1', attended: 5, onlineAttended: 0, sessionRate: 300_000, bonusPerStudent: 10_000, lineTotal: 350_000 },
        { scheduleId: 's2', startTime: '2026-11-03T11:30:00Z', deliveryMode: 'IN_PERSON', className: 'Vinyasa', branchId: 'b1', attended: 4, onlineAttended: 0, sessionRate: 300_000, bonusPerStudent: 10_000, lineTotal: 340_000 },
        { scheduleId: 's3', startTime: '2026-11-04T11:30:00Z', deliveryMode: 'ONLINE', className: 'Yin "online"', branchId: 'b1', attended: 3, onlineAttended: 3, sessionRate: 240_000, bonusPerStudent: 10_000, lineTotal: 270_000 }
      ]
    },
    {
      instructorId: 'i2', instructorName: 'Minh', studioSessions: 0, onlineSessions: 0, hybridSessions: 1,
      attended: 6, onlineAttended: 2, unpricedSessions: 1, total: 0,
      lines: [
        { scheduleId: 's4', startTime: '2026-11-05T11:30:00Z', deliveryMode: 'HYBRID', className: 'Power', branchId: 'b1', attended: 6, onlineAttended: 2, sessionRate: null, bonusPerStudent: null, lineTotal: null }
      ]
    }
  ]
};

const policy: PayRatePolicy = {
  id: 'p1', instructorId: 'i1', instructorName: 'Lan Anh', branchId: null, branchName: null,
  basePayPerClass: 300_000, onlinePayPerClass: null, headcountBonusPerStudent: 10_000,
  effectiveFrom: '2026-10-31T17:00:00Z', effectiveTo: null, active: true
};

describe('PayrollApi', () => {
  it('calls preview, policies, create and deactivate endpoints', () => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    });
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(PayrollApi);
    const wrap = <T>(data: T) => ({ code: 'OK', success: true, message: 'ok', data });

    api.getPreview({ year: 2026, month: 11, branchId: 'b1' }).subscribe();
    const pr = http.expectOne(r => r.url === '/api/v1/payroll/preview');
    expect(pr.request.params.get('year')).toBe('2026');
    expect(pr.request.params.get('month')).toBe('11');
    expect(pr.request.params.get('branchId')).toBe('b1');
    expect(pr.request.params.has('instructorId')).toBe(false);
    pr.flush(wrap(preview));

    api.getPolicies().subscribe();
    http.expectOne('/api/v1/payroll/rate-policies').flush(wrap([policy]));

    api.createPolicy({ instructorId: 'i1', basePayPerClass: 1 }).subscribe();
    const create = http.expectOne('/api/v1/payroll/rate-policies');
    expect(create.request.method).toBe('POST');
    create.flush(wrap(policy));

    api.deactivatePolicy('p1').subscribe();
    const deact = http.expectOne('/api/v1/payroll/rate-policies/p1/deactivate');
    expect(deact.request.method).toBe('POST');
    deact.flush(wrap(null));
    http.verify();
  });
});

describe('PayrollComponent', () => {
  let payrollMock: {
    getPreview: ReturnType<typeof vi.fn>;
    getPolicies: ReturnType<typeof vi.fn>;
    createPolicy: ReturnType<typeof vi.fn>;
    deactivatePolicy: ReturnType<typeof vi.fn>;
  };
  let confirmMock: { confirm: ReturnType<typeof vi.fn> };

  function setup(role: 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'INSTRUCTOR') {
    payrollMock = {
      getPreview: vi.fn().mockReturnValue(of(preview)),
      getPolicies: vi.fn().mockReturnValue(of([policy])),
      createPolicy: vi.fn().mockReturnValue(of(policy)),
      deactivatePolicy: vi.fn().mockReturnValue(of(undefined))
    };
    confirmMock = { confirm: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({
      imports: [PayrollComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        { provide: PayrollApi, useValue: payrollMock },
        {
          provide: ScheduleApi, useValue: {
            getBranches: () => of([
              { id: 'b1', code: 'Q1', name: 'Quận 1', address: '', phone: '', isActive: true },
              { id: 'b2', code: 'CG', name: 'Cầu Giấy', address: '', phone: '', isActive: true }
            ]),
            getInstructors: vi.fn().mockReturnValue(of([{ id: 'i1', fullName: 'Lan Anh', phone: '090' }]))
          }
        },
        { provide: ZenToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ZenConfirmService, useValue: confirmMock },
        {
          provide: AuthService, useValue: {
            isSuperAdmin: () => role === 'SUPER_ADMIN',
            isBranchManager: () => role === 'BRANCH_MANAGER',
            isInstructor: () => role === 'INSTRUCTOR',
            branchIds: () => role === 'BRANCH_MANAGER' ? ['b2'] : [],
            userHomeBranchId: () => role === 'BRANCH_MANAGER' ? 'b2' : null
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(PayrollComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the monthly payroll per instructor with unpriced warning and expandable lines', () => {
    const fixture = setup('SUPER_ADMIN');
    const el = fixture.nativeElement as HTMLElement;
    const query = payrollMock.getPreview.mock.calls[0][0];
    expect(query.branchId).toBeUndefined();
    expect(query.month).toBeGreaterThanOrEqual(1);

    const rows = el.querySelectorAll('.instructor-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Lan Anh');
    expect(rows[0].textContent).toContain('960.000');
    expect(rows[0].querySelector('.unpriced-badge')).toBeNull();
    expect(rows[1].querySelector('.unpriced-badge')?.textContent).toContain('1 buổi chưa có đơn giá');
    expect(el.querySelector('.kpi-total')?.textContent).toContain('960.000');

    expect(el.querySelector('.lines-table')).toBeNull();
    (rows[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.lines-table tbody tr').length).toBe(3);
  });

  it('limits branch managers to their branch', () => {
    setup('BRANCH_MANAGER');
    expect(payrollMock.getPreview.mock.calls.at(-1)![0].branchId).toBe('b2');
  });

  it('does not send a branch for instructors and hides admin actions', () => {
    const fixture = setup('INSTRUCTOR');
    expect(payrollMock.getPreview.mock.calls.at(-1)![0].branchId).toBeUndefined();
    fixture.componentInstance.setTab('policies');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.policy-table tbody tr').length).toBe(1);
    expect(el.querySelector('.btn-deactivate')).toBeNull();
    expect(el.querySelector('.btn-create-policy')).toBeNull();
    expect(el.textContent).toContain('Đơn giá online trống thì buổi online tính theo đơn giá tại phòng');
  });

  it('builds an Excel-friendly CSV with BOM, escaping and unpriced lines', () => {
    const csv = buildPayrollCsv(preview, 'Quận 1');
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Bảng lương HLV,Tháng 11/2026,Quận 1');
    expect(lines[2]).toBe('Huấn luyện viên,Buổi tại phòng,Buổi online,Buổi hybrid,Học viên,Học viên online,Buổi chưa có đơn giá,Tổng thù lao (VND)');
    expect(lines[3]).toBe('Lan Anh,2,1,0,12,3,0,960000');
    expect(lines[4]).toBe('Minh,0,0,1,6,2,1,0');
    expect(lines[5]).toBe('Tổng cộng,,,,,,1,960000');
    expect(csv).toContain('"Hatha, cơ bản"');
    expect(csv).toContain('"Yin ""online"""');
    expect(csv).toMatch(/Minh,[^\r\n]*,Power,Hybrid,6,2,Chưa có đơn giá,,/);
  });

  it('creates a policy with the expected payload (online rate optional)', () => {
    const fixture = setup('SUPER_ADMIN');
    const comp = fixture.componentInstance;
    comp.openCreate();
    comp.patchForm({ instructorId: 'i1', branchId: 'b1', basePayPerClass: 300000, onlinePayPerClass: null, headcountBonusPerStudent: 15000, effectiveFrom: '2026-12-01' });
    comp.submit();
    expect(payrollMock.createPolicy).toHaveBeenCalledWith({
      instructorId: 'i1', branchId: 'b1', basePayPerClass: 300000, onlinePayPerClass: null,
      headcountBonusPerStudent: 15000, effectiveFrom: '2026-12-01'
    });
    expect(comp.formOpen()).toBe(false);
    expect(payrollMock.getPolicies).toHaveBeenCalled();

    comp.openCreate();
    comp.patchForm({ instructorId: '', basePayPerClass: 1 });
    comp.submit();
    expect(comp.formError()).toContain('huấn luyện viên');
    expect(payrollMock.createPolicy).toHaveBeenCalledTimes(1);
  });

  it('deactivates a policy after confirmation', async () => {
    const fixture = setup('SUPER_ADMIN');
    await fixture.componentInstance.deactivate(policy);
    expect(confirmMock.confirm).toHaveBeenCalled();
    expect(payrollMock.deactivatePolicy).toHaveBeenCalledWith('p1');
  });
});
