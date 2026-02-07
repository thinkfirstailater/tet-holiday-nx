import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '@libs/models';
import { IUserRepository } from '../../../port/repository/user-repository.port';
import { UserEntity, UserDocument } from '../entities/user.entity';

@Injectable()
export class UserRepository implements IUserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectModel(UserEntity.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private entityToModel(entity: UserDocument): User {
    return {
      id: entity._id.toString(),
      email: entity.email,
      fullName: entity.fullName,
      status: entity.status,
      password: entity.password,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.userModel.findById(id).exec();
    return entity ? this.entityToModel(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.userModel.findOne({ email }).exec();
    return entity ? this.entityToModel(entity) : null;
  }

  async findAll(): Promise<User[]> {
    const entities = await this.userModel.find().exec();
    return entities.map((entity) => this.entityToModel(entity));
  }

  async create(user: Partial<User>): Promise<User> {
    const entity = new this.userModel({
      email: user.email,
      fullName: user.fullName,
      status: user.status || 'ACTIVE',
      password: user.password,
    });
    const saved = await entity.save();
    return this.entityToModel(saved);
  }

  async update(id: string, user: Partial<User>): Promise<User | null> {
    const entity = await this.userModel
      .findByIdAndUpdate(id, { $set: user }, { new: true })
      .exec();
    return entity ? this.entityToModel(entity) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}
