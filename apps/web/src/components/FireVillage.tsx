import React from 'react';

export interface FireHutProps {
  /** Left edge of the hut bounding box in svg user units */
  x: number;
  /** Ground line the hut sits on */
  baseY: number;
  /** Overall width of the hut */
  width: number;
  /** Stable id prefix for defs */
  uid: string;
  /** Deterministic seed for the thatch and stone scatter */
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

const STONE_LIGHT = '#57534e';
const STONE_MID = '#44403c';
const STONE_DARK = '#292524';
const THATCH_LIGHT = '#b45309';
const THATCH_DARK = '#7c2d12';

/**
 * Volcanic stone hut with a thatched cone roof, lit doorway and glowing
 * firelight spill — the fire realm's village dwelling.
 */
export const FireHut: React.FC<FireHutProps> = ({ x, baseY, width, uid, seed = 5 }) => {
  const height = width * 1.15;
  const wallH = height * 0.5;
  const roofH = height - wallH;
  const rand = mulberry(seed);

  // Stone coursing on the cylindrical wall.
  const courseH = Math.max(4, wallH / 5);
  const courses: React.ReactNode[] = [];
  for (let i = 1; i < 5; i++) {
    courses.push(
      <line
        key={`c${i}`}
        x1={x}
        y1={baseY - wallH + courseH * i}
        x2={x + width}
        y2={baseY - wallH + courseH * i}
        stroke={STONE_DARK}
        strokeWidth="0.7"
        opacity="0.7"
      />
    );
  }
  // Offset vertical joints.
  for (let i = 0; i < 4; i++) {
    const jy = baseY - wallH + (i % 2 === 0 ? courseH / 2 : courseH * 1.5);
    courses.push(
      <line
        key={`j${i}`}
        x1={x + (width / 3) * i + (i % 2 === 0 ? width / 6 : 0)}
        y1={jy}
        x2={x + (width / 3) * i + (i % 2 === 0 ? width / 6 : 0)}
        y2={jy + courseH}
        stroke={STONE_DARK}
        strokeWidth="0.6"
        opacity="0.7"
      />
    );
  }

  // Thatch layer strokes on the cone roof, following the cone slope.
  const thatch: React.ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const yAt = baseY - wallH - roofH + t * roofH;
    const halfW = (width / 2) * (1 - t) * 0.92;
    thatch.push(
      <path
        key={`th${i}`}
        d={`M ${x + width / 2 - halfW} ${yAt} Q ${x + width / 2} ${yAt + 2.5} ${x + width / 2 + halfW} ${yAt}`}
        stroke={t < 0.4 ? THATCH_LIGHT : THATCH_DARK}
        strokeWidth="1.2"
        fill="none"
        opacity="0.55"
      />
    );
  }
  // Thatch fringe under the eaves.
  const fringe: React.ReactNode[] = [];
  const eaveY = baseY - wallH;
  for (let i = 0; i < 14; i++) {
    const fx = x + (width / 14) * i;
    fringe.push(
      <line
        key={`f${i}`}
        x1={fx}
        y1={eaveY}
        x2={fx + 2}
        y2={eaveY + 4}
        stroke={THATCH_DARK}
        strokeWidth="1.1"
        opacity="0.8"
      />
    );
  }
  // Random thatch flecks for a rough, hand-laid roof.
  const flecks: React.ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    flecks.push(
      <line
        key={`fl${i}`}
        x1={x + rand() * width}
        y1={eaveY - rand() * roofH}
        x2={x + rand() * width}
        y2={eaveY - rand() * roofH}
        stroke={rand() > 0.5 ? THATCH_LIGHT : THATCH_DARK}
        strokeWidth="0.8"
        opacity="0.4"
      />
    );
  }

  return (
    <g className="fire-hut" data-testid="fire-hut">
      <defs>
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={STONE_LIGHT} />
          <stop offset="55%" stopColor={STONE_MID} />
          <stop offset="100%" stopColor={STONE_DARK} />
        </linearGradient>
        <linearGradient id={`${uid}-roof`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="55%" stopColor={THATCH_LIGHT} />
          <stop offset="100%" stopColor={THATCH_DARK} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#fb923c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Firelight spill on the ground */}
      <ellipse
        cx={x + width / 2}
        cy={baseY}
        rx={width * 1.3}
        ry={height * 0.28}
        fill={`url(#${uid}-glow)`}
      />

      {/* Cylindrical stone wall */}
      <path
        d={`M ${x} ${baseY} L ${x} ${baseY - wallH} Q ${x + width / 2} ${baseY - wallH - 6} ${x + width} ${baseY - wallH} L ${x + width} ${baseY} Q ${x + width / 2} ${baseY + 5} ${x} ${baseY} Z`}
        fill={`url(#${uid}-wall)`}
      />
      {courses}
      {/* Bulge highlight on the light side */}
      <ellipse
        cx={x + width * 0.32}
        cy={baseY - wallH * 0.45}
        rx={width * 0.22}
        ry={wallH * 0.6}
        fill="#a8a29e"
        opacity="0.25"
      />

      {/* Conical thatched roof with eave overhang */}
      <path
        d={`M ${x - width * 0.1} ${baseY - wallH + 2} Q ${x + width / 2} ${baseY - wallH - roofH * 1.35} ${x + width * 1.1} ${baseY - wallH + 2} Z`}
        fill={`url(#${uid}-roof)`}
      />
      {thatch}
      {flecks}
      {fringe}
      {/* Roof apex cap stone */}
      <circle
        cx={x + width / 2}
        cy={baseY - wallH - roofH * 1.3}
        r={width * 0.055}
        fill="#57534e"
      />

      {/* Doorway with warm interior light */}
      <path
        d={`M ${x + width * 0.36} ${baseY} L ${x + width * 0.36} ${baseY - height * 0.3} Q ${x + width / 2} ${baseY - height * 0.42} ${x + width * 0.64} ${baseY - height * 0.3} L ${x + width * 0.64} ${baseY} Z`}
        fill="#1c1917"
      />
      <path
        d={`M ${x + width * 0.4} ${baseY} L ${x + width * 0.4} ${baseY - height * 0.28} Q ${x + width / 2} ${baseY - height * 0.37} ${x + width * 0.6} ${baseY - height * 0.28} L ${x + width * 0.6} ${baseY} Z`}
        fill="#fb923c"
        opacity="0.9"
      />
      <path
        d={`M ${x + width * 0.44} ${baseY} L ${x + width * 0.44} ${baseY - height * 0.24} Q ${x + width / 2} ${baseY - height * 0.3} ${x + width * 0.56} ${baseY - height * 0.24} L ${x + width * 0.56} ${baseY} Z`}
        fill="#fef08a"
        opacity="0.85"
      />
      {/* Door frame lintel */}
      <path
        d={`M ${x + width * 0.33} ${baseY - height * 0.31} Q ${x + width / 2} ${baseY - height * 0.44} ${x + width * 0.67} ${baseY - height * 0.31}`}
        stroke="#292524"
        strokeWidth="2"
        fill="none"
      />
      {/* Warm round window with a shutter ledge */}
      <circle
        cx={x + width * 0.2}
        cy={baseY - height * 0.34}
        r={width * 0.09}
        fill="#fbbf24"
        opacity="0.9"
      />
      <circle
        cx={x + width * 0.2}
        cy={baseY - height * 0.34}
        r={width * 0.11}
        fill="none"
        stroke="#292524"
        strokeWidth="1.5"
      />
      <rect
        x={x + width * 0.12}
        y={baseY - height * 0.3}
        width={width * 0.16}
        height="2"
        fill="#292524"
      />
      {/* Runic charm strip along the eave */}
      {Array.from({ length: 5 }).map((_, i) => (
        <polygon
          key={`charm${i}`}
          points={`${x + width * (0.15 + i * 0.18)},${eaveY - 1} ${x + width * (0.15 + i * 0.18) + 3},${eaveY - 6} ${x + width * (0.15 + i * 0.18) + 6},${eaveY - 1}`}
          fill="#f59e0b"
          opacity="0.75"
        />
      ))}

      {/* Grounding shadow */}
      <ellipse
        cx={x + width / 2}
        cy={baseY + 2}
        rx={width * 0.62}
        ry="3.5"
        fill="#1c0702"
        opacity="0.5"
      />
    </g>
  );
};

