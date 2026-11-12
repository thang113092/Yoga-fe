export type PlanType = 'TIME_BASED' | 'SESSION_BASED' | 'COMBO';
export type PaymentMethod = 'CASH' | 'POS_CARD' | 'BANK_TRANSFER_QR' | 'PAYOS';
export type OnlinePaymentStatus = 'CREATED' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'NEEDS_RECONCILIATION' | 'RESOLVED';
/** Where a plan's passes can be used (V14). STUDIO passes also join online live classes. */
export type AccessScope = 'STUDIO' | 'ONLINE' | 'HYBRID';

export const ACCESS_SCOPE_OPTIONS: ReadonlyArray<{ value: AccessScope; label: string; hint: string }> = [
  { value: 'STUDIO', label: 'Tại phòng', hint: 'Lớp tại phòng tập và lớp online trực tiếp' },
  { value: 'ONLINE', label: 'Online', hint: 'Chỉ lớp online trực tiếp (thư viện video ở giai đoạn sau)' },
  { value: 'HYBRID', label: 'Kết hợp', hint: 'Lớp tại phòng, lớp online và thư viện video khi ra mắt' }
];

export function accessScopeLabel(scope: AccessScope | string | null | undefined): string {
  return ACCESS_SCOPE_OPTIONS.find(o => o.value === (scope || 'STUDIO'))?.label ?? 'Tại phòng';
}

export type MembershipStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'FROZEN' | 'EXPIRED' | 'CANCELLED' | 'REPLACED' | 'TRANSFERRED';

export interface MembershipPlan {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly price: number;
  readonly planType: PlanType;
  readonly durationDays?: number | null;
  readonly totalSessions?: number | null;
  readonly isAllBranches: boolean;
  /** Missing on responses from a backend older than V14: treat as STUDIO. */
  readonly accessScope?: AccessScope;
  readonly isActive: boolean;
  readonly createdAt?: string;
}

export interface CreatePlanReq {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly price: number;
  readonly planType: PlanType;
  readonly durationDays?: number | null;
  readonly totalSessions?: number | null;
  readonly isAllBranches?: boolean;
  readonly accessScope?: AccessScope;
}

export interface UpdatePlanReq {
  readonly name: string;
  readonly description?: string;
  readonly price: number;
  readonly isAllBranches?: boolean;
  readonly isActive?: boolean;
  readonly accessScope?: AccessScope;
}

export interface CheckoutQuote {
  readonly currentMembership: MembershipResp | null;
  readonly currentPlanName?: string;
  readonly contractValue?: number;
  readonly credit: number;
  readonly totalAmount: number;
  readonly issue: string | null;
}

export interface CreateOrderReq {
  readonly replacesMembershipId?: string;
  readonly expectedCredit?: number;
  readonly expectedTotal?: number;
  readonly adjustedCredit?: number;
  readonly adjustmentReason?: string;
  readonly branchId: string;
  readonly studentId: string;
  readonly planId: string;
  readonly cashierId: string;
  readonly notes?: string;
}

/** A student's own online purchase. The expected amounts come from the quote the student confirmed. */
export interface SelfServiceOrderReq {
  readonly branchId: string;
  readonly planId: string;
  readonly replacesMembershipId?: string;
  readonly expectedCredit: number;
  readonly expectedTotal: number;
}

export interface OrderResp {
  readonly orderId: string;
  readonly orderCode: string;
  readonly branchId: string;
  readonly studentId: string;
  readonly planId: string;
  readonly planName: string;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly totalAmount: number;
  readonly status: 'PENDING' | 'PAID' | 'CANCELLED';
  readonly orderDate: string;
  readonly membershipId: string;
  readonly membershipCode: string;
}

export interface PaymentReq {
  readonly orderId: string;
  readonly paymentMethod: PaymentMethod;
  readonly idempotencyKey: string;
  readonly cashierId: string;
  readonly transactionReference?: string;
  readonly notes?: string;
}

export interface PaymentResp {
  readonly paymentId: string;
  readonly paymentCode: string;
  readonly orderId: string;
  readonly amount: number;
  readonly paymentMethod: PaymentMethod;
  readonly paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  readonly paymentTime: string;
  readonly activatedMembershipCode: string;
}

/** Dynamic VietQR link. QR and checkout URL are only returned while the link is open. */
export interface OnlinePaymentResp {
  readonly id: string;
  readonly paymentId: string;
  readonly orderId: string;
  readonly provider: string;
  readonly providerOrderCode: number;
  readonly status: OnlinePaymentStatus;
  readonly amount: number;
  readonly checkoutUrl: string | null;
  readonly qrPayload: string | null;
  readonly expiresAt: string;
  readonly paidAt: string | null;
  readonly paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  readonly orderStatus: string;
  readonly activatedMembershipCode: string | null;
}

export interface OnlineReconciliationRow {
  readonly id: string;
  readonly orderId: string;
  readonly orderCode: string;
  readonly branchId: string;
  readonly branchName: string;
  readonly customerName: string | null;
  readonly customerPhone: string | null;
  readonly providerOrderCode: number;
  readonly amount: number;
  readonly paidAmount: number | null;
  readonly paidAt: string | null;
  readonly providerReference: string | null;
  readonly orderStatus: string;
  readonly createdAt: string;
}

export interface MembershipResp {
  readonly id: string;
  readonly membershipCode: string;
  readonly studentId: string;
  readonly planId: string;
  readonly registeredBranchId: string;
  readonly isAllBranches: boolean;
  readonly accessScope?: AccessScope;
  readonly startDate: string;
  readonly endDate?: string;
  readonly totalSessions?: number;
  readonly remainingSessions?: number;
  readonly status: MembershipStatus;
  readonly purchasedPrice: number;
  readonly notes?: string;
}

export interface OrderItemResp {
  readonly itemId?: string;
  readonly itemType?: string;
  readonly itemName?: string;
  readonly unitPrice?: number;
  readonly quantity?: number;
  readonly lineTotal?: number;
  readonly membershipCode?: string;
  readonly membershipStatus?: string;
  readonly remainingSessions?: number;
  readonly totalSessions?: number;
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface OrderPaymentResp {
  readonly paymentId?: string;
  readonly paymentCode?: string;
  readonly amount?: number;
  readonly paymentMethod?: string;
  readonly paymentStatus?: string;
  readonly paymentTime?: string;
}

export interface StudentOrderHistoryResp {
  readonly orderId: string;
  readonly orderCode: string;
  readonly branchId: string;
  readonly branchName?: string;
  readonly orderDate: string;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly totalAmount: number;
  readonly status: string;
  readonly notes?: string;
  readonly items: OrderItemResp[];
  readonly payments: OrderPaymentResp[];
}
