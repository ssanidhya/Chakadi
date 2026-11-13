import React, { useState, useEffect } from 'react';
import { LogEntry, LogCategory, subscribeToLogs, clearLogHistory } from '../../utils/logger.ts';

export const DebugLogOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return subscribeToLogs((newLogs) => {
      setLogs(newLogs);
    });
  }, []);

  const filteredLogs = activeCategory === 'ALL'
    ? logs
    : logs.filter((log) => log.category === activeCategory);

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.category}] [${l.level.toUpperCase()}]: ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-2 right-2 z-40 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 font-mono cursor-pointer"
        title="Toggle Debug Console"
      >
        <span>🐞</span>
        <span>Logs ({logs.length})</span>
      </button>

      {/* Terminal Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col justify-end p-2 md:p-6 z-50 font-mono">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden mx-auto">
            {/* Header */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">🐞</span>
                <span className="font-bold text-white text-sm">Chakadi Debug Console</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLogs}
                  className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1 rounded text-slate-200 border border-slate-600 cursor-pointer"
                >
                  {copied ? '✓ Copied!' : '📋 Copy Logs'}
                </button>
                <button
                  onClick={clearLogHistory}
                  className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1 rounded text-slate-200 border border-slate-600 cursor-pointer"
                >
                  🧹 Clear
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-sm px-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              {(['ALL', 'ENGINE', 'STORE', 'P2P', 'AUDIO', 'ERROR'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-full border cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Log Stream Body */}
            <div className="flex-1 p-3 overflow-y-auto bg-slate-950 text-xs space-y-1.5 font-mono select-text">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-600 text-center py-8">No log entries found for this category.</div>
              ) : (
                filteredLogs.map((log) => {
                  const levelColors: Record<LogCategory, string> = {
                    ENGINE: 'text-amber-400',
                    STORE: 'text-emerald-400',
                    P2P: 'text-blue-400',
                    AUDIO: 'text-purple-400',
                    UI: 'text-cyan-400',
                    ERROR: 'text-red-400',
                  };

                  return (
                    <div key={log.id} className="flex flex-col border-b border-slate-900/60 pb-1">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 text-[10px] whitespace-nowrap">{log.timestamp}</span>
                        <span className={`font-bold whitespace-nowrap ${levelColors[log.category] || 'text-white'}`}>
                          [{log.category}]
                        </span>
                        <span className={`flex-1 ${log.level === 'error' ? 'text-red-400 font-bold' : 'text-slate-200'}`}>
                          {log.message}
                        </span>
                      </div>
                      {log.data !== undefined && (
                        <pre className="text-[10px] text-slate-400 bg-slate-900/60 p-1.5 rounded mt-1 overflow-x-auto">
                          {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
