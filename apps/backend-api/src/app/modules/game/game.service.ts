import { Injectable } from '@nestjs/common';
import { 
  GameRoom, Player, PlayerState, 
  GAME_CONSTANTS, calculateNextPosition, calculateNextSpeed 
} from '@tet-holiday/game-core';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameService {
  private rooms: Record<string, GameRoom> = {};

  createRoom(hostId: string): GameRoom {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    const newRoom: GameRoom = {
      roomId,
      hostId,
      players: {},
      state: 'LOBBY',
      raceState: {},
      createdAt: Date.now(),
    };
    this.rooms[roomId] = newRoom;
    return newRoom;
  }

  joinRoom(roomId: string, player: Player): GameRoom | null {
    const room = this.rooms[roomId];
    if (!room) return null;
    
    // Check if player already in room (reconnect)
    if (room.players[player.id]) {
        // Update socket id if needed, but here player.id IS socket.id
        // If we had separate userId, we would map it here.
        return room;
    }

    if (Object.keys(room.players).length >= GAME_CONSTANTS.MAX_PLAYERS) {
      throw new Error('Room is full');
    }
    if (room.state !== 'LOBBY') {
        throw new Error('Game already started');
    }

    room.players[player.id] = player;
    return room;
  }

  startGame(roomId: string, hostId: string): GameRoom {
    const room = this.rooms[roomId];
    if (!room) throw new Error('Room not found');
    if (room.hostId !== hostId) throw new Error('Only host can start game');
    
    room.state = 'RACING';
    
    // Initialize Race State
    Object.values(room.players).forEach(p => {
      room.raceState[p.id] = {
        ...p,
        position: 0,
        speed: GAME_CONSTANTS.BASE_SPEED,
        rank: 0,
        finished: false
      };
    });

    return room;
  }

  handleBoost(roomId: string, playerId: string) {
    const room = this.rooms[roomId];
    if (!room || room.state !== 'RACING') return;
    
    const playerState = room.raceState[playerId];
    if (playerState && !playerState.finished) {
      playerState.speed += GAME_CONSTANTS.BOOST_POWER;
      if (playerState.speed > GAME_CONSTANTS.MAX_SPEED) {
        playerState.speed = GAME_CONSTANTS.MAX_SPEED;
      }
    }
  }

  updateGameLoop(roomId: string) {
    const room = this.rooms[roomId];
    if (!room || room.state !== 'RACING') return null;

    const deltaTime = 1 / GAME_CONSTANTS.GAME_TICK_RATE;
    let allFinished = true;

    Object.values(room.raceState).forEach(p => {
      if (p.finished) return;

      allFinished = false;
      // Physics Update
      p.position = calculateNextPosition(p.position, p.speed, deltaTime);
      p.speed = calculateNextSpeed(p.speed, deltaTime);

      // Check Finish
      if (p.position >= GAME_CONSTANTS.TRACK_LENGTH) {
        p.position = GAME_CONSTANTS.TRACK_LENGTH;
        p.finished = true;
        p.finishedAt = Date.now();
      }
    });

    // Update Ranks (Simple sort)
    const sortedPlayers = Object.values(room.raceState).sort((a, b) => b.position - a.position);
    sortedPlayers.forEach((p, index) => {
        room.raceState[p.id].rank = index + 1;
    });

    if (allFinished) {
      room.state = 'FINISHED';
    }

    return room;
  }
  
  getRoom(roomId: string) {
    return this.rooms[roomId];
  }
  
  removePlayer(socketId: string) {
    // Find room with this player
    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];
      if (room.players[socketId]) {
        // If LOBBY, remove player
        if (room.state === 'LOBBY') {
            delete room.players[socketId];
        } else {
            // If RACING, maybe mark as disconnected? 
            // For now, do nothing or simple removal might break array logic if not careful
            // But we use map (Record), so safe.
            // Let's keep them in raceState but remove from players list to indicate connection status?
            // Actually, for simplicity, just remove from players map.
             delete room.players[socketId];
        }
        
        // If host leaves, maybe close room? For now keep it.
        if (Object.keys(room.players).length === 0) {
            delete this.rooms[roomId];
        }
        return roomId;
      }
    }
    return null;
  }
}
