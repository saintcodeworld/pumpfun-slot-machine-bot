import { useState, useCallback, useEffect } from 'react';
import SlotMachine from './components/SlotMachine';
import ChatSidebar from './components/ChatSidebar';
import Legend from './components/Legend';
import LiveFeed from './components/LiveFeed';
import GiveawayPopup from './components/GiveawayPopup';
import { socket } from './utils/socket';

export default function App() {
  const [liveFeedItems, setLiveFeedItems] = useState([]);
  const [showGiveaway, setShowGiveaway] = useState(false);

  const addFeedItem = useCallback((item) => {
    setLiveFeedItems((prev) => [item, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const handleLiveFeed = (data) => addFeedItem(data);
    const handleGiveaway = () => {
      setShowGiveaway(true);
      setTimeout(() => setShowGiveaway(false), 15000);
    };

    socket.on('live-feed', handleLiveFeed);
    socket.on('giveaway-popup', handleGiveaway);

    return () => {
      socket.off('live-feed', handleLiveFeed);
      socket.off('giveaway-popup', handleGiveaway);
    };
  }, [addFeedItem]);

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
        <SlotMachine onFeedItem={addFeedItem} />
      </main>

      {/* ── Right Sidebar: Chat ── */}
      <aside className="w-80 flex-shrink-0 border-l border-gray-800/70 bg-gray-950">
        <ChatSidebar />
      </aside>

      {/* ── Giveaway Popup (global overlay) ── */}
      {showGiveaway && (
        <GiveawayPopup onClose={() => setShowGiveaway(false)} />
      )}
    </div>
  );
}
