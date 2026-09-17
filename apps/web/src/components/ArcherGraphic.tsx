import React from 'react';
import type { ElementType } from '@math-archer/learning-engine';

export interface ArcherGraphicProps {
  state: 'idle' | 'drawing' | 'released';
  element?: ElementType | null;
  className?: string;
}

export const ArcherGraphic: React.FC<ArcherGraphicProps> = ({
  state,
  element,
  className = '',
}) => {
  // Elemental glow colors
  const elementGlow =
    element === 'fire'
      ? '#f97316'
      : element === 'ice'
        ? '#06b6d4'
        : element === 'wind'
          ? '#10b981'
          : element === 'earth'
            ? '#d97706'
            : '#f59e0b';

  // String draw position based on archer state
  // Bow limb tips are at (42, 16) and (42, 84)
  // When idle: string is a line from (42, 16) to (42, 84)
  // When drawing/shooting: string pulls back to (22, 50)
  // When released: string snaps forward with slight vibration to (44, 50)
  const isDrawing = state === 'drawing';
  const isReleased = state === 'released';

  const stringPath = isDrawing
    ? 'M 42 16 Q 20 50 20 50 Q 20 50 42 84'
    : isReleased
      ? 'M 42 16 Q 45 50 42 50 Q 45 50 42 84'
      : 'M 42 16 L 42 84';

  return (
    <div
      className={`archer-graphic-container state-${state} ${className}`}
      data-testid="archer-graphic"
    >
      <svg
        className="archer-svg"
        viewBox="0 0 120 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Wood gradient for recurve bow */}
          <linearGradient id="bowWood" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="50%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Grip wrap gradient */}
          <linearGradient id="bowGrip" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Elemental Aura Glow */}
          <filter id="elementGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={elementGlow} floodOpacity="0.8" />
          </filter>

          {/* Archer Cloak / Tunic Gradient */}
          <linearGradient id="tunicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>

          {/* Quiver Gradient */}
          <linearGradient id="quiverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
        </defs>

        {/* Quiver with arrows over shoulder */}
        <g className="archer-quiver">
          <path
            d="M 76 38 L 88 74 Q 90 78 86 80 L 80 81 Q 76 81 76 77 L 68 42 Z"
            fill="url(#quiverGrad)"
            stroke="#291204"
            strokeWidth="1.5"
          />
          {/* Arrow shafts & fletchings in quiver */}
          <line x1="84" y1="24" x2="80" y2="44" stroke="#d97706" strokeWidth="2.5" />
          <polygon points="84,24 81,16 87,19" fill="#ef4444" />
          <polygon points="84,24 87,16 89,21" fill="#3b82f6" />

          <line x1="89" y1="26" x2="85" y2="44" stroke="#d97706" strokeWidth="2.5" />
          <polygon points="89,26 86,18 92,20" fill="#10b981" />
          <polygon points="89,26 92,18 94,22" fill="#f59e0b" />
        </g>

        {/* Archer Character Body */}
        <g className="archer-body">
          {/* Cloak / Back Tunic */}
          <path
            d="M 64 48 C 64 48 84 56 86 84 C 76 88 56 88 50 84 C 52 64 56 50 64 48 Z"
            fill="url(#tunicGrad)"
            stroke="#0f381e"
            strokeWidth="1.5"
          />

          {/* Belt & Buckle */}
          <path d="M 52 70 Q 64 73 78 71" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          <rect x="62" y="68" width="5" height="5" rx="1" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />

          {/* Archer Head & Hood */}
          <g className="archer-head">
            {/* Ranger Hood / Cap */}
            <path
              d="M 54 36 C 52 20 74 16 80 28 C 82 34 82 42 78 46 C 72 50 56 48 54 36 Z"
              fill="#15803d"
              stroke="#0f381e"
              strokeWidth="1.5"
            />
            {/* Feather in cap */}
            <path
              d="M 76 22 Q 90 10 94 4 Q 90 12 80 20 Z"
              fill="#ef4444"
              stroke="#b91c1c"
              strokeWidth="0.8"
            />
            <line x1="76" y1="22" x2="94" y2="4" stroke="#fecaca" strokeWidth="0.8" />

            {/* Face */}
            <ellipse cx="66" cy="36" rx="9" ry="10" fill="#fed7aa" />

            {/* Hair peeking from cowl */}
            <path d="M 59 30 Q 64 34 62 38" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />

            {/* Eyes - animated aiming focus */}
            {isDrawing ? (
              // Squinting aim eye + focused target eye
              <>
                <circle cx="63" cy="35" r="1.5" fill="#1e293b" />
                <path d="M 67 36 L 71 35" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
              </>
            ) : (
              // Bright alert eyes
              <>
                <circle cx="63" cy="35" r="1.5" fill="#1e293b" />
                <circle cx="69" cy="35" r="1.5" fill="#1e293b" />
                <circle cx="63.5" cy="34.5" r="0.5" fill="#ffffff" />
                <circle cx="69.5" cy="34.5" r="0.5" fill="#ffffff" />
              </>
            )}

            {/* Determined / Happy Smile */}
            <path d="M 64 41 Q 67 43 70 41" stroke="#9a3412" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </g>

          {/* Left Arm & Bow Hand (extended forward to bow riser) */}
          <g className="archer-bow-arm">
            <path
              d="M 60 52 Q 52 50 43 50"
              stroke="#15803d"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Archer glove/hand clutching bow grip */}
            <circle cx="42" cy="50" r="3.5" fill="#78350f" />
          </g>

          {/* Right Arm (Draw Arm pulling string) */}
          <g className="archer-draw-arm">
            {isDrawing ? (
              // Bent elbow pulling string taut back to jaw
              <path
                d="M 66 54 L 40 58 L 22 50"
                stroke="#15803d"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : isReleased ? (
              // Loosed arm recoiling slightly back
              <path
                d="M 66 54 Q 50 56 34 52"
                stroke="#15803d"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            ) : (
              // Ready stance arm resting near bow
              <path
                d="M 66 54 Q 54 58 46 54"
                stroke="#15803d"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            )}
            {/* Drawing fingers / glove */}
            <circle
              cx={isDrawing ? 22 : isReleased ? 34 : 46}
              cy={isDrawing ? 50 : isReleased ? 52 : 54}
              r="3"
              fill="#78350f"
            />
          </g>
        </g>

        {/* Recurve Bow */}
        <g className={`archer-bow ${isReleased ? 'bow-recoil-active' : ''}`}>
          {/* Upper Limbs (Recurve curve outwards then inwards) */}
          <path
            d="M 42 50 Q 34 32 37 20 Q 38 15 42 16"
            fill="none"
            stroke="url(#bowWood)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Upper Horn Tip */}
          <path d="M 40 17 Q 44 14 43 12" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Lower Limbs */}
          <path
            d="M 42 50 Q 34 68 37 80 Q 38 85 42 84"
            fill="none"
            stroke="url(#bowWood)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Lower Horn Tip */}
          <path d="M 40 83 Q 44 86 43 88" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Riser & Leather Wrapped Grip */}
          <rect x="40" y="44" width="4.5" height="12" rx="2" fill="url(#bowGrip)" stroke="#451a03" strokeWidth="1" />
          <line x1="40" y1="47" x2="44.5" y2="47" stroke="#fef08a" strokeWidth="1" />
          <line x1="40" y1="50" x2="44.5" y2="50" stroke="#fef08a" strokeWidth="1" />
          <line x1="40" y1="53" x2="44.5" y2="53" stroke="#fef08a" strokeWidth="1" />

          {/* Bowstring (dynamically connects tips and flexes on draw/release) */}
          <path
            className={`bow-string ${isReleased ? 'bowstring-vibrate' : ''}`}
            d={stringPath}
            fill="none"
            stroke="#f8fafc"
            strokeWidth="1.6"
            strokeDasharray="solid"
            opacity="0.95"
          />
        </g>

        {/* Nocked Arrow on the bow when aiming or shooting */}
        {element && (isDrawing || isReleased) && (
          <g className="nocked-arrow" filter="url(#elementGlowFilter)">
            {/* Arrow Shaft */}
            <line
              x1={isDrawing ? '22' : '36'}
              y1="50"
              x2="48"
              y2="50"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Arrowhead */}
            <polygon
              points="54,50 46,46 48,50 46,54"
              fill={elementGlow}
              stroke="#ffffff"
              strokeWidth="0.8"
            />
            {/* Fletchings */}
            <polygon
              points="24,50 18,46 16,47 20,50"
              fill={elementGlow}
            />
            <polygon
              points="24,50 18,54 16,53 20,50"
              fill={elementGlow}
            />
          </g>
        )}
      </svg>
    </div>
  );
};

