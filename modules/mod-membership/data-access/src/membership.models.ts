export type PlanType = 'TIME_BASED' | 'SESSION_BASED' | 'COMBO';
export type PaymentMethod = 'CASH' | 'POS_CARD' | 'BANK_TRANSFER_QR';
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
}

export interface UpdatePlanReq {
  readonly name: string;
  readonly description?: string;
  readonly price: number;
  readonly isAllBranches?: boolean;
  readonly isActive?: boolean;
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

export interface MembershipResp {
  readonly id: string;
  readonly membershipCode: string;
  readonly studentId: string;
  readonly planId: string;
  readonly registeredBranchId: string;
  readonly isAllBranches: boolean;
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
