export interface ClassSchedule {
  courseClassId?: string;
  sessionNumber?: number;
  id: string;
  branchId: string;
  branchName?: string;
  roomId: string;
  instructorId: string;
  className: string;
  instructorName: string;
  roomName: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  bookedCount: number;
  availableSlots: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface Booking {
  id: string;
  bookingCode: string;
  scheduleId: string;
  studentId: string;
  membershipId: string;
  matNumber?: number;
  status: 'CONFIRMED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW';
  bookingTime: string;
}

export interface CreateBookingReq {
  scheduleId: string;
  studentId: string;
  membershipId: string;
  matNumber?: number;
}

export interface CheckInReq {
  bookingId?: string;
  bookingCode?: string;
  studentId?: string;
  scheduleId?: string;
  branchId?: string;
  checkedInBy?: string;
  checkInMethod?: 'QR_SCAN' | 'MANUAL_STAFF' | 'INSTRUCTOR_CONFIRM';
  notes?: string;
}

export interface CheckInResp {
  attendanceId: string;
  bookingId: string;
  bookingCode: string;
  studentId: string;
  studentName: string;
  className: string;
  branchName: string;
  checkedInAt: string;
  attendanceStatus: 'PRESENT' | 'LATE' | 'LEFT_EARLY';
  matNumber?: number;
  alreadyCheckedIn: boolean;
}

export interface BranchItem {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
}

export interface StudentPassItem {
  id: string;
  membershipCode: string;
  planId: string;
  status: string;
  isAllBranches: boolean;
  registeredBranchId: string;
  totalSessions: number | null;
  remainingSessions: number | null;
  startDate: string;
  endDate: string | null;
}

export interface StudentBookingDetail {
  id: string;
  bookingCode: string;
  scheduleId: string;
  className: string;
  instructorName: string;
  roomName: string;
  branchName: string;
  startTime: string;
  endTime: string;
  matNumber?: number;
  status: 'CONFIRMED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW';
  bookingTime: string;
  canCancel: boolean;
}

export interface WaitlistJoinReq {
  scheduleId: string;
  studentId: string;
  membershipId: string;
}

export interface WaitlistResp {
  id: string;
  scheduleId: string;
  studentId: string;
  membershipId: string;
  queuePosition: number;
  status: 'WAITING' | 'CONVERTED' | 'CANCELLED' | 'EXPIRED';
  convertedBookingId?: string;
  createdAt: string;
}

export interface StudentWaitlistResp {
  id: string;
  scheduleId: string;
  className: string;
  instructorName: string;
  roomName: string;
  branchName: string;
  startTime: string;
  endTime: string;
  queuePosition: number;
  status: 'WAITING' | 'CONVERTED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
}

export interface ClassTypeItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  defaultDurationMinutes: number;
  intensityLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS' | string;
  isActive: boolean;
}

export interface CreateClassTypeReq {
  code: string;
  name: string;
  description?: string;
  defaultDurationMinutes: number;
  intensityLevel: string;
}

export interface RoomItem {
  id: string;
  branchId: string;
  name: string;
  floor?: string;
  maxCapacity: number;
  isActive: boolean;
}

export interface InstructorItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  roleCode?: string;
  homeBranchId?: string;
}

export interface CreateScheduleReq {
  branchId: string;
  roomId: string;
  classTypeId: string;
  instructorId: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
}

export interface ScheduleAttendee {
  id: string;
  bookingCode: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentEmail?: string;
  studentGender?: string;
  matNumber?: number;
  status: 'CONFIRMED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW';
  bookingTime: string;
  checkedInAt?: string;
}

export interface WorkoutHistoryItem {
  bookingId: string;
  bookingCode: string;
  scheduleId: string;
  className: string;
  intensityLevel?: string;
  instructorName: string;
  roomName: string;
  branchName: string;
  branchId?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  matNumber?: number;
  status: string;
  checkedInAt?: string;
  checkInMethod?: string;
  attendanceStatus?: string;
  membershipCode?: string;
  notes?: string;
}

