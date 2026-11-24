import React from 'react';

export interface IceTowerProps {
  /** Left edge of the tower bounding box in svg user units */
  x: number;
  /** Ground line the tower sits on */
  baseY: number;
  /** Overall width of the tower */
  width: number;
  /** Stable id prefix for defs */
  uid: string;
  /** Deterministic seed for the frost detail scatter */
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

const ICE_LIGHT = '#bae6fd';
const ICE_MID = '#7dd3fc';
const ICE_DEEP = '#38bdf8';
const ICE_SHADOW = '#0c4a6e';
const GLOW = '#8fc6e8';
const GLOW_HOT = '#eaf3fa';

/**
 * Domed ice watchtower with a lit window band and frost spire — the ice
 * realm's dwelling, cousin of the fire village hut.
 */
export const IceTower: React.FC<IceTowerProps> = ({ x, baseY, width, uid, seed = 5 }) => {
  const height = width * 1.35;
  const wallH = height * 0.55;
  const domeH = height - wallH;
  const rand = mulberry(seed);

  // Horizontal frost coursing on the tower wall.
  const courseH = Math.max(4, wallH / 4);
  const courses: React.ReactNode[] = [];
  for (let i = 1; i < 4; i++) {
    courses.push(
      <line
        key={`c${i}`}
        x1={x}
        y1={baseY - wallH + courseH * i}
        x2={x + width}
        y2={baseY - wallH + courseH * i}
        stroke={ICE_SHADOW}
        strokeWidth="0.7"
        opacity="0.6"
      />
    );
  }

  // Lit windows along the wall.
  const windows: React.ReactNode[] = [];
  const winCount = Math.max(2, Math.floor(width / 12));
  for (let i = 0; i < winCount; i++) {
    const wx = x + ((width - winCount * 7) / (winCount + 1)) * (i + 1) + i * 7;
    windows.push(
      <g key={`w${i}`}>
        <rect x={wx} y={baseY - wallH * 0.7} width="5" height={wallH * 0.38} rx="2.4" fill={GLOW} />
        <rect
          x={wx}
          y={baseY - wallH * 0.7}
          width="5"
          height={wallH * 0.16}
          rx="2.4"
          fill={GLOW_HOT}
          opacity="0.9"
        />
      </g>
    );
  }

  // Onion dome with ribbed meridians.
  const domeCx = x + width / 2;
  const domeBaseY = baseY - wallH;
  const domeW = width * 0.62;
  const ribs: React.ReactNode[] = [];
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    ribs.push(
      <path
        key={`r${i}`}
        d={`M ${domeCx - domeW / 2 + domeW * (0.5 - Math.abs(0.5 - t) * 0.6)} ${domeBaseY - domeH * 0.1} Q ${domeCx - domeW / 2 + domeW * t} ${domeBaseY - domeH * 0.5} ${domeCx} ${domeBaseY - domeH}`}
        stroke={ICE_SHADOW}
        strokeWidth="0.7"
        fill="none"
        opacity="0.55"
      />
    );
  }

  return (
    <g className="ice-tower" data-testid="ice-tower">
      <defs>
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={ICE_LIGHT} />
          <stop offset="55%" stopColor={ICE_MID} />
          <stop offset="100%" stopColor={ICE_SHADOW} />
        </linearGradient>
        <linearGradient id={`${uid}-dome`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GLOW_HOT} />
          <stop offset="55%" stopColor={ICE_MID} />
          <stop offset="100%" stopColor={ICE_DEEP} />
        </linearGradient>
      </defs>
      <rect x={x} y={baseY - wallH} width={width} height={wallH} fill={`url(#${uid}-wall)`} />
      {courses}
      {windows}
      <path
        d={`M ${domeCx - domeW / 2} ${domeBaseY} C ${domeCx - domeW / 2} ${domeBaseY - domeH * 0.55} ${domeCx - domeW * 0.3} ${domeBaseY - domeH * 0.75} ${domeCx} ${domeBaseY - domeH} C ${domeCx + domeW * 0.3} ${domeBaseY - domeH * 0.75} ${domeCx + domeW / 2} ${domeBaseY - domeH * 0.55} ${domeCx + domeW / 2} ${domeBaseY} Z`}
        fill={`url(#${uid}-dome)`}
      />
      {ribs}
      <line
        x1={domeCx}
        y1={domeBaseY - domeH}
        x2={domeCx}
        y2={domeBaseY - domeH - 6}
        stroke={GLOW}
        strokeWidth="1"
      />
      <circle cx={domeCx} cy={domeBaseY - domeH - 7} r="1.6" fill={GLOW_HOT} />
      {/* Frost flecks on the wall */}
      {Array.from({ length: 6 }).map((_, i) => (
        <circle
          key={`f${i}`}
          cx={x + rand() * width}
          cy={baseY - rand() * wallH}
          r="0.7"
          fill={GLOW_HOT}
          opacity="0.5"
        />
      ))}
    </g>
  );
};

