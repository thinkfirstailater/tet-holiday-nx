import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { GameService } from './game.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Game')
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get game room status' })
  @ApiResponse({ status: 200, description: 'Return room details' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  getRoom(@Param('id') id: string) {
    const room = this.gameService.getRoom(id.toUpperCase());
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }
}
