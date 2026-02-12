export interface Player {
  id: string; // Socket ID
  username: string;
  avatar?: string; // Horse sprite ID
  isHost: boolean;
}

export interface PlayerState extends Player {
  position: number; // 0 to TRACK_LENGTH
  speed: number;
  rank: number;
  finished: boolean;
  finishedAt?: number;
  money: number; // Accumulated lucky money
  hasCollectedLuckyMoney?: boolean;
}

export interface LuckyMoney {
  id: string;
  laneIndex: number; // -2, -1, 0, 1, 2
  position: number; // Track position
  value: number;
  isCollected: boolean;
}

export interface PendingLuckyMoney {
  value: number;
  laneIndex: number;
  spawnTime: number; // Relative to race start (ms)
}

export interface GameRoom {
  roomId: string;
  hostId: string;
  players: Record<string, Player>; // socketId -> Player
  state: 'LOBBY' | 'RACING' | 'FINISHED';
  raceState: Record<string, PlayerState>; // socketId -> State
  luckyMoneys: Record<string, LuckyMoney>; // id -> LuckyMoney (Active)
  pendingLuckyMoneys: PendingLuckyMoney[];
  raceStartTime?: number;
  createdAt: number;
}

// Socket Events Payloads
export interface JoinRoomDto {
  username: string;
  roomId?: string; // Optional, if creating new room
}

export interface BoostDto {
  roomId: string;
}

export interface RoomStateDto {
  roomId: string;
  players: Player[];
  state: string;
}

export interface RaceUpdateDto {
  positions: Record<string, { p: number; s: number; m: number }>; // position, speed, money
  luckyMoneys: LuckyMoney[]; // Active lucky moneys to render
  serverTime: number;
}
