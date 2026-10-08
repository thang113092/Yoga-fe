import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { CourseApi, ScheduleApi } from '@yoga/mod-schedule/data-access';
import { PosApi } from '@yoga/mod-membership/data-access';
import { CoursesComponent } from './courses.component';

describe('Course schedules',()=>{
  let component:CoursesComponent;
  beforeEach(()=>{
    TestBed.configureTestingModule({imports:[CoursesComponent],providers:[provideExperimentalZonelessChangeDetection(),provideRouter([]),
      {provide:AuthService,useValue:{isSuperAdmin:()=>true,isBranchManager:()=>false,isStudent:()=>false,canAccessPos:()=>true,branchIds:()=>[],userHomeBranchId:()=>null,currentUserId:()=> 'admin'}},
      {provide:CourseApi,useValue:{courses:()=>of([]),classes:()=>of([])}},{provide:ScheduleApi,useValue:{getBranches:()=>of([])}},{provide:PosApi,useValue:{}}]});
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
});
