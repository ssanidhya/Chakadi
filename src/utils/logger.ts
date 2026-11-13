export type LogCategory = 'ENGINE' | 'STORE' | 'P2P' | 'AUDIO' | 'UI' | 'ERROR';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
}

type LogListener = (logs: LogEntry[]) => void;

const MAX_LOG_HISTORY = 120;
const logHistory: LogEntry[] = [];
const listeners: Set<LogListener> = new Set();

function formatTime(date: Date = new Date()): string {
  return date.toTimeString().split(' ')[0] + '.' + String(date.getMilliseconds()).padStart(3, '0');
}

export function addLog(category: LogCategory, level: LogLevel, message: string, data?: any): void {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: formatTime(),
    level,
    category,
    message,
    data,
  };

  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }

  // Console output formatting with category icons
  const icons: Record<LogCategory, string> = {
    ENGINE: '🎴',
    STORE: '⚡',
    P2P: '🌐',
    AUDIO: '🔊',
    UI: '🎨',
    ERROR: '🚨',
  };

  const badge = `[${icons[category]} ${category}]`;
  if (level === 'error') {
    console.error(badge, message, data !== undefined ? data : '');
  } else if (level === 'warn') {
    console.warn(badge, message, data !== undefined ? data : '');
  } else {
    console.log(badge, message, data !== undefined ? data : '');
  }

  listeners.forEach((listener) => listener([...logHistory]));
}

export function logInfo(category: LogCategory, message: string, data?: any): void {
  addLog(category, 'info', message, data);
}

export function logWarn(category: LogCategory, message: string, data?: any): void {
  addLog(category, 'warn', message, data);
}

export function logError(category: LogCategory, message: string, data?: any): void {
  addLog(category, 'error', message, data);
}

export function getLogHistory(): LogEntry[] {
  return [...logHistory];
}

export function clearLogHistory(): void {
  logHistory.length = 0;
  listeners.forEach((listener) => listener([]));
}

export function subscribeToLogs(listener: LogListener): () => void {
  listeners.add(listener);
  listener([...logHistory]);
  return () => {
    listeners.delete(listener);
  };
}
