import React from 'react';

export interface StarfieldProps {
  /** Bottom of the star band (stars fill 0..height) */
  height: number;
  seed?: number;
  count?: number;
}

// Deterministic PRNG so the star chart is stable between renders.
const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const HULL_DARK = '#0b1020';
const HULL = '#1f2a44';
const HULL_MID = '#33415e';
const HULL_LIGHT = '#7d8bab';
const PANEL_BLUE = '#1d4ed8';
const PANEL_CYAN = '#0e7490';
const GLOW_CYAN = '#67e8f9';
const GLOW_VIOLET = '#a78bfa';
const HAZARD = '#f59e0b';

/**
 * Scattered starfield with varying magnitudes and a few glinting stars,
 * so the void behind the station does not read as flat navy.
 */
export const Starfield: React.FC<StarfieldProps> = ({ height, seed = 61, count = 70 }) => {
  const rand = mulberry(seed);
  const stars: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * 600;
    const y = rand() * height;
    const r = 0.4 + rand() * 1.5;
    const tint = rand();
    const fill =
      tint > 0.88 ? '#fde047' : tint > 0.72 ? '#a5f3fc' : tint > 0.6 ? '#c7d2fe' : '#f8fafc';
    const opacity = 0.35 + rand() * 0.6;
    stars.push(<circle key={`s${i}`} cx={x} cy={y} r={r} fill={fill} opacity={opacity} />);
    if (r > 1.55) {
      stars.push(
        <g key={`g${i}`} opacity={opacity * 0.5}>
          <line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke={fill} strokeWidth="0.6" />
          <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke={fill} strokeWidth="0.6" />
        </g>
      );
    }
  }
  return (
    <g className="starfield" data-testid="starfield" pointerEvents="none">
      {stars}
    </g>
  );
};

export interface MilkyWayProps {
  height: number;
  uid: string;
}

/**
 * Faint galactic band sweeping corner to corner, with dust lanes.
 */
export const MilkyWay: React.FC<MilkyWayProps> = ({ height, uid }) => (
  <g className="milky-way" data-testid="milky-way" pointerEvents="none">
    <defs>
      <linearGradient id={`${uid}-band`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={GLOW_VIOLET} stopOpacity="0" />
        <stop offset="45%" stopColor={GLOW_VIOLET} stopOpacity="0.22" />
        <stop offset="70%" stopColor={GLOW_CYAN} stopOpacity="0.16" />
        <stop offset="100%" stopColor={GLOW_CYAN} stopOpacity="0" />
      </linearGradient>
      <filter id={`${uid}-band-blur`} x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
    </defs>
    <rect
      x={-120}
      y={height * 0.18}
      width={840}
      height={height * 0.34}
      fill={`url(#${uid}-band)`}
      filter={`url(#${uid}-band-blur)`}
      transform={`rotate(-12 300 ${height * 0.35})`}
    />
  </g>
);

export interface OrbitalRingProps {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Number of truss modules along the visible arc */
  modules?: number;
}

/**
 * The station's outer ring: a trussed arc across the sky holding habitat
 * pods, with a faint cyan running light.
 */
export const OrbitalRing: React.FC<OrbitalRingProps> = ({ cx, cy, rx, ry, modules = 7 }) => {
  const ties: React.ReactNode[] = [];
  for (let i = 1; i < 18; i++) {
    const a = Math.PI - (i / 18) * Math.PI;
    const x = cx + rx * Math.cos(a);
    const y = cy - ry * Math.sin(a);
    const x2 = cx + (rx - 11) * Math.cos(a);
    const y2 = cy - (ry - 11) * Math.sin(a);
    ties.push(
      <line
        key={`t${i}`}
        x1={x}
        y1={y}
        x2={x2}
        y2={y2}
        stroke={HULL_MID}
        strokeWidth="1"
        opacity="0.5"
      />
    );
  }
  const pods: React.ReactNode[] = [];
  for (let i = 1; i <= modules; i++) {
    const a = Math.PI - (i / (modules + 1)) * Math.PI;
    const x = cx + rx * Math.cos(a);
    const y = cy - ry * Math.sin(a);
    const rot = (-a * 180) / Math.PI + 90;
    pods.push(
      <g
        key={`p${i}`}
        transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)})`}
      >
        <rect
          x="-9"
          y="-5"
          width="18"
          height="10"
          rx="3"
          fill={HULL_MID}
          stroke={HULL_DARK}
          strokeWidth="0.8"
        />
        <rect x="-5" y="-2.4" width="10" height="4.8" rx="2" fill={GLOW_CYAN} opacity="0.35" />
        <circle cx="0" cy="-7" r="1.3" fill={GLOW_VIOLET} opacity="0.9" />
      </g>
    );
  }
  return (
    <g className="orbital-ring" data-testid="orbital-ring" pointerEvents="none">
      <path
        d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`}
        fill="none"
        stroke={HULL_DARK}
        strokeWidth="15"
        opacity="0.92"
      />
      <path
        d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`}
        fill="none"
        stroke={HULL}
        strokeWidth="9"
        opacity="0.95"
      />
      {ties}
      <path
        d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`}
        fill="none"
        stroke={GLOW_CYAN}
        strokeWidth="1.1"
        opacity="0.35"
      />
      <path
        d={`M ${cx - rx} ${cy + 9} A ${rx - 9} ${ry - 9} 0 0 1 ${cx + rx} ${cy + 9}`}
        fill="none"
        stroke={GLOW_VIOLET}
        strokeWidth="0.7"
        opacity="0.22"
      />
      {pods}
    </g>
  );
};

