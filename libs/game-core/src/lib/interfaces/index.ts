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
}

export interface GameRoom {
  roomId: string;
  hostId: string;
  players: Record<string, Player>; // socketId -> Player
  state: 'LOBBY' | 'RACING' | 'FINISHED';
  raceState: Record<string, PlayerState>; // socketId -> State
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
  positions: Record<string, { p: number; s: number }>; // position, speed (minimized for bandwidth)
  serverTime: number;
}
