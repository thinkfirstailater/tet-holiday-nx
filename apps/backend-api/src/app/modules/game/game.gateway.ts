import { 
  WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, 
  WebSocketServer, OnGatewayDisconnect, OnGatewayConnection 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { JoinRoomDto, BoostDto } from '@tet-holiday/game-core';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    // console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    const roomId = this.gameService.removePlayer(client.id);
    if (roomId) {
      const room = this.gameService.getRoom(roomId);
      if (room) {
        this.server.to(roomId).emit('room-state', room);
      }
    }
  }

  @SubscribeMessage('create-room')
  createRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { username: string }) {
    const room = this.gameService.createRoom(client.id);
    this.gameService.joinRoom(room.roomId, {
        id: client.id,
        username: data.username,
        isHost: true
    });
    client.join(room.roomId);
    client.emit('room-created', room); // Send back only to creator
    this.server.to(room.roomId).emit('room-state', room);
  }

  @SubscribeMessage('join-room')
  joinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: JoinRoomDto) {
    try {
        if (!data.roomId) throw new Error('Room ID required');
        // Clean room ID input
        const cleanRoomId = data.roomId.toUpperCase();
        
        const room = this.gameService.joinRoom(cleanRoomId, {
            id: client.id,
            username: data.username,
            isHost: false
        });
        if (room) {
            client.join(room.roomId);
            this.server.to(room.roomId).emit('room-state', room);
            // Send success to joiner
            client.emit('joined-room', room);
        } else {
            client.emit('error', { message: 'Room not found or full' });
        }
    } catch (e) {
        client.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('start-game')
  startGame(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    try {
        const room = this.gameService.startGame(data.roomId, client.id);
        this.server.to(room.roomId).emit('game-started', room);
        this.startGameLoop(room.roomId);
    } catch (e) {
        client.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('boost')
  handleBoost(@ConnectedSocket() client: Socket, @MessageBody() data: BoostDto) {
    this.gameService.handleBoost(data.roomId, client.id);
  }

  private startGameLoop(roomId: string) {
    const interval = setInterval(() => {
        try {
            const room = this.gameService.updateGameLoop(roomId);
            if (!room) {
                clearInterval(interval);
                return;
            }
            
            // Broadcast updates
            this.server.to(roomId).emit('race-update', {
                raceState: room.raceState,
                luckyMoneys: Object.values(room.luckyMoneys),
                serverTime: Date.now()
            });

            if (room.state === 'FINISHED') {
                this.server.to(roomId).emit('game-over', room);
                clearInterval(interval);
            }
        } catch (error) {
            console.error('Game loop error:', error);
            // Don't kill the loop, try to recover next tick? 
            // Or maybe kill it if it's fatal?
            // For now, let's keep it running but log
        }
    }, 1000 / 30); // 30 FPS
  }
}
