import React from 'react';

export interface CragSpurProps {
  /** Left edge of the crag footprint */
  x: number;
  /** Ground line the crag rises from */
  baseY: number;
  /** Footprint width */
  width: number;
  /** Total rise of the crag */
  height: number;
  uid: string;
  seed?: number;
  /** Mirror the buttress so crests face the opposite way */
  flip?: boolean;
}

// Small deterministic PRNG so rock striations are stable across renders.
const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SKY_HIGH = '#2f2a3d';
const SKY_MID = '#57465c';
const SKY_WARM = '#a4726b';
const SKY_DUSK = '#dda783';
const SKY_HAZE = '#f2d9bd';

const GRANITE_DARK = '#23292a';
const GRANITE = '#3d4542';
const GRANITE_MID = '#5c635c';
const GRANITE_LIGHT = '#8a9086';
const GRANITE_RIM = '#b8bfae';

const MOSS = '#55633f';
const MOSS_LIGHT = '#7d8c56';
const GRASS = '#8d9a62';
const HEATHER = '#8a63a6';
const HEATHER_LIGHT = '#c1a2cf';
const RUST = '#a8431a';
const STONE = '#a9b0a2';
const STONE_SHADE = '#5c635c';

const crease = (points: Array<[number, number]>) =>
  points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`).join(' ');

export interface StormCloudsProps {
  /** Vertical centre of the cloud band */
  y: number;
  seed?: number;
}

/**
 * Layered storm banks across the sky: slate puffs with a warm apricot rim,
 * after the reference photograph's heavy sky over the crag.
 */
export const StormClouds: React.FC<StormCloudsProps> = ({ y, seed = 7 }) => {
  const rand = mulberry(seed);
  const banks: React.ReactNode[] = [];
  for (let b = 0; b < 3; b++) {
    const cy = y - b * 16;
    const puffs: React.ReactNode[] = [];
    const count = 5 + b;
    for (let i = 0; i < count; i++) {
      const cx = 40 + i * (520 / count) + rand() * 30;
      const rx = 34 + rand() * 40;
      const ry = 7 + rand() * 8;
      puffs.push(
        <ellipse
          key={`p${i}`}
          cx={cx}
          cy={cy + rand() * 4}
          rx={rx}
          ry={ry}
          fill={b === 0 ? GRANITE : SKY_MID}
          opacity={0.18 + rand() * 0.14}
        />
      );
    }
    banks.push(
      <g key={`b${b}`}>
        <path
          d={`M 0 ${cy + 6} Q 150 ${cy - 10} 300 ${cy + 2} T 600 ${cy - 4}`}
          stroke={SKY_DUSK}
          strokeWidth="1.1"
          fill="none"
          opacity="0.28"
        />
        {puffs}
      </g>
    );
  }
  return (
    <g
      className="storm-clouds"
      data-testid="storm-clouds"
      pointerEvents="none"
      filter="url(#storm-cloud-blur)"
    >
      <defs>
        <filter id="storm-cloud-blur" x="-20%" y="-80%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {banks}
    </g>
  );
};

/**
 * Granite buttress like the reference crag: a jagged crest, stratified rock
 * faces and a mossy turf lip along the summit.
 */
export const CragSpur: React.FC<CragSpurProps> = ({
  x,
  baseY,
  width,
  height,
  uid,
  seed = 11,
  flip = false,
}) => {
  const rand = mulberry(seed);
  // Fractions are measured as rise from the base line (1 = crest height).
  const crest: Array<[number, number]> = [
    [0, 0],
    [0.04, 0.22],
    [0.07, 0.46],
    [0.1, 0.4],
    [0.14, 0.58],
    [0.18, 0.52],
    [0.22, 0.68],
    [0.26, 0.62],
    [0.31, 0.76],
    [0.35, 0.71],
    [0.4, 0.82],
    [0.44, 0.78],
    [0.48, 0.86],
    [0.52, 0.8],
    [0.56, 0.87],
    [0.6, 0.79],
    [0.64, 0.84],
    [0.68, 0.72],
    [0.72, 0.76],
    [0.76, 0.6],
    [0.8, 0.64],
    [0.84, 0.46],
    [0.88, 0.5],
    [0.92, 0.3],
    [0.96, 0.18],
    [1, 0],
  ];
  const outline = crest.map(([fx, fy]): [number, number] => {
    const nx = flip ? 1 - fx : fx;
    const jitter = rand() * 0.05 - 0.025;
    return [x + nx * width, baseY - Math.min(1, Math.max(0, fy + jitter)) * height];
  });
  const body = `${crease(outline)} Z`;
  const crestPoints = outline.slice(2, 15);

  // Rock striations running with the dip of the slope.
  const strata: React.ReactNode[] = [];
  for (let i = 1; i <= 6; i++) {
    const ty = baseY - height * (0.18 + i * 0.12);
    strata.push(
      <path
        key={`s${i}`}
        d={`M ${x - 10} ${ty + rand() * 6} Q ${x + width * 0.35} ${ty - 8 - rand() * 5} ${x + width * 0.62} ${ty + 2} T ${x + width + 10} ${ty - 4}`}
        stroke={i % 2 === 0 ? GRANITE_LIGHT : GRANITE_DARK}
        strokeWidth={i % 2 === 0 ? 0.7 : 1.1}
        fill="none"
        opacity={i % 2 === 0 ? 0.25 : 0.4}
      />
    );
  }

  // Turf lip tracing the summit, with a few loose stones.
  const turfPath = crestPoints.reduce(
    (d, [px, py], i) => `${d}${i === 0 ? 'M' : ' L'} ${px.toFixed(2)} ${(py + 2).toFixed(2)}`,
    ''
  );
  const stones: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const sx = x + width * (0.08 + rand() * 0.84);
    const sy = baseY - height * (0.02 + rand() * 0.16);
    stones.push(
      <ellipse
        key={`r${i}`}
        cx={sx}
        cy={sy}
        rx={3 + rand() * 7}
        ry={1.6 + rand() * 3}
        fill={rand() > 0.5 ? GRANITE_MID : GRANITE_DARK}
        opacity="0.75"
      />
    );
  }

  return (
    <g className="crag-spur" data-testid="crag-spur">
      <defs>
        <linearGradient id={`${uid}-rock`} x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0%" stopColor={GRANITE_MID} />
          <stop offset="42%" stopColor={GRANITE} />
          <stop offset="100%" stopColor={GRANITE_DARK} />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill={`url(#${uid}-rock)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        {strata}
        <path
          d={`M ${x} ${baseY - height * 0.3} L ${x + width * 0.3} ${baseY - height * 0.78} L ${x + width * 0.4} ${baseY} Z`}
          fill={GRANITE_RIM}
          opacity="0.09"
        />
      </g>
      <path d={turfPath} stroke={GRANITE_RIM} strokeWidth="2.4" fill="none" opacity="0.35" />
      <path d={turfPath} stroke={MOSS_LIGHT} strokeWidth="3.4" fill="none" opacity="0.85" />
      <path d={turfPath} stroke={GRASS} strokeWidth="1.2" fill="none" opacity="0.9" />
      {stones}
    </g>
  );
};

