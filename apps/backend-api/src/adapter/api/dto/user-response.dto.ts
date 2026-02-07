import { ApiProperty } from '@nestjs/swagger';
import { UserResponse, UserStatus } from '@libs/models';

export class UserResponseDto implements UserResponse {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  fullName: string;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, description: 'User status' })
  status: UserStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Creation date' })
  createdAt?: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Last update date' })
  updatedAt?: Date;
}
