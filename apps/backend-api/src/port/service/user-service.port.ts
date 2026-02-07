import { User, UserStatus } from '@libs/models';

export const USER_SERVICE = Symbol('USER_SERVICE');

export interface IUserService {
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(cmd: CreateUserCmd): Promise<User>;
  update(id: string, cmd: UpdateUserCmd): Promise<User>;
  delete(id: string): Promise<void>;
}

export class CreateUserCmd {
  email: string;
  fullName: string;
  password: string;
  status?: UserStatus;
}

export class UpdateUserCmd {
  email?: string;
  fullName?: string;
  password?: string;
  status?: UserStatus;
}
