import { create } from 'zustand';

interface SettingsState {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  showHints: boolean;
  devModeEnabled: boolean;
  isSettingsOpen: boolean;

  // Actions
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleHints: () => void;
  toggleDevMode: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const STORAGE_KEY_SOUND = 'chakadi_setting_sound';
const STORAGE_KEY_HAPTICS = 'chakadi_setting_haptics';
const STORAGE_KEY_HINTS = 'chakadi_setting_hints';
const STORAGE_KEY_DEV_MODE = 'chakadi_setting_dev_mode';

function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === 'true';
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: getStoredBoolean(STORAGE_KEY_SOUND, true),
  hapticsEnabled: getStoredBoolean(STORAGE_KEY_HAPTICS, true),
  showHints: getStoredBoolean(STORAGE_KEY_HINTS, true),
  devModeEnabled: getStoredBoolean(STORAGE_KEY_DEV_MODE, false),
  isSettingsOpen: false,

  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SOUND, String(next));
      }
      return { soundEnabled: next };
    }),

  toggleHaptics: () =>
    set((state) => {
      const next = !state.hapticsEnabled;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_HAPTICS, String(next));
      }
      return { hapticsEnabled: next };
    }),

  toggleHints: () =>
    set((state) => {
      const next = !state.showHints;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_HINTS, String(next));
      }
      return { showHints: next };
    }),

  toggleDevMode: () =>
    set((state) => {
      const next = !state.devModeEnabled;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_DEV_MODE, String(next));
      }
      return { devModeEnabled: next };
    }),

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
}));
