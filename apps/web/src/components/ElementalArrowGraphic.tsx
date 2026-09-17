import React from 'react';
import type { ElementType } from '@math-archer/learning-engine';

export interface ElementalArrowGraphicProps {
  element: ElementType;
  variant?: 'quiver' | 'projectile' | 'embedded' | 'nocked';
  className?: string;
  size?: number;
  equippedEffect?: string;
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
}) => {
  const profile = ELEMENTAL_PROFILES[element];

  // Embedded vertical variant: arrow lodged vertically in target bullseye
  if (variant === 'embedded') {
    return (
      <div
        className={`elemental-arrow embedded-variant element-${element} ${className}`}
        data-testid={`embedded-arrow-${element}`}
        data-element={element}
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
          </defs>

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
                d="M 30 36 C 20 30 14 18 16 10 C 22 18 28 24 30 28 Z"
                fill={profile.primaryColor}
                stroke="#a7f3d0"
                strokeWidth="0.8"
              />
              <path
                d="M 30 36 C 40 30 46 18 44 10 C 38 18 32 24 30 28 Z"
                fill={profile.primaryColor}
                stroke="#a7f3d0"
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
        </svg>
      </div>
    );
  }

  // Flying projectile or horizontal quiver preview variant
  return (
    <div
      className={`elemental-arrow-graphic variant-${variant} element-${element} ${className}`}
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
      </svg>
    </div>
  );
};
