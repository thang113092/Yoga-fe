export interface RevenueFilterReq {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  branchId?: string;
  paymentMethod?: string;
}

export interface KpiOverview {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalMembershipsActivated: number;
}

export interface DailyTrend {
  date: string; // YYYY-MM-DD
  amount: number;
  orderCount: number;
}

export interface PaymentMethodSummary {
  paymentMethod: string;
  methodName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface PlanRevenueSummary {
  planId: string;
  planName: string;
  quantitySold: number;
  totalRevenue: number;
  percentage: number;
}

export interface BranchRevenueSummary {
  branchId: string;
  branchCode: string;
  branchName: string;
  totalRevenue: number;
  orderCount: number;
  percentage: number;
}

export interface RecentTransaction {
  orderId: string;
  orderCode: string;
  paymentId: string;
  paymentCode: string;
  paymentTime: string;
  branchId: string;
  branchName: string;
  customerName: string;
  customerPhone: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  paymentMethodName: string;
  cashierName: string;
  status: string;
}

export interface RevenueReportResponse {
  overview: KpiOverview;
  dailyTrends: DailyTrend[];
  paymentMethodSummaries: PaymentMethodSummary[];
  planSummaries: PlanRevenueSummary[];
  branchSummaries: BranchRevenueSummary[];
  recentTransactions: RecentTransaction[];
  fromDate: string;
  toDate: string;
  filteredBranchId: string | null;
  filteredBranchName: string | null;
}
