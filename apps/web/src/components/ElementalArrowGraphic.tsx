import React from 'react';
import type { ElementType, CharacterType } from '@math-archer/learning-engine';
import { getArrowEffectVisual, type ArrowEffectVisual } from './arrowEffects';

export interface ElementalArrowGraphicProps {
  element: ElementType;
  variant?: 'quiver' | 'projectile' | 'embedded' | 'nocked';
  className?: string;
  size?: number;
  equippedEffect?: string;
  character?: CharacterType;
}

export interface ElementVisualProfile {
  name: string;
  glyph: string;
  description: string;
  arrowheadShape: string;
  fletchingShape: string;
  shaftDetail: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  shaftColor: string;
  accentColor: string;
}

export const ELEMENTAL_PROFILES: Record<ElementType, ElementVisualProfile> = {
  fire: {
    name: 'Fire Arrow',
    glyph: '🔥',
    description:
      'Serrated flame-bladed arrowhead with charred ashwood shaft and flickering plume fletchings',
    arrowheadShape: 'serrated-flame-blade',
    fletchingShape: 'flame-plume-vanes',
    shaftDetail: 'engraved-flame-runes',
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    shaftColor: '#78350f',
    accentColor: '#fbbf24',
  },
  ice: {
    name: 'Ice Arrow',
    glyph: '❄️',
    description:
      'Diamond-faceted crystalline arrowhead with pale birch shaft and sharp ice-shard vanes',
    arrowheadShape: 'diamond-crystal-prism',
    fletchingShape: 'crystal-shard-vanes',
    shaftDetail: 'frost-lattice-runes',
    primaryColor: '#0284c7',
    secondaryColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.7)',
    shaftColor: '#cbd5e1',
    accentColor: '#e0f2fe',
  },
  wind: {
    name: 'Wind Arrow',
    glyph: '💨',
    description:
      'Aerodynamic twin-crescent winged arrowhead with bamboo shaft and swept falcon feathers',
    arrowheadShape: 'aerodynamic-winged-crescent',
    fletchingShape: 'swept-falcon-feathers',
    shaftDetail: 'zephyr-spiral-currents',
    primaryColor: '#059669',
    secondaryColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.7)',
    shaftColor: '#b45309',
    accentColor: '#a7f3d0',
  },
  earth: {
    name: 'Earth Arrow',
    glyph: '🪨',
    description:
      'Heavy chiseled stone broadhead with banded oak shaft and square-cut rugged hide vanes',
    arrowheadShape: 'chiseled-stone-broadhead',
    fletchingShape: 'square-notched-hide-vanes',
    shaftDetail: 'bronze-banded-bindings',
    primaryColor: '#b45309',
    secondaryColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.7)',
    shaftColor: '#451a03',
    accentColor: '#fde68a',
  },
};

