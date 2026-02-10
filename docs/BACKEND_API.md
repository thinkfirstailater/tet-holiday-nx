# Backend API Documentation

This document describes the Backend API for the "Tet Horse Racing" game, focusing on Socket.io events and game logic.

## 1. Overview

- **Protocol**: Socket.io (WebSocket)
- **Base URL**: `http://localhost:3000` (Local)
- **Shared Library**: `@tet-holiday/game-core` (Types, Constants, Physics)

## 2. Data Structures

These interfaces are defined in `libs/game-core/src/lib/interfaces/index.ts`.

### GameRoom
```typescript
interface GameRoom {
  roomId: string;      // Unique 6-char code (e.g., "ABCD")
  hostId: string;      // Socket ID of the creator
  players: Record<string, Player>;
  state: 'LOBBY' | 'RACING' | 'FINISHED';
  raceState: Record<string, PlayerState>;
  createdAt: number;
}
```

### Player
```typescript
interface Player {
  id: string;          // Socket ID
  username: string;
  isHost: boolean;
}
```

### PlayerState (Racing)
```typescript
interface PlayerState extends Player {
  position: number;    // Distance from start (0 to TRACK_LENGTH)
  speed: number;       // Current speed
  rank: number;        // Current rank (1st, 2nd...)
  finished: boolean;   // Has crossed finish line?
  finishedAt?: number; // Timestamp
}
```

## 3. Socket Events

### Connection
Client connects to the server. No special payload required.

### `create-room`
Create a new game room. The creator becomes the Host.

- **Direction**: Client -> Server
- **Payload**:
  ```json
  { "username": "UserA" }
  ```
- **Response (to Creator)**: `room-created` -> `GameRoom` object
- **Broadcast (to Room)**: `room-state` -> `GameRoom` object

### `join-room`
Join an existing room using a Room ID.

- **Direction**: Client -> Server
- **Payload**:
  ```json
  { "username": "UserB", "roomId": "ABCD" }
  ```
- **Response (to Joiner)**: `joined-room` -> `GameRoom` object (or `error` event on failure)
- **Broadcast (to Room)**: `room-state` -> `GameRoom` object

### `start-game`
Start the race. Only the Host (Creator) can trigger this.

- **Direction**: Client -> Server
- **Payload**:
  ```json
  { "roomId": "ABCD" }
  ```
- **Broadcast (to Room)**: `game-started` -> `GameRoom` object (state changes to 'RACING')

### `boost`
Increase speed of the player's horse.

- **Direction**: Client -> Server
- **Payload**:
  ```json
  { "roomId": "ABCD" }
  ```
- **Server Action**: Increases player's speed based on `BOOST_POWER` constant.

### `race-update` (Server Broadcast)
Sent by the server every tick (approx 30fps) during the race.

- **Direction**: Server -> Client
- **Payload**:
  ```json
  {
    "raceState": {
      "socketId1": { "position": 100, "speed": 50, ... },
      "socketId2": { "position": 80, "speed": 40, ... }
    },
    "serverTime": 1700000000000
  }
  ```

### `game-over` (Server Broadcast)
Sent when all players finish or race ends.

- **Direction**: Server -> Client
- **Payload**: `GameRoom` object (state 'FINISHED')

## 4. Game Loop & Physics

- **Tick Rate**: 30 updates per second.
- **Physics**: Calculated on the server (Authoritative).
  - Position += Speed * DeltaTime
  - Speed decays over time (friction).
  - Boost adds immediate speed.
- **Shared Logic**: Physics formulas are in `libs/game-core` to allow client-side prediction if needed later.

## 5. Development Notes

- **Single View Logic**: All clients (Host and Joiners) receive the full `raceState`.
- **Rendering**:
  - The frontend should render the race based on `raceState`.
  - Camera can follow the local player (identified by socket.id).
  - "Host" privilege is currently only for starting the game.
