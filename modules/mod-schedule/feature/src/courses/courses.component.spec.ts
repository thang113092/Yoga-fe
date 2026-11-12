import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, UserApi } from '@yoga/platform/auth';
import { CourseApi, ScheduleApi } from '@yoga/mod-schedule/data-access';
import { PosApi, SelfCheckoutApi } from '@yoga/mod-membership/data-access';
import { CoursesComponent } from './courses.component';

describe('Course schedules',()=>{
  let component:CoursesComponent;
  beforeEach(()=>{
    TestBed.configureTestingModule({imports:[CoursesComponent],providers:[provideExperimentalZonelessChangeDetection(),provideRouter([]),
      {provide:AuthService,useValue:{isSuperAdmin:()=>true,isBranchManager:()=>false,isStudent:()=>false,canAccessPos:()=>true,branchIds:()=>[],userHomeBranchId:()=>null,currentUserId:()=> 'admin'}},
      {provide:CourseApi,useValue:{courses:()=>of([]),classes:()=>of([])}},{provide:ScheduleApi,useValue:{getBranches:()=>of([])}},{provide:PosApi,useValue:{}},{provide:UserApi,useValue:{}},{provide:SelfCheckoutApi,useValue:{}}]});
    component=TestBed.createComponent(CoursesComponent).componentInstance;
    component.courses.set([{id:'course',code:'C',name:'Yoga',description:'',classTypeId:'type',totalSessions:12,defaultDurationMinutes:60,defaultFee:500000}]);
    component.classForm.courseId='course';component.startDate='2026-11-02';component.startTime='18:00';component.roomId='room';component.instructorId='teacher';component.weekdays=[1,3];
  });
  it('generates the full 12-session course in Vietnam time',()=>{
    component.generate();const rows=component.classForm.sessions;
    expect(rows).toHaveLength(12);expect(rows[0].startTime).toBe('2026-11-02T11:00:00.000Z');
    expect(rows[11].startTime).toBe('2026-12-09T11:00:00.000Z');
    expect(rows.every(s=>new Date(s.endTime).getTime()-new Date(s.startTime).getTime()===3600000)).toBe(true);
  });
  it('uses the program title and individual duration for generated sessions',()=>{
    component.courses.set([{...component.courses()[0],totalSessions:2,sessions:[{title:'Hít thở',content:'Kỹ thuật hít thở',durationMinutes:45},{title:'Tư thế đứng',content:'Thực hành thăng bằng',durationMinutes:75}]}]);
    component.generate();
    expect(component.classForm.sessions.map(s=>s.title)).toEqual(['Hít thở','Tư thế đứng']);
    expect(component.classForm.sessions.map(s=>(Date.parse(s.endTime)-Date.parse(s.startTime))/60000)).toEqual([45,75]);
    expect(component.classForm.sessions[0].plannedContent).toBe('Kỹ thuật hít thở');
  });
  it('keeps entered content when adding program sessions',()=>{
    component.courseForm.sessions=[{title:'Hít thở',content:'Nội dung đã nhập',durationMinutes:45}];component.resizeProgram(2);
    expect(component.courseForm.sessions?.[0].content).toBe('Nội dung đã nhập');expect(component.courseForm.sessions).toHaveLength(2);
  });
  it('requires weekdays before generating instead of an empty schedule',()=>{
    component.weekdays=[];component.generate();expect(component.error()).toContain('thứ học');expect(component.classForm.sessions).toHaveLength(0);
  });
  it('changing a session invalidates the previous conflict check',()=>{
    component.generate();component.previewed.set(true);component.setTime(component.classForm.sessions[0],'startTime','2026-11-02T19:00');
    expect(component.previewed()).toBe(false);expect(component.classForm.sessions[0].startTime).toBe('2026-11-02T12:00:00.000Z');
  });
  it('renders attendance progress and start/end dates from enrollment',async()=>{
    const fixture=TestBed.createComponent(CoursesComponent);fixture.detectChanges();
    await vi.waitFor(()=>expect(fixture.componentInstance.busy()).toBe(false));
    fixture.componentInstance.enrollment.set({id:'enrollment',enrollmentCode:'CE01',courseClassId:'class',studentId:'student',studentName:'Học viên',studentPhone:'',className:'Yoga nền tảng',classCode:'YG01',courseName:'Yoga',branchName:'An Yên',status:'ACTIVE',orderId:'order',paymentStatus:'PAID',totalAmount:500000,reservedUntil:'2026-11-01T00:00:00Z',plannedSessions:12,attendedSessions:5,heldSessions:6,startTime:'2026-11-02T11:00:00Z',endTime:'2026-12-09T12:00:00Z',sessions:[]});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('5 / 12 buổi');
    expect(fixture.nativeElement.textContent).toContain('02/11/2026');
    expect(fixture.nativeElement.textContent).toContain('09/12/2026');
    expect(fixture.nativeElement.querySelector('progress').value).toBe(5);
  });
  it('correctly cleans up redundant session topic prefixes',()=>{
    expect(component.sessionTopic({sessionTitle:'Buổi 1: Thấu hiểu cột sống',sessionNumber:1})).toBe('Thấu hiểu cột sống');
    expect(component.sessionTopic({title:'Buổi 2 - Mở khớp háng',sessionNumber:2})).toBe('Mở khớp háng');
    expect(component.sessionTopic({sessionTitle:'Buổi 3 · Giới thiệu định tuyến',sessionNumber:3})).toBe('Giới thiệu định tuyến');
    expect(component.sessionTopic({sessionTitle:'Buổi 1',sessionNumber:1})).toBe('');
    expect(component.sessionTopic({sessionTitle:'Thực hành Chuông Xoay',sessionNumber:4})).toBe('Thực hành Chuông Xoay');
    expect(component.sessionTopic(null)).toBe('');
  });
  it('renders class schedule table cleanly without squashed column or duplicated session label',async()=>{
    const fixture=TestBed.createComponent(CoursesComponent);fixture.detectChanges();
    await vi.waitFor(()=>expect(fixture.componentInstance.busy()).toBe(false));
    fixture.componentInstance.selected.set({
      id:'class-1',courseId:'course',code:'CLASS-01',name:'Khóa Trị Liệu',courseName:'Khóa Trị Liệu',description:'',
      branchId:'b1',branchName:'Cơ sở 1',plannedSessions:1,maxCapacity:20,tuitionFee:3600000,status:'OPEN',
      startTime:'2026-11-30T05:00:00+07:00',endTime:'2026-11-30T06:00:00+07:00',enrolledCount:0,heldSessions:0,
      sessions:[{
        id:'sess-1',sessionNumber:1,roomId:'r1',instructorId:'i1',roomName:'Studio Lotus',instructorName:'Trần Minh Tuấn',
        startTime:'2026-11-30T05:00:00+07:00',endTime:'2026-11-30T06:00:00+07:00',status:'SCHEDULED',
        sessionTitle:'Buổi 1: Thấu hiểu cấu trúc cột sống',plannedContent:'Chi tiết buổi 1'
      }]
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.th-session')?.textContent).toContain('Buổi Học & Nội Dung');
    expect(compiled.querySelector('.session-pill')?.textContent).toContain('Buổi 1');
    expect(compiled.querySelector('.session-topic-title')?.textContent).toContain('Thấu hiểu cấu trúc cột sống');
    expect(compiled.querySelector('.session-plan-desc')?.textContent).toContain('Chi tiết buổi 1');
    expect(compiled.querySelector('.time-primary')?.textContent).toContain('05:00 – 06:00');
  });
});

describe('Selling courses and paying online', () => {
  const openClass = { id: 'class-1', courseId: 'course', code: 'YG01', name: 'Yoga nền tảng', courseName: 'Yoga', description: '',
    branchId: 'b-1', branchName: 'An Yên Q1', plannedSessions: 12, maxCapacity: 20, tuitionFee: 2400000, status: 'OPEN',
    startTime: '2026-12-01T11:00:00Z', endTime: '2027-01-10T12:00:00Z', enrolledCount: 3, heldSessions: 0, sessions: [] };
  const pending = { id: 'enr-1', enrollmentCode: 'CE01', courseClassId: 'class-1', studentId: 'student-1', studentName: 'Lan', studentPhone: '0901',
    className: 'Yoga nền tảng', classCode: 'YG01', courseName: 'Yoga', branchName: 'An Yên Q1', status: 'PENDING_PAYMENT', orderId: 'order-1',
    paymentStatus: 'PENDING', totalAmount: 2400000, reservedUntil: '2026-11-20T00:00:00Z', plannedSessions: 12, attendedSessions: 0,
    heldSessions: 0, startTime: '2026-12-01T11:00:00Z', endTime: '2027-01-10T12:00:00Z', sessions: [] };
  const link = { id: 'link-1', paymentId: 'p', orderId: 'order-1', provider: 'PAYOS', providerOrderCode: 100777, status: 'CREATED', amount: 2400000,
    checkoutUrl: null, qrPayload: '000201', expiresAt: new Date(Date.now() + 600_000).toISOString(), paidAt: null, paymentStatus: 'PENDING',
    orderStatus: 'PENDING', activatedMembershipCode: null };

  let courseApi: Record<string, ReturnType<typeof vi.fn>>;
  let selfCheckout: Record<string, ReturnType<typeof vi.fn>>;
  let posApi: Record<string, ReturnType<typeof vi.fn>>;
  let users: Record<string, ReturnType<typeof vi.fn>>;

  function setUp(student: boolean) {
    courseApi = {
      courses: vi.fn().mockReturnValue(of([])), classes: vi.fn().mockReturnValue(of([openClass])), mine: vi.fn().mockReturnValue(of([])),
      detail: vi.fn().mockReturnValue(of(openClass)), roster: vi.fn().mockReturnValue(of([])),
      enroll: vi.fn().mockReturnValue(of(pending)), enrollment: vi.fn().mockReturnValue(of(pending))
    };
    selfCheckout = { startOnlinePayment: vi.fn().mockReturnValue(of(link)), getOnlinePayment: vi.fn().mockReturnValue(of(link)), cancelOrder: vi.fn() };
    posApi = { startOnlinePayment: vi.fn().mockReturnValue(of({ ...link, providerOrderCode: 100888 })), getOnlinePayment: vi.fn().mockReturnValue(of(link)) };
    users = {};
    TestBed.configureTestingModule({ imports: [CoursesComponent], providers: [provideExperimentalZonelessChangeDetection(), provideRouter([]),
      { provide: AuthService, useValue: { isSuperAdmin: () => false, isBranchManager: () => false, isStudent: () => student, canAccessPos: () => !student,
        branchIds: () => ['b-1'], userHomeBranchId: () => 'b-1', currentUserId: () => student ? 'student-1' : 'staff-1' } },
      { provide: CourseApi, useValue: courseApi }, { provide: ScheduleApi, useValue: { getBranches: () => of([{ id: 'b-1', name: 'An Yên Q1' }]) } },
      { provide: PosApi, useValue: posApi }, { provide: UserApi, useValue: users }, { provide: SelfCheckoutApi, useValue: selfCheckout }] });
  }

  async function render() {
    const fixture = TestBed.createComponent(CoursesComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
    fixture.detectChanges();
    return fixture;
  }

  function button(fixture: { nativeElement: HTMLElement }, label: string): HTMLButtonElement {
    const found = [...fixture.nativeElement.querySelectorAll('button')].find(b => b.textContent?.includes(label)) as HTMLButtonElement;
    expect(found, label).toBeTruthy();
    return found;
  }

  async function settle(fixture: { detectChanges(): void; componentInstance: CoursesComponent }) {
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
    fixture.detectChanges();
  }

  it('sends a receptionist to the POS checkout with the course preselected instead of selling here', async () => {
    setUp(false);
    const fixture = await render();
    const rowButtons = [...fixture.nativeElement.querySelectorAll('button')].map((b: HTMLButtonElement) => b.textContent?.trim());
    expect(rowButtons.some(t => t?.includes('Bán khóa'))).toBe(false);

    button(fixture, 'Chi tiết').click();
    await settle(fixture);

    const link = fixture.nativeElement.querySelector('a[href^="/membership/pos"]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/membership/pos?courseId=class-1&branchId=b-1');
    expect(link.textContent).toContain('Ghi danh');
    expect(fixture.nativeElement.querySelector('input[name=studentQuery]')).toBeNull();
    expect(courseApi['enroll']).not.toHaveBeenCalled();
  });

  it('lets a student enroll, then sends them to the shared checkout page', async () => {
    setUp(true);
    const fixture = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button(fixture, 'Đăng ký').click();
    await settle(fixture);

    button(fixture, 'Đăng ký và thanh toán').click();
    await settle(fixture);
    expect(courseApi['enroll']).toHaveBeenCalledWith('class-1', 'student-1');
    expect(navigate).toHaveBeenCalledWith(['/membership/checkout', 'order-1']);
    expect(selfCheckout['startOnlinePayment']).not.toHaveBeenCalled();
  });

  it('puts the row buttons of a class on one line', async () => {
    setUp(true);
    const fixture = await render();
    const row = fixture.nativeElement.querySelector('.row-actions') as HTMLElement;
    expect([...row.querySelectorAll('button')].map(b => b.textContent?.trim())).toEqual(['Đăng ký', 'Chi tiết']);
  });

  it('sends a pending enrollment from the student\u2019s course list to the checkout page', async () => {
    setUp(true);
    courseApi['mine'].mockReturnValue(of([pending]));
    const fixture = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.switchView('mine');
    fixture.detectChanges();

    button(fixture, 'Thanh toán').click();
    expect(navigate).toHaveBeenCalledWith(['/membership/checkout', 'order-1']);
  });
});
