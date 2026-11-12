export interface OnlineReportFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  branchId?: string;
}

export interface OnlineReportKpi {
  sessions: number;
  heldSessions: number;
  bookings: number;
  joins: number;
  /** Percent (0-100), one decimal. */
  attendanceRate: number;
  uniqueStudents: number;
  packageRevenue: number;
  courseRevenue: number;
  activeOnlinePasses: number;
  videoPlays: number;
  videoViewers: number;
  videoCompletions: number;
  videoHours: number;
}

export interface OnlineReportBranchRow {
  branchId: string;
  branchName: string;
  sessions: number;
  bookings: number;
  joins: number;
  attendanceRate: number;
}

export interface OnlineReportDailyRow {
  date: string; // YYYY-MM-DD
  joins: number;
  videoPlays: number;
}

export interface OnlineReportPlanRow {
  planName: string;
  accessScope: string;
  sold: number;
  revenue: number;
}

export interface OnlineReportVideoRow {
  videoId: string;
  title: string;
  plays: number;
  viewers: number;
  completions: number;
  hours: number;
}

export interface OnlineReport {
  startDate: string;
  endDate: string;
  branchId: string | null;
  kpi: OnlineReportKpi;
  branches: OnlineReportBranchRow[];
  daily: OnlineReportDailyRow[];
  plans: OnlineReportPlanRow[];
  topVideos: OnlineReportVideoRow[];
}
