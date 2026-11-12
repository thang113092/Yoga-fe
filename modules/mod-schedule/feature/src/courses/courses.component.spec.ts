import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService, UserApi } from '@yoga/platform/auth';
import { CourseApi, OnlineClassApi, ScheduleApi } from '@yoga/mod-schedule/data-access';
import { PosApi, SelfCheckoutApi } from '@yoga/mod-membership/data-access';
import { ZenToastService } from '@yoga/platform/ui';
import { CoursesComponent } from './courses.component';

describe('Course schedules',()=>{
  let component:CoursesComponent;
  beforeEach(()=>{
    TestBed.configureTestingModule({imports:[CoursesComponent],providers:[provideExperimentalZonelessChangeDetection(),provideRouter([]),
      {provide:AuthService,useValue:{isSuperAdmin:()=>true,isBranchManager:()=>false,isInstructor:()=>false,isStudent:()=>false,canAccessPos:()=>true,branchIds:()=>[],userHomeBranchId:()=>null,currentUserId:()=> 'admin'}},
      {provide:CourseApi,useValue:{courses:()=>of([]),classes:()=>of([])}},{provide:ScheduleApi,useValue:{getBranches:()=>of([])}},{provide:PosApi,useValue:{}},{provide:UserApi,useValue:{}},{provide:SelfCheckoutApi,useValue:{}},{provide:OnlineClassApi,useValue:{}}]});
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
      { provide: AuthService, useValue: { isSuperAdmin: () => false, isBranchManager: () => false, isInstructor: () => false, isStudent: () => student, canAccessPos: () => !student,
        branchIds: () => ['b-1'], userHomeBranchId: () => 'b-1', currentUserId: () => student ? 'student-1' : 'staff-1' } },
      { provide: CourseApi, useValue: courseApi }, { provide: ScheduleApi, useValue: { getBranches: () => of([{ id: 'b-1', name: 'An Yên Q1' }]) } },
      { provide: PosApi, useValue: posApi }, { provide: UserApi, useValue: users }, { provide: SelfCheckoutApi, useValue: selfCheckout },
      { provide: OnlineClassApi, useValue: {} }] });
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

describe('Online courses', () => {
  const rooms = [
    { id: 'r-1', branchId: 'b-1', name: 'Studio Sen', maxCapacity: 20, isActive: true, roomType: 'PHYSICAL' },
    { id: 'v-1', branchId: 'b-1', name: 'Zoom 1', maxCapacity: 100, isActive: true, roomType: 'VIRTUAL', liveHostAccount: 'host@zoom' },
    { id: 'v-off', branchId: 'b-1', name: 'Zoom cũ', maxCapacity: 100, isActive: false, roomType: 'VIRTUAL' }
  ];
  const course = { id: 'course', code: 'C', name: 'Yoga', description: '', classTypeId: 'type', totalSessions: 2, defaultDurationMinutes: 60, defaultFee: 500000 };
  const minutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
  const onlineSession = (over: Record<string, unknown> = {}) => ({ id: 's-1', sessionNumber: 1, roomId: 'v-1', instructorId: 'i-1', roomName: 'Zoom 1',
    instructorName: 'Minh', startTime: minutes(5), endTime: minutes(65), status: 'SCHEDULED', deliveryMode: 'ONLINE', bookingId: 'bk-1',
    bookingCode: 'BK-1', bookingStatus: 'CONFIRMED', attendanceState: 'UPCOMING', ...over });
  const enrollment = (over: Record<string, unknown> = {}) => ({ id: 'enr-1', enrollmentCode: 'CE01', courseClassId: 'class-1', studentId: 'student-1',
    studentName: 'Lan', studentPhone: '', className: 'Yoga online', classCode: 'YO1', courseName: 'Yoga', branchName: 'An Yên Q1', status: 'ACTIVE',
    orderId: 'order-1', paymentStatus: 'PAID', totalAmount: 500000, reservedUntil: minutes(60), plannedSessions: 2, attendedSessions: 0, heldSessions: 0,
    startTime: minutes(5), endTime: minutes(2000), deliveryMode: 'ONLINE', sessions: [onlineSession(), onlineSession({ id: 's-2', sessionNumber: 2,
      bookingId: 'bk-2', startTime: minutes(1440), endTime: minutes(1500) })], ...over });

  let courseApi: Record<string, ReturnType<typeof vi.fn>>;
  let onlineApi: Record<string, ReturnType<typeof vi.fn>>;

  function setUp(student: boolean, classes: unknown[] = []) {
    courseApi = { courses: vi.fn().mockReturnValue(of([course])), classes: vi.fn().mockReturnValue(of(classes)), mine: vi.fn().mockReturnValue(of([])),
      preview: vi.fn().mockReturnValue(of([])), enrollment: vi.fn().mockReturnValue(of(enrollment())) };
    onlineApi = { join: vi.fn().mockReturnValue(of({ joinUrl: 'https://zoom.us/w/9?tk=x' })), getSession: vi.fn().mockReturnValue(of(null)), resync: vi.fn() };
    TestBed.configureTestingModule({ imports: [CoursesComponent], providers: [provideExperimentalZonelessChangeDetection(), provideRouter([]),
      { provide: AuthService, useValue: { isSuperAdmin: () => !student, isBranchManager: () => false, isInstructor: () => false, isReceptionist: () => false,
        isStudent: () => student, canAccessPos: () => !student, branchIds: () => ['b-1'], userHomeBranchId: () => 'b-1',
        currentUserId: () => student ? 'student-1' : 'admin' } },
      { provide: CourseApi, useValue: courseApi },
      { provide: ScheduleApi, useValue: { getBranches: () => of([{ id: 'b-1', name: 'An Yên Q1' }]), getRoomsByBranch: () => of(rooms),
        getInstructors: () => of([{ id: 'i-1', fullName: 'Minh' }]) } },
      { provide: PosApi, useValue: {} }, { provide: UserApi, useValue: {} }, { provide: SelfCheckoutApi, useValue: {} },
      { provide: OnlineClassApi, useValue: onlineApi }] });
  }

  async function render() {
    const fixture = TestBed.createComponent(CoursesComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
    fixture.detectChanges();
    return fixture;
  }

  const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')] as HTMLButtonElement[];

  it('offers only physical rooms for an in-person class and only online rooms for an online class', async () => {
    setUp(false);
    const page = (await render()).componentInstance;
    page.openClass();
    await vi.waitFor(() => expect(page.busy()).toBe(false));
    expect(page.classForm.deliveryMode).toBe('IN_PERSON');
    expect(page.rooms().map(r => r.id)).toEqual(['r-1']);
    expect(page.roomId).toBe('r-1');

    page.startDate = '2030-11-04'; page.weekdays = [1, 3];
    page.generate();
    expect(page.classForm.sessions.map(s => s.roomId)).toEqual(['r-1', 'r-1']);

    page.setDeliveryMode('ONLINE');
    expect(page.rooms().map(r => r.id)).toEqual(['v-1']);
    expect(page.roomId).toBe('v-1');
    expect(page.classForm.sessions.map(s => s.roomId)).toEqual(['v-1', 'v-1']);

    page.setDeliveryMode('IN_PERSON');
    expect(page.roomId).toBe('r-1');
    expect(page.classForm.sessions.map(s => s.roomId)).toEqual(['r-1', 'r-1']);
  });

  it('sends the delivery mode with the schedule check', async () => {
    setUp(false);
    const page = (await render()).componentInstance;
    page.openClass();
    await vi.waitFor(() => expect(page.busy()).toBe(false));
    page.setDeliveryMode('ONLINE');
    page.startDate = '2030-11-04'; page.weekdays = [1, 3];
    page.generate();
    page.checkSchedule();
    await vi.waitFor(() => expect(page.previewed()).toBe(true));
    expect(courseApi['preview']).toHaveBeenCalledWith(expect.objectContaining({ deliveryMode: 'ONLINE',
      sessions: [expect.objectContaining({ roomId: 'v-1' }), expect.objectContaining({ roomId: 'v-1' })] }));
  });

  it('limits the change-session dialog to rooms of the class\u2019s mode', async () => {
    setUp(false);
    const page = (await render()).componentInstance;
    page.selected.set({ id: 'class-1', courseId: 'course', code: 'YO1', name: 'Yoga online', courseName: 'Yoga', description: '', branchId: 'b-1',
      branchName: 'An Yên Q1', plannedSessions: 2, maxCapacity: 20, tuitionFee: 0, status: 'OPEN', startTime: minutes(5), endTime: minutes(65),
      enrolledCount: 0, heldSessions: 0, deliveryMode: 'ONLINE', sessions: [] });
    await page.editSession(onlineSession() as any);
    expect(page.rooms().map(r => r.id)).toEqual(['v-1']);
    expect(page.editing()?.roomId).toBe('v-1');
  });

  it('marks online classes in the catalog and filters by delivery mode', async () => {
    const base = { courseId: 'course', courseName: 'Yoga', description: '', branchId: 'b-1', branchName: 'An Yên Q1', plannedSessions: 2,
      maxCapacity: 20, tuitionFee: 0, status: 'OPEN', startTime: minutes(5), endTime: minutes(65), enrolledCount: 0, heldSessions: 0, sessions: [] };
    setUp(true, [{ ...base, id: 'on', code: 'ON', name: 'Yoga online', deliveryMode: 'ONLINE' }, { ...base, id: 'off', code: 'OFF', name: 'Yoga tại phòng', deliveryMode: 'IN_PERSON' }]);
    const fixture = await render();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Học qua Zoom');
    expect(fixture.nativeElement.querySelectorAll('.online-badge')).toHaveLength(1);
    fixture.componentInstance.modeFilter.set('ONLINE');
    expect(fixture.componentInstance.filteredClasses().map(c => c.id)).toEqual(['on']);
    fixture.componentInstance.modeFilter.set('IN_PERSON');
    expect(fixture.componentInstance.filteredClasses().map(c => c.id)).toEqual(['off']);
  });

  it('shows a join button instead of the QR code for the next online session', async () => {
    setUp(true);
    const fixture = await render();
    fixture.componentInstance.enrollment.set(enrollment() as any);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('yoga-qr-code')).toBeNull();
    expect(el.textContent).toContain('Học qua Zoom');
    expect(el.textContent).toContain('Online (Zoom)');
    const join = buttons(el).filter(b => b.textContent?.trim() === 'Vào lớp');
    // The next-session card and the first row; the session tomorrow is outside the join window.
    expect(join).toHaveLength(2);

    const tab = { location: { href: '' }, opener: {}, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as any);
    join[0].click();
    expect(onlineApi['join']).toHaveBeenCalledWith('bk-1');
    expect(tab.location.href).toBe('https://zoom.us/w/9?tk=x');
    expect(courseApi['enrollment']).toHaveBeenCalledWith('enr-1');
    open.mockRestore();
  });

  it('offers to rejoin after attending and keeps the QR code for in-person courses', async () => {
    setUp(true);
    const fixture = await render();
    fixture.componentInstance.enrollment.set(enrollment({ sessions: [onlineSession({ attendanceState: 'ATTENDED' })] }) as any);
    fixture.detectChanges();
    expect(buttons(fixture.nativeElement).some(b => b.textContent?.trim() === 'Vào lại lớp')).toBe(true);

    fixture.componentInstance.enrollment.set(enrollment({ deliveryMode: 'IN_PERSON',
      sessions: [onlineSession({ deliveryMode: 'IN_PERSON', startTime: minutes(120), endTime: minutes(180) })] }) as any);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('yoga-qr-code')).toBeTruthy();
    expect(buttons(fixture.nativeElement).some(b => b.textContent?.includes('Vào lớp'))).toBe(false);
  });

  it('asks an unpaid student to pay before entering the online class', async () => {
    setUp(true);
    const fixture = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.enrollment.set(enrollment({ status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' }) as any);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('yoga-qr-code')).toBeNull();
    expect(buttons(el).some(b => b.textContent?.trim() === 'Vào lớp')).toBe(false);
    const pay = buttons(el).find(b => b.textContent?.includes('Thanh toán để vào lớp'));
    expect(pay).toBeTruthy();
    pay!.click();
    expect(navigate).toHaveBeenCalledWith(['/membership/checkout', 'order-1']);
  });

  it('shows the join error in a toast', async () => {
    setUp(true);
    const fixture = await render();
    const toast = TestBed.inject(ZenToastService);
    const error = vi.spyOn(toast, 'error').mockImplementation(() => undefined as any);
    onlineApi['join'].mockReturnValue(throwError(() => ({ error: { message: 'Khóa học chưa được thanh toán.' } })));
    const tab = { location: { href: '' }, opener: {}, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as any);
    const e = enrollment() as any;
    fixture.componentInstance.joinSession(e, e.sessions[0]);
    expect(tab.close).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('Khóa học chưa được thanh toán.');
    expect(fixture.componentInstance.joiningBookingId()).toBeNull();
    open.mockRestore();
  });
});
