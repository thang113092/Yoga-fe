export interface Branch {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly address: string;
  readonly phone: string;
  readonly email?: string;
  readonly bankName?: string;
  readonly bankAccountNumber?: string;
  readonly bankAccountHolder?: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly roomCount?: number;
}

export interface CreateBranchReq {
  readonly code: string;
  readonly name: string;
  readonly address: string;
  readonly phone: string;
  readonly email?: string;
  readonly bankName?: string;
  readonly bankAccountNumber?: string;
  readonly bankAccountHolder?: string;
}

export interface UpdateBranchReq {
  readonly code?: string;
  readonly name: string;
  readonly address: string;
  readonly phone: string;
  readonly email?: string;
  readonly bankName?: string;
  readonly bankAccountNumber?: string;
  readonly bankAccountHolder?: string;
  readonly isActive?: boolean;
}

export interface Room {
  readonly id: string;
  readonly branchId: string;
  readonly name: string;
  readonly floor?: string;
  readonly maxCapacity: number;
  readonly isActive: boolean;
}

export interface CreateRoomReq {
  readonly name: string;
  readonly floor?: string;
  readonly maxCapacity: number;
  readonly isActive?: boolean;
}

export interface UpdateRoomReq {
  readonly name: string;
  readonly floor?: string;
  readonly maxCapacity: number;
  readonly isActive?: boolean;
}
