import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { OnlineReport, OnlineReportApi } from '@yoga/mod-membership/data-access';
import { OnlineReportComponent } from './online-report.component';

const report: OnlineReport = {
  startDate: '2026-10-14',
  endDate: '2026-11-12',
  branchId: null,
  kpi: {
    sessions: 12, heldSessions: 10, bookings: 80, joins: 64, attendanceRate: 80, uniqueStudents: 30,
    packageRevenue: 3_000_000, courseRevenue: 1_500_000, activeOnlinePasses: 9,
    videoPlays: 120, videoViewers: 25, videoCompletions: 40, videoHours: 18.5
  },
  branches: [
    { branchId: 'b1', branchName: 'Cơ sở Quận 1', sessions: 8, bookings: 50, joins: 40, attendanceRate: 80 },
    { branchId: 'b2', branchName: 'Cơ sở Cầu Giấy', sessions: 4, bookings: 30, joins: 24, attendanceRate: 80 }
  ],
  daily: [
    { date: '2026-11-11', joins: 5, videoPlays: 10 },
    { date: '2026-11-12', joins: 0, videoPlays: 3 }
  ],
  plans: [{ planName: 'Online 1 tháng', accessScope: 'ONLINE', sold: 3, revenue: 3_000_000 }],
  topVideos: [{ videoId: 'v1', title: 'Hatha buổi sáng', plays: 50, viewers: 12, completions: 20, hours: 6.2 }]
};

const branches = [
  { id: 'b1', code: 'CN_Q1', name: 'Cơ sở Quận 1', address: '', phone: '', email: '', isActive: true },
  { id: 'b2', code: 'CN_CG', name: 'Cơ sở Cầu Giấy', address: '', phone: '', email: '', isActive: true }
];

describe('OnlineReportApi', () => {
  it('sends only the filled filters to /reports/online and unwraps the response', () => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    });
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(OnlineReportApi);
    let received: OnlineReport | null = null;

    api.getReport({ startDate: '2026-11-01', endDate: '2026-11-12', branchId: 'b1' }).subscribe(r => received = r);
    const req = http.expectOne(r => r.url === '/api/v1/reports/online');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('startDate')).toBe('2026-11-01');
    expect(req.request.params.get('endDate')).toBe('2026-11-12');
    expect(req.request.params.get('branchId')).toBe('b1');
    req.flush({ code: 'OK', success: true, message: 'ok', data: report });
    expect(received!.kpi.joins).toBe(64);

    api.getReport({ startDate: '2026-11-01' }).subscribe();
    const req2 = http.expectOne(r => r.url === '/api/v1/reports/online');
    expect(req2.request.params.keys()).toEqual(['startDate']);
    req2.flush({ code: 'OK', success: true, message: 'ok', data: report });
    http.verify();
  });
});

describe('OnlineReportComponent', () => {
  let apiMock: { getReport: ReturnType<typeof vi.fn> };

  function setup(role: 'SUPER_ADMIN' | 'BRANCH_MANAGER') {
    apiMock = { getReport: vi.fn().mockReturnValue(of(report)) };
    TestBed.configureTestingModule({
      imports: [OnlineReportComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        { provide: OnlineReportApi, useValue: apiMock },
        { provide: BranchApi, useValue: { getAll: () => of(branches) } },
        {
          provide: AuthService, useValue: {
            isSuperAdmin: () => role === 'SUPER_ADMIN',
            isBranchManager: () => role === 'BRANCH_MANAGER',
            branchIds: () => role === 'BRANCH_MANAGER' ? ['b2'] : [],
            userHomeBranchId: () => role === 'BRANCH_MANAGER' ? 'b2' : null
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(OnlineReportComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the whole system for super admin and renders KPIs, chart and tables', () => {
    const fixture = setup('SUPER_ADMIN');
    const call = apiMock.getReport.mock.calls.at(-1)![0];
    expect(call.branchId).toBeUndefined();
    expect(call.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(call.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('zen-page-header h1')?.textContent).toContain('Báo cáo học online');
    expect(el.querySelector('.kpi-joins')?.textContent).toContain('64');
    expect(el.querySelector('.kpi-revenue')?.textContent).toContain('4.500.000');
    expect(el.querySelectorAll('.bar-column').length).toBe(2);
    expect(el.querySelectorAll('.branch-table tbody tr').length).toBe(2);
    expect(el.querySelector('.plan-table')?.textContent).toContain('Online');
    expect(el.querySelector('.video-table')?.textContent).toContain('Hatha buổi sáng');

    fixture.componentInstance['onBranchChange']('b1');
    expect(apiMock.getReport.mock.calls.at(-1)![0].branchId).toBe('b1');
  });

  it('locks branch managers to their own branch', () => {
    const fixture = setup('BRANCH_MANAGER');
    const comp = fixture.componentInstance;
    expect(comp['branchLocked']()).toBe(true);
    expect(apiMock.getReport.mock.calls.at(-1)![0].branchId).toBe('b2');
    expect(comp['branchOptions']().map(o => o.value)).toEqual(['b2']);

    const calls = apiMock.getReport.mock.calls.length;
    comp['onBranchChange']('ALL');
    expect(apiMock.getReport.mock.calls.length).toBe(calls);
    expect(comp['selectedBranchId']()).toBe('b2');
  });

  it('shows empty states when the period has no data', () => {
    apiMock = { getReport: vi.fn() };
    const fixture = (() => {
      const empty: OnlineReport = { ...report, branches: [], daily: [], plans: [], topVideos: [] };
      const f = setup('SUPER_ADMIN');
      apiMock.getReport.mockReturnValue(of(empty));
      f.componentInstance['loadReport']();
      f.detectChanges();
      return f;
    })();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Chưa có hoạt động học online');
    expect(text).toContain('Chưa có lớp online trong kỳ.');
    expect(text).toContain('Chưa có lượt xem video trong kỳ.');
  });
});