const renderEffectMotifs = (
  effect: ArrowEffectVisual,
  orientation: 'horizontal' | 'vertical'
) => {
  if (orientation === 'vertical') {
    switch (effect.particleType) {
      case 'star':
        return (
          <g className="effect-motifs-star" fill={effect.glowColor}>
            <polygon points="30,30 31.5,33 34.5,34.5 31.5,36 30,39 28.5,36 25.5,34.5 28.5,33" />
            <polygon points="26,60 27.5,63 30.5,64.5 27.5,66 26,69 24.5,66 21.5,64.5 24.5,63" />
            <polygon points="34,85 35.5,88 38.5,89.5 35.5,91 34,94 32.5,91 29.5,89.5 32.5,88" />
            <circle cx="30" cy="48" r="1.5" fill="#ffffff" />
            <circle cx="28" cy="74" r="1.2" fill="#ffffff" />
            <circle cx="32" cy="100" r="1.5" fill="#ffffff" />
          </g>
        );
      case 'spark':
        return (
          <g className="effect-motifs-spark" stroke={effect.glowColor} strokeWidth="1.2">
            <line x1="27" y1="40" x2="33" y2="40" />
            <line x1="30" y1="37" x2="30" y2="43" />
            <line x1="26" y1="70" x2="32" y2="70" />
            <line x1="29" y1="67" x2="29" y2="73" />
            <line x1="28" y1="95" x2="34" y2="95" />
            <line x1="31" y1="92" x2="31" y2="98" />
          </g>
        );
      case 'ember':
        return (
          <g className="effect-motifs-ember">
            <circle cx="28" cy="35" r="2.2" fill="#fed7aa" />
            <circle cx="32" cy="55" r="1.8" fill="#f97316" />
            <circle cx="27" cy="75" r="2.4" fill="#ea580c" />
            <circle cx="33" cy="95" r="2" fill="#ffedd5" />
            <path d="M 30 110 Q 25 80 30 50 Q 35 20 30 10" stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.6" />
          </g>
        );
      case 'rainbow':
        return (
          <g className="effect-motifs-rainbow">
            <path d="M 28 15 Q 34 45 27 75 Q 33 100 29 110" stroke="url(#effectRainbowGrad)" strokeWidth="2.5" fill="none" opacity="0.85" />
          </g>
        );
      case 'lightning':
        return (
          <g className="effect-motifs-lightning" stroke="#7dd3fc" strokeWidth="1.8" fill="none" strokeLinecap="round">
            <path d="M 30 15 L 26 35 L 34 50 L 26 70 L 33 88 L 30 108" />
          </g>
        );
      case 'void':
        return (
          <g className="effect-motifs-void" stroke="#c4b5fd" strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.8">
            <ellipse cx="30" cy="35" rx="5" ry="3" />
            <ellipse cx="30" cy="65" rx="6" ry="3.5" />
            <ellipse cx="30" cy="95" rx="5" ry="3" />
          </g>
        );
      case 'sunbeam':
        return (
          <g className="effect-motifs-sunbeam" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round">
            <line x1="30" y1="105" x2="20" y2="115" />
            <line x1="30" y1="105" x2="40" y2="115" />
            <line x1="30" y1="80" x2="22" y2="85" />
            <line x1="30" y1="80" x2="38" y2="85" />
            <circle cx="30" cy="110" r="3" fill="#fef08a" opacity="0.8" />
          </g>
        );
      case 'petal':
        return (
          <g className="effect-motifs-petal" fill="#f472b6" opacity="0.85">
            <path d="M 26 35 C 23 38 25 43 29 41 C 31 39 29 34 26 35 Z" />
            <path d="M 34 65 C 37 68 35 73 31 71 C 29 69 31 64 34 65 Z" />
            <path d="M 27 92 C 24 95 26 100 30 98 C 32 96 30 91 27 92 Z" />
          </g>
        );
      case 'ice':
        return (
          <g className="effect-motifs-ice" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.8">
            <polygon points="30,35 34,42 30,49 26,42" />
            <polygon points="28,68 33,74 29,81 24,75" />
            <polygon points="31,95 35,101 31,107 27,101" />
          </g>
        );
      case 'dragon':
        return (
          <g className="effect-motifs-dragon" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.85">
            <path d="M 30 20 Q 24 45 34 70 Q 25 95 30 110" />
            <circle cx="30" cy="110" r="3.5" fill="#dc2626" />
          </g>
        );
      case 'meteor':
        return (
          <g className="effect-motifs-meteor">
            <line x1="30" y1="20" x2="30" y2="105" stroke="#06b6d4" strokeWidth="2.5" opacity="0.75" />
            <ellipse cx="30" cy="108" rx="4" ry="5" fill="#a5f3fc" />
          </g>
        );
      case 'phoenix':
        return (
          <g className="effect-motifs-phoenix">
            <path d="M 30 25 Q 36 50 26 75 Q 34 95 30 110" stroke="#f59e0b" strokeWidth="2" fill="none" />
            <circle cx="26" cy="45" r="2" fill="#ef4444" />
            <circle cx="34" cy="70" r="2" fill="#fbbf24" />
            <circle cx="28" cy="98" r="2" fill="#ef4444" />
          </g>
        );
      case 'supernova':
      default:
        return (
          <g className="effect-motifs-supernova">
            <ellipse cx="30" cy="105" rx="8" ry="4" stroke={effect.primaryColor} strokeWidth="1.2" fill="none" opacity="0.85" />
            <ellipse cx="30" cy="65" rx="6" ry="3" stroke={effect.glowColor} strokeWidth="1" fill="none" opacity="0.7" />
            <polygon points="30,100 32,104 36,106 32,108 30,112 28,108 24,106 28,104" fill={effect.glowColor} />
          </g>
        );
    }
  }

  // Horizontal orientation
  switch (effect.particleType) {
    case 'star':
      return (
        <g className="effect-motifs-star" fill={effect.glowColor}>
          <polygon points="36,12 37.5,14 40.5,15 37.5,16 36,18 34.5,16 31.5,15 34.5,14" />
          <polygon points="66,24 67.5,26 70.5,27 67.5,28 66,30 64.5,28 61.5,27 64.5,26" />
          <polygon points="96,12 97.5,14 100.5,15 97.5,16 96,18 94.5,16 91.5,15 94.5,14" />
          <polygon points="120,24 121.5,26 124.5,27 121.5,28 120,30 118.5,28 115.5,27 118.5,26" />
          <circle cx="52" cy="18" r="1.5" fill="#ffffff" />
          <circle cx="82" cy="18" r="1.5" fill="#ffffff" />
          <circle cx="108" cy="18" r="1.8" fill="#ffffff" />
        </g>
      );
    case 'spark':
      return (
        <g className="effect-motifs-spark" stroke={effect.glowColor} strokeWidth="1.2">
          <line x1="33" y1="13" x2="39" y2="13" />
          <line x1="36" y1="10" x2="36" y2="16" />
          <line x1="65" y1="23" x2="71" y2="23" />
          <line x1="68" y1="20" x2="68" y2="26" />
          <line x1="93" y1="13" x2="99" y2="13" />
          <line x1="96" y1="10" x2="96" y2="16" />
          <line x1="117" y1="22" x2="123" y2="22" />
          <line x1="120" y1="19" x2="120" y2="25" />
        </g>
      );
    case 'ember':
      return (
        <g className="effect-motifs-ember">
          <circle cx="35" cy="12" r="2.2" fill="#fed7aa" />
          <circle cx="65" cy="24" r="2.5" fill="#f97316" />
          <circle cx="95" cy="12" r="1.8" fill="#ea580c" />
          <circle cx="120" cy="24" r="2.2" fill="#ffedd5" />
          <path d="M 20 18 Q 45 10 75 22 Q 105 12 125 18" stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.6" />
        </g>
      );
    case 'rainbow':
      return (
        <g className="effect-motifs-rainbow">
          <path d="M 16 15 Q 45 8 80 18 Q 110 26 135 15" stroke="url(#effectRainbowGrad)" strokeWidth="2.5" fill="none" opacity="0.85" />
        </g>
      );
    case 'lightning':
      return (
        <g className="effect-motifs-lightning" stroke="#7dd3fc" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M 18 18 L 38 12 L 52 23 L 74 13 L 90 23 L 112 14 L 126 18" />
        </g>
      );
    case 'void':
      return (
        <g className="effect-motifs-void" stroke="#c4b5fd" strokeWidth="1.5" strokeDasharray="4 2" fill="none" opacity="0.8">
          <ellipse cx="36" cy="18" rx="8" ry="4" />
          <ellipse cx="68" cy="18" rx="9" ry="4.5" />
          <ellipse cx="100" cy="18" rx="8" ry="4" />
        </g>
      );
    case 'sunbeam':
      return (
        <g className="effect-motifs-sunbeam" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round">
          <line x1="126" y1="18" x2="137" y2="8" />
          <line x1="126" y1="18" x2="137" y2="28" />
          <line x1="100" y1="18" x2="108" y2="10" />
          <line x1="100" y1="18" x2="108" y2="26" />
          <circle cx="126" cy="18" r="3.5" fill="#fef08a" opacity="0.8" />
        </g>
      );
    case 'petal':
      return (
        <g className="effect-motifs-petal" fill="#f472b6" opacity="0.85">
          <path d="M 38 12 C 42 9 47 13 44 16 C 41 17 38 15 38 12 Z" />
          <path d="M 68 24 C 72 21 77 25 74 28 C 71 29 68 27 68 24 Z" />
          <path d="M 98 12 C 102 9 107 13 104 16 C 101 17 98 15 98 12 Z" />
        </g>
      );
    case 'ice':
      return (
        <g className="effect-motifs-ice" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.8">
          <polygon points="36,18 43,14 50,18 43,22" />
          <polygon points="68,18 75,13 82,18 75,23" />
          <polygon points="98,18 105,14 112,18 105,22" />
        </g>
      );
    case 'dragon':
      return (
        <g className="effect-motifs-dragon" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.85">
          <path d="M 22 18 Q 45 10 70 22 Q 95 12 118 20 Q 130 14 136 18" />
          <circle cx="128" cy="18" r="3.5" fill="#dc2626" />
        </g>
      );
    case 'meteor':
      return (
        <g className="effect-motifs-meteor">
          <line x1="20" y1="18" x2="120" y2="18" stroke="#06b6d4" strokeWidth="2.5" opacity="0.75" />
          <ellipse cx="125" cy="18" rx="6" ry="3.5" fill="#a5f3fc" />
        </g>
      );
    case 'phoenix':
      return (
        <g className="effect-motifs-phoenix">
          <path d="M 26 22 Q 55 12 85 22 Q 105 14 125 18" stroke="#f59e0b" strokeWidth="2" fill="none" />
          <circle cx="45" cy="12" r="2" fill="#ef4444" />
          <circle cx="75" cy="24" r="2" fill="#fbbf24" />
          <circle cx="105" cy="12" r="2" fill="#ef4444" />
        </g>
      );
    case 'supernova':
    default:
      return (
        <g className="effect-motifs-supernova">
          <ellipse cx="124" cy="18" rx="5" ry="9" stroke={effect.primaryColor} strokeWidth="1.2" fill="none" opacity="0.85" />
          <ellipse cx="70" cy="18" rx="4" ry="7" stroke={effect.glowColor} strokeWidth="1" fill="none" opacity="0.7" />
          <polygon points="126,18 129,15 134,18 129,21" fill={effect.glowColor} />
        </g>
      );
  }
};

