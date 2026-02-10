import { GAME_CONSTANTS } from './constants';

export const calculateNextPosition = (
  currentPos: number,
  currentSpeed: number,
  deltaTimeInSeconds: number
): number => {
  const nextPos = currentPos + currentSpeed * deltaTimeInSeconds;
  return Math.min(nextPos, GAME_CONSTANTS.TRACK_LENGTH);
};

export const calculateNextSpeed = (
  currentSpeed: number,
  deltaTimeInSeconds: number
): number => {
  // Friction/Decay logic
  let nextSpeed = currentSpeed - GAME_CONSTANTS.BOOST_DECAY * deltaTimeInSeconds; // Simple decay
  
  // Clamp speed
  if (nextSpeed < GAME_CONSTANTS.MIN_SPEED) nextSpeed = GAME_CONSTANTS.MIN_SPEED;
  if (nextSpeed > GAME_CONSTANTS.MAX_SPEED) nextSpeed = GAME_CONSTANTS.MAX_SPEED;
  
  return nextSpeed;
};
