import React from 'react';
import type { ElementType } from '@math-archer/learning-engine';

export interface ArcherGraphicProps {
  state: 'idle' | 'drawing' | 'released';
  element?: ElementType | null;
  className?: string;
  equippedOutfit?: string;
  equippedBow?: string;
}

const OUTFIT_SKINS: Record<
  string,
  { primary: string; secondary: string; stroke: string; feather: string; arm: string }
> = {
  outfit_classic_green: {
    primary: '#15803d',
    secondary: '#14532d',
    stroke: '#0f381e',
    feather: '#ef4444',
    arm: '#15803d',
  },
  outfit_ember_crimson: {
    primary: '#dc2626',
    secondary: '#991b1b',
    stroke: '#450a0a',
    feather: '#f59e0b',
    arm: '#dc2626',
  },
  outfit_frost_azure: {
    primary: '#0284c7',
    secondary: '#0369a1',
    stroke: '#082f49',
    feather: '#38bdf8',
    arm: '#0284c7',
  },
  outfit_zephyr_emerald: {
    primary: '#059669',
    secondary: '#065f46',
    stroke: '#022c22',
    feather: '#34d399',
    arm: '#059669',
  },
  outfit_royal_gold: {
    primary: '#d97706',
    secondary: '#b45309',
    stroke: '#451a03',
    feather: '#fbbf24',
    arm: '#d97706',
  },
};

const BOW_SKINS: Record<
  string,
  { stop0: string; stop50: string; stop100: string; tips: string; grip0: string; grip100: string }
> = {
  bow_recurve_oak: {
    stop0: '#92400e',
    stop50: '#b45309',
    stop100: '#78350f',
    tips: '#facc15',
    grip0: '#d97706',
    grip100: '#78350f',
  },
  bow_ember_blaze: {
    stop0: '#ea580c',
    stop50: '#c2410c',
    stop100: '#7c2d12',
    tips: '#fdba74',
    grip0: '#ef4444',
    grip100: '#431407',
  },
  bow_frost_crystal: {
    stop0: '#38bdf8',
    stop50: '#0284c7',
    stop100: '#0369a1',
    tips: '#e0f2fe',
    grip0: '#bae6fd',
    grip100: '#0369a1',
  },
  bow_zephyr_wind: {
    stop0: '#10b981',
    stop50: '#059669',
    stop100: '#047857',
    tips: '#a7f3d0',
    grip0: '#34d399',
    grip100: '#064e3b',
  },
  bow_regal_gold: {
    stop0: '#fde047',
    stop50: '#eab308',
    stop100: '#a16207',
    tips: '#fef08a',
    grip0: '#fbbf24',
    grip100: '#78350f',
  },
};

