import { useState } from 'react';

export default function Lever({ onPull, disabled }) {
  const [pulled, setPulled] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setPulled(true);
    setTimeout(() => {
      setPulled(false);
      onPull();
    }, 450);
  };

  return (
    <div
      className={`lever-mount ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={handleClick}
    >
      {/* Bracket that bolts into the cabinet wall */}
      <div className="lever-bracket" />

      {/* Shaft + Ball assembly (moves on pull) */}
      <div className={`lever-shaft-wrapper ${pulled ? 'is-pulled' : ''}`}>
        <div className="lever-shaft" />
        <div className="lever-ball" />
      </div>

      {/* Label underneath */}
      <div className="lever-label">
        {disabled ? 'Spinning…' : 'Pull'}
      </div>
    </div>
  );
}
