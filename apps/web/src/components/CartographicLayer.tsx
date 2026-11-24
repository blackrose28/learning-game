import React from 'react';
import { type WorldAreaId } from '@math-archer/learning-engine';

export interface CartographicPalette {
  paper: string;
  hills: [string, string, string];
  contour: string;
  water: string;
  waterDeep: string;
  accent: string;
  grainLight: boolean;
}

/**
 * Refined Atlas cartographic palettes: warm hand-crafted map tones per realm,
 * layered relief, graded water and terracotta map accents.
 */
const CARTO_PALETTES: Record<WorldAreaId, CartographicPalette> = {
  castle: {
    paper: '#F5F0E6',
    hills: ['#E7DCC4', '#D9C9A8', '#C9B48B'],
    contour: '#B4532A',
    water: '#A8C3BC',
    waterDeep: '#7FA69E',
    accent: '#B4532A',
    grainLight: true,
  },
  fire_area: {
    paper: '#F5E6D8',
    hills: ['#E8B48A', '#D98E5F', '#B4532A'],
    contour: '#7C2D12',
    water: '#E25822',
    waterDeep: '#B45309',
    accent: '#B4532A',
    grainLight: true,
  },
  ice_area: {
    paper: '#EEF3F5',
    hills: ['#DDE8EC', '#C4D7DE', '#A9C3CE'],
    contour: '#5E8CA0',
    water: '#BFD9E4',
    waterDeep: '#8FB6C6',
    accent: '#B4532A',
    grainLight: true,
  },
  wind_area: {
    paper: '#F1EFE2',
    hills: ['#DEE0C4', '#C6CBA0', '#ABB378'],
    contour: '#7C8A4D',
    water: '#B9CDB4',
    waterDeep: '#93B08C',
    accent: '#B4532A',
    grainLight: true,
  },
  earth_area: {
    paper: '#E6E0CC',
    hills: ['#97A07D', '#78845F', '#5C6944'],
    contour: '#3F4A2D',
    water: '#93A78F',
    waterDeep: '#6E8468',
    accent: '#B4532A',
    grainLight: true,
  },
  space_area: {
    paper: '#1E1B3A',
    hills: ['#2C2854', '#37306B', '#443C82'],
    contour: '#818CF8',
    water: '#312E81',
    waterDeep: '#4338CA',
    accent: '#A5B4FC',
    grainLight: false,
  },
};

interface CartographicLayerProps {
  areaId: WorldAreaId;
  variant: 'arena' | 'compact';
}

/**
 * Hand-crafted cartographic background detail composited behind each realm
 * scene: paper wash, three relief tiers with contour lines, graded water with
 * shoreline depth cues, parchment grain and a small compass rose.
 */
