export interface LoginReq {
  readonly email: string;
  readonly password: string;
}

export interface RegisterReq {
  readonly phone: string;
  readonly password: string;
  readonly fullName: string;
  readonly email: string;
  readonly gender?: string;
  readonly dob?: string;
}

export interface UserToken {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly userId: string;
  readonly fullName: string;
  readonly roleCode: string;
  readonly homeBranchId?: string;
}

export interface CurrentUser {
  readonly id: string;
  readonly phone: string;
  readonly email?: string;
  readonly fullName: string;
  readonly roleCode: string;
  readonly roleName: string;
  readonly homeBranchId?: string;
  readonly isActive: boolean;
}

export interface CreateUserReq {
  readonly phone: string;
  readonly password: string;
  readonly fullName: string;
  readonly email?: string;
  readonly gender?: string;
  readonly dob?: string;
  readonly roleCode: string;
  readonly homeBranchId?: string;
}

export interface UserResponse {
  readonly id: string;
  readonly phone: string;
  readonly email?: string;
  readonly fullName: string;
  readonly gender?: string;
  readonly dob?: string;
  readonly roleId: string;
  readonly roleCode: string;
  readonly roleName: string;
  readonly homeBranchId?: string;
  readonly branchName?: string;
  readonly isActive: boolean;
  readonly createdAt: string;
}
