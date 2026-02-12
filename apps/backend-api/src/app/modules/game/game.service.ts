import { Injectable } from '@nestjs/common';
import { 
  GameRoom, Player, PlayerState, 
  GAME_CONSTANTS, calculateNextPosition, calculateNextSpeed,
  PendingLuckyMoney, LuckyMoney
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
      luckyMoneys: {},
      pendingLuckyMoneys: [],
      createdAt: Date.now(),
    };
    this.rooms[roomId] = newRoom;
    return newRoom;
  }

  joinRoom(roomId: string, player: Player): GameRoom | null {
    const room = this.rooms[roomId];
    if (!room) return null;
    
    if (room.players[player.id]) {
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
    console.log(`Starting game for room ${roomId} by host ${hostId}`);
    const room = this.rooms[roomId];
    if (!room) throw new Error('Room not found');
    if (room.hostId !== hostId) throw new Error('Only host can start game');
    
    room.state = 'RACING';
    room.raceStartTime = Date.now();
    room.luckyMoneys = {};
    
    try {
        room.pendingLuckyMoneys = this.generateLuckyMoneys(Object.keys(room.players).length);
    } catch (error) {
        console.error('Error generating lucky moneys:', error);
        room.pendingLuckyMoneys = [];
    }
    
    // Initialize Race State
    Object.values(room.players).forEach(p => {
      room.raceState[p.id] = {
        ...p,
        position: 0,
        speed: GAME_CONSTANTS.BASE_SPEED,
        rank: 0,
        finished: false,
        money: 0,
        hasCollectedLuckyMoney: false
      };
    });

    return room;
  }

  private generateLuckyMoneys(playerCount: number): PendingLuckyMoney[] {
    const values: number[] = [];
    // Defensive access
    const quotas = GAME_CONSTANTS.LUCKY_MONEY_QUOTAS || [6, 8, 1];
    const baseValues = GAME_CONSTANTS.LUCKY_MONEY_VALUES || [10, 20, 50];

    baseValues.forEach((val, idx) => {
        const count = quotas[idx] || 0;
        for (let i = 0; i < count; i++) {
            values.push(val);
        }
    });

    // Shuffle values (Fisher-Yates)
    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
    }

    // Lanes
    const baseLanes = [-2, -1, 0, 1, 2];
    const lanes: number[] = [];
    for (let i = 0; i < Math.ceil(values.length / 5); i++) {
        const batch = [...baseLanes];
        // Shuffle lanes
        for (let k = batch.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            [batch[k], batch[j]] = [batch[j], batch[k]];
        }
        lanes.push(...batch);
    }

    // Time Distribution
    const startRatio = GAME_CONSTANTS.LUCKY_MONEY_SPAWN_START_RATIO;
    const endRatio = GAME_CONSTANTS.LUCKY_MONEY_SPAWN_END_RATIO;
    const startTime = GAME_CONSTANTS.RACE_DURATION * startRatio * 1000;
    const endTime = GAME_CONSTANTS.RACE_DURATION * endRatio * 1000;
    const availableTime = endTime - startTime;
    const interval = availableTime / Math.max(1, values.length);

    return values.map((val, index) => ({
        value: val,
        laneIndex: lanes[index % lanes.length],
        spawnTime: startTime + (index * interval)
    }));
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

    const now = Date.now();
    const raceTime = now - (room.raceStartTime || now);
    // Use fallback for constants
    const tickRate = GAME_CONSTANTS.GAME_TICK_RATE || 30;
    const trackLength = GAME_CONSTANTS.TRACK_LENGTH || 1000;
    const deltaTime = 1 / tickRate;
    let allFinished = true;

    // 1. Physics Update & Leader Tracking
    let leaderPosition = 0;

    Object.values(room.raceState).forEach(p => {
      if (p.finished) {
          leaderPosition = trackLength;
          return;
      }

      allFinished = false;
      // Physics Update
      p.position = calculateNextPosition(p.position, p.speed, deltaTime);
      p.speed = calculateNextSpeed(p.speed, deltaTime);

      if (p.position > leaderPosition) {
          leaderPosition = p.position;
      }

      // Check Finish
      if (p.position >= trackLength) {
        p.position = trackLength;
        p.finished = true;
        p.finishedAt = Date.now();
      }
    });

    // 2. Spawn Lucky Money
    // Move from pending to active if time reached
    // We iterate backwards to remove safely
    for (let i = room.pendingLuckyMoneys.length - 1; i >= 0; i--) {
        const pending = room.pendingLuckyMoneys[i];
        if (raceTime >= pending.spawnTime) {
            // Spawn!
            const id = uuidv4();
            // Spawn ahead of leader: Leader Pos + Offset (e.g. 500)
            // But ensure it doesn't exceed Track Length too much? 
            // Or maybe just relative to leader is fine.
            // Let's spawn at LeaderPos + 400 (approx half screen ahead)
            const spawnPos = leaderPosition + 400;
            const trackLen = GAME_CONSTANTS.TRACK_LENGTH || 1000;
            
            if (spawnPos < trackLen + 200) { // Don't spawn too far past finish
                room.luckyMoneys[id] = {
                    id,
                    laneIndex: pending.laneIndex,
                    position: spawnPos,
                    value: pending.value,
                    isCollected: false
                };
            }
            
            room.pendingLuckyMoneys.splice(i, 1);
        }
    }

    // 3. Collision Detection (Simple AABB/Distance)
    // Horse running on a specific lane (index).
    // In this game, horses have 'positionIndex' which maps to lane.
    // However, player objects don't explicitly store 'positionIndex' in Core yet?
    // Wait, HORSES_DATA in Frontend has 'positionIndex'.
    // The backend doesn't know which player has which horse/lane index unless we map it.
    // The mapping happens in Frontend: players[0] -> Horse[0].
    // We should replicate this mapping logic in Backend or store it.
    // Let's assume standard mapping: Player 0 -> Lane -2, Player 1 -> Lane -1...
    // We need to know the order of players. 
    // `room.players` is a Record (unordered).
    // We need a stable order. `Object.keys` is not guaranteed stable across runs but usually insert order.
    // Let's sort players by ID or join time to get stable lane assignment.
    
    const sortedPlayerIds = Object.keys(room.players).sort(); // Stable sort
    
    // Define Lane Indices corresponding to HORSES_DATA: [-2, -1, 0, 1, 2]
    // HORSES_DATA[0] -> -2
    // HORSES_DATA[1] -> -1
    // ...
    const LANE_INDICES = [-2, -1, 0, 1, 2];

    sortedPlayerIds.forEach((pid, index) => {
        const pState = room.raceState[pid];
        if (!pState || pState.finished) return;

        const playerLane = LANE_INDICES[index % LANE_INDICES.length];
        
        // Check collision with all active lucky moneys
        Object.values(room.luckyMoneys).forEach(lm => {
            if (lm.isCollected) return;

            // Check Lane
            if (lm.laneIndex === playerLane) {
                // Check Distance
                const dist = Math.abs(pState.position - lm.position);
                if (dist < GAME_CONSTANTS.LUCKY_MONEY_COLLISION_RADIUS) {
                    // Check if already collected
                    if (pState.hasCollectedLuckyMoney) return;

                    // Collect!
                    lm.isCollected = true;
                    pState.money += lm.value;
                    pState.hasCollectedLuckyMoney = true;

                    // We can remove it immediately or keep it marked as collected for a moment?
                    // Remove immediately to prevent double collect
                    delete room.luckyMoneys[lm.id];
                }
            }
        });
    });

    // 4. Update Ranks
    const sortedPlayers = Object.values(room.raceState).sort((a, b) => b.position - a.position);
    sortedPlayers.forEach((p, index) => {
        room.raceState[p.id].rank = index + 1;
    });

    if (allFinished) {
      room.state = 'FINISHED';
      
      // Apply Double Money Rule
      const winner = sortedPlayers[0];
      if (winner) {
          room.raceState[winner.id].money *= 2;
      }
    }

    return room;
  }
  
  getRoom(roomId: string) {
    return this.rooms[roomId];
  }
  
  removePlayer(socketId: string) {
    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];
      if (room.players[socketId]) {
        if (room.state === 'LOBBY') {
            delete room.players[socketId];
        } else {
             delete room.players[socketId];
        }
        
        if (Object.keys(room.players).length === 0) {
            delete this.rooms[roomId];
        }
        return roomId;
      }
    }
    return null;
  }
}
