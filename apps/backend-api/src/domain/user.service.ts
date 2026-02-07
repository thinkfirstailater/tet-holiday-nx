import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '@libs/models';
import { IUserRepository, USER_REPOSITORY } from '../port/repository';
import { CreateUserCmd, IUserService, UpdateUserCmd, USER_SERVICE } from '../port/service';

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async create(cmd: CreateUserCmd): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(cmd.email);
    if (existingUser) {
      throw new ConflictException(`User with email ${cmd.email} already exists`);
    }

    const hashedPassword = await bcrypt.hash(cmd.password, 10);

    return this.userRepository.create({
      email: cmd.email,
      fullName: cmd.fullName,
      password: hashedPassword,
      status: cmd.status,
    });
  }

  async update(id: string, cmd: UpdateUserCmd): Promise<User> {
    const user = await this.findById(id);

    if (cmd.email && cmd.email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(cmd.email);
      if (existingUser) {
        throw new ConflictException(`User with email ${cmd.email} already exists`);
      }
    }

    const updateData: Partial<User> = {};
    if (cmd.email) updateData.email = cmd.email;
    if (cmd.fullName) updateData.fullName = cmd.fullName;
    if (cmd.status) updateData.status = cmd.status;
    if (cmd.password) {
      updateData.password = await bcrypt.hash(cmd.password, 10);
    }

    const updatedUser = await this.userRepository.update(id, updateData);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
