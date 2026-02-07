export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface User {
  id?: string;
  email: string;
  fullName: string;
  status: UserStatus;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  status?: UserStatus;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  password?: string;
  status?: UserStatus;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
