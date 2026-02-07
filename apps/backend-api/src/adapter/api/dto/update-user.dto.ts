import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { Expose } from 'class-transformer';
import { UpdateUserRequest, UserStatus } from '@libs/models';

export class UpdateUserDto implements UpdateUserRequest {
  @ApiProperty({ example: 'user@example.com', description: 'User email address', required: false })
  @Expose()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name', required: false })
  @Expose()
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: 'newpassword123', description: 'User password', required: false, minLength: 6 })
  @Expose()
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, required: false, description: 'User status' })
  @Expose()
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
