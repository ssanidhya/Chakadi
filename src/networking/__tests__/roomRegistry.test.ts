import { describe, it, expect, beforeEach } from 'vitest';
import { roomRegistry } from '../roomRegistry.ts';

describe('RoomRegistry (7-Digit Room Code Management)', () => {
  beforeEach(() => {
    roomRegistry.clear();
  });

  it('should generate valid 7-digit numeric room codes', () => {
    const code = roomRegistry.generateUniqueRoomCode();
    expect(code).toMatch(/^\d{7}$/);
    expect(Number(code)).toBeGreaterThanOrEqual(1000000);
    expect(Number(code)).toBeLessThanOrEqual(9999999);
  });

  it('should register code as active upon generation', () => {
    const code = roomRegistry.generateUniqueRoomCode();
    expect(roomRegistry.isRoomActive(code)).toBe(true);
    expect(roomRegistry.getActiveRoomCount()).toBe(1);
  });

  it('should prevent collision when registering duplicate code', () => {
    const code = '8492015';
    const firstReg = roomRegistry.registerRoom(code);
    expect(firstReg).toBe(true);

    const secondReg = roomRegistry.registerRoom(code);
    expect(secondReg).toBe(false);
  });

  it('should release and recycle room code when game finishes', () => {
    const code = '8492015';
    roomRegistry.registerRoom(code);
    expect(roomRegistry.isRoomActive(code)).toBe(true);

    roomRegistry.releaseRoom(code);
    expect(roomRegistry.isRoomActive(code)).toBe(false);

    // Code can now be re-registered / recycled
    const reRegister = roomRegistry.registerRoom(code);
    expect(reRegister).toBe(true);
  });
});
