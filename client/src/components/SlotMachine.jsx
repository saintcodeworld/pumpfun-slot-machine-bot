import { useState, useRef, useCallback, useEffect } from 'react';
import { socket } from '../utils/socket';
import Lever from './Lever';

const FACE_EMOJIS = ['😀', '😎', '🤩', '😍'];
const BONUS_EMOJIS = ['eagle', '🚀', '🔒', '🔥', '🤑', '😳'];

const BONUS_MESSAGES = {
  'eagle': 'DEX PAID',
  '🚀': 'DEX BOOSTED',
  '🔒': 'SUPPLY LOCKED',
  '🔥': 'SUPPLY BURNED',
};

const WEIGHTED_BONUS = ['eagle', '🚀', '🔒', '🔥', '🤑', '😳'];

function getRandomEmoji() {
  if (Math.random() < 0.60) {
    return FACE_EMOJIS[Math.floor(Math.random() * FACE_EMOJIS.length)];
  }
  return WEIGHTED_BONUS[Math.floor(Math.random() * WEIGHTED_BONUS.length)];
}

function generateReelSymbols() {
  return [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()];
}

function generateFinalReels() {
  const reels = [generateReelSymbols(), generateReelSymbols(), generateReelSymbols()];

  // ~12% chance to force a face match on the middle row
  if (Math.random() < 0.12) {
    const faceEmoji = FACE_EMOJIS[Math.floor(Math.random() * FACE_EMOJIS.length)];
    reels[0][1] = faceEmoji;
    reels[1][1] = faceEmoji;
    reels[2][1] = faceEmoji;
  }
  // ~5% chance to force a bonus match on the middle row
  else if (Math.random() < 0.05) {
    const bonusEmoji = WEIGHTED_BONUS[Math.floor(Math.random() * WEIGHTED_BONUS.length)];
    reels[0][1] = bonusEmoji;
    reels[1][1] = bonusEmoji;
    reels[2][1] = bonusEmoji;
  }

  return reels;
}

