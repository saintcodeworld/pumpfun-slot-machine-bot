export default function Legend() {
  const items = [
    {
      emoji: '😀😎🤩',
      label: '3 Matching Faces',
      desc: 'Triggers a 0.1 SOL Dev Buy on pump.fun',
      color: 'text-green-400',
    },
    {
      emoji: '🦅',
      label: 'Eagle — DEX PAID',
      desc: 'Announces DEX has been paid',
      color: 'text-yellow-400',
    },
    {
      emoji: '🚀',
      label: 'Rocket — DEX BOOSTED',
      desc: 'Announces DEX boost activated',
      color: 'text-blue-400',
    },
    {
      emoji: '🔒',
      label: 'Lock — SUPPLY LOCKED',
      desc: 'Announces token supply is locked',
      color: 'text-purple-400',
    },
    {
      emoji: '🔥',
      label: 'Fire — SUPPLY BURNED',
      desc: 'Announces token supply burn',
      color: 'text-orange-400',
    },
    {
      emoji: '🤑',
      label: 'Money Face — GIVEAWAY',
      desc: 'Global popup! Drop your wallet in chat',
      color: 'text-pink-400',
    },
    {
      emoji: '😳',
      label: 'Frenzy Mode',
      desc: 'x2 rewards / buys for the next 7 spins',
      color: 'text-red-400',
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
        <h2 className="text-lg font-bold text-yellow-400">📖 Legend</h2>
        <p className="text-[10px] text-gray-500 mt-0.5">Middle-row payline combos</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/60 transition-colors"
          >
            <div className="text-2xl flex-shrink-0 w-9 text-center leading-none pt-0.5">
              {item.emoji}
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${item.color}`}>{item.label}</div>
              <div className="text-[11px] text-gray-500 leading-snug">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
