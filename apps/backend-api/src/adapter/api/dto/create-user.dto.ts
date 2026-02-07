import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateUserRequest, UserStatus } from '@libs/models';

export class CreateUserDto implements CreateUserRequest {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @Expose()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @Expose()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'password123', description: 'User password', minLength: 6 })
  @Expose()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, required: false, description: 'User status' })
  @Expose()
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
