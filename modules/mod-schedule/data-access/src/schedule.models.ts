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
  /** ONLINE for classes taught in a virtual room (Zoom); HYBRID for studio classes also streamed on Zoom. */
  deliveryMode?: DeliveryMode;
  /** HYBRID: the online (VIRTUAL) room of the same branch whose Zoom account streams the class. */
  liveRoomId?: string | null;
  /** HYBRID: online seats; maxCapacity/bookedCount/availableSlots are the studio seats. */
  onlineCapacity?: number;
  onlineBookedCount?: number;
}

export type DeliveryMode = 'IN_PERSON' | 'ONLINE' | 'HYBRID';

/** The seat a booking takes: studio mat or online (Zoom). Required when booking a HYBRID class. */
export type AttendanceMode = 'IN_PERSON' | 'ONLINE';

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
  /** Required for HYBRID classes; omitted for other classes. */
  attendanceMode?: AttendanceMode;
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
  /** Retired V12 branch that held online classes; online classes now belong to each studio branch. */
  isVirtual?: boolean;
  isActive?: boolean;
}

export interface StudentPassItem {
  id: string;
  membershipCode: string;
  planId: string;
  status: string;
  isAllBranches: boolean;
  /** STUDIO, ONLINE or HYBRID (V14); missing means STUDIO. */
  accessScope?: string;
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
  deliveryMode?: DeliveryMode;
  /** Seat of the booking; ONLINE seats join on Zoom, IN_PERSON seats check in by QR. */
  attendanceMode?: AttendanceMode;
}

export interface WaitlistJoinReq {
  scheduleId: string;
  studentId: string;
  membershipId: string;
  /** Required for HYBRID classes: the seat type the student waits for. */
  attendanceMode?: AttendanceMode;
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
  roomType?: 'PHYSICAL' | 'VIRTUAL';
  liveHostAccount?: string | null;
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
  /** HYBRID: online room (VIRTUAL, same branch) that streams the studio class. */
  liveRoomId?: string;
  /** HYBRID: number of online seats, 1..live room capacity. */
  onlineCapacity?: number;
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


export interface OnlineJoinResp {
  bookingId: string;
  scheduleId: string;
  joinUrl: string;
  startTime: string;
  endTime: string;
}

export type OnlineMeetingStatus = 'PENDING' | 'READY' | 'UPDATE_PENDING' | 'CANCEL_PENDING' | 'CANCELLED' | 'STARTED' | 'ENDED' | 'MISSING';

export interface OnlineSessionInfo {
  scheduleId: string;
  providerConfigured: boolean;
  meetingStatus: OnlineMeetingStatus;
  lastError?: string | null;
  syncAttempts: number;
  startedAt?: string | null;
  endedAt?: string | null;
  registeredCount: number;
  pendingCount: number;
  /** Zoom host link; only for the class instructor or managers, from an hour before class. */
  startUrl?: string | null;
  hostLinkOpensAt: string;
  /** false: Zoom Basic test mode, every student gets the same meeting link. */
  personalLinks?: boolean;
}
