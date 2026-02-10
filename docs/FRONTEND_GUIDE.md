# Frontend Implementation Guide (Tet Horse Racing)

This guide provides step-by-step instructions for an Agent/Developer to implement the Online Multiplayer Frontend for "Tet Horse Racing".
The Backend is already implemented (see `BACKEND_API.md`).

## 1. Architecture Overview

- **Framework**: React + Phaser 3.
- **Communication**: Socket.io-client (connects to NestJS Backend).
- **Core Principle**: **Single View Multiplayer**.
  - Whether User is on TV (Host) or Mobile (Player), they see the **SAME** Phaser game world.
  - **Host View**: Camera follows the leading horse.
  - **Player (Mobile) View**: Camera follows the player's own horse + Big "Boost" Button overlay.

## 2. Prerequisites

1.  **Dependencies**:
    ```bash
    npm install socket.io-client react-router-dom
    ```
2.  **Shared Library**: Ensure `libs/game-core` is accessible (contains interfaces like `GameRoom`, `PlayerState`).

## 3. Project Structure Plan

Recommended folder structure:
```
apps/frontend-react/src/app/
├── components/
│   ├── GamePhaser.tsx       # (Existing) Offline Mode
│   └── online/
│       └── OnlineGamePhaser.tsx # [NEW] Shared Online Game Component
├── pages/
│   ├── HomePage.tsx         # [NEW] Menu (Offline / Host / Join)
│   ├── HostPage.tsx         # [NEW] For TV/PC Host
│   └── JoinPage.tsx         # [NEW] For Mobile Players
├── services/
│   └── socket.service.ts    # [NEW] Socket.io singleton wrapper
└── app.tsx                  # [UPDATE] Routing Logic
```

## 4. Implementation Steps

### Step 1: Socket Service (`services/socket.service.ts`)
Create a singleton class to manage the Socket.io connection.
- **Methods**: `connect()`, `disconnect()`, `getSocket()`.
- **Auto-Discovery**: Use `window.location.hostname` to determine Backend URL (localhost vs IP).

### Step 2: Online Game Component (`components/online/OnlineGamePhaser.tsx`)
This is the core visual component.
- **Props**: `roomId`, `roomState` (from Backend), `socket`, `isHost`, `myPlayerId`.
- **Phaser Scene**:
  - Load assets (same as offline mode).
  - **Create**:
    - Listen to React prop changes or direct Socket events (`race-update`).
    - **Update Loop**:
      - Interpolate horse positions based on server data (`raceState`).
      - **Camera Logic**:
        - If `myPlayerId` exists: `camera.startFollow(myHorse)`.
        - Else (Host): Find leader (max X position) and follow.

### Step 3: Page Implementation

#### A. Host Page (`pages/HostPage.tsx`)
- **Role**: Create Room & Display Game on Big Screen.
- **Logic**:
  - Connect Socket.
  - Emit `create-room`.
  - Listen for `room-created` -> save `roomId`.
  - Render `<OnlineGamePhaser isHost={true} />`.
  - **UI Overlay**: Show Room ID (Huge Font) + List of joined players.
  - **Action**: "START GAME" button (only visible when >1 players).

#### B. Join Page (`pages/JoinPage.tsx`)
- **Role**: Mobile Controller + View.
- **Logic**:
  - **Input Form**: Username + Room ID.
  - Emit `join-room`.
  - On Success: Render `<OnlineGamePhaser isHost={false} myPlayerId={socket.id} />`.
  - **UI Overlay (Racing State)**:
    - **Bottom 50%**: Giant circular **BOOST BUTTON**.
    - **Event**: `onClick` -> Emit `boost` event.

### Step 4: Routing (`app.tsx`)
Update `App` to use `react-router-dom`.
- `/`: Home Menu.
  - [Offline Mode] -> `/offline`
  - [Create Room (Host)] -> `/host`
  - [Join Room (Mobile)] -> `/join`
- `/offline`: Existing `GamePhaser`.
- `/host`: New `HostPage`.
- `/join`: New `JoinPage`.

## 5. Key Logic Details

### Syncing Game State
The Backend sends `race-update` approx 30 times/sec.
```typescript
socket.on('race-update', (data) => {
  // Forward to Phaser Scene via Event Emitter
  gameInstance.events.emit('race-update', data);
});
```
In Phaser:
```typescript
this.game.events.on('race-update', (data) => {
  // Update sprite x/y
});
```

### Mobile Layout
- Ensure `OnlineGamePhaser` container has `overflow: hidden`.
- Mobile View should stack:
  1.  **Top**: Game Canvas (Height: 40-50%).
  2.  **Bottom**: Control Panel (Height: 50-60%) with Boost Button.

## 6. Verification Checklist
- [ ] Can Host create a room?
- [ ] Can Mobile join the room?
- [ ] Does Host see Mobile player in the list?
- [ ] Does clicking Start trigger Countdown/Race?
- [ ] **CRITICAL**: Do BOTH screens show horses running?
- [ ] **CRITICAL**: Does Mobile Camera follow the player's horse?
- [ ] Does Boost button actually speed up the horse?
