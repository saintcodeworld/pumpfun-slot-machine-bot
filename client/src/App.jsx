import { useState, useCallback, useEffect, useRef } from 'react';
import SlotMachine from './components/SlotMachine';
import ChatSidebar from './components/ChatSidebar';
import Legend from './components/Legend';
import LiveFeed from './components/LiveFeed';
import GiveawayPopup from './components/GiveawayPopup';
import BonusPopup from './components/BonusPopup';
import LaunchingSoon from './components/LaunchingSoon';
import { socket } from './utils/socket';

// ⚡ TEMPORARY: Set to false when ready to go live
const LAUNCHING_SOON = true;

export default function App() {
  if (LAUNCHING_SOON) return <LaunchingSoon />;
  const [liveFeedItems, setLiveFeedItems] = useState([]);
  const [showGiveaway, setShowGiveaway] = useState(false);
  const [activeBonusPopup, setActiveBonusPopup] = useState(null);
  const [devBuyPopup, setDevBuyPopup] = useState(null);
  const bonusTimeoutRef = useRef(null);
  const giveawayTimeoutRef = useRef(null);
  const devBuyTimeoutRef = useRef(null);

  const addFeedItem = useCallback((item) => {
    setLiveFeedItems((prev) => [item, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const handleLiveFeed = (data) => addFeedItem(data);
    const handleGiveaway = () => {
      setShowGiveaway(true);
      if (giveawayTimeoutRef.current) clearTimeout(giveawayTimeoutRef.current);
      giveawayTimeoutRef.current = setTimeout(() => setShowGiveaway(false), 15000);
    };
    const handleBonusPopup = (data) => {
      if (bonusTimeoutRef.current) clearTimeout(bonusTimeoutRef.current);
      setActiveBonusPopup(data.type);
      bonusTimeoutRef.current = setTimeout(() => setActiveBonusPopup(null), 15000);
    };
    const handleDevBuyPopup = (data) => {
      if (devBuyTimeoutRef.current) clearTimeout(devBuyTimeoutRef.current);
      setDevBuyPopup(data);
      devBuyTimeoutRef.current = setTimeout(() => setDevBuyPopup(null), 6000);
    };

    socket.on('live-feed', handleLiveFeed);
    socket.on('giveaway-popup', handleGiveaway);
    socket.on('bonus-popup', handleBonusPopup);
    socket.on('dev-buy-popup', handleDevBuyPopup);

    return () => {
      socket.off('live-feed', handleLiveFeed);
      socket.off('giveaway-popup', handleGiveaway);
      socket.off('bonus-popup', handleBonusPopup);
      socket.off('dev-buy-popup', handleDevBuyPopup);
      if (bonusTimeoutRef.current) clearTimeout(bonusTimeoutRef.current);
      if (giveawayTimeoutRef.current) clearTimeout(giveawayTimeoutRef.current);
      if (devBuyTimeoutRef.current) clearTimeout(devBuyTimeoutRef.current);
    };
  }, [addFeedItem]);

  const handleSlotResult = useCallback((result) => {
    if (result.type === 'dev-buy') {
      if (devBuyTimeoutRef.current) clearTimeout(devBuyTimeoutRef.current);
      setDevBuyPopup({ emojis: result.emojis, amount: result.amount, frenzy: result.frenzy });
      devBuyTimeoutRef.current = setTimeout(() => setDevBuyPopup(null), 6000);
    } else if (result.type === 'bonus') {
      if (bonusTimeoutRef.current) clearTimeout(bonusTimeoutRef.current);
      setActiveBonusPopup(result.bonusType);
      bonusTimeoutRef.current = setTimeout(() => setActiveBonusPopup(null), 15000);
    } else if (result.type === 'giveaway') {
      if (giveawayTimeoutRef.current) clearTimeout(giveawayTimeoutRef.current);
      setShowGiveaway(true);
      giveawayTimeoutRef.current = setTimeout(() => setShowGiveaway(false), 15000);
    }
  }, []);

  return (
    <div className="h-screen flex bg-gray-950 text-white overflow-hidden">
      {/* ── Left Sidebar: Legend (top) + Live Feed (bottom) ── */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-gray-800/70 bg-gray-950">
        <div className="flex-1 min-h-0 border-b border-gray-800/70 overflow-hidden">
          <Legend />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <LiveFeed items={liveFeedItems} />
        </div>
      </aside>

      {/* ── Center: Slot Machine ── */}
      <main className="flex-1 flex items-center justify-center min-w-0 p-4">
        <SlotMachine onResult={handleSlotResult} />
      </main>

      {/* ── Right Sidebar: Chat ── */}
      <aside className="w-80 flex-shrink-0 border-l border-gray-800/70 bg-gray-950">
        <ChatSidebar />
      </aside>

      {/* ── Giveaway Popup (global overlay) ── */}
      {showGiveaway && (
        <GiveawayPopup onClose={() => setShowGiveaway(false)} />
      )}

      {activeBonusPopup && (
        <BonusPopup type={activeBonusPopup} onClose={() => { setActiveBonusPopup(null); if (bonusTimeoutRef.current) clearTimeout(bonusTimeoutRef.current); }} />
      )}

      {devBuyPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="pop-in bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-green-500 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl shadow-green-500/30">
            <div className="text-7xl mb-4">🎰</div>
            <h2 className="text-2xl font-extrabold text-green-400 mb-2">DEV BUY!</h2>
            <p className="text-gray-300 mb-2 leading-relaxed">
              {devBuyPopup.emojis} matched on the payline!
            </p>
            <p className="text-green-400 font-bold text-lg mb-6">
              Buying {devBuyPopup.amount} SOL{devBuyPopup.frenzy ? ' (FRENZY x2!)' : ''}
            </p>
            <button
              onClick={() => { setDevBuyPopup(null); if (devBuyTimeoutRef.current) clearTimeout(devBuyTimeoutRef.current); }}
              className="px-8 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-gray-900 font-bold rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all hover:shadow-lg hover:shadow-green-500/30 active:scale-95"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
