import type { SpriteKind } from '../game/data';

/** Hand-drawn SVG sprites. Decorative: the unit's name and HP are always given as text beside them. */
export function Sprite({ kind, size = 64 }: { kind: SpriteKind; size?: number }) {
  return (
    <svg className="sprite" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {kind === 'guard' && <Hamster fur="#e0a15a" belly="#f7dfbf" />}
      {kind === 'sage' && <Hamster fur="#f1f0ea" belly="#fffaf0" patch="#c98a4b" />}
      {kind === 'lancer' && <Hamster fur="#8b5a3c" belly="#e9c9a3" />}
      {kind === 'guard' && (
        <g>
          <ellipse cx="17" cy="44" rx="10" ry="12" fill="#7a4a24" stroke="#4a2a12" strokeWidth="2" />
          <path d="M9 38 Q17 30 25 38" fill="#a8743f" stroke="#4a2a12" strokeWidth="2" />
        </g>
      )}
      {kind === 'sage' && (
        <g>
          <path d="M20 16 L32 -2 L44 16 Z" fill="#6a4fb3" stroke="#3b2a6e" strokeWidth="2" />
          <circle cx="50" cy="40" r="5" fill="#ff9a3c" />
          <circle cx="50" cy="40" r="2.5" fill="#ffe08a" />
        </g>
      )}
      {kind === 'lancer' && (
        <g>
          <line x1="52" y1="60" x2="58" y2="8" stroke="#5b3b1f" strokeWidth="3" strokeLinecap="round" />
          <path d="M58 2 L62 12 L54 11 Z" fill="#9fd36b" stroke="#3f6b22" strokeWidth="1.5" />
          <path d="M14 14 Q22 8 30 14" fill="none" stroke="#c0392b" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {kind === 'rat' && (
        <g>
          <path d="M8 52 Q-2 40 8 30" fill="none" stroke="#c98f8f" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="32" cy="44" rx="20" ry="15" fill="#8d8f96" />
          <path d="M44 34 L62 40 L44 46 Z" fill="#8d8f96" />
          <circle cx="40" cy="26" r="7" fill="#a7a9b0" />
          <circle cx="40" cy="26" r="4" fill="#d9a3a3" />
          <circle cx="50" cy="38" r="2.5" fill="#1b1b1f" />
          <circle cx="62" cy="40" r="2" fill="#d97a7a" />
          <path d="M20 42 L26 40" stroke="#b5562f" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {kind === 'crow' && (
        <g>
          <ellipse cx="30" cy="40" rx="18" ry="16" fill="#2e2f3a" />
          <circle cx="44" cy="24" r="11" fill="#383a48" />
          <path d="M54 22 L64 27 L54 30 Z" fill="#e0a43c" />
          <circle cx="47" cy="22" r="2.5" fill="#f2e6c9" />
          <path d="M14 34 Q24 50 40 44 Q28 40 22 30 Z" fill="#4a4c5e" />
          <line x1="26" y1="56" x2="24" y2="63" stroke="#e0a43c" strokeWidth="2.5" />
          <line x1="36" y1="56" x2="38" y2="63" stroke="#e0a43c" strokeWidth="2.5" />
        </g>
      )}
      {kind === 'weasel' && (
        <g>
          <path d="M4 56 Q8 40 24 46" fill="none" stroke="#a14a24" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="32" cy="46" rx="18" ry="14" fill="#b8552a" />
          <ellipse cx="32" cy="50" rx="10" ry="8" fill="#f0d2b0" />
          <ellipse cx="38" cy="22" rx="14" ry="12" fill="#c35f30" />
          <circle cx="28" cy="12" r="4.5" fill="#c35f30" />
          <circle cx="48" cy="12" r="4.5" fill="#c35f30" />
          <path d="M26 20 Q38 14 50 20 L50 26 Q38 22 26 26 Z" fill="#2a1a14" />
          <circle cx="32" cy="23" r="2.2" fill="#ffd36b" />
          <circle cx="44" cy="23" r="2.2" fill="#ffd36b" />
          <path d="M22 6 L28 0 L32 6 L38 -1 L42 6 L48 0 L52 7" fill="#e0a43c" stroke="#7a4a12" strokeWidth="1.5" />
          <circle cx="38" cy="30" r="2" fill="#2a1a14" />
        </g>
      )}
    </svg>
  );
}

function Hamster({ fur, belly, patch }: { fur: string; belly: string; patch?: string }) {
  return (
    <g>
      <ellipse cx="32" cy="42" rx="20" ry="18" fill={fur} />
      <ellipse cx="32" cy="48" rx="12" ry="11" fill={belly} />
      <circle cx="18" cy="16" r="6" fill={fur} />
      <circle cx="46" cy="16" r="6" fill={fur} />
      <circle cx="18" cy="16" r="3" fill="#f2a7a7" />
      <circle cx="46" cy="16" r="3" fill="#f2a7a7" />
      <ellipse cx="32" cy="26" rx="16" ry="13" fill={fur} />
      {patch && <path d="M32 14 Q42 14 46 26 Q38 24 32 20 Z" fill={patch} />}
      <ellipse cx="22" cy="31" rx="5" ry="4" fill={belly} />
      <ellipse cx="42" cy="31" rx="5" ry="4" fill={belly} />
      <circle cx="26" cy="25" r="2.6" fill="#1b1410" />
      <circle cx="38" cy="25" r="2.6" fill="#1b1410" />
      <circle cx="26.8" cy="24.2" r="0.9" fill="#ffffff" />
      <circle cx="38.8" cy="24.2" r="0.9" fill="#ffffff" />
      <ellipse cx="32" cy="30" rx="2" ry="1.5" fill="#e07a8a" />
      <ellipse cx="26" cy="58" rx="5" ry="3" fill="#f2b8b8" />
      <ellipse cx="38" cy="58" rx="5" ry="3" fill="#f2b8b8" />
    </g>
  );
}