export interface FrostBrazierProps {
  /** Center x of the brazier */
  x: number;
  /** Ground line the brazier stands on */
  baseY: number;
  /** Total height including the flame */
  height: number;
  uid: string;
}

/**
 * Frost brazier: pale stone pedestal with a cold blue flame and icy halo,
 * the ice realm's counterpart to the fire torch.
 */
export const FrostBrazier: React.FC<FrostBrazierProps> = ({ x, baseY, height, uid }) => {
  const flameH = height * 0.45;
  const stemH = height - flameH;
  return (
    <g className="frost-brazier" data-testid="frost-brazier">
      <defs>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0%" stopColor={GLOW} stopOpacity="0.5" />
          <stop offset="100%" stopColor={GLOW} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-flame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GLOW_HOT} />
          <stop offset="55%" stopColor={GLOW} />
          <stop offset="100%" stopColor={ICE_DEEP} />
        </linearGradient>
      </defs>
      <circle
        cx={x}
        cy={baseY - stemH - flameH * 0.4}
        r={flameH * 1.1}
        fill={`url(#${uid}-halo)`}
      />
      <rect x={x - 3} y={baseY - stemH} width="6" height={stemH} fill="#64748b" />
      <rect x={x - 5.5} y={baseY - 3} width="11" height="3" rx="1" fill="#475569" />
      <rect x={x - 4.5} y={baseY - stemH - 2} width="9" height="3" rx="1" fill="#64748b" />
      <path
        d={`M ${x - 3.4} ${baseY - stemH - 2} C ${x - 4.4} ${baseY - stemH - flameH * 0.5} ${x - 1.6} ${baseY - stemH - flameH * 0.7} ${x} ${baseY - stemH - flameH} C ${x + 1.6} ${baseY - stemH - flameH * 0.7} ${x + 4.4} ${baseY - stemH - flameH * 0.5} ${x + 3.4} ${baseY - stemH - 2} Z`}
        fill={`url(#${uid}-flame)`}
      />
      <path
        d={`M ${x - 1.4} ${baseY - stemH - 2} C ${x - 1.8} ${baseY - stemH - flameH * 0.4} ${x} ${baseY - stemH - flameH * 0.62} ${x} ${baseY - stemH - flameH * 0.8} C ${x} ${baseY - stemH - flameH * 0.62} ${x + 1.8} ${baseY - stemH - flameH * 0.4} ${x + 1.4} ${baseY - stemH - 2} Z`}
        fill={GLOW_HOT}
        opacity="0.9"
      />
    </g>
  );
};

export interface FrostGroundProps {
  /** Top of the ground band */
  y: number;
  /** Height of the ground band */
  height: number;
  uid: string;
  seed?: number;
}

/**
 * Snow field with drift ridges, icy cracks and sparkle glints, like the
 * frozen forecourt in the reference.
 */
