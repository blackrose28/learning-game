import React from 'react';

export interface TempleHallProps {
  /** Left edge of the hall bounding box in svg user units */
  x: number;
  /** Ground line the hall sits on */
  baseY: number;
  /** Overall width of the hall */
  width: number;
  /** Number of stacked roof tiers */
  tiers?: number;
  /** Stable id prefix for defs */
  uid: string;
  /** Deterministic seed for foliage detail */
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

const ROOF_TEAL = '#0f766e';
const ROOF_DEEP = '#134e4a';
const ROOF_GLOW = '#2dd4bf';
const WALL_RED = '#c2410c';
const WALL_DEEP = '#7c2d12';
const WALL_GLOW = '#ef4444';
const STONE_LIGHT = '#e7e5e4';
const STONE_MID = '#a8a29e';
const STONE_DARK = '#57534e';

/**
 * Tiered mountain temple hall: vermilion walls under sweeping teal roofs with
 * upturned eaves, a stone terrace base and a gilded finial — the wind realm's
 * sanctuary, matching the floating temple mountain reference.
 */
export const TempleHall: React.FC<TempleHallProps> = ({
  x,
  baseY,
  width,
  tiers = 3,
  uid,
  seed = 5,
}) => {
  const rand = mulberry(seed);
  const height = width * 0.95;
  const terraceH = height * 0.14;
  const tierH = (height - terraceH) / (tiers + 0.55);
  const wallH = tierH * 0.62;

  // Stone terrace under the hall.
  const terrace: React.ReactNode[] = [];
  for (let i = 1; i < 5; i++) {
    terrace.push(
      <line
        key={`s${i}`}
        x1={x}
        y1={baseY - terraceH + (terraceH / 5) * i}
        x2={x + width}
        y2={baseY - terraceH + (terraceH / 5) * i}
        stroke={STONE_MID}
        strokeWidth="0.7"
        opacity="0.7"
      />
    );
  }

  // Stacked tiers, each narrower than the one below.
  const tierNodes: React.ReactNode[] = [];
  for (let t = 0; t < tiers; t++) {
    const shrink = 1 - t * 0.22;
    const tw = width * 0.82 * shrink;
    const tx = x + (width - tw) / 2;
    const base = baseY - terraceH - t * tierH;
    // Vermilion wall band with column strokes.
    const columns: React.ReactNode[] = [];
    const colCount = Math.max(3, Math.round(tw / 22));
    for (let c = 0; c <= colCount; c++) {
      const cx = tx + (tw / colCount) * c;
      columns.push(
        <line
          key={`col${t}-${c}`}
          x1={cx}
          y1={base - wallH}
          x2={cx}
          y2={base}
          stroke={WALL_DEEP}
          strokeWidth="1.1"
          opacity="0.65"
        />
      );
    }
    // Sweeping teal roof: deep curve, upturned eaves, ridge highlight.
    const roofH = tierH * 0.55;
    const eaveDrop = roofH * 0.32;
    const lx = tx - tw * 0.1;
    const rx = tx + tw + tw * 0.1;
    tierNodes.push(
      <g key={`tier${t}`}>
        <rect x={tx} y={base - wallH} width={tw} height={wallH} fill={`url(#${uid}-wall)`} />
        {columns}
        <path
          d={`M ${lx} ${base - wallH + eaveDrop} Q ${tx} ${base - wallH - roofH * 0.15} ${tx + tw / 2} ${base - wallH - roofH} Q ${tx + tw} ${base - wallH - roofH * 0.15} ${rx} ${base - wallH + eaveDrop} Q ${tx + tw * 0.72} ${base - wallH + eaveDrop - roofH * 0.28} ${tx + tw / 2} ${base - wallH + eaveDrop - roofH * 0.34} Q ${tx + tw * 0.28} ${base - wallH + eaveDrop - roofH * 0.28} ${lx} ${base - wallH + eaveDrop} Z`}
          fill={`url(#${uid}-roof)`}
        />
        <path
          d={`M ${lx} ${base - wallH + eaveDrop} Q ${tx + tw * 0.28} ${base - wallH + eaveDrop - roofH * 0.28} ${tx + tw / 2} ${base - wallH + eaveDrop - roofH * 0.34} Q ${tx + tw * 0.72} ${base - wallH + eaveDrop - roofH * 0.28} ${rx} ${base - wallH + eaveDrop}`}
          stroke={ROOF_GLOW}
          strokeWidth="1.2"
          fill="none"
          opacity="0.8"
        />
        {/* Gilded finial on the top tier */}
        {t === tiers - 1 && (
          <g>
            <circle cx={tx + tw / 2} cy={base - wallH - roofH - 4} r="1.6" fill="#fbbf24" />
            <line
              x1={tx + tw / 2}
              y1={base - wallH - roofH}
              x2={tx + tw / 2}
              y2={base - wallH - roofH - 6}
              stroke="#fbbf24"
              strokeWidth="1"
            />
          </g>
        )}
      </g>
    );
  }

  // Flecks of moss on the terrace for a weathered look.
  const moss: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    moss.push(
      <circle
        key={`m${i}`}
        cx={x + rand() * width}
        cy={baseY - rand() * terraceH}
        r={0.8 + rand()}
        fill="#4d7c0f"
        opacity="0.5"
      />
    );
  }