export default function SlotMachine({ onResult }) {
  const [reels, setReels] = useState(() => [
    generateReelSymbols(),
    generateReelSymbols(),
    generateReelSymbols(),
  ]);
  const [reelStates, setReelStates] = useState([false, false, false]);
  const [spinning, setSpinning] = useState(false);
  const [frenzyMode, setFrenzyMode] = useState(false);
  const [frenzySpins, setFrenzySpins] = useState(0);
  const [lastWin, setLastWin] = useState(null);
  const [landedCells, setLandedCells] = useState([false, false, false]);
  const [eagleDone, setEagleDone] = useState(false);

  const intervalsRef = useRef([null, null, null]);
  const stopTimeoutsRef = useRef([null, null, null]);
  const spinningRef = useRef(false);
  const frenzyRef = useRef({ mode: false, spins: 0 });
  const eagleDoneRef = useRef(false);

  useEffect(() => {
    frenzyRef.current = { mode: frenzyMode, spins: frenzySpins };
  }, [frenzyMode, frenzySpins]);

  useEffect(() => {
    eagleDoneRef.current = eagleDone;
  }, [eagleDone]);

  useEffect(() => {
    const handleEagleStatus = (data) => {
      setEagleDone(data.triggered);
    };
    const handleEagleBlocked = () => {
      setEagleDone(true);
    };
    socket.on('eagle-status', handleEagleStatus);
    socket.on('eagle-blocked', handleEagleBlocked);
    return () => {
      socket.off('eagle-status', handleEagleStatus);
      socket.off('eagle-blocked', handleEagleBlocked);
    };
  }, []);

  // Cleanup all intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      for (let i = 0; i < 3; i++) {
        if (intervalsRef.current[i]) clearInterval(intervalsRef.current[i]);
        if (stopTimeoutsRef.current[i]) clearTimeout(stopTimeoutsRef.current[i]);
      }
    };
  }, []);

  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const processResults = useCallback(
    (finalReels) => {
      const middleRow = [finalReels[0][1], finalReels[1][1], finalReels[2][1]];
      const { mode: isFrenzyActive, spins: currentSpins } = frenzyRef.current;

      // Check for ANY three-of-a-kind on middle row
      const allThreeMatch =
        middleRow[0] === middleRow[1] && middleRow[1] === middleRow[2];

      // 3 matching face emojis on middle row → dev buy
      const isMatch =
        allThreeMatch &&
        FACE_EMOJIS.includes(middleRow[0]);

      if (isMatch) {
        const isFrenzy = isFrenzyActive && currentSpins > 0;
        const amount = isFrenzy ? 0.2 : 0.1;
        setLastWin({ emoji: middleRow[0], amount });
        socket.emit('dev-buy', { frenzy: isFrenzy, emojis: middleRow.join('') });
        // Notify parent directly for popup (no server roundtrip needed)
        if (onResultRef.current) {
          onResultRef.current({ type: 'dev-buy', emojis: middleRow.join(''), amount, frenzy: isFrenzy });
        }
      } else {
        setLastWin(null);
      }

      // 3 matching bonus emojis on middle row → trigger bonus effect
      if (allThreeMatch && !isMatch) {
        const emoji = middleRow[0];
        if (emoji === '🔥') {
          socket.emit('burn-trigger');
          if (onResultRef.current) onResultRef.current({ type: 'bonus', bonusType: 'burn' });
        } else if (emoji === '🔒') {
          socket.emit('lock-trigger');
          if (onResultRef.current) onResultRef.current({ type: 'bonus', bonusType: 'lock' });
        } else if (emoji === '🚀') {
          socket.emit('boost-trigger');
          if (onResultRef.current) onResultRef.current({ type: 'bonus', bonusType: 'boost' });
        } else if (emoji === 'eagle') {
          if (!eagleDoneRef.current) {
            socket.emit('eagle-trigger');
            setEagleDone(true);
            if (onResultRef.current) onResultRef.current({ type: 'bonus', bonusType: 'eagle' });
          }
        } else if (emoji === '🤑') {
          socket.emit('giveaway-trigger');
          if (onResultRef.current) onResultRef.current({ type: 'giveaway' });
        } else if (emoji === '😳') {
          setFrenzyMode(true);
          setFrenzySpins(7);
          socket.emit('frenzy-trigger');
        }
      }

      // Decrement frenzy counter
      if (isFrenzyActive && currentSpins > 0) {
        const remaining = currentSpins - 1;
        setFrenzySpins(remaining);
        if (remaining <= 0) setFrenzyMode(false);
      }

      setSpinning(false);
      spinningRef.current = false;
    },
    [],
  );

  const spin = useCallback(() => {
    if (spinningRef.current) return;

    // Clear any leaked intervals and pending timeouts from previous spins
    for (let i = 0; i < 3; i++) {
      if (intervalsRef.current[i]) {
        clearInterval(intervalsRef.current[i]);
        intervalsRef.current[i] = null;
      }
      if (stopTimeoutsRef.current[i]) {
        clearTimeout(stopTimeoutsRef.current[i]);
        stopTimeoutsRef.current[i] = null;
      }
    }

    setLastWin(null);
    setSpinning(true);
    spinningRef.current = true;
    setLandedCells([false, false, false]);
    setReelStates([true, true, true]);

    const finalReels = generateFinalReels();

    // Start rapid emoji cycling per reel
    for (let i = 0; i < 3; i++) {
      intervalsRef.current[i] = setInterval(() => {
        setReels((prev) => {
          const next = [...prev];
          next[i] = [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()];
          return next;
        });
      }, 50 + i * 15);
    }

    // Stop reels left → middle → right
    const stopDelays = [1000, 1700, 2400];
    stopDelays.forEach((delay, i) => {
      stopTimeoutsRef.current[i] = setTimeout(() => {
        clearInterval(intervalsRef.current[i]);
        intervalsRef.current[i] = null;
        stopTimeoutsRef.current[i] = null;

        setReels((prev) => {
          const next = [...prev];
          next[i] = finalReels[i];
          return next;
        });

        setReelStates((prev) => {
          const next = [...prev];
          next[i] = false;
          return next;
        });

        setLandedCells((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });

        // After last reel stops → evaluate
        if (i === 2) {
          setTimeout(() => processResults(finalReels), 350);
        }
      }, delay);
    });
  }, [processResults]);

  const LED_COLORS = ['#4ade80', '#ef4444', '#facc15'];

  return (
    <div className="cabinet-scene select-none" style={{ paddingRight: 60 }}>
      {/* ═══ THE 3D ARCADE CABINET ═══ */}
      <div className={`cabinet ${frenzyMode ? 'frenzy-cabinet' : ''}`}>

        {/* Vertical neon trim lights on cabinet sides */}
        <div className="cabinet-side-light left" style={{ background: 'linear-gradient(180deg, #4ade80, #22c55e)' }} />
        <div className="cabinet-side-light right" style={{ background: 'linear-gradient(180deg, #22c55e, #4ade80)' }} />

        {/* ══ MARQUEE (back-lit header panel) ══════════ */}
        <div className="marquee">
          <div className="relative z-10 flex items-center justify-center gap-3 mb-1.5">
            <img
              src="/pumpfunlogo.png"
              alt="Betmoji"
              className="w-10 h-10 drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.4))' }}
            />
            <span
              className="text-3xl font-black tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #4ade80, #a7f3d0, #4ade80)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.5))',
              }}
            >
              Betmoji
            </span>
          </div>
          <div
            className="relative z-10 text-[11px] font-extrabold tracking-[0.28em] uppercase"
            style={{ color: 'rgba(74,222,128,0.85)', textShadow: '0 0 10px rgba(74,222,128,0.4)' }}
          >
            ★ DEV BUY MACHINE ★
          </div>

          {/* LED strip below marquee text */}
          <div className="relative z-10 flex justify-center gap-3 mt-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="led led-animate"
                style={{
                  background: LED_COLORS[i % 3],
                  color: LED_COLORS[i % 3],
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* ══ CABINET BODY ════════════════════════════ */}
        <div className="px-7 py-6">

          {/* Frenzy indicator (inside the machine body) */}
          {frenzyMode && (
            <div className="mb-3 text-center px-4 py-1.5 bg-red-500/10 border border-red-500/50 rounded-lg frenzy-border">
              <span className="text-red-400 font-bold text-xs tracking-wide">
                🔥 FRENZY x2 — {frenzySpins} spin{frenzySpins !== 1 ? 's' : ''} left
              </span>
            </div>
          )}

          {/* ── GLASS PANEL (reels behind glass) ────── */}
          <div className="glass-panel">
            {/* Horizontal neon payline */}
            <div className="payline-glow" />

            <div className="relative z-[2] flex items-center gap-3">
              {/* Left payline arrow */}
              <div className="payline-arrow text-green-400 text-xl font-black leading-none">▶</div>

              {/* 3×3 Reel Grid */}
              <div className="flex gap-2.5 flex-1 justify-center">
                {reels.map((reel, ri) => (
                  <div key={ri} className="flex flex-col gap-2.5">
                    {reel.map((symbol, si) => {
                      const isMiddle = si === 1;
                      const isSpinning = reelStates[ri];
                      const justLanded = landedCells[ri] && !isSpinning;
                      const isWinCell = lastWin && isMiddle;

                      return (
                        <div
                          key={si}
                          className={[
                            'w-[6.2rem] h-[6.2rem] flex items-center justify-center text-[3.2rem] leading-none',
                            isMiddle ? 'reel-cell-middle' : 'reel-cell opacity-45',
                            isSpinning ? 'reel-spinning' : 'reel-stopped',
                            justLanded ? 'cell-land' : '',
                            isWinCell ? 'win-glow' : '',
                          ].join(' ')}
                        >
                          {symbol === 'eagle' ? (
                            <img src="/dexscreener.png" alt="eagle" className="w-[3.2rem] h-[3.2rem] object-contain" />
                          ) : (
                            symbol
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Right payline arrow */}
              <div className="payline-arrow text-green-400 text-xl font-black leading-none">◀</div>
            </div>
          </div>

          {/* ── WIN BANNER ────────────────────────────── */}
          {lastWin && (
            <div className="mt-4 text-center pop-in">
              <div
                className="inline-block px-6 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30"
                style={{ boxShadow: '0 0 25px rgba(74,222,128,0.2)' }}
              >
                <span className="text-green-400 font-bold text-base">
                  🎉 WIN! Dev Buy {lastWin.amount} SOL
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ══ LEVER (physically mounted on right side) ═ */}
        <Lever onPull={spin} disabled={spinning} />

        {/* ══ CABINET BASE / COIN TRAY ════════════════ */}
        <div className="cabinet-base">
          <div className="coin-slot" />
          {/* Bottom LED strip */}
          <div className="flex justify-center gap-4 mt-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="led led-animate"
                style={{
                  background: ['#4ade80', '#facc15', '#ef4444', '#facc15', '#4ade80'][i],
                  color: ['#4ade80', '#facc15', '#ef4444', '#facc15', '#4ade80'][i],
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ══ SOCIAL LINK ════════════════════════════════ */}
      <a
        href="https://x.com/betmojidotfun"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex items-center gap-2 px-5 py-2 bg-gray-900/80 border border-gray-700/50 rounded-xl text-gray-300 font-semibold text-sm hover:border-blue-400/50 hover:text-blue-400 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        @betmojidotfun
      </a>
    </div>
  );
}
