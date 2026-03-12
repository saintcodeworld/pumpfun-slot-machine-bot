export default function GiveawayPopup({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="pop-in bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-yellow-500 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl shadow-yellow-500/30">
        <div className="text-7xl mb-4">🤑</div>
        <h2 className="text-2xl font-extrabold text-yellow-400 mb-2">GIVEAWAY!</h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
          Someone hit the giveaway emoji!
          <br />
          <span className="text-green-400 font-bold">
            Drop your public wallet keys in chat!
          </span>
        </p>
        <button
          onClick={onClose}
          className="px-8 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 font-bold rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all hover:shadow-lg hover:shadow-yellow-500/30 active:scale-95"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
