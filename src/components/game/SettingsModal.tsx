import React from 'react';
import { useSettingsStore } from '../../store/settingsStore.ts';

export const SettingsModal: React.FC = () => {
  const { soundEnabled, hapticsEnabled, isSettingsOpen, toggleSound, toggleHaptics, closeSettings } =
    useSettingsStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-5 text-left">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-lg font-bold text-white">Settings & Rules</h2>
          </div>
          <button
            onClick={closeSettings}
            className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Preferences Toggles */}
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Preferences</span>

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>🔊</span> Sound Effects
              </span>
              <span className="text-[11px] text-slate-400">Card deal, play & trick chimes</span>
            </div>
            <button
              onClick={toggleSound}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 cursor-pointer ${
                soundEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Haptic Vibration Toggle */}
          <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>📳</span> Haptic Vibration
              </span>
              <span className="text-[11px] text-slate-400">Vibrate on card play & turn</span>
            </div>
            <button
              onClick={toggleHaptics}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 cursor-pointer ${
                hapticsEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  hapticsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Quick Rules Glossary */}
        <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Glossary & Rules</span>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5 max-h-36 overflow-y-auto">
            <p>• <strong>Boli (बोली):</strong> Bidding contract (Min 5 in 6P, 7 in 4P).</p>
            <p>• <strong>Kaat (काट):</strong> Trump suit declared by bid winner.</p>
            <p>• <strong>Hukum (हुकूम):</strong> Spades suit (♠) only.</p>
            <p>• <strong>Gunti (गुंती):</strong> Penalty points accumulated by losing contracts.</p>
            <p>• <strong>Kot (कोट):</strong> Awarded when a team hits 48 Gunti; points wrap around.</p>
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={closeSettings}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-600 transition-colors"
        >
          Close Settings
        </button>
      </div>
    </div>
  );
};
