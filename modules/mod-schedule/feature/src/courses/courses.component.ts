import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ScheduleApi, BranchItem, RoomItem, InstructorItem, ClassTypeItem, DeliveryMode, OnlineClassApi } from '@yoga/mod-schedule/data-access';
import { PosApi } from '@yoga/mod-membership/data-access';
import { OnlinePaymentPanelComponent } from '@yoga/mod-membership/feature';
import { QrCodeComponent } from '@yoga/platform/api';
import { ZEN_UI, ZenTabItem, ZenToastService, ZenTone } from '@yoga/platform/ui';
import { CourseApi, Course, CourseClass, CourseSession, CourseEnrollment, CourseConflict, CreateCourseClass } from '@yoga/mod-schedule/data-access';
import { OnlineSessionPanelComponent } from '../online-classes/online-session-panel.component';
import { isInOnlineJoinWindow, onlineJoinOpensAt, openOnlineJoin } from '../online-classes/online-join';

/** Online courses use the branch's online (Zoom) rooms, in-person courses its physical rooms. */
export function roomFitsMode(room: RoomItem, mode: DeliveryMode): boolean {
  return (room.roomType ?? 'PHYSICAL') === (mode === 'ONLINE' ? 'VIRTUAL' : 'PHYSICAL');
}

@Component({
  selector: 'yoga-courses', standalone: true, imports: [CommonModule, FormsModule, RouterModule, QrCodeComponent, OnlinePaymentPanelComponent, OnlineSessionPanelComponent, ...ZEN_UI],
  templateUrl: './courses.component.html', styleUrl: './courses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoursesComponent implements OnInit {
  readonly auth=inject(AuthService);
  private readonly api=inject(CourseApi);
  private readonly schedule=inject(ScheduleApi);
  private readonly pos=inject(PosApi);
  private readonly route=inject(ActivatedRoute);
  private readonly router=inject(Router);
  private readonly onlineApi=inject(OnlineClassApi);
  private readonly toast=inject(ZenToastService);
  /** Ticks every 30 s so join buttons appear and disappear on time. */
  readonly now=signal(Date.now());
  readonly joiningBookingId=signal<string|null>(null);
  /** The VietQR being shown for the open enrollment's order: the student paying online, or staff at the desk. */
  /** Staff only: the VietQR shown at the desk for the open enrollment. Students pay on the shared checkout page. */
  readonly onlinePay=signal<{orderId:string}|null>(null);
  readonly busy=signal(false); readonly error=signal(''); readonly success=signal('');
  readonly courses=signal<Course[]>([]); readonly classes=signal<CourseClass[]>([]); readonly mine=signal<CourseEnrollment[]>([]);
  readonly branches=signal<BranchItem[]>([]);
  /** Active rooms of the branch; rooms() keeps only those that fit the delivery mode being edited. */
  readonly branchRooms=signal<RoomItem[]>([]);
  /** Delivery mode of the class being created, or of the class whose session is being changed. */
  readonly formMode=signal<DeliveryMode>('IN_PERSON');
  readonly rooms=computed(()=>this.branchRooms().filter(r=>roomFitsMode(r,this.formMode()))); readonly instructors=signal<InstructorItem[]>([]);
  readonly types=signal<ClassTypeItem[]>([]);
  readonly selected=signal<CourseClass|null>(null); readonly enrollment=signal<CourseEnrollment|null>(null); readonly roster=signal<CourseEnrollment[]>([]);
  readonly conflicts=signal<CourseConflict[]>([]); readonly previewed=signal(false); readonly view=signal<'classes'|'mine'|'programs'>('classes');
  readonly form=signal<'course'|'class'|null>(null); readonly editing=signal<CourseSession|null>(null);
  readonly canCreateClass=computed(()=>this.auth.isSuperAdmin()||this.auth.isBranchManager());
  readonly canEnroll=computed(()=>this.auth.canAccessPos()||this.auth.isStudent());
  readonly tabs=computed<ZenTabItem[]>(()=>[
    ...(this.auth.isStudent()?[]:[{key:'programs',label:'Chương trình học',icon:'book' as const,count:this.courses().length}]),
    {key:'classes',label:'Khóa học',icon:'calendar' as const,count:this.classes().length},
    ...(this.auth.isStudent()?[{key:'mine',label:'Khóa học của tôi',icon:'graduation-cap' as const,count:this.mine().length}]:[])
  ]);
  readonly searchQuery = signal('');
  /** Catalog filter by delivery mode. */
  readonly modeFilter = signal<'ALL'|DeliveryMode>('ALL');
  readonly modeFilterOptions = [
    { value: 'ALL', label: 'Tất cả hình thức' },
    { value: 'IN_PERSON', label: 'Tại phòng' },
    { value: 'ONLINE', label: 'Online' }
  ];
  readonly canSeeZoomRoom = computed(() => this.auth.isSuperAdmin() || this.auth.isBranchManager() || this.auth.isInstructor());
  /** Staff: the online session whose Zoom room is shown (picked in the table, else the next one). */
  readonly zoomSessionId = signal<string|null>(null);
  readonly zoomSession = computed(() => {
    const c = this.selected();
    if (!c || !this.isOnline(c)) return null;
    const live = (c.sessions || []).filter(s => s.id && s.status !== 'CANCELLED' && this.isOnline(s, c));
    return live.find(s => s.id === this.zoomSessionId()) ?? live.find(s => Date.parse(s.endTime) > this.now()) ?? null;
  });
  readonly filteredClasses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const mode = this.modeFilter();
    const byMode = mode === 'ALL' ? this.classes() : this.classes().filter(c => (c.deliveryMode ?? 'IN_PERSON') === mode);
    if (!q) return byMode;
    return byMode.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.branchName && c.branchName.toLowerCase().includes(q))
    );
  });
  readonly filteredMine = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.mine();
    return this.mine().filter(e =>
      (e.className && e.className.toLowerCase().includes(q)) ||
      (e.classCode && e.classCode.toLowerCase().includes(q)) ||
      (e.branchName && e.branchName.toLowerCase().includes(q))
    );
  });
  readonly branchFilterOptions = computed(() => {
    const list = this.branches();
    if (this.auth.isStudent() || this.auth.isSuperAdmin()) {
      return [
        { value: 'ALL', label: 'Tất cả cơ sở', sublabel: 'Toàn bộ hệ thống phòng tập' },
        ...list.map(b => ({ value: b.id, label: b.name, sublabel: b.address }))
      ];
    }
    return list.map(b => ({ value: b.id, label: b.name, sublabel: b.address }));
  });
  branchId='ALL'; studentId=''; paymentMethod: 'CASH'|'POS_CARD'|'BANK_TRANSFER_QR'|'PAYOS'='CASH'; paymentReference='';
  private paymentKeys=new Map<string,string>();
  courseForm: Omit<Course,'id'>={code:'',name:'',description:'',classTypeId:'',totalSessions:12,defaultDurationMinutes:60,defaultFee:0};
  classForm: CreateCourseClass={courseId:'',branchId:'',code:'',name:'',maxCapacity:20,tuitionFee:0,sessions:[],deliveryMode:'IN_PERSON'};
  startDate=''; startTime='18:00'; duration=60; roomId=''; instructorId=''; weekdays=[1,3];
  readonly days=[{value:1,label:'Thứ Hai'},{value:2,label:'Thứ Ba'},{value:3,label:'Thứ Tư'},{value:4,label:'Thứ Năm'},{value:5,label:'Thứ Sáu'},{value:6,label:'Thứ Bảy'},{value:0,label:'Chủ Nhật'}];
  private async run(work:()=>Promise<void>) {
    if(this.busy()) return; this.busy.set(true); this.error.set(''); this.success.set('');
    try { await work(); } catch(e: any) { this.error.set(e?.error?.message||e?.message||'Không thể hoàn tất thao tác.'); }
    finally { this.busy.set(false); }
  }
  constructor() {
    const timer=setInterval(()=>this.now.set(Date.now()),30_000);
    inject(DestroyRef).onDestroy(()=>clearInterval(timer));
  }
  ngOnInit() { void this.run(async()=>{
    const [courses,branches]=await Promise.all([firstValueFrom(this.api.courses()),firstValueFrom(this.schedule.getBranches())]);
    this.courses.set(courses); this.branches.set(branches.filter(b=>this.auth.isSuperAdmin()||this.auth.isStudent()||this.auth.branchIds().includes(b.id)||b.id===this.auth.userHomeBranchId()));
    this.branchId = (this.auth.isStudent() || this.auth.isSuperAdmin())
      ? 'ALL'
      : (this.auth.userHomeBranchId() || this.branches()[0]?.id || 'ALL');
    await this.reload();
    const id=this.route.snapshot.queryParamMap.get('classId'); if(id) await this.loadDetail(id);
    // PayOS sends the student back here with its own parameters; the status is always read from the backend.
    if(this.auth.isStudent() && this.route.snapshot.queryParamMap.has('orderCode')) {
      void this.router.navigate([],{relativeTo:this.route,queryParams:{},replaceUrl:true});
      const pending=this.mine().find(e=>e.status==='PENDING_PAYMENT');
      if(pending) void this.router.navigate(['/membership/checkout',pending.orderId],{queryParams:{check:1}});
    }
  }); }
  private async reload() {
    const bId = this.branchId && this.branchId !== 'ALL' ? this.branchId : undefined;
    this.classes.set(await firstValueFrom(this.api.classes(bId)));
    if(this.auth.isStudent()) this.mine.set(await firstValueFrom(this.api.mine()));
  }
  refresh() { void this.run(()=>this.reload()); }
  filterBranch(id?: string) {
    if (id !== undefined) this.branchId = id;
    this.selected.set(null);
    this.enrollment.set(null);
    this.refresh();
  }
  resizeProgram(count: number) {
    if (!Number.isInteger(count) || count < 1 || count > 120) return;
    this.courseForm.totalSessions = count;
    const previous = this.courseForm.sessions || [];
    this.courseForm.sessions = Array.from({length: count}, (_, i) => previous[i] || {title: 'Buổi ' + (i+1), content: '', durationMinutes: this.courseForm.defaultDurationMinutes});
  }
  updateDefaultDuration(minutes: number) {
    this.courseForm.defaultDurationMinutes = minutes;
    if (this.courseForm.sessions) {
      for (const s of this.courseForm.sessions) {
        s.durationMinutes = minutes;
      }
    }
  }
  openCourse() {
    this.courseForm = {code:'',name:'',description:'',classTypeId:'',totalSessions:12,defaultDurationMinutes:60,defaultFee:0,sessions:[]};
    this.resizeProgram(12); this.form.set('course'); void this.run(async()=>this.types.set(await firstValueFrom(this.api.classTypes()))); }
  saveCourse() {
    const plan = this.courseForm.sessions || [];
    for (const s of plan) {
      s.durationMinutes = this.courseForm.defaultDurationMinutes;
    }
    if (!this.courseForm.defaultDurationMinutes || this.courseForm.defaultDurationMinutes < 15 || this.courseForm.defaultDurationMinutes > 240) {
      this.error.set('Thời lượng mỗi buổi học phải từ 15 đến 240 phút.');
      return;
    }
    if (plan.length !== this.courseForm.totalSessions || plan.some(s => !s.title.trim() || !s.content.trim())) {
      this.error.set('Vui lòng điền tiêu đề và nội dung cho từng buổi học.');
      return;
    }
    void this.run(async()=>{ await firstValueFrom(this.api.createCourse(this.courseForm)); this.courses.set(await firstValueFrom(this.api.courses())); this.form.set(null); this.success.set('Đã tạo chương trình khóa học.'); }); }
  openClassFor(courseId:string) {this.openClass();this.classForm.courseId=courseId;this.selectCourse();}
  openClass() {
    this.form.set('class'); this.previewed.set(false); this.formMode.set('IN_PERSON'); this.classForm={courseId:this.courses()[0]?.id||'',branchId:(this.branchId && this.branchId !== 'ALL') ? this.branchId : (this.branches()[0]?.id||''),code:'',name:'',maxCapacity:20,tuitionFee:0,sessions:[],deliveryMode:'IN_PERSON'};
    this.selectCourse(); void this.run(()=>this.loadResources(this.classForm.branchId));
  }
  selectCourse() { const c=this.courses().find(c=>c.id===this.classForm.courseId); if(c) {this.classForm.name=c.name;this.classForm.tuitionFee=c.defaultFee;this.duration=c.defaultDurationMinutes;} this.invalidate(); }
  private async loadResources(branch: string) {
    const [rooms,instructors]=await Promise.all([firstValueFrom(this.schedule.getRoomsByBranch(branch)),firstValueFrom(this.schedule.getInstructors(branch))]);
    this.branchRooms.set(rooms.filter(r=>r.isActive)); this.instructors.set(instructors); this.roomId=this.rooms()[0]?.id||'';this.instructorId=instructors[0]?.id||'';
  }
  /** Switches the new class between in-person and online; rooms of the other kind are replaced. */
  setDeliveryMode(mode: DeliveryMode) {
    if(this.formMode()===mode) return;
    this.formMode.set(mode); this.classForm.deliveryMode=mode; this.invalidate();
    const fits=new Set(this.rooms().map(r=>r.id));
    if(!fits.has(this.roomId)) this.roomId=this.rooms()[0]?.id||'';
    for(const s of this.classForm.sessions) if(!fits.has(s.roomId)) s.roomId=this.roomId;
  }
  classBranchChanged() { this.invalidate(); void this.run(()=>this.loadResources(this.classForm.branchId)); }
  invalidate() { this.previewed.set(false); this.conflicts.set([]); }
  toggleDay(day:number,checked:boolean) { this.weekdays=checked?[...this.weekdays,day]:this.weekdays.filter(d=>d!==day); this.invalidate(); }
  generate() {
    this.error.set(''); this.invalidate();
    const course=this.courses().find(c=>c.id===this.classForm.courseId);
    if(!course||!this.startDate||!this.startTime||!this.roomId||!this.instructorId||!this.weekdays.length) {this.error.set('Chọn ngày bắt đầu, thứ học, phòng và huấn luyện viên.');return;}
    const sessions:CourseSession[]=[];
    const day=new Date(this.startDate+'T12:00:00+07:00');
    for(let n=0;sessions.length<course.totalSessions&&n<850;n++) {
      const iso=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(day);
      const weekday=new Date(iso+'T00:00:00Z').getUTCDay();
      if(this.weekdays.includes(weekday)) {
        const start=new Date(iso+'T'+this.startTime+':00+07:00');
        const planned = course.sessions?.[sessions.length];
        sessions.push({roomId:this.roomId,instructorId:this.instructorId,startTime:start.toISOString(),endTime:new Date(start.getTime()+(planned?.durationMinutes ?? this.duration)*60000).toISOString(),plannedContent:planned?.content,title:planned?.title || 'Buổi '+(sessions.length+1)});
      }
      day.setTime(day.getTime()+86400000);
    }
    this.classForm.sessions=sessions;
  }
  checkSchedule() { void this.run(async()=>{this.conflicts.set(await firstValueFrom(this.api.preview(this.classForm)));this.previewed.set(true);}); }
  saveClass() { if(!this.previewed()||this.conflicts().length) return;void this.run(async()=>{const c=await firstValueFrom(this.api.createClass(this.classForm));this.form.set(null);await this.reload();await this.loadDetail(c.id);this.success.set('Đã mở lớp và tạo toàn bộ lịch khóa học.');}); }
  private async loadDetail(id:string) {
    this.selected.set(await firstValueFrom(this.api.detail(id)));this.enrollment.set(null);this.roster.set([]);
    if(!this.auth.isStudent()) this.roster.set(await firstValueFrom(this.api.roster(id)));
    this.studentId=this.auth.isStudent()?this.auth.currentUserId()||'':'';
  }
  showClass(id:string) {this.zoomSessionId.set(null);void this.run(()=>this.loadDetail(id));}
  showEnrollment(id:string) {void this.run(()=>this.openEnrollment(id));}
  /** Students pay any pending order on the shared checkout page. */
  checkout(orderId:string) {void this.router.navigate(['/membership/checkout',orderId]);}
  private async openEnrollment(id:string) {this.onlinePay.set(null);this.paymentMethod='CASH';this.enrollment.set(await firstValueFrom(this.api.enrollment(id)));this.selected.set(null);}
  /** Opens the VietQR for the open enrollment: the student's own, or shown by staff at the desk. */
  payOnline() {const e=this.enrollment();if(!e||e.status!=='PENDING_PAYMENT')return;
    if(this.auth.isStudent()) {this.checkout(e.orderId);return;}
    this.error.set('');this.onlinePay.set({orderId:e.orderId});}
  onlinePaid() {const e=this.enrollment();if(!e)return;void this.run(async()=>{this.enrollment.set(await firstValueFrom(this.api.enrollment(e.id)));await this.reload();this.onlinePay.set(null);
    this.success.set('Đã nhận học phí qua VietQR và kích hoạt đăng ký khóa.');});}
  enroll() { const c=this.selected();if(!c||!this.studentId)return;void this.run(async()=>{
    const e=await firstValueFrom(this.api.enroll(c.id,this.auth.isStudent()?this.auth.currentUserId()!:this.studentId));
    if(this.auth.isStudent()) {this.checkout(e.orderId);return;}
    this.enrollment.set(e);this.selected.set(null);await this.reload();
    this.paymentMethod='CASH';
    this.success.set('Đã giữ chỗ cho học viên. Thu học phí bên dưới để kích hoạt đăng ký.');
  });}
  pay() { const e=this.enrollment();if(!e||!this.auth.canAccessPos())return;if(this.paymentMethod==='PAYOS'){this.payOnline();return;}void this.run(async()=>{
    let key=this.paymentKeys.get(e.orderId);if(!key){key=crypto.randomUUID();this.paymentKeys.set(e.orderId,key);}
    await firstValueFrom(this.pos.processPayment({orderId:e.orderId,paymentMethod:this.paymentMethod,idempotencyKey:key,cashierId:this.auth.currentUserId()!,transactionReference:this.paymentReference||undefined}));
    this.enrollment.set(await firstValueFrom(this.api.enrollment(e.id)));await this.reload();this.success.set('Đã thu học phí và kích hoạt đăng ký khóa.');
  });}
  cancelPending() {const e=this.enrollment();if(!e)return;void this.run(async()=>{await firstValueFrom(this.pos.cancelPendingOrder(e.orderId));this.enrollment.set(await firstValueFrom(this.api.enrollment(e.id)));await this.reload();this.success.set('Đã hủy đăng ký và giải phóng toàn bộ chỗ học.');});}
  async editSession(s:CourseSession) { await this.run(async()=>{const c=this.selected()!;this.formMode.set(c.deliveryMode??'IN_PERSON');await this.loadResources(c.branchId);this.editing.set({...s});}); }
  saveSession() { const s=this.editing(),c=this.selected();if(!s||!c)return;void this.run(async()=>{await firstValueFrom(this.api.changeSession(c.id,s.id!,s));this.editing.set(null);await this.loadDetail(c.id);this.success.set('Đã cập nhật lịch cho tất cả học viên của lớp.');});}
  localTime(iso:string) {return new Date(new Date(iso).getTime()+7*3600000).toISOString().slice(0,16);}
  setTime(s:CourseSession,key:'startTime'|'endTime',value:string) {
    this.invalidate();const date=new Date(value+':00+07:00');
    if(!value||Number.isNaN(date.getTime())) {this.error.set('Vui lòng nhập ngày giờ hợp lệ.');return;}
    this.error.set('');s[key]=date.toISOString();
  }
  future(s:CourseSession) {return new Date(s.startTime).getTime()>Date.now();}
  sessionTopic(s?: { sessionTitle?: string; title?: string; sessionNumber?: number } | null): string {
    if (!s) return '';
    const raw = (s.sessionTitle || s.title || '').trim();
    if (!raw) return '';
    if (/^Buổi\s*\d+$/i.test(raw)) return '';
    const cleaned = raw.replace(/^Buổi\s*\d+\s*[:\-·\.]\s*/i, '').trim();
    return cleaned || raw;
  }
  /** In-person: the next session to come. Online: also a session in progress, which can still be joined. */
  nextSession(e:CourseEnrollment) {
    if(this.isOnline(e)) return e.sessions?.find(s=>s.status!=='CANCELLED'&&Date.parse(s.endTime)>this.now());
    return e.sessions?.find(s=>s.status!=='CANCELLED'&&this.future(s));
  }
  isOnline(item?: {deliveryMode?: DeliveryMode}|null, parent?: {deliveryMode?: DeliveryMode}|null): boolean {
    return (item?.deliveryMode ?? parent?.deliveryMode) === 'ONLINE';
  }
  /** A student of a paid online course may enter from 15 minutes before a session until it ends. */
  canJoin(e:CourseEnrollment,s:CourseSession): boolean {
    if(!this.auth.isStudent()||e.status!=='ACTIVE'||!s.bookingId||!this.isOnline(s,e)) return false;
    if(s.status==='CANCELLED'||s.bookingStatus==='CANCELLED'||s.attendanceState==='CANCELLED') return false;
    return isInOnlineJoinWindow(s.startTime,s.endTime,this.now());
  }
  joinOpensAt(s:CourseSession) {return onlineJoinOpensAt(s.startTime);}
  joinSession(e:CourseEnrollment,s:CourseSession) {
    if(this.joiningBookingId()||!s.bookingId) return;
    const firstJoin=s.attendanceState!=='ATTENDED';
    this.joiningBookingId.set(s.bookingId);
    openOnlineJoin(this.onlineApi.join(s.bookingId),{
      joined:()=>{
        this.joiningBookingId.set(null);
        if(!firstJoin) return;
        this.toast.success('Đã điểm danh buổi '+(s.sessionNumber??'')+' lớp '+e.className+'. Chúc bạn buổi tập vui vẻ!');
        this.api.enrollment(e.id).subscribe({next:fresh=>{if(this.enrollment()?.id===fresh.id) this.enrollment.set(fresh);},error:()=>undefined});
      },
      failed:(err)=>{
        this.joiningBookingId.set(null);
        this.toast.error(err?.error?.message||'Không thể vào lớp online. Vui lòng thử lại.');
      }
    });
  }
  switchView(key:string) {this.view.set(key as 'classes'|'mine'|'programs');this.selected.set(null);this.enrollment.set(null);this.onlinePay.set(null);}
  tone(status?:string|null):ZenTone {return ({OPEN:'success',IN_PROGRESS:'info',COMPLETED:'neutral',CANCELLED:'neutral',ACTIVE:'success',PENDING_PAYMENT:'warning',SCHEDULED:'info',ATTENDED:'success',ABSENT:'danger',UPCOMING:'neutral',PAID:'success',PENDING:'warning'} as Record<string,ZenTone>)[status||'']||'neutral';}
  percent(part:number,total:number) {return total?Math.min(100,(part/total)*100):0;}
  label(status:string) {return ({OPEN:'Mở đăng ký',IN_PROGRESS:'Đang học',COMPLETED:'Hoàn thành',CANCELLED:'Đã hủy',ACTIVE:'Đang theo học',PENDING_PAYMENT:'Chờ thanh toán',SCHEDULED:'Sắp diễn ra',ATTENDED:'Đã tham dự',ABSENT:'Vắng',UPCOMING:'Chưa điểm danh',PAID:'Đã thanh toán',PENDING:'Chờ thanh toán'} as Record<string,string>)[status]||status;}
}
