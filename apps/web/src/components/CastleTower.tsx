import React from 'react';

export interface CastleTowerProps {
  /** Left edge of the tower body in svg user units */
  x: number;
  /** Bottom edge of the tower body (where it meets the wall/ground) */
  baseY: number;
  width: number;
  height: number;
  /** Stable id prefix so multiple towers do not collide in <defs> */
  uid: string;
  /** True for the right-hand tower: light comes from the left, so shade the left face */
  flipped?: boolean;
}

const MORTAR = 'rgba(71, 85, 105, 0.55)';

/**
 * Realistic castle bastion tower: light-from-one-side shading, coursed stone
 * blocks with offset joints, corbelled battlements and recessed arrow slits.
 */
export const CastleTower: React.FC<CastleTowerProps> = ({
  x,
  baseY,
  width,
  height,
  uid,
  flipped = false,
}) => {
  // Battlement (parapet) band at the top.
  const parapetH = Math.max(18, height * 0.09);
  const merlonW = width / 5;
  const merlonH = parapetH * 0.55;
  const bodyY = baseY - height;
  const wallTop = bodyY + parapetH;
  const bodyH = height - parapetH;

  // Course spacing scales with tower size; compact towers get finer stone.
  const courseH = Math.max(9, bodyH / 16);
  const courses: React.ReactNode[] = [];
  for (let i = 1; courseH * i < bodyH - 2; i++) {
    const y = wallTop + courseH * i;
    courses.push(
      <line
        key={`c${i}`}
        x1={x + 1}
        y1={y}
        x2={x + width - 1}
        y2={y}
        stroke={MORTAR}
        strokeWidth="0.7"
      />
    );
    // Offset vertical joints, alternating per course like real masonry.
    const jointEvery = width / 3;
    const offset = i % 2 === 0 ? 0 : jointEvery / 2;
    for (let jx = offset; jx < width; jx += jointEvery) {
      if (jx <= 1 || jx >= width - 1) continue;
      courses.push(
        <line
          key={`j${i}-${jx}`}
          x1={x + jx}
          y1={y - courseH + 1}
          x2={x + jx}
          y2={y}
          stroke={MORTAR}
          strokeWidth="0.6"
        />
      );
    }
  }

  // Merlons across the parapet.
  const merlons: React.ReactNode[] = [];
  for (let m = 0; m < 5; m++) {
    merlons.push(
      <rect
        key={`m${m}`}
        x={x + m * merlonW}
        y={bodyY}
        width={merlonW * 0.62}
        height={merlonH + parapetH * 0.45}
        fill={`url(#${uid}-stone)`}
      />
    );
  }

  // Arrow slits down the tower face.
  const slitW = Math.max(7, width * 0.11);
  const slitH = Math.max(26, bodyH * 0.14);
  const slits: React.ReactNode[] = [0.22, 0.5, 0.78].map((fy, i) => {
    const sy = wallTop + bodyH * fy - slitH / 2;
    const sx = x + width / 2 - slitW / 2;
    return (
      <g key={`s${i}`}>
        {/* recessed surround */}
        <rect
          x={sx - 3}
          y={sy - 3}
          width={slitW + 6}
          height={slitH + 6}
          rx="2"
          fill="#3b4657"
          opacity="0.85"
        />
        {/* dark opening with a cool interior glow at the bottom */}
        <rect x={sx} y={sy} width={slitW} height={slitH} rx={slitW / 2} fill="#1e2430" />
        <rect
          x={sx}
          y={sy + slitH * 0.6}
          width={slitW}
          height={slitH * 0.4}
          rx={slitW / 2}
          fill="#5b6b84"
          opacity="0.5"
        />
        {/* lit sill on the light side */}
        <rect
          x={flipped ? sx - 3 : sx + slitW + 1}
          y={sy + slitH + 2}
          width={slitW * 0.7}
          height="2"
          fill="#e2e8f0"
          opacity="0.6"
        />
      </g>
    );
  });

  const lightX = flipped ? x + width : x;
  const shadeX = flipped ? x : x + width;

  return (
    <g className="castle-tower" data-testid="castle-tower">
      <defs>
        <linearGradient id={`${uid}-stone`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={flipped ? '#8b98ab' : '#b9c4d4'} />
          <stop offset="35%" stopColor="#a3aebb" />
          <stop offset="100%" stopColor={flipped ? '#b0bac8' : '#77839a'} />
        </linearGradient>
        <linearGradient id={`${uid}-face-light`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-face-shade`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#1e2430" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#1e2430" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Tower body */}
      <rect x={x} y={wallTop} width={width} height={bodyH} fill={`url(#${uid}-stone)`} />
      <g opacity="0.5">{courses}</g>

      {/* Directional light and shade over the coursed stone */}
      <rect x={x} y={wallTop} width={width} height={bodyH} fill={`url(#${uid}-face-light)`} />
      <rect x={x} y={wallTop} width={width} height={bodyH} fill={`url(#${uid}-face-shade)`} />
      {/* corner highlight on the light edge */}
      <rect
        x={flipped ? lightX - 3 : lightX}
        y={wallTop}
        width="3"
        height={bodyH}
        fill="#ffffff"
        opacity="0.35"
      />
      {/* shaded corner */}
      <rect
        x={flipped ? shadeX : shadeX - 3}
        y={wallTop}
        width="3"
        height={bodyH}
        fill="#1e2430"
        opacity="0.3"
      />

      {/* Corbels supporting the parapet overhang */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect
          key={`corb${i}`}
          x={x + 2 + i * (width / 6)}
          y={wallTop - 4}
          width={width / 9}
          height="4"
          fill="#5b6779"
        />
      ))}

      {/* Parapet deck and merlons */}
      <rect
        x={x - 4}
        y={bodyY + merlonH * 0.55}
        width={width + 8}
        height={parapetH * 0.5}
        fill="#6d7889"
      />
      {merlons}
      {/* parapet top light */}
      <rect
        x={x - 4}
        y={bodyY + merlonH * 0.55}
        width={width + 8}
        height="1.6"
        fill="#cbd5e1"
        opacity="0.7"
      />

      {/* Slits */}
      {slits}

      {/* Grounding shadow where the tower meets the wall */}
      <rect x={x - 2} y={baseY - 5} width={width + 4} height="5" fill="#1e2430" opacity="0.35" />
    </g>
  );
};

interface ShadeOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  uid: string;
  /** Overall strength of the light/shade treatment, 0..1 */
  strength?: number;
  /** Optional polygon points (svg points list) clipping the overlay to a shape */
  clipPoints?: string;
}

/**
 * Directional light/shade overlay for flat background structures in the other
 * realms: a lit left edge and a shaded right edge, so simple rects read as
 * solid, three-dimensional forms.
 */
export const ShadeOverlay: React.FC<ShadeOverlayProps> = ({
  x,
  y,
  width,
  height,
  uid,
  strength = 1,
  clipPoints,
}) => (
  <g className="shade-overlay" pointerEvents="none">
    <defs>
      {clipPoints && (
        <clipPath id={`${uid}-clip`}>
          <polygon points={clipPoints} />
        </clipPath>
      )}
      <linearGradient id={`${uid}-lit`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.3 * strength} />
        <stop offset="30%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${uid}-shaded`} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stopColor="#0f172a" stopOpacity={0.32 * strength} />
        <stop offset="45%" stopColor="#0f172a" stopOpacity="0" />
      </linearGradient>
    </defs>
    <g clipPath={clipPoints ? `url(#${uid}-clip)` : undefined}>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${uid}-lit)`} />
      <rect x={x} y={y} width={width} height={height} fill={`url(#${uid}-shaded)`} />
    </g>
  </g>
);
