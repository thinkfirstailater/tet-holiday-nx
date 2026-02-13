export const GAME_CONSTANTS = {
  TRACK_LENGTH: 1000, // Distance to finish
  MAX_PLAYERS: 5,
  BASE_SPEED: 5, // Units per second
  BOOST_POWER: 6, // Speed increase on tap
  BOOST_DECAY: 2, // Speed loss per second
  GRAVITY: 0, // Flat race for now
  GAME_TICK_RATE: 30, // Updates per second sent to client
  MAX_SPEED: 80,
  MIN_SPEED: 2,

  // New Constants for Rules
  RACE_DURATION: 25, // Seconds (Target duration for auto-speed calculation)
  LUCKY_MONEY_VALUES: [10, 20, 50],
  LUCKY_MONEY_QUOTAS: [6, 8, 1],
  LUCKY_MONEY_SPAWN_START_RATIO: 0.1, // 10% of race time (Start earlier)
  LUCKY_MONEY_SPAWN_END_RATIO: 0.8,   // 80% of race time
  LUCKY_MONEY_COLLISION_RADIUS: 40,   // Distance to collect
};