/**
 * ElementalArrowGraphic renders distinct vector art for each of the four elemental arrows.
 * Each arrow is designed to be immediately distinguishable even in monochrome / grayscale
 * via distinct arrowhead silhouettes, fletching profiles, and shaft craftsmanship.
 */
export const ElementalArrowGraphic: React.FC<ElementalArrowGraphicProps> = ({
  element,
  variant = 'quiver',
  className = '',
  equippedEffect = 'arrow_effect_classic',
  character = 'archer',
}) => {
  const profile = ELEMENTAL_PROFILES[element];
  const effectVisual = getArrowEffectVisual(equippedEffect);

  // Embedded vertical variant: arrow lodged vertically in target bullseye
  if (variant === 'embedded') {
    return (
      <div
        className={`elemental-arrow embedded-variant element-${element} effect-${effectVisual.id} ${className}`}
        data-testid={`embedded-arrow-${element}`}
        data-element={element}
        data-effect={equippedEffect}
        data-arrowhead-shape={profile.arrowheadShape}
        data-fletching-shape={profile.fletchingShape}
      >
        <svg
          className="embedded-arrow-svg"
          viewBox="0 0 60 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <filter id={`embedGlow-${element}`} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={profile.glowColor} />
            </filter>
            <filter id={`effectEmbedGlow-${element}-${effectVisual.id}`} x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={effectVisual.glowColor} />
            </filter>
            <linearGradient id="effectRainbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="20%" stopColor="#f97316" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="60%" stopColor="#22c55e" />
              <stop offset="80%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          {character === 'wizard' ? (
            <g className="embedded-wizard-spell" filter={`url(#embedGlow-${element})`}>
              <circle cx="30" cy="112" r="15" fill="none" stroke={profile.primaryColor} strokeWidth="2" strokeDasharray="4 3" />
              <circle cx="30" cy="112" r="9" fill={profile.primaryColor} stroke={profile.accentColor} strokeWidth="1.5" />
              <circle cx="30" cy="112" r="4.5" fill="#ffffff" />
              <line x1="30" y1="20" x2="30" y2="108" stroke={profile.glowColor} strokeWidth="3" strokeDasharray="3 3" />
              <polygon points="30,16 25,26 35,26" fill={profile.accentColor} />
            </g>
          ) : (
            <>
              {/* Arrow Shaft (vertical) */}
              <line
                x1="30"
                y1="112"
                x2="30"
                y2="10"
                stroke={profile.shaftColor}
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Shaft Detail Marks based on element */}
              {element === 'fire' && (
                <g stroke={profile.accentColor} strokeWidth="1.2">
                  <line x1="28" y1="85" x2="32" y2="83" />
                  <line x1="28" y1="65" x2="32" y2="63" />
                  <line x1="28" y1="45" x2="32" y2="43" />
                </g>
              )}
              {element === 'ice' && (
                <g stroke={profile.accentColor} strokeWidth="1.2">
                  <line x1="28" y1="80" x2="32" y2="80" />
                  <line x1="28" y1="60" x2="32" y2="60" />
                  <line x1="28" y1="40" x2="32" y2="40" />
                </g>
              )}
              {element === 'wind' && (
                <g stroke={profile.accentColor} strokeWidth="1.2">
                  <path d="M 28 85 Q 32 80 28 75" fill="none" />
                  <path d="M 28 55 Q 32 50 28 45" fill="none" />
                </g>
              )}
              {element === 'earth' && (
                <g fill={profile.accentColor}>
                  <rect x="27.5" y="80" width="5" height="3" rx="0.5" />
                  <rect x="27.5" y="55" width="5" height="3" rx="0.5" />
                </g>
              )}

              {/* Embedded Arrowhead Buried in Target center (y=112) */}
              {element === 'fire' && (
                <polygon
                  points="30,120 22,106 26,108 24,103 30,107 36,103 34,108 38,106"
                  fill={profile.primaryColor}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
              )}
              {element === 'ice' && (
                <polygon
                  points="30,120 23,108 30,102 37,108"
                  fill={profile.primaryColor}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              )}
              {element === 'wind' && (
                <polygon
                  points="30,120 20,104 27,107 30,103 33,107 40,104"
                  fill={profile.primaryColor}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
              )}
              {element === 'earth' && (
                <polygon
                  points="30,120 21,110 21,105 39,105 39,110"
                  fill="#57534e"
                  stroke="#292524"
                  strokeWidth="1.5"
                />
              )}

              {/* Distinct Fletchings at Rear (y=10 to y=38) */}
              {element === 'fire' && (
                <g className="fletching-fire" filter={`url(#embedGlow-${element})`}>
                  <path
                    d="M 30 36 Q 16 28 14 14 Q 22 22 30 20 Z"
                    fill={profile.primaryColor}
                    stroke={profile.accentColor}
                    strokeWidth="0.8"
                  />
                  <path
                    d="M 30 36 Q 44 28 46 14 Q 38 22 30 20 Z"
                    fill={profile.primaryColor}
                    stroke={profile.accentColor}
                    strokeWidth="0.8"
                  />
                </g>
              )}
              {element === 'ice' && (
                <g className="fletching-ice" filter={`url(#embedGlow-${element})`}>
                  <polygon
                    points="30,34 16,22 18,12 30,24"
                    fill={profile.primaryColor}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <polygon
                    points="30,34 44,22 42,12 30,24"
                    fill={profile.primaryColor}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </g>
              )}
              {element === 'wind' && (
                <g className="fletching-wind" filter={`url(#embedGlow-${element})`}>
                  <path
                    d="M 30 36 Q 14 26 14 12 Q 22 20 30 18 Z"
                    fill={profile.primaryColor}
                    stroke="#047857"
                    strokeWidth="0.8"
                  />
                  <path
                    d="M 30 36 Q 46 26 46 12 Q 38 20 30 18 Z"
                    fill={profile.primaryColor}
                    stroke="#047857"
                    strokeWidth="0.8"
                  />
                </g>
              )}
              {element === 'earth' && (
                <g className="fletching-earth" filter={`url(#embedGlow-${element})`}>
                  <polygon
                    points="30,36 17,32 17,14 30,18"
                    fill="#78350f"
                    stroke="#d97706"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="30,36 43,32 43,14 30,18"
                    fill="#78350f"
                    stroke="#d97706"
                    strokeWidth="1.2"
                  />
                </g>
              )}

              {/* Rear Nock */}
              <circle cx="30" cy="8" r="2.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
            </>
          )}

          {/* Equipped Arrow Effect Overlay Layer */}
          <g
            className="arrow-effect-overlay-embedded"
            filter={`url(#effectEmbedGlow-${element}-${effectVisual.id})`}
            data-testid="arrow-effect-overlay"
          >
            <line
              x1="30"
              y1="20"
              x2="30"
              y2="108"
              stroke={effectVisual.primaryColor}
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.85"
            />
            {renderEffectMotifs(effectVisual, 'vertical')}
            {/* Bullseye Impact Flash */}
            <circle cx="30" cy="112" r="9" fill={effectVisual.glowColor} opacity="0.55" />
            <circle cx="30" cy="112" r="4.5" fill={effectVisual.primaryColor} opacity="0.9" />
          </g>
        </svg>
      </div>
    );
  }

  // Flying projectile or horizontal quiver preview variant
  return (
    <div
      className={`elemental-arrow-graphic variant-${variant} element-${element} effect-${effectVisual.id} ${className}`}
      data-testid={`elemental-arrow-${element}`}
      data-element={element}
      data-effect={equippedEffect}
      data-arrowhead-shape={profile.arrowheadShape}
      data-fletching-shape={profile.fletchingShape}
      aria-label={profile.name}
    >
      <svg
        className="arrow-vector-svg"
        viewBox="0 0 140 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <title>{profile.name}</title>
        <desc>{profile.description}</desc>

        <defs>
          {/* Glowing Aura Filter */}
          <filter id={`glow-${element}-${variant}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={profile.glowColor} />
          </filter>
          <filter id={`effectAura-${element}-${variant}-${effectVisual.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={effectVisual.glowColor} />
          </filter>
          <linearGradient id="effectRainbowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="20%" stopColor="#f97316" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="60%" stopColor="#22c55e" />
            <stop offset="80%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          {/* Shaft Linear Gradient */}
          <linearGradient id={`shaftGrad-${element}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={profile.shaftColor} />
            <stop offset="70%" stopColor={profile.shaftColor} />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Fire Flame Gradient */}
          <linearGradient id="fireHeadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          {/* Ice Crystal Gradient */}
          <linearGradient id="iceHeadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Wind Aero Gradient */}
          <linearGradient id="windHeadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="60%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#a7f3d0" />
          </linearGradient>

          {/* Earth Stone Gradient */}
          <linearGradient id="earthHeadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#57534e" />
            <stop offset="50%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#d6d3d1" />
          </linearGradient>
        </defs>

        {character === 'wizard' ? (
          variant === 'projectile' ? (
            <g className="wizard-spell-projectile" data-testid="wizard-spell-projectile" filter={`url(#glow-${element}-${variant})`}>
              {/* Trailing Arcane Comet Tail */}
              <path
                d="M 20 18 Q 65 8 115 18 Q 65 28 20 18 Z"
                fill={`url(#shaftGrad-${element})`}
                opacity="0.8"
              />
              {/* Inner High-Energy Stream */}
              <line
                x1="35"
                y1="18"
                x2="118"
                y2="18"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Swirling Arcane Rings */}
              <ellipse
                cx="95"
                cy="18"
                rx="6"
                ry="14"
                stroke={profile.accentColor}
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="3 3"
              />
              <ellipse
                cx="75"
                cy="18"
                rx="4"
                ry="10"
                stroke={profile.secondaryColor}
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="2 2"
              />
              {/* Magic Orb Head */}
              <circle
                cx="118"
                cy="18"
                r="12"
                fill={profile.primaryColor}
                stroke={profile.accentColor}
                strokeWidth="2"
              />
              <circle cx="118" cy="18" r="7" fill="#ffffff" />
              {/* Orbiting Elemental Sparks */}
              <circle cx="114" cy="9" r="2.5" fill={profile.secondaryColor} />
              <circle cx="124" cy="27" r="2" fill={profile.accentColor} />
              <circle cx="106" cy="23" r="1.8" fill="#ffffff" />
            </g>
          ) : (
            /* Horizontal Arcane Spell Bolt Underlay for Choice Panels */
            <g className="wizard-spell-underlay" data-testid="wizard-spell-underlay" filter={`url(#glow-${element}-${variant})`}>
              {/* Horizontal Arcane Energy Channel */}
              <path
                d="M 16 18 Q 70 12 124 18 Q 70 24 16 18 Z"
                fill={`url(#shaftGrad-${element})`}
                opacity="0.65"
              />
              <line
                x1="22"
                y1="18"
                x2="118"
                y2="18"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.9"
              />

              {/* Left Mystic Wing (Replaces Arrow Fletching) */}
              {element === 'fire' && (
                <g className="spell-wing-fire" fill="url(#fireHeadGrad)" stroke="#b91c1c" strokeWidth="0.8">
                  <path d="M 10 18 C 16 10 28 11 36 18 C 28 14 20 12 14 18 Z" />
                  <path d="M 10 18 C 16 26 28 25 36 18 C 28 22 20 24 14 18 Z" />
                </g>
              )}
              {element === 'ice' && (
                <g className="spell-wing-ice" fill="url(#iceHeadGrad)" stroke="#0284c7" strokeWidth="0.8">
                  <polygon points="10,18 22,10 32,18 22,26" />
                  <polygon points="18,18 26,13 32,18 26,23" fill="#ffffff" opacity="0.6" />
                </g>
              )}
              {element === 'wind' && (
                <g className="spell-wing-wind" stroke="#34d399" strokeWidth="1.5" fill="none">
                  <path d="M 12 14 Q 24 10 34 18" />
                  <path d="M 12 22 Q 24 26 34 18" />
                  <circle cx="20" cy="18" r="3" fill="#059669" />
                </g>
              )}
              {element === 'earth' && (
                <g className="spell-wing-earth" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8">
                  <polygon points="12,18 20,11 28,11 24,18" />
                  <polygon points="12,18 20,25 28,25 24,18" />
                  <circle cx="26" cy="18" r="2.5" fill="#fde68a" />
                </g>
              )}

              {/* Left Mana Source Focus Orb */}
              <circle cx="24" cy="18" r="5" fill={profile.primaryColor} stroke={profile.accentColor} strokeWidth="1" />
              <circle cx="24" cy="18" r="2.5" fill="#ffffff" />

              {/* Center Radiant Halo (Frames the number sitting at x=70, y=18) */}
              <g className="spell-center-frame">
                <polygon
                  points="70,3 81,18 70,33 59,18"
                  fill="none"
                  stroke={profile.accentColor}
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                />
                <circle
                  cx="70"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke={profile.secondaryColor}
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  opacity="0.8"
                />
                <circle cx="70" cy="18" r="12" fill={profile.glowColor} opacity="0.28" />
                <circle cx="70" cy="4" r="1.8" fill={profile.accentColor} />
                <circle cx="70" cy="32" r="1.8" fill={profile.accentColor} />
                <circle cx="50" cy="18" r="2" fill={profile.secondaryColor} />
                <circle cx="90" cy="18" r="2" fill={profile.secondaryColor} />
              </g>

              {/* Right Spell Projection Flare (Replaces Arrowhead) */}
              {element === 'fire' && (
                <g className="spell-flare-fire" fill="url(#fireHeadGrad)" stroke="#ea580c" strokeWidth="0.8">
                  <polygon points="132,18 116,9 122,18 116,27" />
                  <circle cx="120" cy="18" r="4.5" fill="#facc15" />
                  <circle cx="120" cy="18" r="2" fill="#ffffff" />
                </g>
              )}
              {element === 'ice' && (
                <g className="spell-flare-ice" fill="url(#iceHeadGrad)" stroke="#38bdf8" strokeWidth="0.8">
                  <polygon points="132,18 116,10 122,18 116,26" />
                  <polygon points="126,18 118,13 122,18 118,23" fill="#ffffff" />
                </g>
              )}
              {element === 'wind' && (
                <g className="spell-flare-wind" fill="url(#windHeadGrad)" stroke="#059669" strokeWidth="0.8">
                  <polygon points="132,18 115,8 120,18 115,28" />
                  <path d="M 112 12 Q 124 18 112 24" stroke="#a7f3d0" strokeWidth="1.5" fill="none" />
                </g>
              )}
              {element === 'earth' && (
                <g className="spell-flare-earth" fill="url(#earthHeadGrad)" stroke="#78350f" strokeWidth="0.8">
                  <polygon points="132,18 116,10 120,18 116,26" />
                  <rect x="114" y="15" width="6" height="6" rx="1" fill="#fde68a" stroke="#ca8a04" strokeWidth="0.8" />
                </g>
              )}

              {/* Trailing Magic Sparkles */}
              <circle cx="40" cy="11" r="1.5" fill={profile.accentColor} />
              <circle cx="100" cy="25" r="1.5" fill={profile.accentColor} />
              <circle cx="110" cy="10" r="1.2" fill="#ffffff" />
              <circle cx="30" cy="25" r="1.2" fill="#ffffff" />
            </g>
          )
        ) : (
          <>
            {/* 1. Arrow Shaft (x=16 to x=116, horizontal center y=18) */}
            <line
              x1="18"
              y1="18"
              x2="114"
              y2="18"
              stroke={`url(#shaftGrad-${element})`}
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* 2. Shaft Distinct Markings & Bindings */}
            {element === 'fire' && (
              <g className="shaft-runes-fire" stroke="#fbbf24" strokeWidth="1.2">
                <line x1="42" y1="16" x2="45" y2="20" />
                <line x1="48" y1="16" x2="51" y2="20" />
                <line x1="74" y1="16" x2="77" y2="20" />
                <line x1="80" y1="16" x2="83" y2="20" />
                <line x1="102" y1="16" x2="105" y2="20" />
              </g>
            )}
            {element === 'ice' && (
              <g className="shaft-runes-ice" stroke="#e0f2fe" strokeWidth="1.2">
                {/* Crystalline diamond rune rings */}
                <circle cx="48" cy="18" r="2" fill="none" />
                <circle cx="78" cy="18" r="2" fill="none" />
                <circle cx="104" cy="18" r="2" fill="none" />
              </g>
            )}
            {element === 'wind' && (
              <g className="shaft-runes-wind" stroke="#a7f3d0" strokeWidth="1.2" fill="none">
                {/* Flowing zephyr spirals */}
                <path d="M 40 16 Q 46 20 52 16" />
                <path d="M 72 16 Q 78 20 84 16" />
                <path d="M 98 16 Q 104 20 110 16" />
              </g>
            )}
            {element === 'earth' && (
              <g className="shaft-runes-earth" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8">
                {/* Heavy bronze bands */}
                <rect x="42" y="15.5" width="4.5" height="5" rx="0.5" />
                <rect x="74" y="15.5" width="4.5" height="5" rx="0.5" />
                <rect x="102" y="15.5" width="4.5" height="5" rx="0.5" />
              </g>
            )}

            {/* 3. Rear Fletchings (x=12 to x=36, y=5 to y=31) - Distinct Silhouette */}
            {element === 'fire' && (
              <g className="fletching-fire" filter={`url(#glow-${element}-${variant})`}>
                {/* Upper Jagged Flame Plume */}
                <path
                  d="M 12 18 C 16 11 26 8 36 18 C 30 14 24 10 18 16 Z"
                  fill="url(#fireHeadGrad)"
                  stroke="#b91c1c"
                  strokeWidth="0.8"
                />
                {/* Lower Jagged Flame Plume */}
                <path
                  d="M 12 18 C 16 25 26 28 36 18 C 30 22 24 26 18 20 Z"
                  fill="url(#fireHeadGrad)"
                  stroke="#b91c1c"
                  strokeWidth="0.8"
                />
              </g>
            )}

            {element === 'ice' && (
              <g className="fletching-ice" filter={`url(#glow-${element}-${variant})`}>
                {/* Upper Crystal Shard Vanes */}
                <polygon
                  points="14,18 24,7 34,7 28,18"
                  fill="url(#iceHeadGrad)"
                  stroke="#0284c7"
                  strokeWidth="0.8"
                />
                {/* Lower Crystal Shard Vanes */}
                <polygon
                  points="14,18 24,29 34,29 28,18"
                  fill="url(#iceHeadGrad)"
                  stroke="#0284c7"
                  strokeWidth="0.8"
                />
              </g>
            )}

            {element === 'wind' && (
              <g className="fletching-wind" filter={`url(#glow-${element}-${variant})`}>
                {/* Upper Swept Falcon Wing */}
                <path
                  d="M 12 18 C 16 10 24 6 36 18 C 28 14 20 12 14 17 Z"
                  fill="url(#windHeadGrad)"
                  stroke="#047857"
                  strokeWidth="0.8"
                />
                {/* Lower Swept Falcon Wing */}
                <path
                  d="M 12 18 C 16 26 24 30 36 18 C 28 22 20 24 14 19 Z"
                  fill="url(#windHeadGrad)"
                  stroke="#047857"
                  strokeWidth="0.8"
                />
              </g>
            )}

            {element === 'earth' && (
              <g className="fletching-earth" filter={`url(#glow-${element}-${variant})`}>
                {/* Upper Square Notched Leather Vane */}
                <polygon
                  points="14,18 18,8 34,8 30,18"
                  fill="#78350f"
                  stroke="#d97706"
                  strokeWidth="1.2"
                />
                <line x1="26" y1="8" x2="26" y2="12" stroke="#451a03" strokeWidth="1" />
                {/* Lower Square Notched Leather Vane */}
                <polygon
                  points="14,18 18,28 34,28 30,18"
                  fill="#78350f"
                  stroke="#d97706"
                  strokeWidth="1.2"
                />
                <line x1="26" y1="28" x2="26" y2="24" stroke="#451a03" strokeWidth="1" />
              </g>
            )}

            {/* 4. Rear Nock (x=10, y=18) */}
            <circle cx="11" cy="18" r="2.5" fill="#f8fafc" stroke="#475569" strokeWidth="0.8" />

            {/* 5. Distinct Arrowhead (x=110 to x=138, y=5 to y=31) - Distinct Silhouette */}
            {element === 'fire' && (
              <g className="arrowhead-fire" filter={`url(#glow-${element}-${variant})`}>
                {/* Serrated Flame Blade: Multi-point barbed flank */}
                <polygon
                  points="138,18 124,8 127,13 118,12 122,18 118,24 127,23 124,28"
                  fill="url(#fireHeadGrad)"
                  stroke="#b91c1c"
                  strokeWidth="1.2"
                />
                {/* Inner Flame Core */}
                <polygon points="134,18 125,14 123,18 125,22" fill="#ffffff" />
              </g>
            )}

            {element === 'ice' && (
              <g className="arrowhead-ice" filter={`url(#glow-${element}-${variant})`}>
                {/* Diamond Crystal Prism with Sharp Facet Ridge */}
                <polygon
                  points="138,18 122,7 114,18 122,29"
                  fill="url(#iceHeadGrad)"
                  stroke="#0284c7"
                  strokeWidth="1.2"
                />
                {/* Center Crystal Ridge Line */}
                <line x1="114" y1="18" x2="138" y2="18" stroke="#ffffff" strokeWidth="1.5" />
              </g>
            )}

            {element === 'wind' && (
              <g className="arrowhead-wind" filter={`url(#glow-${element}-${variant})`}>
                {/* Twin-Crescent Winged Broadhead */}
                <path
                  d="M 138 18 C 132 12 122 7 112 10 C 118 14 120 18 120 18 C 120 18 118 22 112 26 C 122 29 132 24 138 18 Z"
                  fill="url(#windHeadGrad)"
                  stroke="#047857"
                  strokeWidth="1.2"
                />
                {/* Aero Speed Groove */}
                <circle cx="127" cy="18" r="2.2" fill="#ffffff" />
              </g>
            )}

            {element === 'earth' && (
              <g className="arrowhead-earth" filter={`url(#glow-${element}-${variant})`}>
                {/* Chiseled Stone Wedge with Rugged Fracture Notches */}
                <polygon
                  points="137,18 124,9 116,9 116,27 124,27"
                  fill="url(#earthHeadGrad)"
                  stroke="#292524"
                  strokeWidth="1.5"
                />
                {/* Chiseled bevel strike lines */}
                <line x1="116" y1="18" x2="137" y2="18" stroke="#44403c" strokeWidth="1.2" />
                <line x1="124" y1="9" x2="128" y2="18" stroke="#a8a29e" strokeWidth="1" />
              </g>
            )}
          </>
        )}

        {/* Equipped Arrow Effect Overlay Layer */}
        <g
          className="arrow-effect-overlay-projectile"
          filter={`url(#effectAura-${element}-${variant}-${effectVisual.id})`}
          data-testid="arrow-effect-overlay"
        >
          <line
            x1="18"
            y1="18"
            x2="114"
            y2="18"
            stroke={effectVisual.primaryColor}
            strokeWidth="2"
            strokeDasharray="4 2"
            opacity="0.85"
          />
          {renderEffectMotifs(effectVisual, 'horizontal')}
        </g>
      </svg>
    </div>
  );
};