export interface StationSpireProps {
  /** Left edge of the spire footprint */
  x: number;
  /** Deck line the spire rises from */
  baseY: number;
  width: number;
  height: number;
  uid: string;
  /** Mirror so the solar wing reaches outward */
  flip?: boolean;
}

/**
 * Dock spire: habitat cylinder with lit portholes, open lattice mast,
 * cupola, dish and an outboard solar wing.
 */
export const StationSpire: React.FC<StationSpireProps> = ({
  x,
  baseY,
  width,
  height,
  uid,
  flip,
}) => {
  const w = width;
  const h = height;
  const cx = x + w * 0.5;
  const spineX = cx - w * 0.06;
  const moduleY = baseY - h * 0.34;
  const wingDir = flip ? -1 : 1;
  const portholes: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    portholes.push(
      <circle
        key={`p${i}`}
        cx={x + w * (0.24 + i * 0.17)}
        cy={moduleY + h * 0.12}
        r={Math.max(1.6, w * 0.035)}
        fill={GLOW_CYAN}
        opacity="0.85"
      />
    );
  }
  const truss: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    const y0 = moduleY - h * (0.08 + i * 0.1);
    const y1 = y0 - h * 0.1;
    truss.push(
      <line
        key={`tl${i}`}
        x1={spineX}
        y1={y0}
        x2={spineX + w * 0.12}
        y2={y1}
        stroke={HULL_LIGHT}
        strokeWidth="0.9"
        opacity="0.55"
      />
    );
    truss.push(
      <line
        key={`tr${i}`}
        x1={spineX + w * 0.12}
        y1={y0}
        x2={spineX}
        y2={y1}
        stroke={HULL_LIGHT}
        strokeWidth="0.9"
        opacity="0.55"
      />
    );
  }
  const wingW = w * 1.0;
  return (
    <g className="station-spire" data-testid="station-spire">
      <defs>
        <linearGradient id={`${uid}-hull`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={HULL_MID} />
          <stop offset="45%" stopColor={HULL} />
          <stop offset="100%" stopColor={HULL_DARK} />
        </linearGradient>
        <linearGradient id={`${uid}-panel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={PANEL_BLUE} />
          <stop offset="100%" stopColor={PANEL_CYAN} />
        </linearGradient>
        <radialGradient id={`${uid}-beacon`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={GLOW_CYAN} stopOpacity="0.9" />
          <stop offset="100%" stopColor={GLOW_CYAN} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outboard solar wing */}
      <g
        transform={`translate(${cx + wingDir * w * 0.1} ${moduleY + h * 0.06}) rotate(${wingDir * -8})`}
      >
        <rect
          x={wingDir > 0 ? 0 : -wingW}
          y="0"
          width={wingW}
          height={h * 0.26}
          rx="1.5"
          fill={`url(#${uid}-panel)`}
          stroke={HULL_DARK}
          strokeWidth="0.8"
          opacity="0.9"
        />
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={`pv${f}`}
            x1={wingDir > 0 ? wingW * f : -wingW * f}
            y1="0"
            x2={wingDir > 0 ? wingW * f : -wingW * f}
            y2={h * 0.26}
            stroke={HULL_DARK}
            strokeWidth="0.7"
            opacity="0.6"
          />
        ))}
        <line
          x1={wingDir > 0 ? 0 : -wingW}
          y1={h * 0.13}
          x2={wingDir > 0 ? wingW : 0}
          y2={h * 0.13}
          stroke={HULL_DARK}
          strokeWidth="0.7"
          opacity="0.6"
        />
      </g>

      {/* Spine */}
      <rect
        x={spineX}
        y={baseY - h * 0.78}
        width={w * 0.12}
        height={h * 0.78}
        fill={`url(#${uid}-hull)`}
        stroke={HULL_DARK}
        strokeWidth="0.6"
      />
      {truss}

      {/* Habitat cylinder */}
      <rect
        x={x + w * 0.14}
        y={moduleY}
        width={w * 0.72}
        height={h * 0.24}
        rx={w * 0.08}
        fill={`url(#${uid}-hull)`}
        stroke={HULL_DARK}
        strokeWidth="0.8"
      />
      <rect
        x={x + w * 0.16}
        y={moduleY + h * 0.02}
        width={w * 0.68}
        height={h * 0.03}
        rx={w * 0.03}
        fill={HULL_LIGHT}
        opacity="0.28"
      />
      {portholes}

      {/* Cupola and dish */}
      <circle
        cx={cx}
        cy={baseY - h * 0.82}
        r={w * 0.2}
        fill={HULL}
        stroke={HULL_DARK}
        strokeWidth="0.8"
      />
      <path
        d={`M ${cx - w * 0.2} ${baseY - h * 0.82} A ${w * 0.2} ${w * 0.2} 0 0 1 ${cx + w * 0.2} ${baseY - h * 0.82}`}
        fill={GLOW_CYAN}
        opacity="0.25"
      />
      <line
        x1={cx + wingDir * w * 0.16}
        y1={baseY - h * 0.9}
        x2={cx + wingDir * w * 0.3}
        y2={baseY - h * 0.98}
        stroke={HULL_LIGHT}
        strokeWidth="1.4"
      />
      <ellipse
        cx={cx + wingDir * w * 0.33}
        cy={baseY - h * 0.99}
        rx={w * 0.13}
        ry={w * 0.06}
        fill={HULL_MID}
        stroke={HULL_DARK}
        strokeWidth="0.6"
        transform={`rotate(${-28 * wingDir} ${cx + wingDir * w * 0.33} ${baseY - h * 0.99})`}
      />
      <circle
        cx={cx}
        cy={baseY - h * 0.82}
        r={w * 0.32}
        fill={`url(#${uid}-beacon)`}
        opacity="0.35"
      />
      <circle cx={cx} cy={baseY - h * 0.82} r={Math.max(1.4, w * 0.03)} fill={GLOW_CYAN} />
    </g>
  );
};