export interface CliffRuinProps {
  /** Left edge of the ruin footprint */
  x: number;
  /** Ground line the ruin stands on */
  baseY: number;
  /** Footprint width of the keep */
  width: number;
  uid: string;
  seed?: number;
}

/**
 * Ruined stone keep on a turf shelf like the reference: a broken-gabled hall,
 * an arched window recess, a crenellated stub tower and a rust pennant.
 */
export const CliffRuin: React.FC<CliffRuinProps> = ({ x, baseY, width, uid, seed = 5 }) => {
  const rand = mulberry(seed);
  const h = width * 0.56;
  const towerW = width * 0.24;
  const hallX = x + towerW * 0.86;
  const hallW = width * 0.52;
  const hallTop = baseY - h * 0.72;
  const towerX = x;
  const towerTop = baseY - h;

  // Turf shelf the ruin sits on, over a rocky knoll so the summit reads as crag.
  const shelf =
    `M ${x - width * 0.12} ${baseY + 6} Q ${x + width * 0.2} ${baseY - h * 0.16} ${x + width * 0.52} ${baseY - h * 0.1} ` +
    `Q ${x + width * 0.86} ${baseY - h * 0.18} ${x + width * 1.12} ${baseY + 6} Z`;
  const skirt =
    `M ${x - width * 0.16} ${baseY + 2} L ${x + width * 0.02} ${baseY + h * 0.24} ` +
    `L ${x + width * 0.14} ${baseY + h * 0.1} L ${x + width * 0.34} ${baseY + h * 0.3} ` +
    `L ${x + width * 0.52} ${baseY + h * 0.12} L ${x + width * 0.72} ${baseY + h * 0.28} ` +
    `L ${x + width * 0.9} ${baseY + h * 0.1} L ${x + width * 1.14} ${baseY + 2} Z`;

  // Crenellations: alternating merlons, some fallen away.
  const merlons: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    if (i === 2) continue;
    merlons.push(
      <rect
        key={`m${i}`}
        x={towerX + (towerW / 4) * i + 1}
        y={towerTop - 7}
        width={towerW / 4 - 2}
        height="8"
        fill={STONE}
        stroke={STONE_SHADE}
        strokeWidth="0.6"
      />
    );
  }

  // Ragged top of the hall: stepped gable with a collapsed shoulder.
  const gable: Array<[number, number]> = [
    [hallX, hallTop + 8],
    [hallX + hallW * 0.18, hallTop + 2],
    [hallX + hallW * 0.3, hallTop + 6],
    [hallX + hallW * 0.46, hallTop - h * 0.16],
    [hallX + hallW * 0.56, hallTop + 4],
    [hallX + hallW * 0.7, hallTop + 10],
    [hallX + hallW, hallTop + 2],
  ];

  const cracks: React.ReactNode[] = [];
  for (let i = 0; i < 3; i++) {
    const cx = hallX + hallW * (0.2 + rand() * 0.6);
    cracks.push(
      <path
        key={`c${i}`}
        d={`M ${cx} ${hallTop + 12} l ${rand() * 4 - 2} 10 l ${rand() * 4 - 2} 12`}
        stroke={STONE_SHADE}
        strokeWidth="0.7"
        fill="none"
        opacity="0.55"
      />
    );
  }

  return (
    <g className="cliff-ruin" data-testid="cliff-ruin">
      <defs>
        <linearGradient id={`${uid}-shelf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={MOSS_LIGHT} />
          <stop offset="100%" stopColor={MOSS} />
        </linearGradient>
        <linearGradient id={`${uid}-knoll`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor={GRANITE_MID} />
          <stop offset="100%" stopColor={GRANITE_DARK} />
        </linearGradient>
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor={STONE} />
          <stop offset="62%" stopColor="#8d9488" />
          <stop offset="100%" stopColor={STONE_SHADE} />
        </linearGradient>
      </defs>

      <path d={skirt} fill={`url(#${uid}-knoll)`} stroke={GRANITE_DARK} strokeWidth="0.6" />
      <path d={shelf} fill={`url(#${uid}-shelf)`} />
      <path
        d={`M ${x - width * 0.06} ${baseY + 2} Q ${x + width * 0.4} ${baseY - h * 0.1} ${x + width * 1.08} ${baseY + 2}`}
        stroke={GRASS}
        strokeWidth="1"
        fill="none"
        opacity="0.6"
      />

      {/* Stub tower */}
      <rect
        x={towerX}
        y={towerTop}
        width={towerW}
        height={h}
        fill={`url(#${uid}-wall)`}
        stroke={STONE_SHADE}
        strokeWidth="0.8"
      />
      {merlons}
      <rect
        x={towerX + towerW * 0.34}
        y={towerTop + h * 0.24}
        width={towerW * 0.3}
        height={h * 0.22}
        rx={towerW * 0.15}
        fill={GRANITE_DARK}
        opacity="0.82"
      />

      {/* Hall with broken gable */}
      <path
        d={`${crease(gable)} L ${hallX + hallW} ${baseY} L ${hallX} ${baseY} Z`}
        fill={`url(#${uid}-wall)`}
        stroke={STONE_SHADE}
        strokeWidth="0.9"
      />
      <path
        d={`M ${hallX + hallW * 0.32} ${baseY} L ${hallX + hallW * 0.32} ${hallTop + h * 0.3} Q ${hallX + hallW * 0.44} ${hallTop + h * 0.14} ${hallX + hallW * 0.56} ${hallTop + h * 0.3} L ${hallX + hallW * 0.56} ${baseY} Z`}
        fill={GRANITE_DARK}
        opacity="0.85"
      />
      <rect
        x={hallX + hallW * 0.62}
        y={hallTop + h * 0.3}
        width={hallW * 0.14}
        height={h * 0.2}
        fill={GRANITE_DARK}
        opacity="0.7"
      />
      {cracks}
      <line
        x1={hallX + hallW * 0.14}
        y1={baseY}
        x2={hallX + hallW * 0.14}
        y2={hallTop + h * 0.4}
        stroke={STONE_SHADE}
        strokeWidth="0.8"
        opacity="0.5"
      />

      {/* Pennant on the fallen mast */}
      <line
        x1={hallX + hallW * 0.46}
        y1={hallTop - h * 0.16}
        x2={hallX + hallW * 0.46}
        y2={hallTop - h * 0.5}
        stroke={GRANITE_DARK}
        strokeWidth="1.4"
      />
      <polygon
        points={`${hallX + hallW * 0.46},${hallTop - h * 0.5} ${hallX + hallW * 0.46 + 14},${hallTop - h * 0.46} ${hallX + hallW * 0.46},${hallTop - h * 0.38}`}
        fill={RUST}
      />
    </g>
  );
};

export interface HeatherDriftProps {
  /** Ground line the heather grows from */
  y: number;
  /** Vertical extent available for stems */
  height: number;
  seed?: number;
  /** Number of clumps */
  clumps?: number;
}

/**
 * Purple heather and tussock grass along the crag lips, after the flowers
 * crowding the foreground of the reference.
 */
export const HeatherDrift: React.FC<HeatherDriftProps> = ({ y, height, seed = 13, clumps = 9 }) => {
  const rand = mulberry(seed);
  const groups: React.ReactNode[] = [];
  for (let i = 0; i < clumps; i++) {
    const gx = 18 + rand() * 564;
    const gy = y + rand() * height * 0.6;
    const scale = 0.85 + rand() * 1.1;
    const stems: React.ReactNode[] = [];
    for (let s = 0; s < 4; s++) {
      const lean = (rand() - 0.5) * 8 * scale;
      const top = gy - (10 + rand() * 10) * scale;
      stems.push(
        <path
          key={`st${s}`}
          d={`M ${gx + s * 2 - 2} ${gy} Q ${gx + lean * 0.4} ${(gy + top) / 2} ${gx + lean} ${top}`}
          stroke={MOSS}
          strokeWidth="0.8"
          fill="none"
        />
      );
      const beads = 3 + Math.floor(rand() * 3);
      for (let b = 0; b < beads; b++) {
        stems.push(
          <circle
            key={`b${s}-${b}`}
            cx={gx + lean + (rand() - 0.5) * 5 * scale}
            cy={top + rand() * 6 * scale}
            r={(0.9 + rand() * 1.3) * scale}
            fill={rand() > 0.4 ? HEATHER : HEATHER_LIGHT}
            opacity="0.92"
          />
        );
      }
    }
    const blades: React.ReactNode[] = [];
    for (let b = 0; b < 4; b++) {
      const bx = gx + (rand() - 0.5) * 16 * scale;
      blades.push(
        <path
          key={`g${b}`}
          d={`M ${bx} ${gy} q ${(rand() - 0.5) * 3} ${-5 * scale} ${(rand() - 0.5) * 5} ${-9 * scale}`}
          stroke={b % 2 === 0 ? GRASS : MOSS_LIGHT}
          strokeWidth="0.8"
          fill="none"
          opacity="0.85"
        />
      );
    }
    groups.push(
      <g key={`h${i}`}>
        {blades}
        {stems}
      </g>
    );
  }
  return (
    <g className="heather-drift" data-testid="heather-drift" pointerEvents="none">
      {groups}
    </g>
  );
};

export interface EarthGroundProps {
  /** Top of the ground band */
  y: number;
  /** Height of the ground band */
  height: number;
  uid: string;
  seed?: number;
}

/**
 * Granite shelf with a turf fringe, survey hairlines and loose scree — the
 * rocky forecourt of the crag.
 */
export const EarthGround: React.FC<EarthGroundProps> = ({ y, height, uid, seed = 3 }) => {
  const rand = mulberry(seed);
  const shelves: React.ReactNode[] = [];
  for (let i = 1; i <= 3; i++) {
    const sy = y + height * (i * 0.24);
    shelves.push(
      <path
        key={`s${i}`}
        d={`M 0 ${sy} Q ${120 + i * 20} ${sy - 5 - rand() * 4} 300 ${sy + 2} T 600 ${sy - 2}`}
        stroke={i === 1 ? GRANITE_LIGHT : GRANITE_MID}
        strokeWidth={i === 1 ? 1 : 0.7}
        fill="none"
        opacity={i === 1 ? 0.55 : 0.3}
      />
    );
  }
  const cracks: React.ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const cx = rand() * 600;
    const cy = y + 8 + rand() * (height - 16);
    cracks.push(
      <path
        key={`c${i}`}
        d={`M ${cx} ${cy} l ${rand() * 12 - 6} ${4 + rand() * 5} l ${rand() * 10 - 5} ${5 + rand() * 6}`}
        stroke={GRANITE_DARK}
        strokeWidth="0.8"
        fill="none"
        opacity="0.6"
      />
    );
  }
  const scree: React.ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const sx = rand() * 600;
    const sy = y + 6 + rand() * (height - 10);
    scree.push(
      <ellipse
        key={`r${i}`}
        cx={sx}
        cy={sy}
        rx={1.5 + rand() * 4}
        ry={1 + rand() * 2}
        fill={rand() > 0.5 ? GRANITE_MID : GRANITE_LIGHT}
        opacity={0.35 + rand() * 0.35}
        transform={`rotate(${rand() * 40 - 20} ${sx} ${sy})`}
      />
    );
  }
  const boulders: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    const bx = 30 + rand() * 540;
    const by = y + 14 + rand() * (height * 0.35);
    const scale = 0.7 + rand() * 1.1;
    boulders.push(
      <g key={`bd${i}`}>
        <path
          d={`M ${bx - 12 * scale} ${by} L ${bx - 6 * scale} ${by - 9 * scale} L ${bx + 5 * scale} ${by - 11 * scale} L ${bx + 13 * scale} ${by - 4 * scale} L ${bx + 10 * scale} ${by + 3 * scale} L ${bx - 9 * scale} ${by + 3 * scale} Z`}
          fill={GRANITE_DARK}
          stroke={GRANITE_MID}
          strokeWidth="0.7"
        />
        <path
          d={`M ${bx - 6 * scale} ${by - 9 * scale} L ${bx + 5 * scale} ${by - 11 * scale} L ${bx + 1 * scale} ${by - 5 * scale} Z`}
          fill={GRANITE_LIGHT}
          opacity="0.4"
        />
      </g>
    );
  }
  const fringe = 2 + (height > 80 ? 4 : 2);
  return (
    <g className="earth-ground" data-testid="earth-ground">
      <defs>
        <linearGradient id={`${uid}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c554d" />
          <stop offset="46%" stopColor={GRANITE_DARK} />
          <stop offset="100%" stopColor="#141817" />
        </linearGradient>
        <linearGradient id={`${uid}-fringe`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GRASS} />
          <stop offset="100%" stopColor={MOSS} />
        </linearGradient>
      </defs>
      <rect x="0" y={y} width="600" height={height} fill={`url(#${uid}-ground)`} />
      <path
        d={`M 0 ${y + fringe * 2} Q 90 ${y - 3} 180 ${y + fringe} Q 280 ${y + fringe * 2.4} 380 ${y + fringe * 0.6} Q 480 ${y - 2} 600 ${y + fringe}`}
        stroke={`url(#${uid}-fringe)`}
        strokeWidth={fringe}
        fill="none"
      />
      {shelves}
      {cracks}
      {scree}
      {boulders}
    </g>
  );
};

export interface GorgeMistProps {
  /** Centre of the mist band */
  y: number;
  seed?: number;
}

/**
 * Low cloud pooling in the gorge between the crag walls.
 */
export const GorgeMist: React.FC<GorgeMistProps> = ({ y, seed = 23 }) => {
  const rand = mulberry(seed);
  const bands: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    const cy = y + i * 9 + rand() * 4;
    const rx = 110 + rand() * 90;
    bands.push(
      <ellipse
        key={`b${i}`}
        cx={90 + i * 145 + rand() * 30}
        cy={cy}
        rx={rx}
        ry={6 + rand() * 6}
        fill={SKY_HAZE}
        opacity={0.14 + rand() * 0.1}
      />
    );
  }
  return (
    <g
      className="gorge-mist"
      data-testid="gorge-mist"
      pointerEvents="none"
      filter="url(#gorge-mist-blur)"
    >
      <defs>
        <filter id="gorge-mist-blur" x="-20%" y="-120%" width="140%" height="340%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>
      {bands}
    </g>
  );
};

export interface EarthSkyProps {
  /** Bottom of the sky gradient */
  height: number;
  uid: string;
}

/**
 * Storm-dusk sky from the reference: violet cloud cover breaking to a warm
 * apricot horizon.
 */
export const EarthSky: React.FC<EarthSkyProps> = ({ height, uid }) => (
  <>
    <defs>
      <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SKY_HIGH} />
        <stop offset="42%" stopColor={SKY_MID} />
        <stop offset="70%" stopColor={SKY_WARM} />
        <stop offset="88%" stopColor={SKY_DUSK} />
        <stop offset="100%" stopColor={SKY_HAZE} />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="600" height={height} fill={`url(#${uid}-sky)`} />
  </>
);
