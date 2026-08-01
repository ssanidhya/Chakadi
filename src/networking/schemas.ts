import type { ClientMessage, ServerMessage } from './adapter.ts';

export function validateClientMessage(message: any): { success: boolean; data?: ClientMessage; error?: string } {
  if (!message || typeof message !== 'object') {
    return { success: false, error: 'Message must be an object.' };
  }

  const { type } = message;
  if (!type || typeof type !== 'string') {
    return { success: false, error: 'Message missing string type tag.' };
  }

  if (type === 'JOIN_ROOM') {
    if (!message.roomId || typeof message.roomId !== 'string' || !message.player) {
      return { success: false, error: 'Invalid JOIN_ROOM payload.' };
    }
    return { success: true, data: message as ClientMessage };
  }

  if (type === 'LEAVE_ROOM') {
    if (!message.roomId || !message.playerId) {
      return { success: false, error: 'Invalid LEAVE_ROOM payload.' };
    }
    return { success: true, data: message as ClientMessage };
  }

  if (type === 'DISPATCH_ACTION') {
    if (!message.roomId || !message.action || typeof message.action.type !== 'string') {
      return { success: false, error: 'Invalid DISPATCH_ACTION payload.' };
    }
    return { success: true, data: message as ClientMessage };
  }

  if (type === 'PING') {
    if (typeof message.timestamp !== 'number') {
      return { success: false, error: 'Invalid PING timestamp.' };
    }
    return { success: true, data: message as ClientMessage };
  }

  return { success: false, error: `Unknown client message type: ${type}` };
}