export const FrostGround: React.FC<FrostGroundProps> = ({ y, height, uid, seed = 3 }) => {
  const rand = mulberry(seed);
  const drifts: React.ReactNode[] = [];
  for (let i = 0; i < 3; i++) {
    const dy = y + height * (0.25 + i * 0.28);
    drifts.push(
      <path
        key={`d${i}`}
        d={`M 0 ${dy} Q 100 ${dy - 4 - rand() * 4} 220 ${dy} T 450 ${dy - 2} T 600 ${dy + 1}`}
        stroke={i === 0 ? '#e0f2fe' : ICE_SHADOW}
        strokeWidth={i === 0 ? 1.6 : 0.9}
        fill="none"
        opacity={i === 0 ? 0.9 : 0.35}
      />
    );
  }
  const glints: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const gx = rand() * 600;
    const gy = y + 4 + rand() * (height - 8);
    glints.push(
      rand() > 0.5 ? (
        <circle key={`g${i}`} cx={gx} cy={gy} r="0.9" fill={GLOW_HOT} opacity="0.8" />
      ) : (
        <path
          key={`g${i}`}
          d={`M ${gx - 1.6} ${gy} L ${gx + 1.6} ${gy} M ${gx} ${gy - 1.6} L ${gx} ${gy + 1.6}`}
          stroke={GLOW_HOT}
          strokeWidth="0.6"
          opacity="0.7"
        />
      )
    );
  }
  return (
    <g className="frost-ground" data-testid="frost-ground">
      <defs>
        <linearGradient id={`${uid}-snow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="55%" stopColor={ICE_MID} />
          <stop offset="100%" stopColor={ICE_SHADOW} />
        </linearGradient>
      </defs>
      <rect x="0" y={y} width="600" height={height} fill={`url(#${uid}-snow)`} />
      {drifts}
      {glints}
    </g>
  );
};

export interface IceCitadelProps {
  /** Left edge of the citadel footprint */
  x: number;
  /** Ground line */
  baseY: number;
  /** Footprint width of the widest tier */
  width: number;
  /** Number of stacked wall tiers */
  tiers?: number;
  uid: string;
  seed?: number;
}

const WALL = '#a5d8f3';
const WALL_DEEP = '#5ba7d6';
const CRYSTAL = '#eaf3fa';
const CRYSTAL_GLOW = '#8fc6e8';

/**
 * Grand ice citadel like the reference: stacked crystalline wall tiers with
 * glowing window bands, flanking onion-domed turrets and a tall central
 * spire crowned with a frozen banner.
 */
export const IceCitadel: React.FC<IceCitadelProps> = ({
  x,
  baseY,
  width,
  tiers = 3,
  uid,
  seed = 5,
}) => {
  const rand = mulberry(seed);
  const tierH = Math.max(16, width * 0.3);
  const wallH = tierH * 0.72;
  const totalH = tiers * tierH + wallH * 0.3;
  const storeys: React.ReactNode[] = [];

  for (let t = 0; t < tiers; t++) {
    const tierW = width * (1 - t * 0.2);
    const tx = x + (width - tierW) / 2;
    const floorY = baseY - t * tierH;
    const wallTop = floorY - wallH;

    // Ice-block wall with a lit window band between crenellations.
    storeys.push(
      <g key={`w${t}`}>
        <rect x={tx} y={wallTop} width={tierW} height={wallH} fill={WALL} />
        <rect
          x={tx}
          y={wallTop}
          width={tierW * 0.32}
          height={wallH}
          fill={CRYSTAL}
          opacity="0.75"
        />
        <rect
          x={tx}
          y={wallTop}
          width={tierW}
          height={wallH}
          fill="none"
          stroke={WALL_DEEP}
          strokeWidth="0.8"
          opacity="0.7"
        />
        {Array.from({ length: Math.max(3, Math.floor(tierW / 16)) }).map((_, i) => {
          const wx = tx + 5 + i * 16;
          if (wx > tx + tierW - 9) return null;
          return (
            <g key={`win${i}`}>
              <rect
                x={wx}
                y={wallTop + wallH * 0.3}
                width="6"
                height={wallH * 0.45}
                rx="3"
                fill={CRYSTAL_GLOW}
                opacity="0.95"
              />
              <rect
                x={wx}
                y={wallTop + wallH * 0.3}
                width="6"
                height={wallH * 0.16}
                rx="3"
                fill={CRYSTAL}
                opacity="0.9"
              />
            </g>
          );
        })}
        {/* Crenellation crest */}
        {Array.from({ length: Math.max(3, Math.floor(tierW / 12)) }).map((_, i) => {
          const mx = tx + 2 + i * 12;
          if (mx > tx + tierW - 6) return null;
          return (
            <rect key={`cr${i}`} x={mx} y={wallTop - 3} width="5" height="3.5" fill={CRYSTAL} />
          );
        })}
      </g>
    );

    // Dome-capped corner turrets on the widest two tiers.
    if (t < 2) {
      const turretW = 10;
      for (const side of [-1, 1]) {
        const cx = side === -1 ? tx + turretW / 2 : tx + tierW - turretW / 2;
        const turretH = wallH * 0.5;
        storeys.push(
          <g key={`t${t}${side}`}>
            <rect
              x={cx - turretW / 2}
              y={wallTop - turretH + 3}
              width={turretW}
              height={turretH}
              fill={WALL}
            />
            <path
              d={`M ${cx - turretW * 0.62} ${wallTop - turretH + 3} C ${cx - turretW * 0.62} ${wallTop - turretH - 4} ${cx - turretW * 0.3} ${wallTop - turretH - 6} ${cx} ${wallTop - turretH - 9} C ${cx + turretW * 0.3} ${wallTop - turretH - 6} ${cx + turretW * 0.62} ${wallTop - turretH - 4} ${cx + turretW * 0.62} ${wallTop - turretH + 3} Z`}
              fill={WALL_DEEP}
            />
            <circle cx={cx} cy={wallTop - turretH - 10} r="1.2" fill={CRYSTAL} />
          </g>
        );
      }
    }
  }

  // Central spire with frozen banner, as in the reference sky.
  const spireX = x + width / 2;
  const spireBase = baseY - totalH;

  return (
    <g className="ice-citadel" data-testid="ice-citadel">
      <defs>
        <linearGradient id={`${uid}-spire`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CRYSTAL} />
          <stop offset="60%" stopColor={WALL} />
          <stop offset="100%" stopColor={WALL_DEEP} />
        </linearGradient>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0%" stopColor={CRYSTAL_GLOW} stopOpacity="0.45" />
          <stop offset="100%" stopColor={CRYSTAL_GLOW} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Cool halo behind the citadel */}
      <ellipse
        cx={x + width / 2}
        cy={baseY - totalH * 0.55}
        rx={width * 0.9}
        ry={totalH * 0.65}
        fill={`url(#${uid}-halo)`}
      />
      {storeys}
      {/* Central spire */}
      <polygon
        points={`${spireX - 6},${spireBase + 6} ${spireX + 6},${spireBase + 6} ${spireX + 2.5},${spireBase - 26} ${spireX - 2.5},${spireBase - 26}`}
        fill={`url(#${uid}-spire)`}
      />
      <polygon
        points={`${spireX - 2.5},${spireBase - 26} ${spireX + 2.5},${spireBase - 26} ${spireX},${spireBase - 34}`}
        fill={CRYSTAL}
      />
      <line
        x1={spireX}
        y1={spireBase - 34}
        x2={spireX}
        y2={spireBase - 40}
        stroke={CRYSTAL}
        strokeWidth="1"
      />
      {/* Frozen banner */}
      <rect
        x={spireX}
        y={spireBase - 40}
        width="9"
        height="6"
        rx="1"
        fill="#ef4444"
        opacity="0.9"
      />
      {/* Grounding shadow */}
      <ellipse
        cx={x + width / 2}
        cy={baseY + 2}
        rx={width * 0.62}
        ry="3.5"
        fill={ICE_SHADOW}
        opacity="0.45"
      />
      {/* Ice glints near the entrance */}
      {Array.from({ length: 4 }).map((_, i) => (
        <circle
          key={`sp${i}`}
          cx={x + width * (0.3 + rand() * 0.4)}
          cy={baseY - rand() * 6}
          r="1"
          fill={CRYSTAL}
          opacity="0.8"
        />
      ))}
    </g>
  );
};

