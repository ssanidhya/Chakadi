import { generateRoomCode } from './webrtcAdapter.ts';

/**
 * In-memory Room Code Registry & Lifecycle Manager.
 * Handles 7-digit room code generation, collision avoidance, and code recycling.
 */
class RoomRegistry {
  private activeRooms: Set<string> = new Set();

  /**
   * Validates if a string is a valid 7-digit numeric room code.
   */
  public isValidRoomCodeFormat(code: string): boolean {
    return /^\d{7}$/.test(code.trim());
  }

  /**
   * Generates a collision-free 7-digit numeric room code and registers it as active.
   */
  public generateUniqueRoomCode(): string {
    let attempts = 0;
    let code = generateRoomCode();

    // Prevent collision by re-rolling if code is already occupied
    while (this.activeRooms.has(code) && attempts < 100) {
      code = generateRoomCode();
      attempts++;
    }

    this.activeRooms.add(code);
    return code;
  }

  /**
   * Registers a room code as active.
   * Returns true if successfully registered, or false if already occupied.
   */
  public registerRoom(code: string): boolean {
    const cleanCode = code.trim();
    if (!this.isValidRoomCodeFormat(cleanCode)) return false;
    if (this.activeRooms.has(cleanCode)) return false;

    this.activeRooms.add(cleanCode);
    return true;
  }

  /**
   * Releases/recycles a room code upon match completion or disconnection,
   * making the code available again for new matches.
   */
  public releaseRoom(code: string): void {
    const cleanCode = code.trim();
    this.activeRooms.delete(cleanCode);
  }

  /**
   * Checks if a room code is currently active.
   */
  public isRoomActive(code: string): boolean {
    return this.activeRooms.has(code.trim());
  }

  /**
   * Returns the count of currently active rooms.
   */
  public getActiveRoomCount(): number {
    return this.activeRooms.size;
  }

  /**
   * Resets the registry (useful for testing or server restart).
   */
  public clear(): void {
    this.activeRooms.clear();
  }
}

export const roomRegistry = new RoomRegistry();
