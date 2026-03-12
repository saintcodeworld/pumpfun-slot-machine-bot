const POPUP_CONFIG = {
  burn: {
    emoji: '🔥',
    title: 'BURN!',
    message: 'Someone hit the burn emojis!',
    detail: 'Burning tokens in 3 minutes!',
    borderColor: 'border-orange-500',
    shadowColor: 'shadow-orange-500/30',
    titleColor: 'text-orange-400',
    detailColor: 'text-orange-400',
    btnFrom: 'from-orange-500',
    btnTo: 'to-red-500',
    btnHoverFrom: 'hover:from-orange-400',
    btnHoverTo: 'hover:to-red-400',
    btnShadow: 'hover:shadow-orange-500/30',
  },
  lock: {
    emoji: '🔒',
    title: 'LOCK!',
    message: 'Someone hit the lock emojis!',
    detail: 'Locking tokens in 3 minutes!',
    borderColor: 'border-blue-500',
    shadowColor: 'shadow-blue-500/30',
    titleColor: 'text-blue-400',
    detailColor: 'text-blue-400',
    btnFrom: 'from-blue-500',
    btnTo: 'to-cyan-500',
    btnHoverFrom: 'hover:from-blue-400',
    btnHoverTo: 'hover:to-cyan-400',
    btnShadow: 'hover:shadow-blue-500/30',
  },
  boost: {
    emoji: '🚀',
    title: '10x DEX BOOST!',
    message: 'Someone hit the dex boost emojis!',
    detail: 'Paying 10x DEX Boost in 5 minutes!',
    borderColor: 'border-purple-500',
    shadowColor: 'shadow-purple-500/30',
    titleColor: 'text-purple-400',
    detailColor: 'text-purple-400',
    btnFrom: 'from-purple-500',
    btnTo: 'to-pink-500',
    btnHoverFrom: 'hover:from-purple-400',
    btnHoverTo: 'hover:to-pink-400',
    btnShadow: 'hover:shadow-purple-500/30',
  },
  eagle: {
    emoji: '🦅',
    title: 'DEX PAID!',
    message: 'Someone hit the DEX pay!',
    detail: 'Paying DEX in 5 minutes!',
    borderColor: 'border-amber-500',
    shadowColor: 'shadow-amber-500/30',
    titleColor: 'text-amber-400',
    detailColor: 'text-amber-400',
    btnFrom: 'from-amber-500',
    btnTo: 'to-yellow-500',
    btnHoverFrom: 'hover:from-amber-400',
    btnHoverTo: 'hover:to-yellow-400',
    btnShadow: 'hover:shadow-amber-500/30',
  },
};

export default function BonusPopup({ type, onClose }) {
  const config = POPUP_CONFIG[type];
  if (!config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`pop-in bg-gradient-to-b from-gray-800 to-gray-900 border-2 ${config.borderColor} rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl ${config.shadowColor}`}>
        <div className="text-7xl mb-4">{config.emoji}</div>
        <h2 className={`text-2xl font-extrabold ${config.titleColor} mb-2`}>{config.title}</h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
          {config.message}
          <br />
          <span className={`${config.detailColor} font-bold`}>
            {config.detail}
          </span>
        </p>
        <button
          onClick={onClose}
          className={`px-8 py-2.5 bg-gradient-to-r ${config.btnFrom} ${config.btnTo} text-gray-900 font-bold rounded-xl ${config.btnHoverFrom} ${config.btnHoverTo} transition-all hover:shadow-lg ${config.btnShadow} active:scale-95`}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
