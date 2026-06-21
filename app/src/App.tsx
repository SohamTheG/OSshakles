import { useState, useEffect } from 'react';

interface AppInfo {
  name: string;
  description: string;
  path: string;
}

// Define the API exposed in preload.ts
declare global {
  interface Window {
    electronAPI: {
      getRunningApps: () => Promise<AppInfo[]>;
      getAppIcon: (exePath: string) => Promise<string | null>;
      startSession: (apps: string[], durationMinutes: number) => void;
      stopSession: () => void;
      onSessionEnded: (callback: () => void) => void;
    };
  }
}

function AppIcon({ exePath, appName }: { exePath: string, appName: string }) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    window.electronAPI.getAppIcon(exePath).then(url => {
      if (mounted && url) {
        setIconUrl(url);
      }
    });
    return () => { mounted = false; };
  }, [exePath]);

  if (!iconUrl) {
    return (
      <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">
        {appName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return <img src={iconUrl} alt={appName} className="w-8 h-8 object-contain" />;
}

const BASE_ESSAY = `I am choosing to exit my focus session early. I understand that by doing this, I am giving into distraction and abandoning my goals. Productivity requires discipline, and today I have fallen short. The path to success is built on consistency, yet I am breaking my commitment. Every time I give up, I make it easier to give up the next time. I must recognize that this momentary comfort will lead to long-term regret. I am trading my future accomplishments for cheap, immediate gratification. This action is a reflection of my current lack of willpower. I acknowledge my failure to stay focused. Moving forward, I need to cultivate stronger habits and resist the urge to quit when things get difficult. I promise to reflect on this moment and use it as motivation to build better self-control.`;

function generateTargetText(wordCount: number) {
  const baseWords = BASE_ESSAY.split(' ');
  let result = [];
  for (let i = 0; i < wordCount; i++) {
    result.push(baseWords[i % baseWords.length]);
  }
  return result.join(' ');
}

function Dashboard() {
  const [runningApps, setRunningApps] = useState<AppInfo[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [duration, setDuration] = useState<number>(25);
  const [punishmentWords, setPunishmentWords] = useState<number>(50);
  const [sessionActive, setSessionActive] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitReason, setExitReason] = useState('');
  const [targetText, setTargetText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchApps = () => {
    setLoading(true);
    window.electronAPI.getRunningApps().then(apps => {
      setRunningApps(apps);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchApps();
    
    window.electronAPI.onSessionEnded(() => {
      setSessionActive(false);
      setShowExitModal(false);
      setExitReason('');
      alert("Focus Session Complete! Great job.");
    });
  }, []);

  const handleStart = () => {
    if (selectedApps.length === 0) {
      alert("Please select at least one application to allow.");
      return;
    }
    window.electronAPI.startSession(selectedApps, duration);
    setSessionActive(true);
  };

  const handleAttemptStop = () => {
    setTargetText(generateTargetText(punishmentWords));
    setExitReason('');
    setShowExitModal(true);
  };

  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
  const normalizedExit = normalize(exitReason);
  const normalizedTarget = normalize(targetText);
  const canExit = normalizedExit === normalizedTarget;
  const isError = normalizedExit.length > 0 && !normalizedTarget.startsWith(normalizedExit);

  const handleForceStop = () => {
    if (canExit) {
      window.electronAPI.stopSession();
      setSessionActive(false);
      setShowExitModal(false);
      setExitReason('');
    }
  };

  const filteredApps = runningApps.filter(app => 
    app.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-block mb-4">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold uppercase tracking-widest">
              Absolute Focus
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent mb-6 tracking-tight drop-shadow-sm">
            OSshakles
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            Welcome to your strict productivity environment. Whitelist the applications you need for work, and let the watchdog handle the rest. Anything not on the list will be aggressively blocked. If you want to exit early, you must complete the <strong className="text-red-400 font-semibold">Walk of Shame</strong>.
          </p>
        </div>

        {!sessionActive ? (
          <div className="space-y-8 bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-slate-200">1. Set Focus Duration</h2>
                <div className="flex items-center space-x-4">
                  <input 
                    type="number" 
                    value={duration}
                    onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                    className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 w-24 text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    min="1"
                  />
                  <span className="text-slate-400">minutes</span>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4 text-slate-200">2. Set Early Exit Penalty</h2>
                <div className="flex items-center space-x-4">
                  <input 
                    type="number" 
                    value={punishmentWords}
                    onChange={e => setPunishmentWords(Math.max(10, Number(e.target.value)))}
                    className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 w-24 text-center focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    min="10"
                  />
                  <span className="text-slate-400">words to type</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-200 mb-2">3. Select Allowed Applications</h2>
                  <input
                    type="text"
                    placeholder="Search apps..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full max-w-sm bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button onClick={fetchApps} className="text-sm text-blue-400 hover:text-blue-300 font-semibold px-4 py-2 bg-blue-500/10 rounded-lg transition-colors">
                  Refresh List
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 h-72 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center items-center h-full text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                    Scanning processes...
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="text-center text-slate-500 mt-10">No applications found.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredApps.map(app => (
                      <label 
                        key={app.path} 
                        className={`flex items-center space-x-4 p-3 rounded-xl cursor-pointer transition-all border ${selectedApps.includes(app.name) ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700/50'}`}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedApps.includes(app.name)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedApps([...selectedApps, app.name]);
                            else setSelectedApps(selectedApps.filter(a => a !== app.name));
                          }}
                          className="hidden"
                        />
                        <AppIcon exePath={app.path} appName={app.description} />
                        <div className="flex flex-col truncate">
                          <span className="font-semibold text-slate-200 truncate">{app.description}</span>
                          {app.description !== app.name && (
                            <span className="text-xs text-slate-500 truncate">{app.name}.exe</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 text-sm text-slate-400">
                {selectedApps.length} application(s) allowed.
              </div>
            </div>

            <button 
              onClick={handleStart}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              Start Focus Session
            </button>
          </div>
        ) : (
          <div className="text-center space-y-8 bg-slate-800 p-12 rounded-2xl shadow-xl border border-blue-500/30">
            <div className="animate-pulse flex justify-center mb-4">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.7)]"></div>
            </div>
            <h2 className="text-3xl font-bold text-slate-200">Session Active</h2>
            <p className="text-slate-400 text-lg">You are locked in. The watchdog is watching.</p>
            
            <button 
              onClick={handleAttemptStop}
              className="mt-8 border border-red-500/50 text-red-400 hover:bg-red-500/10 font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Exit Early (Requires Walk of Shame)
            </button>
          </div>
        )}

        {showExitModal && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 p-8 rounded-2xl max-w-4xl w-full border border-red-500/30 shadow-2xl flex flex-col h-[90vh]">
              <h2 className="text-3xl font-bold text-red-400 mb-2">The Walk of Shame</h2>
              <p className="text-slate-300 mb-4">
                To exit this session early, you must accurately transcribe the following text. Copy-pasting is disabled.
              </p>
              
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6 select-none text-slate-400 italic text-lg leading-relaxed overflow-y-auto max-h-48">
                {targetText}
              </div>

              <textarea 
                value={exitReason}
                onChange={e => setExitReason(e.target.value)}
                onPaste={e => e.preventDefault()}
                onCopy={e => e.preventDefault()}
                onCut={e => e.preventDefault()}
                className={`flex-1 w-full bg-slate-900 border rounded-xl p-6 text-slate-200 focus:outline-none resize-none text-lg leading-relaxed shadow-inner transition-colors ${isError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'}`}
                placeholder="Start transcribing here..."
                autoFocus
              />
              
              <div className="mt-6 flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${canExit ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : isError ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                  <span className={`font-mono text-xl font-bold ${canExit ? 'text-emerald-400' : isError ? 'text-red-400' : 'text-slate-400'}`}>
                    {exitReason.trim() === '' ? 0 : normalizedExit.split(' ').length} / {punishmentWords} words
                  </span>
                  {isError && (
                    <span className="text-red-400 text-sm ml-4 font-semibold animate-pulse">
                      Typo detected! Please check your transcription.
                    </span>
                  )}
                </div>
                
                <div className="space-x-4 shrink-0">
                  <button 
                    onClick={() => setShowExitModal(false)}
                    className="px-6 py-3 rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white transition-all font-medium"
                  >
                    Nevermind, back to work
                  </button>
                  <button 
                    onClick={handleForceStop}
                    disabled={!canExit}
                    className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${canExit ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                  >
                    Force Exit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Overlay() {
  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center cursor-none">
      <div className="absolute inset-0 bg-red-600/20 mix-blend-overlay"></div>
      <div className="z-10 flex flex-col items-center">
        <div className="w-32 h-32 mb-8 text-red-500 animate-pulse">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-8xl font-black mb-8 uppercase tracking-widest text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
          LOCKED
        </h1>
        <p className="text-4xl font-light mb-4">You have opened an unapproved application.</p>
        <p className="text-2xl mt-8 text-slate-400">Alt+Tab back to your allowed apps to dismiss this screen.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (hash === '#/overlay') {
    return <Overlay />;
  }

  return <Dashboard />;
}
