import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserStatus } from '@libs/models';

export type UserDocument = HydratedDocument<UserEntity>;

@Schema({ timestamps: true, collection: 'users' })
export class UserEntity {
  @Prop({ required: true, unique: true, type: String })
  email: string;

  @Prop({ required: true, type: String })
  fullName: string;

  @Prop({ 
    required: true, 
    type: String, 
    enum: Object.values(UserStatus), 
    default: UserStatus.ACTIVE 
  })
  status: UserStatus;

  @Prop({ required: true, type: String })
  password: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);