export const CartographicLayer: React.FC<CartographicLayerProps> = ({ areaId, variant }) => {
  const p = CARTO_PALETTES[areaId] ?? CARTO_PALETTES.castle;
  const isCompact = variant === 'compact';
  const uid = `carto-${areaId}`;
  const height = isCompact ? 180 : 500;

  // Ridge lines per tier, from far (highest, faintest) to near (lowest, strongest).
  const farRidge = isCompact
    ? 'M 0 96 Q 60 78 130 90 Q 190 100 250 84 Q 310 70 370 88 Q 430 102 490 86 Q 545 74 600 92 L 600 180 L 0 180 Z'
    : 'M 0 262 Q 70 226 150 250 Q 220 268 290 234 Q 360 204 430 246 Q 500 272 560 240 Q 585 228 600 246 L 600 500 L 0 500 Z';
  const midRidge = isCompact
    ? 'M 0 114 Q 55 98 115 108 Q 175 118 240 102 Q 305 88 365 106 Q 425 122 485 104 Q 545 92 600 110 L 600 180 L 0 180 Z'
    : 'M 0 312 Q 60 282 130 300 Q 205 318 275 292 Q 345 268 415 300 Q 485 326 545 298 Q 575 286 600 302 L 600 500 L 0 500 Z';
  const nearRidge = isCompact
    ? 'M 0 130 Q 70 118 140 126 Q 210 134 280 122 Q 350 112 420 124 Q 490 134 550 124 Q 580 120 600 126 L 600 180 L 0 180 Z'
    : 'M 0 356 Q 65 338 135 350 Q 210 362 280 346 Q 355 330 425 350 Q 495 366 555 348 Q 580 342 600 350 L 600 500 L 0 500 Z';
  // Contour echoes retrace each ridge a little lower, like elevation lines on a map.
  const contourOf = (ridge: string, dy: number): string =>
    ridge
      .split(' L 600')
      .slice(0, 1)
      .join(' L 600')
      .replace(/Q (-?\d+) (-?\d+) (\d+) (-?\d+)/g, (_m, a, b, c, d) => {
        return `Q ${a} ${Number(b) + dy} ${c} ${Number(d) + dy}`;
      })
      .replace(/M 0 (\d+)/, (_m, y) => `M 0 ${Number(y) + dy}`);

  return (
    <g className="cartographic-layer" data-testid="cartographic-layer" data-carto-area={areaId}>
      <defs>
        <linearGradient id={`${uid}-relief-far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.hills[0]} stopOpacity="0.85" />
          <stop offset="100%" stopColor={p.hills[1]} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`${uid}-relief-mid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.hills[1]} stopOpacity="0.9" />
          <stop offset="100%" stopColor={p.hills[2]} stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={`${uid}-relief-near`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.hills[2]} stopOpacity="0.95" />
          <stop offset="100%" stopColor={p.paper} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.water} stopOpacity="0.8" />
          <stop offset="55%" stopColor={p.waterDeep} stopOpacity="0.7" />
          <stop offset="100%" stopColor={p.waterDeep} stopOpacity="0.9" />
        </linearGradient>
        <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.45 0 0 0 0 0.4 0 0 0 0 0.32 0 0 0 0.5 0"
          />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
      </defs>

      {/* Warm paper wash over the flat sky */}
      <rect x="0" y="0" width="600" height={height} fill={p.paper} opacity="0.3" />

      {/* Relief tier 1 — farthest, faintest */}
      <path d={farRidge} fill={`url(#${uid}-relief-far)`} />
      <path
        d={contourOf(farRidge, 10)}
        fill="none"
        stroke={p.contour}
        strokeWidth="0.6"
        opacity="0.25"
      />
      <path
        d={contourOf(farRidge, 20)}
        fill="none"
        stroke={p.contour}
        strokeWidth="0.5"
        opacity="0.18"
      />

      {/* Relief tier 2 — middle distance */}
      <path d={midRidge} fill={`url(#${uid}-relief-mid)`} />
      <path
        d={contourOf(midRidge, 9)}
        fill="none"
        stroke={p.contour}
        strokeWidth="0.7"
        opacity="0.3"
      />
      <path
        d={contourOf(midRidge, 18)}
        fill="none"
        stroke={p.contour}
        strokeWidth="0.6"
        opacity="0.22"
      />
      <path
        d={contourOf(midRidge, 27)}
        fill="none"
        stroke={p.contour}
        strokeWidth="0.5"
        opacity="0.16"
      />

      {/* Relief tier 3 — nearest, strongest with hillshade edge */}
      <path d={nearRidge} fill={`url(#${uid}-relief-near)`} />
      <path
        d={contourOf(nearRidge, 8)}
        fill="none"
        stroke={p.contour}
        strokeWidth="0.8"
        opacity="0.35"
      />
      <path
        d={contourOf(nearRidge, 16)}
        fill="none"
        stroke={p.contour}
        strokeWidth="0.6"
        opacity="0.25"
      />

      {/* Graded water with shoreline depth cues */}
      <g className="carto-water">
        {isCompact ? (
          <>
            <path
              d="M 0 150 Q 90 142 180 148 Q 300 156 420 148 Q 510 142 600 150 L 600 180 L 0 180 Z"
              fill={`url(#${uid}-water)`}
            />
            <path
              d="M 0 150 Q 90 142 180 148 Q 300 156 420 148 Q 510 142 600 150"
              fill="none"
              stroke={p.paper}
              strokeWidth="1.6"
              opacity="0.7"
            />
            <path
              d="M 20 160 Q 150 154 300 160 Q 450 166 580 160"
              fill="none"
              stroke={p.waterDeep}
              strokeWidth="0.8"
              opacity="0.5"
              strokeDasharray="6 5"
            />
          </>
        ) : (
          <>
            <path
              d="M 0 452 Q 100 438 210 448 Q 340 460 460 446 Q 540 438 600 448 L 600 500 L 0 500 Z"
              fill={`url(#${uid}-water)`}
            />
            <path
              d="M 0 452 Q 100 438 210 448 Q 340 460 460 446 Q 540 438 600 448"
              fill="none"
              stroke={p.paper}
              strokeWidth="2"
              opacity="0.7"
            />
            <path
              d="M 30 468 Q 170 460 320 468 Q 470 476 575 466"
              fill="none"
              stroke={p.waterDeep}
              strokeWidth="1"
              opacity="0.5"
              strokeDasharray="8 6"
            />
            <path
              d="M 80 484 Q 220 478 360 484 Q 480 489 560 482"
              fill="none"
              stroke={p.waterDeep}
              strokeWidth="0.8"
              opacity="0.35"
              strokeDasharray="5 7"
            />
          </>
        )}
      </g>

      {/* Small compass rose, tucked into the sky (scene elements draw over it) */}
      {!isCompact && (
        <g
          className="carto-compass"
          transform="translate(300 44)"
          stroke={p.accent}
          fill="none"
          opacity="0.4"
        >
          <circle r="13" strokeWidth="1" />
          <circle r="9" strokeWidth="0.5" opacity="0.7" />
          <path d="M 0 -16 L 3 0 L 0 16 L -3 0 Z" fill={p.accent} stroke="none" />
          <path d="M -16 0 L 0 -3 L 16 0 L 0 3 Z" fill={p.accent} stroke="none" opacity="0.6" />
        </g>
      )}

      {/* Parchment grain over the whole scene */}
      <rect
        x="0"
        y="0"
        width="600"
        height={height}
        filter={`url(#${uid}-grain)`}
        opacity={p.grainLight ? 0.14 : 0.1}
      />
    </g>
  );
};