export interface FrostLightStringProps {
  /** Left anchor of the string */
  x1: number;
  y1: number;
  /** Right anchor */
  x2: number;
  y2: number;
  uid: string;
}

/**
 * Festival frost-light line: sagging cord with glowing cold-blue crystals,
 * mirroring the fire village's lantern strings.
 */
export const FrostLightString: React.FC<FrostLightStringProps> = ({ x1, y1, x2, y2, uid }) => {
  const count = Math.max(4, Math.round((x2 - x1) / 46));
  const lights: React.ReactNode[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const lx = x1 + (x2 - x1) * t;
    // Quadratic sag, deepest mid-span.
    const sag = 14 + Math.sin(t * Math.PI) * 6;
    const ly = y1 + (y2 - y1) * t + sag;
    lights.push(
      <g key={`l${i}`}>
        <line x1={lx} y1={ly - 7} x2={lx} y2={ly - 3} stroke={ICE_SHADOW} strokeWidth="0.8" />
        <circle cx={lx} cy={ly} r="9" fill={`url(#${uid}-halo)`} />
        <polygon
          points={`${lx},${ly - 5} ${lx + 3.4},${ly - 2.4} ${lx + 2.1},${ly + 4} ${lx - 2.1},${ly + 4} ${lx - 3.4},${ly - 2.4}`}
          fill={CRYSTAL_GLOW}
        />
        <polygon
          points={`${lx},${ly - 5} ${lx + 3.4},${ly - 2.4} ${lx},${ly - 1.5} ${lx - 3.4},${ly - 2.4}`}
          fill={CRYSTAL}
          opacity="0.9"
        />
        <circle cx={lx} cy={ly + 1} r="1.4" fill={CRYSTAL} opacity="0.9" />
      </g>
    );
  }
  const midx = (x1 + x2) / 2;
  const midy = (y1 + y2) / 2 + 14;
  return (
    <g className="frost-light-string" data-testid="frost-light-string">
      <defs>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0%" stopColor={CRYSTAL_GLOW} stopOpacity="0.55" />
          <stop offset="100%" stopColor={CRYSTAL_GLOW} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d={`M ${x1} ${y1} Q ${midx} ${midy} ${x2} ${y2}`}
        stroke={ICE_SHADOW}
        strokeWidth="1.2"
        fill="none"
      />
      {lights}
    </g>
  );
};