export interface FireTorchProps {
  x: number;
  baseY: number;
  height: number;
  uid: string;
}

/**
 * Village torch: charred wooden pole with a flickering flame and warm glow.
 */
export const FireTorch: React.FC<FireTorchProps> = ({ x, baseY, height, uid }) => (
  <g className="fire-torch" data-testid="fire-torch">
    <defs>
      <radialGradient id={`${uid}-glow`}>
        <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#fb923c" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Pole */}
    <rect x={x - 1.5} y={baseY - height} width="3" height={height} rx="1.5" fill="#44403c" />
    <rect
      x={x - 1.5}
      y={baseY - height}
      width="1.2"
      height={height}
      rx="0.6"
      fill="#78716c"
      opacity="0.6"
    />
    {/* Glow and flame */}
    <circle cx={x} cy={baseY - height - 4} r={height * 0.5} fill={`url(#${uid}-glow)`} />
    <path
      d={`M ${x} ${baseY - height + 2} Q ${x - 4} ${baseY - height - 4} ${x} ${baseY - height - 12} Q ${x + 4} ${baseY - height - 4} ${x} ${baseY - height + 2} Z`}
      fill="#f97316"
    />
    <path
      d={`M ${x} ${baseY - height + 1} Q ${x - 2} ${baseY - height - 3} ${x} ${baseY - height - 7} Q ${x + 2} ${baseY - height - 3} ${x} ${baseY - height + 1} Z`}
      fill="#fde047"
    />
    {/* Charred rim */}
    <rect x={x - 2.5} y={baseY - height - 1} width="5" height="3" rx="1.5" fill="#1c1917" />
  </g>
);

