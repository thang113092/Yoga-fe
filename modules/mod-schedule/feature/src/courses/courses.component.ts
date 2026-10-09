import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ScheduleApi, BranchItem, RoomItem, InstructorItem, ClassTypeItem } from '@yoga/mod-schedule/data-access';
import { PosApi } from '@yoga/mod-membership/data-access';
import { QrCodeComponent, ZenSelectComponent } from '@yoga/platform/api';
import { CourseApi, Course, CourseClass, CourseSession, CourseEnrollment, CourseConflict, CourseStudent, CreateCourseClass } from '@yoga/mod-schedule/data-access';

@Component({
  selector: 'yoga-courses', standalone: true, imports: [CommonModule, FormsModule, RouterModule, QrCodeComponent, ZenSelectComponent],
  templateUrl: './courses.component.html', styleUrl: './courses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoursesComponent implements OnInit {
  readonly auth=inject(AuthService);
  private readonly api=inject(CourseApi);
  private readonly schedule=inject(ScheduleApi);
  private readonly pos=inject(PosApi);
  private readonly route=inject(ActivatedRoute);
  readonly busy=signal(false); readonly error=signal(''); readonly success=signal('');
  readonly courses=signal<Course[]>([]); readonly classes=signal<CourseClass[]>([]); readonly mine=signal<CourseEnrollment[]>([]);
  readonly branches=signal<BranchItem[]>([]); readonly rooms=signal<RoomItem[]>([]); readonly instructors=signal<InstructorItem[]>([]);
  readonly types=signal<ClassTypeItem[]>([]); readonly students=signal<CourseStudent[]>([]);
  readonly selected=signal<CourseClass|null>(null); readonly enrollment=signal<CourseEnrollment|null>(null); readonly roster=signal<CourseEnrollment[]>([]);
  readonly conflicts=signal<CourseConflict[]>([]); readonly previewed=signal(false); readonly view=signal<'classes'|'mine'|'programs'>('classes');
  readonly form=signal<'course'|'class'|null>(null); readonly editing=signal<CourseSession|null>(null);
  readonly canCreateClass=computed(()=>this.auth.isSuperAdmin()||this.auth.isBranchManager());
  readonly canEnroll=computed(()=>this.auth.canAccessPos()||this.auth.isStudent());
  readonly searchQuery = signal('');
  readonly filteredClasses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.classes();
    return this.classes().filter(c =>
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
  branchId='ALL'; studentId=''; paymentMethod: 'CASH'|'POS_CARD'|'BANK_TRANSFER_QR'='CASH'; paymentReference='';
  private paymentKeys=new Map<string,string>();
  courseForm: Omit<Course,'id'>={code:'',name:'',description:'',classTypeId:'',totalSessions:12,defaultDurationMinutes:60,defaultFee:0};
  classForm: CreateCourseClass={courseId:'',branchId:'',code:'',name:'',maxCapacity:20,tuitionFee:0,sessions:[]};
  startDate=''; startTime='18:00'; duration=60; roomId=''; instructorId=''; weekdays=[1,3];
  readonly days=[{value:1,label:'Thứ Hai'},{value:2,label:'Thứ Ba'},{value:3,label:'Thứ Tư'},{value:4,label:'Thứ Năm'},{value:5,label:'Thứ Sáu'},{value:6,label:'Thứ Bảy'},{value:0,label:'Chủ Nhật'}];
  private async run(work:()=>Promise<void>) {
    if(this.busy()) return; this.busy.set(true); this.error.set(''); this.success.set('');
    try { await work(); } catch(e: any) { this.error.set(e?.error?.message||e?.message||'Không thể hoàn tất thao tác.'); }
    finally { this.busy.set(false); }
  }
  ngOnInit() { void this.run(async()=>{
    const [courses,branches]=await Promise.all([firstValueFrom(this.api.courses()),firstValueFrom(this.schedule.getBranches())]);
    this.courses.set(courses); this.branches.set(branches.filter(b=>this.auth.isSuperAdmin()||this.auth.isStudent()||this.auth.branchIds().includes(b.id)||b.id===this.auth.userHomeBranchId()));
    this.branchId = (this.auth.isStudent() || this.auth.isSuperAdmin())
      ? 'ALL'
      : (this.auth.userHomeBranchId() || this.branches()[0]?.id || 'ALL');
    await this.reload();
    const id=this.route.snapshot.queryParamMap.get('classId'); if(id) await this.loadDetail(id);
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
    this.form.set('class'); this.previewed.set(false); this.classForm={courseId:this.courses()[0]?.id||'',branchId:(this.branchId && this.branchId !== 'ALL') ? this.branchId : (this.branches()[0]?.id||''),code:'',name:'',maxCapacity:20,tuitionFee:0,sessions:[]};
    this.selectCourse(); void this.run(()=>this.loadResources(this.classForm.branchId));
  }
  selectCourse() { const c=this.courses().find(c=>c.id===this.classForm.courseId); if(c) {this.classForm.name=c.name;this.classForm.tuitionFee=c.defaultFee;this.duration=c.defaultDurationMinutes;} this.invalidate(); }
  private async loadResources(branch: string) {
    const [rooms,instructors]=await Promise.all([firstValueFrom(this.schedule.getRoomsByBranch(branch)),firstValueFrom(this.schedule.getInstructors(branch))]);
    this.rooms.set(rooms.filter(r=>r.isActive)); this.instructors.set(instructors); this.roomId=this.rooms()[0]?.id||'';this.instructorId=instructors[0]?.id||'';
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
    if(this.auth.canAccessPos()) this.students.set(await firstValueFrom(this.api.students(this.selected()!.branchId)));
    this.studentId=this.auth.isStudent()?this.auth.currentUserId()||'':'';
  }
  showClass(id:string) {void this.run(()=>this.loadDetail(id));}
  showEnrollment(id:string) {void this.run(async()=>{this.enrollment.set(await firstValueFrom(this.api.enrollment(id)));this.selected.set(null);});}
  enroll() { const c=this.selected();if(!c||!this.studentId)return;void this.run(async()=>{
    const e=await firstValueFrom(this.api.enroll(c.id,this.auth.isStudent()?this.auth.currentUserId()!:this.studentId));
    this.enrollment.set(e);this.selected.set(null);await this.reload();this.success.set('Đã giữ chỗ cho toàn bộ khóa. Vui lòng thanh toán tại cơ sở trước hạn giữ chỗ.');
  });}
  pay() { const e=this.enrollment();if(!e||!this.auth.canAccessPos())return;void this.run(async()=>{
    let key=this.paymentKeys.get(e.orderId);if(!key){key=crypto.randomUUID();this.paymentKeys.set(e.orderId,key);}
    await firstValueFrom(this.pos.processPayment({orderId:e.orderId,paymentMethod:this.paymentMethod,idempotencyKey:key,cashierId:this.auth.currentUserId()!,transactionReference:this.paymentReference||undefined}));
    this.enrollment.set(await firstValueFrom(this.api.enrollment(e.id)));await this.reload();this.success.set('Đã thu học phí và kích hoạt đăng ký khóa.');
  });}
  cancelPending() {const e=this.enrollment();if(!e)return;void this.run(async()=>{await firstValueFrom(this.pos.cancelPendingOrder(e.orderId));this.enrollment.set(await firstValueFrom(this.api.enrollment(e.id)));await this.reload();this.success.set('Đã hủy đăng ký và giải phóng toàn bộ chỗ học.');});}
  async editSession(s:CourseSession) { await this.run(async()=>{await this.loadResources(this.selected()!.branchId);this.editing.set({...s});}); }
  saveSession() { const s=this.editing(),c=this.selected();if(!s||!c)return;void this.run(async()=>{await firstValueFrom(this.api.changeSession(c.id,s.id!,s));this.editing.set(null);await this.loadDetail(c.id);this.success.set('Đã cập nhật lịch cho tất cả học viên của lớp.');});}
  localTime(iso:string) {return new Date(new Date(iso).getTime()+7*3600000).toISOString().slice(0,16);}
  setTime(s:CourseSession,key:'startTime'|'endTime',value:string) {
    this.invalidate();const date=new Date(value+':00+07:00');
    if(!value||Number.isNaN(date.getTime())) {this.error.set('Vui lòng nhập ngày giờ hợp lệ.');return;}
    this.error.set('');s[key]=date.toISOString();
  }
  future(s:CourseSession) {return new Date(s.startTime).getTime()>Date.now();}
  nextSession(e:CourseEnrollment) {return e.sessions?.find(s=>s.status!=='CANCELLED'&&this.future(s));}
  label(status:string) {return ({OPEN:'Mở đăng ký',IN_PROGRESS:'Đang học',COMPLETED:'Hoàn thành',CANCELLED:'Đã hủy',ACTIVE:'Đang theo học',PENDING_PAYMENT:'Chờ thanh toán',SCHEDULED:'Sắp diễn ra',ATTENDED:'Đã tham dự',ABSENT:'Vắng',UPCOMING:'Chưa điểm danh',PAID:'Đã thanh toán',PENDING:'Chờ thanh toán'} as Record<string,string>)[status]||status;}
}