export interface IceSparklesProps {
  /** Upper sky band for bursts */
  y: number;
  seed?: number;
}

/**
 * Night-sky ice-crystal bursts: radial frost trails, glitter dots and a soft
 * cold flash, like the aurora of fireworks over the reference citadel.
 */
export const IceSparkles: React.FC<IceSparklesProps> = ({ y, seed = 19 }) => {
  const rand = mulberry(seed);
  const palette = ['#eaf3fa', '#8fc6e8', '#7dd3fc', '#c4b5fd'];
  const centers: Array<[number, number]> = [
    [110, y * 0.55],
    [300, y * 0.35],
    [480, y * 0.6],
    [400, y * 0.8],
  ];
  const bursts: React.ReactNode[] = centers.map(([cx, cy], b) => {
    const color = palette[b % palette.length];
    const r = 18 + rand() * 16;
    const rays: React.ReactNode[] = [];
    const rayCount = 10;
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2 + rand() * 0.3;
      const r1 = r * 0.55;
      const r2 = r * (0.85 + rand() * 0.3);
      rays.push(
        <line
          key={`ray${i}`}
          x1={cx + Math.cos(a) * r1}
          y1={cy + Math.sin(a) * r1}
          x2={cx + Math.cos(a) * r2}
          y2={cy + Math.sin(a) * r2}
          stroke={color}
          strokeWidth="1.4"
          opacity={0.55 + rand() * 0.3}
        />
      );
    }
    const sparkles: React.ReactNode[] = [];
    for (let i = 0; i < 8; i++) {
      const a = rand() * Math.PI * 2;
      const rr = r * (0.9 + rand() * 0.35);
      sparkles.push(
        <circle
          key={`sp${i}`}
          cx={cx + Math.cos(a) * rr}
          cy={cy + Math.sin(a) * rr}
          r={0.9}
          fill={CRYSTAL}
          opacity={0.6 + rand() * 0.4}
        />
      );
    }
    return (
      <g key={`b${b}`}>
        <circle cx={cx} cy={cy} r={r * 1.15} fill={CRYSTAL} opacity="0.08" />
        {rays}
        {sparkles}
      </g>
    );
  });
  return (
    <g className="ice-sparkles" data-testid="ice-sparkles" pointerEvents="none">
      {bursts}
    </g>
  );
};