export interface OrbitalDeckProps {
  /** Top of the deck band */
  y: number;
  height: number;
  uid: string;
  seed?: number;
}

/**
 * Pressurised deck plating: hazard band along the lip, panel seams,
 * runway lights and vent grilles where the archer stands.
 */
export const OrbitalDeck: React.FC<OrbitalDeckProps> = ({ y, height, uid, seed = 9 }) => {
  const rand = mulberry(seed);
  const seams: React.ReactNode[] = [];
  for (let i = 1; i < 8; i++) {
    const sx = i * 80 + rand() * 10;
    seams.push(
      <line
        key={`s${i}`}
        x1={sx}
        y1={y + 6}
        x2={sx}
        y2={y + height}
        stroke={HULL_DARK}
        strokeWidth="1"
        opacity="0.5"
      />
    );
  }
  const rivets: React.ReactNode[] = [];
  for (let i = 0; i < 18; i++) {
    rivets.push(
      <circle
        key={`r${i}`}
        cx={rand() * 600}
        cy={y + 16 + rand() * (height - 24)}
        r="1.1"
        fill={HULL_LIGHT}
        opacity="0.3"
      />
    );
  }
  const lights: React.ReactNode[] = [];
  // Amber marker lights sit at fixed stations; the rest are cyan running lights.
  const markerLights = new Set([0, 4, 9, 13]);
  for (let i = 0; i < 14; i++) {
    const isMarker = markerLights.has(i);
    lights.push(
      <circle
        key={`l${i}`}
        cx={22 + i * 42}
        cy={y + height * 0.42}
        r="1.8"
        fill={isMarker ? HAZARD : GLOW_CYAN}
        opacity={isMarker ? 0.8 : 0.55}
      />
    );
  }
  const vents: React.ReactNode[] = [];
  for (let g = 0; g < 2; g++) {
    const vx = 120 + g * 330;
    for (let i = 0; i < 5; i++) {
      vents.push(
        <rect
          key={`v${g}-${i}`}
          x={vx + i * 7}
          y={y + height * 0.62}
          width="4"
          height={height * 0.18}
          rx="1"
          fill={HULL_DARK}
          opacity="0.7"
        />
      );
    }
  }
  return (
    <g className="orbital-deck" data-testid="orbital-deck">
      <defs>
        <linearGradient id={`${uid}-deck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={HULL} />
          <stop offset="42%" stopColor="#161d30" />
          <stop offset="100%" stopColor="#07090f" />
        </linearGradient>
        <pattern
          id={`${uid}-hazard`}
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="18" height="18" fill="#151a26" />
          <rect width="9" height="18" fill={HAZARD} opacity="0.55" />
        </pattern>
      </defs>
      <rect x="0" y={y} width="600" height={height} fill={`url(#${uid}-deck)`} />
      <rect x="0" y={y} width="600" height="6" fill={`url(#${uid}-hazard)`} opacity="0.85" />
      <line
        x1="0"
        y1={y + 6}
        x2="600"
        y2={y + 6}
        stroke={GLOW_CYAN}
        strokeWidth="1"
        opacity="0.45"
      />
      <line
        x1="0"
        y1={y + height * 0.3}
        x2="600"
        y2={y + height * 0.3}
        stroke={GLOW_VIOLET}
        strokeWidth="1"
        opacity="0.16"
      />
      {seams}
      {rivets}
      {lights}
      {vents}
    </g>
  );
};

export interface CometTrailProps {
  x: number;
  y: number;
  /** Angle in degrees, 0 = rightwards */
  angle: number;
  length: number;
  uid: string;
}

/**
 * A drifting comet with a tapering tail, for motion in the void.
 */
export const CometTrail: React.FC<CometTrailProps> = ({ x, y, angle, length, uid }) => {
  const rad = (angle * Math.PI) / 180;
  const tx = x - Math.cos(rad) * length;
  const ty = y - Math.sin(rad) * length;
  return (
    <g className="comet-trail" data-testid="comet-trail" pointerEvents="none">
      <defs>
        <linearGradient id={`${uid}-tail`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f8fafc" stopOpacity="0" />
          <stop offset="70%" stopColor={GLOW_CYAN} stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <line
        x1={tx}
        y1={ty}
        x2={x}
        y2={y}
        stroke={`url(#${uid}-tail)`}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx={x} cy={y} r="2" fill="#f8fafc" />
      <circle cx={x} cy={y} r="4" fill={GLOW_CYAN} opacity="0.25" />
    </g>
  );
};

export interface StationSkyProps {
  height: number;
  uid: string;
}

/**
 * Deep-space sky: near-black zenith falling to indigo above the deck.
 */
export const StationSky: React.FC<StationSkyProps> = ({ height, uid }) => (
  <>
    <defs>
      <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#04060e" />
        <stop offset="48%" stopColor="#0d1030" />
        <stop offset="82%" stopColor="#1b1a4a" />
        <stop offset="100%" stopColor="#2b2a66" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="600" height={height} fill={`url(#${uid}-sky)`} />
  </>
);