export const ArcherGraphic: React.FC<ArcherGraphicProps> = ({
  state,
  element,
  className = '',
  equippedOutfit = 'outfit_classic_green',
  equippedBow = 'bow_recurve_oak',
}) => {
  const outfit = OUTFIT_SKINS[equippedOutfit] || OUTFIT_SKINS.outfit_classic_green;
  const bow = BOW_SKINS[equippedBow] || BOW_SKINS.bow_recurve_oak;

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
      data-outfit={equippedOutfit}
      data-bow={equippedBow}
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
            <stop offset="0%" stopColor={bow.stop0} />
            <stop offset="50%" stopColor={bow.stop50} />
            <stop offset="100%" stopColor={bow.stop100} />
          </linearGradient>

          {/* Grip wrap gradient */}
          <linearGradient id="bowGrip" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={bow.grip0} />
            <stop offset="100%" stopColor={bow.grip100} />
          </linearGradient>

          {/* Elemental Aura Glow */}
          <filter id="elementGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="3"
              floodColor={elementGlow}
              floodOpacity="0.8"
            />
          </filter>

          {/* Archer Cloak / Tunic Gradient */}
          <linearGradient id="tunicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={outfit.primary} />
            <stop offset="100%" stopColor={outfit.secondary} />
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
            stroke={outfit.stroke}
            strokeWidth="1.5"
          />

          {/* Belt & Buckle */}
          <path d="M 52 70 Q 64 73 78 71" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          <rect
            x="62"
            y="68"
            width="5"
            height="5"
            rx="1"
            fill="#facc15"
            stroke="#ca8a04"
            strokeWidth="1"
          />

          {/* Archer Head & Hood */}
          <g className="archer-head">
            {/* Ranger Hood / Cap */}
            <path
              d="M 54 36 C 52 20 74 16 80 28 C 82 34 82 42 78 46 C 72 50 56 48 54 36 Z"
              fill={outfit.primary}
              stroke={outfit.stroke}
              strokeWidth="1.5"
            />
            {/* Feather in cap */}
            <path
              d="M 76 22 Q 90 10 94 4 Q 90 12 80 20 Z"
              fill={outfit.feather}
              stroke={outfit.stroke}
              strokeWidth="0.8"
            />
            <line x1="76" y1="22" x2="94" y2="4" stroke="#fecaca" strokeWidth="0.8" />

            {/* Face */}
            <ellipse cx="66" cy="36" rx="9" ry="10" fill="#fed7aa" />

            {/* Hair peeking from cowl */}
            <path
              d="M 59 30 Q 64 34 62 38"
              stroke="#92400e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Eyes - animated aiming focus */}
            {isDrawing ? (
              // Squinting aim eye + focused target eye
              <>
                <circle cx="63" cy="35" r="1.5" fill="#1e293b" />
                <path
                  d="M 67 36 L 71 35"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
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
            <path
              d="M 64 41 Q 67 43 70 41"
              stroke="#9a3412"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Left Arm & Bow Hand (extended forward to bow riser) */}
          <g className="archer-bow-arm">
            <path
              d="M 60 52 Q 52 50 43 50"
              stroke={outfit.arm}
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
                stroke={outfit.arm}
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : isReleased ? (
              // Loosed arm recoiling slightly back
              <path
                d="M 66 54 Q 50 56 34 52"
                stroke={outfit.arm}
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            ) : (
              // Ready stance arm resting near bow
              <path
                d="M 66 54 Q 54 58 46 54"
                stroke={outfit.arm}
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
          <path
            d="M 40 17 Q 44 14 43 12"
            stroke={bow.tips}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Lower Limbs */}
          <path
            d="M 42 50 Q 34 68 37 80 Q 38 85 42 84"
            fill="none"
            stroke="url(#bowWood)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Lower Horn Tip */}
          <path
            d="M 40 83 Q 44 86 43 88"
            stroke={bow.tips}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Riser & Leather Wrapped Grip */}
          <rect
            x="40"
            y="44"
            width="4.5"
            height="12"
            rx="2"
            fill="url(#bowGrip)"
            stroke="#451a03"
            strokeWidth="1"
          />
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

        {/* Nocked Arrow on the bow when aiming or shooting with distinct elemental geometry */}
        {element && (isDrawing || isReleased) && (
          <g
            className={`nocked-arrow element-${element}`}
            data-testid="nocked-arrow"
            data-element={element}
            filter="url(#elementGlowFilter)"
          >
            {/* Arrow Shaft with element-specific coloration */}
            <line
              x1={isDrawing ? '22' : '36'}
              y1="50"
              x2="48"
              y2="50"
              stroke={
                element === 'ice'
                  ? '#cbd5e1'
                  : element === 'wind'
                    ? '#b45309'
                    : element === 'earth'
                      ? '#451a03'
                      : '#78350f'
              }
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Distinct Arrowhead per element */}
            {element === 'fire' && (
              <polygon
                className="nocked-arrowhead-fire"
                points="55,50 47,45 49,48 45,47 48,50 45,53 49,52 47,55"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="0.8"
              />
            )}
            {element === 'ice' && (
              <g className="nocked-arrowhead-ice">
                <polygon
                  points="55,50 47,45 44,50 47,55"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                />
                <line x1="44" y1="50" x2="55" y2="50" stroke="#ffffff" strokeWidth="1" />
              </g>
            )}
            {element === 'wind' && (
              <path
                className="nocked-arrowhead-wind"
                d="M 55 50 C 51 46 45 44 44 46 C 47 48 48 50 48 50 C 48 50 47 52 44 54 C 45 56 51 54 55 50 Z"
                fill="#059669"
                stroke="#a7f3d0"
                strokeWidth="0.8"
              />
            )}
            {element === 'earth' && (
              <polygon
                className="nocked-arrowhead-earth"
                points="54,50 48,44 45,45 45,55 48,56"
                fill="#78716c"
                stroke="#292524"
                strokeWidth="1"
              />
            )}

            {/* Distinct Fletchings per element */}
            {element === 'fire' && (
              <g className="nocked-fletching-fire">
                <path
                  d={
                    isDrawing
                      ? 'M 24 50 Q 18 44 14 46 Q 19 49 22 50 Z'
                      : 'M 38 50 Q 32 44 28 46 Q 33 49 36 50 Z'
                  }
                  fill="#f97316"
                  stroke="#ef4444"
                  strokeWidth="0.6"
                />
                <path
                  d={
                    isDrawing
                      ? 'M 24 50 Q 18 56 14 54 Q 19 51 22 50 Z'
                      : 'M 38 50 Q 32 56 28 54 Q 33 51 36 50 Z'
                  }
                  fill="#f97316"
                  stroke="#ef4444"
                  strokeWidth="0.6"
                />
              </g>
            )}
            {element === 'ice' && (
              <g className="nocked-fletching-ice">
                <polygon
                  points={isDrawing ? '24,50 18,44 14,45 20,50' : '38,50 32,44 28,45 34,50'}
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="0.6"
                />
                <polygon
                  points={isDrawing ? '24,50 18,56 14,55 20,50' : '38,50 32,56 28,55 34,50'}
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="0.6"
                />
              </g>
            )}
            {element === 'wind' && (
              <g className="nocked-fletching-wind">
                <path
                  d={
                    isDrawing
                      ? 'M 24 50 C 20 44 15 45 14 47 C 18 48 21 50 22 50 Z'
                      : 'M 38 50 C 34 44 29 45 28 47 C 32 48 35 50 36 50 Z'
                  }
                  fill="#34d399"
                  stroke="#059669"
                  strokeWidth="0.6"
                />
                <path
                  d={
                    isDrawing
                      ? 'M 24 50 C 20 56 15 55 14 53 C 18 52 21 50 22 50 Z'
                      : 'M 38 50 C 34 56 29 55 28 53 C 32 52 35 50 36 50 Z'
                  }
                  fill="#34d399"
                  stroke="#059669"
                  strokeWidth="0.6"
                />
              </g>
            )}
            {element === 'earth' && (
              <g className="nocked-fletching-earth">
                <polygon
                  points={isDrawing ? '24,50 19,45 15,45 19,50' : '38,50 33,45 29,45 33,50'}
                  fill="#78350f"
                  stroke="#d97706"
                  strokeWidth="0.8"
                />
                <polygon
                  points={isDrawing ? '24,50 19,55 15,55 19,50' : '38,50 33,55 29,55 33,50'}
                  fill="#78350f"
                  stroke="#d97706"
                  strokeWidth="0.8"
                />
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
};
