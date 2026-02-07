import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CreateUserCmd, UpdateUserCmd, IUserService, USER_SERVICE } from '../../port/service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: IUserService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'User with email already exists' })
  async create(@Body() dto: CreateUserDto) {
    const cmd: CreateUserCmd = {
      email: dto.email,
      fullName: dto.fullName,
      password: dto.password,
      status: dto.status,
    };
    return this.userService.create(cmd);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users', type: [UserResponseDto] })
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const cmd: UpdateUserCmd = {
      email: dto.email,
      fullName: dto.fullName,
      password: dto.password,
      status: dto.status,
    };
    return this.userService.update(id, cmd);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    await this.userService.delete(id);
  }
}
