import React from 'react';

export interface GrassFieldProps {
  /** Top edge of the grass band in svg user units */
  y: number;
  height: number;
  /** Stable id prefix for defs */
  uid: string;
  /** Base greens, overridable per realm */
  light?: string;
  mid?: string;
  dark?: string;
  /** Deterministic seed so tufts land the same every render */
  seed?: number;
}

// Small deterministic PRNG so scatter layouts are stable across renders.
const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Realistic grass field: horizon light band, mowing stripes, a blade fringe
 * along the top edge, scattered tufts and faint blade noise with depth cues.
 */
export const GrassField: React.FC<GrassFieldProps> = ({
  y,
  height,
  uid,
  light = '#86efac',
  mid = '#22c55e',
  dark = '#15803d',
  seed = 7,
}) => {
  const rand = mulberry(seed);
  const bladeH = Math.max(4, height * 0.07);
  const tufts: React.ReactNode[] = [];
  const tuftCount = Math.round(height / 4);
  for (let i = 0; i < tuftCount; i++) {
    const tx = rand() * 600;
    const ty = y + 6 + rand() * (height - 10);
    const depth = (ty - y) / height; // nearer the bottom = larger, darker
    const th = bladeH * (0.6 + depth * 1.1);
    const tone = depth > 0.5 ? dark : mid;
    tufts.push(
      <g key={`t${i}`} transform={`translate(${tx} ${ty})`} opacity={0.35 + depth * 0.4}>
        <path
          d={`M -2.4 0 Q -2 -${th} -0.6 -${th * 1.25} Q -1 -${th * 0.6} -0.4 0 Z`}
          fill={tone}
        />
        <path
          d={`M 0.2 0 Q 0.6 -${th * 0.9} 2.2 -${th * 1.1} Q 1.4 -${th * 0.5} 1 0 Z`}
          fill={tone}
          opacity="0.8"
        />
      </g>
    );
  }

  // Faint windrows of blade noise for texture between tufts.
  const wisps: React.ReactNode[] = [];
  const wispCount = Math.round(height / 2.5);
  for (let i = 0; i < wispCount; i++) {
    const wx = rand() * 600;
    const wy = y + 4 + rand() * (height - 8);
    const depth = (wy - y) / height;
    wisps.push(
      <line
        key={`w${i}`}
        x1={wx}
        y1={wy}
        x2={wx + (rand() - 0.5) * 3}
        y2={wy - bladeH * (0.4 + depth * 0.5)}
        stroke={depth > 0.5 ? dark : mid}
        strokeWidth="0.8"
        opacity={0.2 + depth * 0.2}
      />
    );
  }

  // Mowing stripes: alternating light bands with a gentle perspective skew.
  const stripes: React.ReactNode[] = [];
  const stripeH = height / 5;
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) continue;
    stripes.push(
      <rect
        key={`s${i}`}
        x={-10 + i * 4}
        y={y + i * stripeH}
        width={620 - i * 8}
        height={stripeH + 1}
        fill={light}
        opacity="0.12"
      />
    );
  }

  // Blade fringe along the top edge, like grass catching the horizon light.
  const fringe =
    `M 0 ${y} ` +
    Array.from({ length: 40 }, (_, i) => {
      const fx = (i + 0.5) * 15;
      return `L ${fx} ${y - bladeH * (0.4 + ((i * 37) % 7) / 10)} L ${(i + 1) * 15} ${y}`;
    }).join(' ');

  return (
    <g className="grass-field" data-testid="grass-field">
      <defs>
        <linearGradient id={`${uid}-grass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="18%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>

      {/* Base with horizon light at the top edge */}
      <rect x="0" y={y} width="600" height={height} fill={`url(#${uid}-grass)`} />

      {/* Mowing stripes */}
      {stripes}

      {/* Blade noise + tufts, denser and darker toward the viewer */}
      {wisps}
      {tufts}

      {/* Blade fringe catching light at the horizon */}
      <path d={fringe} fill={light} opacity="0.7" />

      {/* Soft shadow under the horizon so the grass recedes */}
      <rect x="0" y={y} width="600" height={height * 0.06} fill={dark} opacity="0.25" />
    </g>
  );
};