export interface AshGroundProps {
  /** Top edge of the ground band */
  y: number;
  height: number;
  uid: string;
  seed?: number;
}

/**
 * Volcanic ash ground: tonal scatter, cooled crust plates and branching lava
 * veins with a hot core and glow halo.
 */
export const AshGround: React.FC<AshGroundProps> = ({ y, height, uid, seed = 3 }) => {
  const rand = mulberry(seed);
  const pebbles: React.ReactNode[] = [];
  const pebbleCount = Math.round(height / 1.6);
  for (let i = 0; i < pebbleCount; i++) {
    const px = rand() * 600;
    const py = y + 4 + rand() * (height - 8);
    const depth = (py - y) / height;
    pebbles.push(
      <ellipse
        key={`p${i}`}
        cx={px}
        cy={py}
        rx={1.5 + depth * 3}
        ry={1 + depth * 1.6}
        fill={rand() > 0.5 ? '#57534e' : '#1c1917'}
        opacity={0.3 + depth * 0.3}
      />
    );
  }
  const cracks: React.ReactNode[] = [];
  for (let i = 0; i < Math.round(height / 12); i++) {
    const cy = y + 8 + rand() * (height - 16);
    const cx = rand() * 600;
    cracks.push(
      <path
        key={`cr${i}`}
        d={`M ${cx} ${cy} q ${8 + rand() * 14} ${-4 - rand() * 6} ${16 + rand() * 20} 0`}
        stroke="#1c1917"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />
    );
  }

  return (
    <g className="ash-ground" data-testid="ash-ground">
      <defs>
        <linearGradient id={`${uid}-ash`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#44200f" />
          <stop offset="100%" stopColor="#1c0702" />
        </linearGradient>
        <radialGradient id={`${uid}-lava-core`}>
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="55%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      <rect x="0" y={y} width="600" height={height} fill={`url(#${uid}-ash)`} />
      {cracks}
      {pebbles}

      {/* Branching lava veins with glow halo and hot core */}
      <path
        d={`M -10 ${y + height * 0.3} Q 120 ${y + height * 0.22} 240 ${y + height * 0.34} T 610 ${y + height * 0.28}`}
        stroke="#f97316"
        strokeWidth="5"
        fill="none"
        opacity="0.3"
      />
      <path
        d={`M -10 ${y + height * 0.3} Q 120 ${y + height * 0.22} 240 ${y + height * 0.34} T 610 ${y + height * 0.28}`}
        stroke={`url(#${uid}-lava-core)`}
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d={`M -10 ${y + height * 0.68} Q 160 ${y + height * 0.6} 320 ${y + height * 0.72} T 610 ${y + height * 0.66}`}
        stroke="#f97316"
        strokeWidth="7"
        fill="none"
        opacity="0.25"
      />
      <path
        d={`M -10 ${y + height * 0.68} Q 160 ${y + height * 0.6} 320 ${y + height * 0.72} T 610 ${y + height * 0.66}`}
        stroke={`url(#${uid}-lava-core)`}
        strokeWidth="3.5"
        fill="none"
      />
      {/* Lava blisters */}
      {[
        [110, 0.42],
        [430, 0.55],
        [260, 0.8],
      ].map(([bx, byFrac], i) => (
        <ellipse
          key={`bl${i}`}
          cx={bx}
          cy={y + height * byFrac}
          rx={4 + i}
          ry={2.5 + i * 0.8}
          fill={`url(#${uid}-lava-core)`}
          opacity="0.85"
        />
      ))}
    </g>
  );
};

export interface FireChimneyProps {
  /** Chimney base at the roof slope */
  x: number;
  baseY: number;
  height: number;
  uid: string;
}

/**
 * Stone chimney with a smoking clay pot: layered smoke puffs drift up and
 * thin out, and the pot rim glows from the fire inside.
 */
export const FireChimney: React.FC<FireChimneyProps> = ({ x, baseY, height, uid }) => (
  <g className="fire-chimney" data-testid="fire-chimney">
    <defs>
      <radialGradient id={`${uid}-smoke`}>
        <stop offset="0%" stopColor="#a8a29e" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#a8a29e" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Stack */}
    <rect x={x - 4} y={baseY - height} width="8" height={height} fill="#57534e" />
    <rect x={x - 4} y={baseY - height} width="3" height={height} fill="#78716c" opacity="0.7" />
    {Array.from({ length: Math.max(2, Math.floor(height / 10)) }).map((_, i) => (
      <line
        key={`sm${i}`}
        x1={x - 4}
        y1={baseY - height + 8 + i * 10}
        x2={x + 4}
        y2={baseY - height + 8 + i * 10}
        stroke="#292524"
        strokeWidth="0.8"
        opacity="0.6"
      />
    ))}
    {/* Clay pot with glowing rim */}
    <ellipse cx={x} cy={baseY - height} rx="6" ry="3.5" fill="#7c2d12" />
    <ellipse cx={x} cy={baseY - height - 1} rx="4.5" ry="2" fill="#f97316" opacity="0.9" />
    {/* Smoke puffs, drifting right and thinning */}
    {[
      [0, 8, 6],
      [4, -2, 9],
      [9, -14, 12],
      [16, -28, 15],
    ].map(([dx, dy, r], i) => (
      <circle
        key={`smoke${i}`}
        cx={x + dx}
        cy={baseY - height + dy}
        r={r}
        fill={`url(#${uid}-smoke)`}
      />
    ))}
  </g>
);

export interface EmberFieldProps {
  /** Top of the field band */
  y: number;
  height: number;
  seed?: number;
}

/**
 * Drifting ember sparks above the lava: tiny bright motes with a fading trail
 * halo, denser near the veins and thinning with altitude.
 */
export const EmberField: React.FC<EmberFieldProps> = ({ y, height, seed = 13 }) => {
  const rand = mulberry(seed);
  const embers: React.ReactNode[] = [];
  for (let i = 0; i < Math.round(height / 3); i++) {
    const ex = rand() * 600;
    const ey = y + rand() * height;
    const lift = 1 - (ey - y) / height; // higher = fainter
    const r = 0.8 + rand() * 1.6;
    embers.push(
      <g key={`e${i}`}>
        <circle cx={ex} cy={ey} r={r * 2.6} fill="#f97316" opacity={0.12 + lift * 0.1} />
        <circle
          cx={ex}
          cy={ey}
          r={r}
          fill={rand() > 0.4 ? '#fbbf24' : '#f97316'}
          opacity={0.5 + lift * 0.4}
        />
      </g>
    );
  }
  return (
    <g className="ember-field" data-testid="ember-field" pointerEvents="none">
      {embers}
    </g>
  );
};

export interface FireBannerProps {
  /** Pole base on the ground line */
  x: number;
  baseY: number;
  height: number;
  uid: string;
  /** Pennant tone for left/right alternation */
  tone?: 'ember' | 'gold';
}

/**
 * Village banner pole: charred trunk, iron ring, three streaming pennants and
 * a flame finial.
 */
export const FireBanner: React.FC<FireBannerProps> = ({
  x,
  baseY,
  height,
  uid,
  tone = 'ember',
}) => {
  const main = tone === 'gold' ? '#fbbf24' : '#f97316';
  const shade = tone === 'gold' ? '#d97706' : '#dc2626';
  return (
    <g className="fire-banner" data-testid="fire-banner">
      <defs>
        <linearGradient id={`${uid}-pennant`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={main} />
          <stop offset="100%" stopColor={shade} />
        </linearGradient>
      </defs>
      {/* Pole with charred base wrap */}
      <rect x={x - 2} y={baseY - height} width="4" height={height} rx="2" fill="#3f2a1a" />
      <rect x={x - 3.5} y={baseY - 8} width="7" height="8" rx="2" fill="#1c1917" />
      {/* Iron ring collar */}
      <rect x={x - 3} y={baseY - height + 4} width="6" height="3" rx="1.5" fill="#292524" />
      {/* Streaming pennants */}
      {[
        [height * 0.18, 26],
        [height * 0.38, 20],
        [height * 0.56, 15],
      ].map(([py, pw], i) => (
        <path
          key={`pen${i}`}
          d={`M ${x + 2} ${baseY - py} q ${pw * 0.45} -2.5 ${pw * 0.7} 0 q ${pw * 0.3} 2 ${pw} 1.5 L ${x + 2 + pw * 0.72} ${baseY - py + 7} q ${-pw * 0.4} 2 ${-pw * 0.72} 0 Z`}
          fill={`url(#${uid}-pennant)`}
          opacity="0.92"
        />
      ))}
      {/* Flame finial */}
      <path
        d={`M ${x} ${baseY - height - 1} Q ${x - 3.5} ${baseY - height - 6} ${x} ${baseY - height - 12} Q ${x + 3.5} ${baseY - height - 6} ${x} ${baseY - height - 1} Z`}
        fill={main}
      />
      <path
        d={`M ${x} ${baseY - height - 2} Q ${x - 1.6} ${baseY - height - 5} ${x} ${baseY - height - 8} Q ${x + 1.6} ${baseY - height - 5} ${x} ${baseY - height - 2} Z`}
        fill="#fef08a"
      />
      {/* Grounding shadow */}
      <ellipse cx={x} cy={baseY + 1.5} rx="7" ry="2.2" fill="#1c0702" opacity="0.5" />
    </g>
  );
};

export interface PagodaHallProps {
  /** Left edge of the hall footprint */
  x: number;
  /** Ground line */
  baseY: number;
  /** Footprint width of the widest tier */
  width: number;
  /** Number of stacked roof tiers */
  tiers?: number;
  uid: string;
  seed?: number;
}

const EAVE = '#7c2d12';
const EAVE_LIGHT = '#b45309';
const WALL = '#3f2a1a';
const WALL_LIGHT = '#5c3a20';
const GOLD = '#fbbf24';
const GOLD_HOT = '#fde68a';

/**
 * Festival pagoda hall like the reference night village: stacked roofs with
 * upswept golden-lit eaves, red columns and glowing windows between them.
 */
export const PagodaHall: React.FC<PagodaHallProps> = ({
  x,
  baseY,
  width,
  tiers = 3,
  uid,
  seed = 5,
}) => {
  const rand = mulberry(seed);
  const tierH = Math.max(14, width * 0.34);
  const wallH = tierH * 0.62;
  const totalH = tiers * tierH + wallH * 0.4;
  const storeys: React.ReactNode[] = [];

  for (let t = 0; t < tiers; t++) {
    const tierW = width * (1 - t * 0.22);
    const tx = x + (width - tierW) / 2;
    const floorY = baseY - t * tierH;
    const wallTop = floorY - wallH;

    // Red column wall with glowing windows between columns.
    storeys.push(
      <g key={`w${t}`}>
        <rect x={tx} y={wallTop} width={tierW} height={wallH} fill={WALL} />
        <rect
          x={tx}
          y={wallTop}
          width={tierW * 0.3}
          height={wallH}
          fill={WALL_LIGHT}
          opacity="0.7"
        />
        {Array.from({ length: Math.max(2, Math.floor(tierW / 18)) }).map((_, i) => {
          const cxs = tx + 6 + i * 18;
          if (cxs > tx + tierW - 8) return null;
          return (
            <g key={`col${i}`}>
              <rect x={cxs} y={wallTop + 1} width="3.5" height={wallH - 2} fill="#991b1b" />
              <rect
                x={cxs + 4.5}
                y={wallTop + wallH * 0.25}
                width="8"
                height={wallH * 0.5}
                fill={GOLD}
                opacity="0.9"
              />
              <rect
                x={cxs + 4.5}
                y={wallTop + wallH * 0.25}
                width="8"
                height={wallH * 0.2}
                fill={GOLD_HOT}
                opacity="0.9"
              />
            </g>
          );
        })}
      </g>
    );

    // Roof tier with upswept eaves.
    const roofY = wallTop;
    const overhang = tierW * 0.14;
    const rise = tierH * 0.55;
    storeys.push(
      <g key={`r${t}`}>
        <path
          d={`M ${tx - overhang} ${roofY} Q ${tx + tierW * 0.2} ${roofY - rise} ${tx + tierW / 2} ${roofY - rise} Q ${tx + tierW * 0.8} ${roofY - rise} ${tx + tierW + overhang} ${roofY} L ${tx + tierW * 0.86} ${roofY + 3} Q ${tx + tierW / 2} ${roofY - rise * 0.55} ${tx + tierW * 0.14} ${roofY + 3} Z`}
          fill={`url(#${uid}-roof${t % 2})`}
        />
        {/* Ridge cap */}
        <path
          d={`M ${tx + tierW * 0.3} ${roofY - rise + 1} Q ${tx + tierW / 2} ${roofY - rise - 3} ${tx + tierW * 0.7} ${roofY - rise + 1}`}
          stroke={EAVE}
          strokeWidth="2"
          fill="none"
        />
        {/* Eave glow from the windows below */}
        <path
          d={`M ${tx + tierW * 0.1} ${roofY + 2} Q ${tx + tierW / 2} ${roofY - rise * 0.5} ${tx + tierW * 0.9} ${roofY + 2}`}
          stroke={GOLD}
          strokeWidth="1"
          fill="none"
          opacity="0.5"
        />
      </g>
    );
  }

  return (
    <g className="pagoda-hall" data-testid="pagoda-hall">
      <defs>
        <linearGradient id={`${uid}-roof0`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={EAVE_LIGHT} />
          <stop offset="50%" stopColor={EAVE} />
          <stop offset="100%" stopColor="#5c1a08" />
        </linearGradient>
        <linearGradient id={`${uid}-roof1`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="55%" stopColor={EAVE_LIGHT} />
          <stop offset="100%" stopColor={EAVE} />
        </linearGradient>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0%" stopColor={GOLD_HOT} stopOpacity="0.5" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Warm halo behind the hall */}
      <ellipse
        cx={x + width / 2}
        cy={baseY - totalH * 0.55}
        rx={width * 0.85}
        ry={totalH * 0.6}
        fill={`url(#${uid}-halo)`}
      />
      {storeys}
      {/* Finial spire */}
      <rect x={x + width / 2 - 1} y={baseY - totalH - 8} width="2" height="10" fill={GOLD} />
      <circle cx={x + width / 2} cy={baseY - totalH - 9} r="2.5" fill={GOLD_HOT} />
      {/* Grounding shadow */}
      <ellipse
        cx={x + width / 2}
        cy={baseY + 2}
        rx={width * 0.6}
        ry="3.5"
        fill="#1c0702"
        opacity="0.5"
      />
      {/* Warm ground sparks near the entrance */}
      {Array.from({ length: 4 }).map((_, i) => (
        <circle
          key={`sp${i}`}
          cx={x + width * (0.3 + rand() * 0.4)}
          cy={baseY - rand() * 6}
          r="1"
          fill={GOLD_HOT}
          opacity="0.7"
        />
      ))}
    </g>
  );
};

export interface LanternStringProps {
  /** Left anchor of the string */
  x1: number;
  y1: number;
  /** Right anchor */
  x2: number;
  y2: number;
  uid: string;
}

/**
 * Festival lantern line: sagging cord with glowing red-gold lanterns, each
 * with a cap, tassel and halo.
 */
export const LanternString: React.FC<LanternStringProps> = ({ x1, y1, x2, y2, uid }) => {
  const count = Math.max(4, Math.round((x2 - x1) / 46));
  const lanterns: React.ReactNode[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const lx = x1 + (x2 - x1) * t;
    // Quadratic sag, deepest mid-span.
    const sag = 14 + Math.sin(t * Math.PI) * 6;
    const ly = y1 + (y2 - y1) * t + sag;
    lanterns.push(
      <g key={`l${i}`}>
        <line x1={lx} y1={ly - 7} x2={lx} y2={ly - 3} stroke="#5c1a08" strokeWidth="0.8" />
        <circle cx={lx} cy={ly} r="9" fill={`url(#${uid}-halo)`} />
        <ellipse cx={lx} cy={ly} rx="4.2" ry="5" fill="#dc2626" />
        <ellipse
          cx={lx}
          cy={ly}
          rx="4.2"
          ry="5"
          fill="none"
          stroke="#f97316"
          strokeWidth="0.7"
          opacity="0.8"
        />
        <ellipse cx={lx} cy={ly} rx="2" ry="5" fill={GOLD_HOT} opacity="0.85" />
        <rect x={lx - 3} y={ly - 6.2} width="6" height="1.6" rx="0.8" fill={GOLD} />
        <rect x={lx - 3} y={ly + 4.6} width="6" height="1.6" rx="0.8" fill={GOLD} />
        <line x1={lx} y1={ly + 6.2} x2={lx} y2={ly + 9} stroke={GOLD} strokeWidth="0.8" />
      </g>
    );
  }
  const midx = (x1 + x2) / 2;
  const midy = (y1 + y2) / 2 + 14;
  return (
    <g className="lantern-string" data-testid="lantern-string">
      <defs>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d={`M ${x1} ${y1} Q ${midx} ${midy} ${x2} ${y2}`}
        stroke="#5c1a08"
        strokeWidth="1.2"
        fill="none"
      />
      {lanterns}
    </g>
  );
};

export interface FireworksProps {
  /** Upper sky band for bursts */
  y: number;
  seed?: number;
}

/**
 * Night-sky firework bursts: radial trails, sparkle dots and a soft flash,
 * like the festival sky in the reference.
 */
export const Fireworks: React.FC<FireworksProps> = ({ y, seed = 19 }) => {
  const rand = mulberry(seed);
  const palette = ['#fbbf24', '#f97316', '#fde047', '#fb7185'];
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
          fill={GOLD_HOT}
          opacity={0.6 + rand() * 0.4}
        />
      );
    }
    return (
      <g key={`b${b}`}>
        <circle cx={cx} cy={cy} r={r * 1.15} fill="#fff7ed" opacity="0.08" />
        {rays}
        {sparkles}
      </g>
    );
  });
  return (
    <g className="fireworks" data-testid="fireworks" pointerEvents="none">
      {bursts}
    </g>
  );
};
