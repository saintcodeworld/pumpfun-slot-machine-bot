export default function LiveFeed({ items }) {
  const typeStyles = {
    'dev-buy': 'text-green-400 bg-green-500/5 border-green-500/20',
    bonus: 'text-yellow-400 bg-yellow-500/5 border-yellow-500/20',
    giveaway: 'text-pink-400 bg-pink-500/5 border-pink-500/20',
    frenzy: 'text-red-400 bg-red-500/5 border-red-500/20',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
        <h2 className="text-lg font-bold text-purple-400">⚡ Live Feed</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {items.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-8">
            Waiting for action…
          </p>
        )}

        {items.map((item, i) => {
          const style = typeStyles[item.type] || 'text-gray-400 bg-gray-800/20 border-gray-700/30';
          return (
            <div
              key={i}
              className={`text-xs p-2 rounded-lg border ${style} ${i === 0 ? 'feed-enter' : ''}`}
            >
              <div className="font-medium leading-snug">{item.message}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">
                {new Date(item.timestamp).toLocaleTimeString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
