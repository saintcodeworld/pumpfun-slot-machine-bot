import { useState, useRef, useCallback, useEffect } from 'react';
import { socket } from '../utils/socket';
import Lever from './Lever';

const FACE_EMOJIS = ['😀', '😎', '🤩', '😍', '🥳', '😂', '🤪', '😇'];
const BONUS_EMOJIS = ['🦅', '🚀', '🔒', '🔥', '🤑', '😳'];

const BONUS_MESSAGES = {
  '🦅': 'DEX PAID',
  '🚀': 'DEX BOOSTED',
  '🔒': 'SUPPLY LOCKED',
  '🔥': 'SUPPLY BURNED',
};

function getRandomEmoji() {
  if (Math.random() < 0.82) {
    return FACE_EMOJIS[Math.floor(Math.random() * FACE_EMOJIS.length)];
  }
  return BONUS_EMOJIS[Math.floor(Math.random() * BONUS_EMOJIS.length)];
}

function generateReelSymbols() {
  return [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()];
}

export default function SlotMachine() {
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

  const intervalsRef = useRef([null, null, null]);
  const frenzyRef = useRef({ mode: false, spins: 0 });

  useEffect(() => {
    frenzyRef.current = { mode: frenzyMode, spins: frenzySpins };
  }, [frenzyMode, frenzySpins]);


  const processResults = useCallback(
    (finalReels) => {
      const middleRow = [finalReels[0][1], finalReels[1][1], finalReels[2][1]];
      const { mode: isFrenzyActive, spins: currentSpins } = frenzyRef.current;

      // 3 matching face emojis on middle row → dev buy
      const isMatch =
        middleRow[0] === middleRow[1] &&
        middleRow[1] === middleRow[2] &&
        FACE_EMOJIS.includes(middleRow[0]);

      if (isMatch) {
        const isFrenzy = isFrenzyActive && currentSpins > 0;
        const amount = isFrenzy ? 0.2 : 0.1;
        setLastWin({ emoji: middleRow[0], amount });
        socket.emit('dev-buy', { frenzy: isFrenzy, emojis: middleRow.join('') });
      } else {
        setLastWin(null);
      }

      // Check each middle-row cell for bonus emojis
      const seen = new Set();
      middleRow.forEach((emoji) => {
        if (seen.has(emoji)) return;
        seen.add(emoji);

        if (BONUS_MESSAGES[emoji]) {
          socket.emit('bonus-trigger', { emoji, message: `${emoji} ${BONUS_MESSAGES[emoji]}` });
        }

        if (emoji === '🤑') {
          socket.emit('giveaway-trigger');
        }

        if (emoji === '😳') {
          setFrenzyMode(true);
          setFrenzySpins(7);
          socket.emit('frenzy-trigger');
        }
      });

      // Decrement frenzy counter
      if (isFrenzyActive && currentSpins > 0) {
        const remaining = currentSpins - 1;
        setFrenzySpins(remaining);
        if (remaining <= 0) setFrenzyMode(false);
      }

      setSpinning(false);
    },
    [],
  );

  const spin = useCallback(() => {
    if (spinning) return;

    setLastWin(null);
    setSpinning(true);
    setLandedCells([false, false, false]);
    setReelStates([true, true, true]);

    const finalReels = [generateReelSymbols(), generateReelSymbols(), generateReelSymbols()];

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
      setTimeout(() => {
        clearInterval(intervalsRef.current[i]);
        intervalsRef.current[i] = null;

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
  }, [spinning, processResults]);

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
              alt="pump.fun"
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
              pump.fun
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
                          {symbol}
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
    </div>
  );
}
