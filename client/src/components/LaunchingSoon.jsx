import { useState, useEffect } from 'react';

export default function LaunchingSoon() {
  const [loaded, setLoaded] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Radial glow behind the content */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Loading spinner (shows briefly, then fades) */}
      <div
        className={`transition-all duration-700 ${
          loaded ? 'opacity-0 scale-75 absolute' : 'opacity-100 scale-100'
        }`}
      >
        <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
      </div>

      {/* Main content */}
      <div
        className={`flex flex-col items-center transition-all duration-700 ${
          loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Logo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl scale-150 animate-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-green-500/40 flex items-center justify-center shadow-2xl shadow-green-500/20 p-6">
            <img src="/pumpfunlogo.png" alt="Betmoji" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 mb-4 text-center tracking-tight launching-text">
          BETMOJI
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-lg md:text-xl font-medium mb-2 text-center">
          The Pump.fun Slot Machine
        </p>

        {/* Status badge */}
        <div className="mt-6 mb-10 px-5 py-2.5 bg-gray-900/80 border border-green-500/30 rounded-full flex items-center gap-3 backdrop-blur-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-green-400 font-bold text-sm tracking-widest uppercase">
            Launching Soon{dots}
          </span>
        </div>

        {/* Feature teasers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-4 mb-12">
          <div className="feature-card">
            <div className="text-3xl mb-2">🎲</div>
            <h3 className="text-white font-bold text-sm mb-1">Spin & Win</h3>
            <p className="text-gray-500 text-xs">Emoji slot machine with real token actions</p>
          </div>
          <div className="feature-card">
            <div className="text-3xl mb-2">💎</div>
            <h3 className="text-white font-bold text-sm mb-1">Dev Buys</h3>
            <p className="text-gray-500 text-xs">Match symbols to trigger automated buys</p>
          </div>
          <div className="feature-card">
            <div className="text-3xl mb-2">🎁</div>
            <h3 className="text-white font-bold text-sm mb-1">Giveaways</h3>
            <p className="text-gray-500 text-xs">Bonus rounds and community rewards</p>
          </div>
        </div>

        {/* Social / links placeholder */}
        <div className="flex items-center gap-4">
          <a
            href="https://pump.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl text-green-400 font-semibold text-sm hover:border-green-400/60 hover:bg-green-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
          >
            <img src="/pumpfunlogo.png" alt="Pump.fun" className="w-5 h-5 rounded" />
            Pump.fun
          </a>
          <a
            href="https://dexscreener.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl text-gray-300 font-semibold text-sm hover:border-gray-500/60 hover:bg-gray-700/40 transition-all duration-300 hover:shadow-lg hover:shadow-gray-700/10"
          >
            <img src="/dexscreener.png" alt="DexScreener" className="w-5 h-5 rounded" />
            DexScreener
          </a>
        </div>

        {/* Footer */}
        <p className="mt-16 text-gray-600 text-xs tracking-wider">
          © 2025 Betmoji — All rights reserved
        </p>
      </div>
    </div>
  );
}