  return (
    <g className="temple-hall" data-testid="temple-hall">
      <defs>
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={WALL_GLOW} />
          <stop offset="55%" stopColor={WALL_RED} />
          <stop offset="100%" stopColor={WALL_DEEP} />
        </linearGradient>
        <linearGradient id={`${uid}-roof`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={ROOF_GLOW} />
          <stop offset="55%" stopColor={ROOF_TEAL} />
          <stop offset="100%" stopColor={ROOF_DEEP} />
        </linearGradient>
        <linearGradient id={`${uid}-stone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={STONE_LIGHT} />
          <stop offset="100%" stopColor={STONE_MID} />
        </linearGradient>
      </defs>
      <rect
        x={x}
        y={baseY - terraceH}
        width={width}
        height={terraceH}
        fill={`url(#${uid}-stone)`}
      />
      {terrace}
      {moss}
      {tierNodes}
    </g>
  );
};

export interface PrayerFlagStringProps {
  /** Left anchor of the string */
  x1: number;
  y1: number;
  /** Right anchor */
  x2: number;
  y2: number;
  uid: string;
}

/**
 * Prayer-flag line: sagging cord with small teal-and-red pennants that flutter
 * on the mountain wind, mirroring the lantern and frost-light strings of the
 * other realms.
 */
export const PrayerFlagString: React.FC<PrayerFlagStringProps> = ({ x1, y1, x2, y2, uid }) => {
  const count = Math.max(4, Math.round((x2 - x1) / 34));
  const flags: React.ReactNode[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const lx = x1 + (x2 - x1) * t;
    const sag = 12 + Math.sin(t * Math.PI) * 5;
    const ly = y1 + (y2 - y1) * t + sag;
    const flutter = i % 2 === 0 ? 1.2 : -0.8;
    flags.push(
      <g key={`f${i}`} className="prayer-flag">
        <line x1={lx} y1={ly} x2={lx} y2={ly + 7} stroke={STONE_DARK} strokeWidth="0.8" />
        <path
          d={`M ${lx} ${ly + 7} q 5 ${flutter} 10 0 l 0 7 q -5 ${flutter} -10 0 Z`}
          fill={i % 2 === 0 ? WALL_RED : ROOF_TEAL}
          opacity="0.92"
        />
        <circle cx={lx + 11} cy={ly + 12} r="6" fill={`url(#${uid}-halo)`} opacity="0.7" />
      </g>
    );
  }
  const midx = (x1 + x2) / 2;
  const midy = (y1 + y2) / 2 + 12;
  return (
    <g className="prayer-flag-string" data-testid="prayer-flag-string">
      <defs>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0%" stopColor={ROOF_GLOW} stopOpacity="0.5" />
          <stop offset="100%" stopColor={ROOF_GLOW} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d={`M ${x1} ${y1} Q ${midx} ${midy} ${x2} ${y2}`}
        stroke={STONE_DARK}
        strokeWidth="1.2"
        fill="none"
      />
      {flags}
    </g>
  );
};

export interface IncenseBrazierProps {
  /** Center x of the brazier */
  x: number;
  /** Ground line the brazier sits on */
  baseY: number;
  /** Overall height of the brazier */
  height: number;
  uid: string;
}

/**
 * Stone incense brazier with a thin curl of temple smoke rising straight up
 * until the zephyr bends it aside.
 */
export const IncenseBrazier: React.FC<IncenseBrazierProps> = ({ x, baseY, height, uid }) => {
  const w = height * 0.42;
  const bowlH = height * 0.34;
  const smokeH = height - bowlH - w * 0.3;
  return (
    <g className="incense-brazier" data-testid="incense-brazier">
      <defs>
        <linearGradient id={`${uid}-stone`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={STONE_LIGHT} />
          <stop offset="60%" stopColor={STONE_MID} />
          <stop offset="100%" stopColor={STONE_DARK} />
        </linearGradient>
      </defs>
      {/* Column and bowl */}
      <rect
        x={x - w * 0.16}
        y={baseY - bowlH - w * 0.55}
        width={w * 0.32}
        height={w * 0.55}
        fill={`url(#${uid}-stone)`}
      />
      <ellipse cx={x} cy={baseY - bowlH} rx={w * 0.5} ry={w * 0.16} fill={STONE_MID} />
      <path
        d={`M ${x - w * 0.5} ${baseY - bowlH} q ${w * 0.08} ${bowlH} ${w * 0.5} ${bowlH} q ${w * 0.42} 0 ${w * 0.5} -${bowlH} Z`}
        fill={`url(#${uid}-stone)`}
      />
      {/* Smoke curl: straight column bending with the wind */}
      <path
        d={`M ${x} ${baseY - bowlH - 2} q 2 -${smokeH * 0.3} 6 -${smokeH * 0.45} q 4 -${smokeH * 0.18} 10 -${smokeH * 0.25}`}
        stroke="#f1f5f9"
        strokeWidth="1.6"
        fill="none"
        opacity="0.55"
        strokeLinecap="round"
      />
    </g>
  );
};

export interface ZephyrGroundProps {
  /** Top of the ground band */
  y: number;
  /** Height of the ground band */
  height: number;
  uid: string;
  /** Deterministic seed for the grass and stone scatter */
  seed?: number;
}

/**
 * High-altitude terrace ground: jade grass over cut stone slabs with grass
 * tufts and scattered pebbles, like the temple plateau in the reference.
 */
export const ZephyrGround: React.FC<ZephyrGroundProps> = ({ y, height, uid, seed = 3 }) => {
  const rand = mulberry(seed);
  const tufts: React.ReactNode[] = [];
  for (let i = 0; i < 22; i++) {
    const gx = rand() * 600;
    const gy = y + rand() * height * 0.55;
    tufts.push(
      <path
        key={`t${i}`}
        d={`M ${gx} ${gy} q -1.4 -4 -0.4 -6 M ${gx} ${gy} q 1.6 -3.4 2.6 -5.4`}
        stroke="#365314"
        strokeWidth="0.9"
        fill="none"
        opacity="0.7"
      />
    );
  }
  const pebbles: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    pebbles.push(
      <ellipse
        key={`p${i}`}
        cx={rand() * 600}
        cy={y + height * 0.35 + rand() * height * 0.6}
        rx={1.2 + rand() * 2}
        ry={0.8 + rand() * 1.2}
        fill={STONE_MID}
        opacity="0.65"
      />
    );
  }
  return (
    <g className="zephyr-ground" data-testid="zephyr-ground">
      <defs>
        <linearGradient id={`${uid}-grass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d7c0f" />
          <stop offset="45%" stopColor="#3f6212" />
          <stop offset="100%" stopColor="#1a2e05" />
        </linearGradient>
      </defs>
      <rect x="0" y={y} width="600" height={height} fill={`url(#${uid}-grass)`} />
      <rect x="0" y={y} width="600" height="6" fill="#65a30d" />
      {/* Cut stone slab joints */}
      {[110, 230, 360, 480].map((jx) => (
        <line
          key={`j${jx}`}
          x1={jx}
          y1={y + 6}
          x2={jx}
          y2={y + height}
          stroke="#1a2e05"
          strokeWidth="1.4"
          opacity="0.55"
        />
      ))}
      {tufts}
      {pebbles}
    </g>
  );
};

export interface CloudBankProps {
  /** Center x of the cloud bank */
  cx: number;
  /** Center y of the cloud bank */
  cy: number;
  /** Overall scale of the bank */
  scale?: number;
  uid: string;
}

/**
 * Soft cumulus bank: white billows with cool blue undersides, drifting past
 * the floating mountain.
 */
export const CloudBank: React.FC<CloudBankProps> = ({ cx, cy, scale = 1, uid }) => {
  const billows: Array<[number, number, number]> = [
    [-46, 2, 20],
    [-18, -8, 26],
    [14, -2, 22],
    [44, 4, 18],
  ];
  return (
    <g className="cloud-bank" data-testid={`cloud-bank-${uid}`}>
      <defs>
        <linearGradient id={`${uid}-cloud`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
      </defs>
      <ellipse
        cx={cx}
        cy={cy + 8 * scale}
        rx={62 * scale}
        ry={12 * scale}
        fill={`url(#${uid}-cloud)`}
        opacity="0.9"
      />
      {billows.map(([dx, dy, r], i) => (
        <circle
          key={`b${i}`}
          cx={cx + dx * scale}
          cy={cy + dy * scale}
          r={r * scale}
          fill={`url(#${uid}-cloud)`}
        />
      ))}
    </g>
  );
};

export interface FloatingStoneProps {
  /** Center x of the stone */
  cx: number;
  /** Center y of the stone */
  cy: number;
  /** Radius of the stone */
  r: number;
  /** Deterministic seed for the crag silhouette */
  seed?: number;
}

/**
 * Small broken rock drifting beside the island, echoing the shattered stones
 * around the temple mountain.
 */
export const FloatingStone: React.FC<FloatingStoneProps> = ({ cx, cy, r, seed = 7 }) => {
  const rand = mulberry(seed);
  const pts = 6;
  const nodes: string[] = [];
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = r * (0.72 + rand() * 0.5);
    nodes.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
  }
  return (
    <polygon
      className="floating-stone"
      data-testid="floating-stone"
      points={nodes.join(' ')}
      fill="#44403c"
      stroke="#292524"
      strokeWidth="1"
    />
  );
};

export interface KiteGliderProps {
  /** Center x of the glider */
  cx: number;
  /** Center y of the glider */
  cy: number;
  uid: string;
}

/**
 * A monk soaring on a bamboo-and-paper kite glider — the signature flourish
 * of the wind temple sky from the reference illustration.
 */
export const KiteGlider: React.FC<KiteGliderProps> = ({ cx, cy, uid }) => {
  const s = 1.1;
  return (
    <g className="kite-glider" data-testid="kite-glider">
      <defs>
        <linearGradient id={`${uid}-kite`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#d6c9a8" />
        </linearGradient>
      </defs>
      {/* Kite canopy */}
      <path
        d={`M ${cx - 34 * s} ${cy} Q ${cx} ${cy - 20 * s} ${cx + 34 * s} ${cy - 2 * s} Q ${cx + 6 * s} ${cy + 14 * s} ${cx - 34 * s} ${cy} Z`}
        fill={`url(#${uid}-kite)`}
        stroke="#a8a29e"
        strokeWidth="1"
      />
      {/* Bamboo spars */}
      <path
        d={`M ${cx - 24 * s} ${cy + 1 * s} L ${cx + 26 * s} ${cy - 1 * s} M ${cx - 12 * s} ${cy + 7 * s} L ${cx + 14 * s} ${cy - 8 * s}`}
        stroke="#b45309"
        strokeWidth="0.9"
        fill="none"
        opacity="0.8"
      />
      {/* Monk body hanging beneath */}
      <circle cx={cx - 6 * s} cy={cy + 20 * s} r={4.4 * s} fill="#fcd34d" />
      <path
        d={`M ${cx - 10 * s} ${cy + 24 * s} q ${-3 * s} ${7 * s} ${-5 * s} ${12 * s} M ${cx - 4 * s} ${cy + 25 * s} q ${1 * s} ${8 * s} ${-2 * s} ${14 * s}`}
        stroke="#f97316"
        strokeWidth={3.2 * s}
        fill="none"
        strokeLinecap="round"
      />
      {/* Arms gripping the spars */}
      <path
        d={`M ${cx - 6 * s} ${cy + 19 * s} L ${cx - 12 * s} ${cy + 6 * s} M ${cx - 5 * s} ${cy + 19 * s} L ${cx + 8 * s} ${cy - 4 * s}`}
        stroke="#f97316"
        strokeWidth={2.4 * s}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};

export interface WindSparklesProps {
  /** Upper sky band for the swirls */
  y: number;
  seed?: number;
}

/**
 * Spiralling zephyr trails across the sky: curved wind strokes with drifting
 * leaf flecks caught in the updraft.
 */
export const WindSparkles: React.FC<WindSparklesProps> = ({ y, seed = 19 }) => {
  const rand = mulberry(seed);
  const swirls: React.ReactNode[] = [];
  const centers: Array<[number, number]> = [
    [110, y * 0.5],
    [300, y * 0.32],
    [480, y * 0.58],
    [400, y * 0.82],
  ];
  centers.forEach(([cx, cy], i) => {
    const r = 14 + rand() * 14;
    swirls.push(
      <path
        key={`s${i}`}
        d={`M ${cx - r} ${cy} q ${r * 0.6} ${-r * 0.55} ${r} 0 q ${r * 0.4} ${r * 0.4} ${r * 0.85} ${r * 0.1}`}
        stroke="#65a30d"
        strokeWidth="1.4"
        fill="none"
        opacity={0.4 + rand() * 0.3}
        strokeLinecap="round"
      />
    );
  });
  const leaves: React.ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    leaves.push(
      <ellipse
        key={`l${i}`}
        cx={rand() * 600}
        cy={y * (0.3 + rand() * 0.7)}
        rx={2}
        ry={1}
        fill="#84cc16"
        opacity={0.5 + rand() * 0.4}
        transform={`rotate(${rand() * 180} ${rand() * 600} ${y})`}
      />
    );
  }
  return (
    <g className="wind-sparkles" data-testid="wind-sparkles" pointerEvents="none">
      {swirls}
      {leaves}
    </g>
  );
};
