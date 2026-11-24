import React, { useEffect, useState } from 'react';
import { type WorldAreaId, getWorldArea } from '@math-archer/learning-engine';
import { CartographicLayer } from './CartographicLayer';
import {
  CragSpur,
  CliffRuin,
  StormClouds,
  HeatherDrift,
  EarthGround,
  GorgeMist,
  EarthSky,
} from './EarthMountain';
import {
  StationSky,
  Starfield,
  MilkyWay,
  OrbitalRing,
  StationSpire,
  OrbitalDeck,
  CometTrail,
} from './SpaceStation';
import { CastleTower, ShadeOverlay } from './CastleTower';
import { GrassField } from './GrassField';
import {
  FireHut,
  FireTorch,
  AshGround,
  FireChimney,
  EmberField,
  FireBanner,
  PagodaHall,
  LanternString,
  Fireworks,
} from './FireVillage';
import {
  IceTower,
  FrostBrazier,
  FrostGround,
  IceCitadel,
  FrostLightString,
  IceSparkles,
} from './IceKingdom';
import {
  TempleHall,
  PrayerFlagString,
  IncenseBrazier,
  ZephyrGround,
  CloudBank,
  FloatingStone,
  KiteGlider,
  WindSparkles,
} from './WindTemple';

export interface RangeBackdropProps {
  areaId: WorldAreaId;
  equippedBanner?: string;
  equippedStatue?: string;
  equippedGround?: string;
  variant?: 'arena' | 'compact';
}

/**
 * Renders the tournament standards / banners flanking the arena.
 */
const renderBackdropBanners = (
  bannerLeft: string,
  bannerRight: string,
  isCompact: boolean,
  poleColor: string = '#334155'
) => {
  return isCompact ? (
    <g className="realm-encampment-banners" data-testid="realm-encampment-banners">
      <line x1="90" y1="70" x2="90" y2="45" stroke={poleColor} strokeWidth="2" />
      <polygon points="90,45 115,54 90,63" fill={bannerLeft} />
      <line x1="510" y1="70" x2="510" y2="45" stroke={poleColor} strokeWidth="2" />
      <polygon points="510,45 535,54 510,63" fill={bannerRight} />
    </g>
  ) : (
    <g className="realm-encampment-banners" data-testid="realm-encampment-banners">
      {/* Left Standard Banner */}
      <line x1="82" y1="50" x2="82" y2="15" stroke={poleColor} strokeWidth="2.5" />
      <polygon points="82,15 125,28 82,40" fill={bannerLeft} />
      <rect x="66" y="98" width="32" height="65" fill={bannerLeft} rx="2" opacity="0.9" />
      <polygon points="66,163 82,176 98,163" fill={bannerLeft} opacity="0.9" />

      {/* Right Standard Banner */}
      <line x1="518" y1="50" x2="518" y2="15" stroke={poleColor} strokeWidth="2.5" />
      <polygon points="518,15 561,28 518,40" fill={bannerRight} />
      <rect x="502" y="98" width="32" height="65" fill={bannerRight} rx="2" opacity="0.9" />
      <polygon points="502,163 518,176 534,163" fill={bannerRight} opacity="0.9" />
    </g>
  );
};

/**
 * Renders an architectural promontory / dais underneath central statues.
 */
const renderCenterPromontory = (
  equippedStatue: string,
  isCompact: boolean,
  fill: string,
  stroke: string
) => {
  if (
    equippedStatue === 'castle_statue_none' ||
    equippedStatue === 'castle_statue_stone_gargoyle' ||
    equippedStatue === 'castle_statue_griffin'
  ) {
    return null;
  }
  return isCompact ? (
    <rect
      x="275"
      y="115"
      width="50"
      height="6"
      rx="2"
      fill={fill}
      stroke={stroke}
      strokeWidth="1"
    />
  ) : (
    <rect
      x="270"
      y="115"
      width="60"
      height="10"
      rx="2"
      fill={fill}
      stroke={stroke}
      strokeWidth="1.5"
    />
  );
};

/**
 * Renders the archer's equipped monument statue across all world realms.
 */
const renderBackdropStatues = (equippedStatue: string, isCompact: boolean) => {
  if (isCompact) {
    return (
      <>
        {equippedStatue === 'castle_statue_stone_gargoyle' && (
          <g className="castle-gargoyle-statues" data-testid="statue-gargoyle">
            <path
              d="M 50 68 C 45 60 48 52 56 50 C 62 50 66 56 64 68 Z"
              fill="#475569"
              stroke="#334155"
              strokeWidth="1"
            />
            <polygon points="46,54 40,48 48,50" fill="#334155" />
            <path
              d="M 544 68 C 540 60 542 52 550 50 C 556 50 560 56 558 68 Z"
              fill="#475569"
              stroke="#334155"
              strokeWidth="1"
            />
            <polygon points="562,54 568,48 560,50" fill="#334155" />
          </g>
        )}

        {equippedStatue === 'castle_statue_griffin' && (
          <g className="castle-griffin-statues" data-testid="statue-griffin">
            <circle cx="56" cy="54" r="5" fill="#64748b" />
            <polygon points="53,52 45,46 51,56" fill="#334155" />
            <path d="M 52 58 L 62 58 L 60 68 L 50 68 Z" fill="#475569" />
            <circle cx="544" cy="54" r="5" fill="#64748b" />
            <polygon points="547,52 555,46 549,56" fill="#334155" />
            <path d="M 540 58 L 550 58 L 548 68 L 538 68 Z" fill="#475569" />
          </g>
        )}

        {equippedStatue === 'castle_statue_crystal_dragon' && (
          <g className="castle-crystal-dragon-statue" data-testid="statue-crystal-dragon">
            <rect x="285" y="65" width="30" height="50" rx="3" fill="#cffafe" stroke="#06b6d4" />
            <polygon points="300,44 290,56 310,56" fill="#22d3ee" stroke="#0891b2" />
            <circle cx="300" cy="58" r="7" fill="#67e8f9" stroke="#0891b2" />
            <polygon points="292,54 280,48 290,60" fill="#a5f3fc" />
            <polygon points="308,54 320,48 310,60" fill="#a5f3fc" />
          </g>
        )}

        {equippedStatue === 'castle_statue_golden_archer' && (
          <g className="castle-golden-archer-statue" data-testid="statue-golden-archer">
            <rect x="285" y="65" width="30" height="50" rx="3" fill="#cbd5e1" stroke="#64748b" />
            <path d="M 285 65 Q 300 48 315 65 Z" fill="#94a3b8" />
            <circle cx="300" cy="54" r="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
            <path d="M 296 59 L 304 59 L 306 74 L 294 74 Z" fill="#fbbf24" stroke="#d97706" />
            <line x1="304" y1="59" x2="312" y2="52" stroke="#b45309" strokeWidth="2" />
          </g>
        )}

        {equippedStatue === 'castle_statue_phoenix_pillar' && (
          <g className="castle-phoenix-pillar-statue" data-testid="statue-phoenix-pillar">
            <rect x="290" y="60" width="20" height="55" fill="#fed7aa" stroke="#f97316" rx="2" />
            <circle cx="300" cy="50" r="6" fill="#ea580c" stroke="#c2410c" />
            <polygon points="294,48 280,42 290,54" fill="#fb923c" />
            <polygon points="306,48 320,42 310,54" fill="#fb923c" />
          </g>
        )}

        {equippedStatue === 'castle_statue_celestial_archon' && (
          <g className="castle-celestial-archon-statue" data-testid="statue-celestial-archon">
            <rect
              x="282"
              y="60"
              width="36"
              height="55"
              rx="4"
              fill="#f8fafc"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <circle cx="300" cy="48" r="8" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
            <circle
              cx="300"
              cy="48"
              r="12"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <line x1="310" y1="42" x2="322" y2="34" stroke="#38bdf8" strokeWidth="2" />
          </g>
        )}
      </>
    );
  }

  // Full Arena Mode (500h)
  return (
    <>
      {equippedStatue === 'castle_statue_stone_gargoyle' && (
        <g className="castle-gargoyle-statues" data-testid="statue-gargoyle">
          <path
            d="M 45 48 C 40 40 43 32 51 30 C 57 30 61 36 59 48 Z"
            fill="#475569"
            stroke="#334155"
            strokeWidth="1.2"
          />
          <polygon points="41,34 35,28 43,30" fill="#334155" />
          <path
            d="M 545 48 C 541 40 543 32 551 30 C 557 30 561 36 559 48 Z"
            fill="#475569"
            stroke="#334155"
            strokeWidth="1.2"
          />
          <polygon points="563,34 569,28 561,30" fill="#334155" />
        </g>
      )}

      {equippedStatue === 'castle_statue_griffin' && (
        <g className="castle-griffin-statues" data-testid="statue-griffin">
          <circle cx="48" cy="36" r="6" fill="#64748b" />
          <polygon points="45,34 37,28 43,38" fill="#334155" />
          <path d="M 44 40 L 54 40 L 52 50 L 42 50 Z" fill="#475569" />
          <circle cx="552" cy="36" r="6" fill="#64748b" />
          <polygon points="555,34 563,28 557,38" fill="#334155" />
          <path d="M 548 40 L 558 40 L 556 50 L 546 50 Z" fill="#475569" />
        </g>
      )}

      {equippedStatue === 'castle_statue_crystal_dragon' && (
        <g className="castle-crystal-dragon-statue" data-testid="statue-crystal-dragon">
          <rect
            x="282"
            y="60"
            width="36"
            height="55"
            rx="4"
            fill="#cffafe"
            stroke="#06b6d4"
            strokeWidth="1.5"
          />
          <polygon points="300,38 288,52 312,52" fill="#22d3ee" stroke="#0891b2" />
          <circle cx="300" cy="54" r="8" fill="#67e8f9" stroke="#0891b2" />
          <polygon points="290,50 276,44 288,58" fill="#a5f3fc" />
          <polygon points="310,50 324,44 312,58" fill="#a5f3fc" />
        </g>
      )}

      {equippedStatue === 'castle_statue_golden_archer' && (
        <g className="castle-golden-archer-statue" data-testid="statue-golden-archer">
          <rect x="282" y="60" width="36" height="55" rx="4" fill="#cbd5e1" stroke="#64748b" />
          <path d="M 282 60 Q 300 42 318 60 Z" fill="#94a3b8" />
          <circle cx="300" cy="48" r="6.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
          <path d="M 295 54 L 305 54 L 307 72 L 293 72 Z" fill="#fbbf24" stroke="#d97706" />
          <line x1="305" y1="54" x2="315" y2="46" stroke="#b45309" strokeWidth="2.5" />
        </g>
      )}

      {equippedStatue === 'castle_statue_phoenix_pillar' && (
        <g className="castle-phoenix-pillar-statue" data-testid="statue-phoenix-pillar">
          <rect
            x="288"
            y="55"
            width="24"
            height="60"
            fill="#fed7aa"
            stroke="#f97316"
            rx="2"
            strokeWidth="1.5"
          />
          <circle cx="300" cy="44" r="7" fill="#ea580c" stroke="#c2410c" />
          <polygon points="293,42 278,35 289,48" fill="#fb923c" />
          <polygon points="307,42 322,35 311,48" fill="#fb923c" />
        </g>
      )}

      {equippedStatue === 'castle_statue_celestial_archon' && (
        <g className="castle-celestial-archon-statue" data-testid="statue-celestial-archon">
          <rect
            x="280"
            y="55"
            width="40"
            height="60"
            rx="4"
            fill="#f8fafc"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          <circle cx="300" cy="42" r="9" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
          <circle
            cx="300"
            cy="42"
            r="14"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <line x1="312" y1="36" x2="326" y2="28" stroke="#38bdf8" strokeWidth="2.5" />
        </g>
      )}
    </>
  );
};

/**
 * Renders the tournament platform / ground transformation across all world realms.
 */
const renderBackdropGround = (equippedGround: string, isCompact: boolean) => {
  if (isCompact) {
    return (
      <>
        {equippedGround === 'castle_ground_flowerbed' && (
          <g className="castle-rose-flowerbed" data-testid="ground-flowerbed">
            <circle cx="60" cy="140" r="5" fill="#e11d48" />
            <circle cx="65" cy="138" r="4" fill="#fb7185" />
            <circle cx="150" cy="140" r="5.5" fill="#e11d48" />
            <circle cx="156" cy="137" r="4" fill="#fb7185" />
            <circle cx="440" cy="140" r="5" fill="#e11d48" />
            <circle cx="446" cy="138" r="4" fill="#fb7185" />
            <circle cx="530" cy="140" r="5.5" fill="#e11d48" />
            <circle cx="536" cy="137" r="4" fill="#fb7185" />
          </g>
        )}

        {equippedGround === 'castle_ground_champions_pedestal' && (
          <g className="castle-champions-plinth" data-testid="ground-pedestal">
            <rect x="270" y="138" width="60" height="12" rx="2" fill="#e2e8f0" stroke="#94a3b8" />
            <circle cx="300" cy="144" r="4.5" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
            <circle cx="300" cy="144" r="2" fill="#ef4444" />
          </g>
        )}

        {equippedGround === 'castle_ground_obsidian_cobble' && (
          <g className="castle-obsidian-ground" data-testid="ground-obsidian">
            <rect x="0" y="135" width="600" height="45" fill="#1e293b" opacity="0.9" />
            <line x1="0" y1="135" x2="600" y2="135" stroke="#f97316" strokeWidth="2" />
            <line x1="100" y1="135" x2="100" y2="180" stroke="#334155" strokeWidth="1" />
            <line x1="200" y1="135" x2="200" y2="180" stroke="#334155" strokeWidth="1" />
            <line x1="300" y1="135" x2="300" y2="180" stroke="#334155" strokeWidth="1" />
            <line x1="400" y1="135" x2="400" y2="180" stroke="#334155" strokeWidth="1" />
            <line x1="500" y1="135" x2="500" y2="180" stroke="#334155" strokeWidth="1" />
          </g>
        )}

        {equippedGround === 'castle_ground_enchanted_meadow' && (
          <g className="castle-enchanted-ground" data-testid="ground-enchanted">
            <rect x="0" y="135" width="600" height="45" fill="#0f172a" opacity="0.9" />
            <line x1="0" y1="135" x2="600" y2="135" stroke="#a855f7" strokeWidth="2" />
            <circle cx="80" cy="142" r="4" fill="#c084fc" />
            <circle cx="180" cy="144" r="4.5" fill="#38bdf8" />
            <circle cx="280" cy="141" r="3.5" fill="#f472b6" />
            <circle cx="380" cy="145" r="4.5" fill="#c084fc" />
            <circle cx="480" cy="142" r="4" fill="#38bdf8" />
          </g>
        )}

        {equippedGround === 'castle_ground_royal_marble' && (
          <g className="castle-royal-marble-ground" data-testid="ground-marble">
            <rect x="0" y="135" width="600" height="45" fill="#f8fafc" opacity="0.9" />
            <line x1="0" y1="135" x2="600" y2="135" stroke="#ca8a04" strokeWidth="2.5" />
            <line
              x1="0"
              y1="155"
              x2="600"
              y2="155"
              stroke="#e2e8f0"
              strokeWidth="1.5"
              strokeDasharray="10 5"
            />
          </g>
        )}

        {equippedGround === 'castle_ground_starfall_mosaic' && (
          <g className="castle-starfall-mosaic-ground" data-testid="ground-starfall">
            <rect x="0" y="135" width="600" height="45" fill="#020617" opacity="0.9" />
            <line x1="0" y1="135" x2="600" y2="135" stroke="#38bdf8" strokeWidth="2" />
            <polygon points="120,140 123,148 115,143 125,143 117,148" fill="#fef08a" />
            <polygon points="300,142 303,150 295,145 305,145 297,150" fill="#e0e7ff" />
            <polygon points="480,140 483,148 475,143 485,143 477,148" fill="#fef08a" />
          </g>
        )}
      </>
    );
  }

  // Full Arena Mode (500h)
  return (
    <>
      {equippedGround === 'castle_ground_flowerbed' && (
        <g className="castle-rose-flowerbed" data-testid="ground-flowerbed">
          <circle cx="60" cy="410" r="7" fill="#e11d48" />
          <circle cx="66" cy="406" r="5" fill="#fb7185" />
          <circle cx="150" cy="415" r="8" fill="#e11d48" />
          <circle cx="158" cy="410" r="6" fill="#fb7185" />
          <circle cx="280" cy="420" r="7" fill="#e11d48" />
          <circle cx="287" cy="415" r="5" fill="#fb7185" />
          <circle cx="440" cy="415" r="8" fill="#e11d48" />
          <circle cx="448" cy="410" r="6" fill="#fb7185" />
          <circle cx="530" cy="410" r="7" fill="#e11d48" />
          <circle cx="538" cy="406" r="5" fill="#fb7185" />
        </g>
      )}

      {equippedGround === 'castle_ground_champions_pedestal' && (
        <g className="castle-champions-plinth" data-testid="ground-pedestal">
          <rect
            x="230"
            y="405"
            width="140"
            height="30"
            rx="4"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <circle cx="300" cy="420" r="8" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          <circle cx="300" cy="420" r="4" fill="#ef4444" />
        </g>
      )}

      {equippedGround === 'castle_ground_obsidian_cobble' && (
        <g className="castle-obsidian-ground" data-testid="ground-obsidian">
          <rect x="0" y="380" width="600" height="120" fill="#1e293b" opacity="0.9" />
          <line x1="0" y1="380" x2="600" y2="380" stroke="#f97316" strokeWidth="3" />
          <line
            x1="0"
            y1="420"
            x2="600"
            y2="420"
            stroke="#f97316"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <line
            x1="0"
            y1="460"
            x2="600"
            y2="460"
            stroke="#f97316"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <line x1="100" y1="380" x2="100" y2="500" stroke="#334155" strokeWidth="1.5" />
          <line x1="200" y1="380" x2="200" y2="500" stroke="#334155" strokeWidth="1.5" />
          <line x1="300" y1="380" x2="300" y2="500" stroke="#334155" strokeWidth="1.5" />
          <line x1="400" y1="380" x2="400" y2="500" stroke="#334155" strokeWidth="1.5" />
          <line x1="500" y1="380" x2="500" y2="500" stroke="#334155" strokeWidth="1.5" />
        </g>
      )}

      {equippedGround === 'castle_ground_enchanted_meadow' && (
        <g className="castle-enchanted-ground" data-testid="ground-enchanted">
          <rect x="0" y="380" width="600" height="120" fill="#0f172a" opacity="0.9" />
          <line x1="0" y1="380" x2="600" y2="380" stroke="#a855f7" strokeWidth="3" />
          <circle cx="80" cy="410" r="6" fill="#c084fc" />
          <circle cx="180" cy="425" r="7" fill="#38bdf8" />
          <circle cx="280" cy="415" r="5" fill="#f472b6" />
          <circle cx="380" cy="430" r="7" fill="#c084fc" />
          <circle cx="480" cy="415" r="6" fill="#38bdf8" />
          <circle cx="130" cy="450" r="5" fill="#38bdf8" />
          <circle cx="330" cy="460" r="6" fill="#c084fc" />
          <circle cx="530" cy="455" r="5.5" fill="#f472b6" />
        </g>
      )}

      {equippedGround === 'castle_ground_royal_marble' && (
        <g className="castle-royal-marble-ground" data-testid="ground-marble">
          <rect x="0" y="380" width="600" height="120" fill="#f8fafc" opacity="0.9" />
          <line x1="0" y1="380" x2="600" y2="380" stroke="#ca8a04" strokeWidth="3.5" />
          <line
            x1="0"
            y1="420"
            x2="600"
            y2="420"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeDasharray="15 8"
          />
          <line
            x1="0"
            y1="460"
            x2="600"
            y2="460"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeDasharray="15 8"
          />
        </g>
      )}

      {equippedGround === 'castle_ground_starfall_mosaic' && (
        <g className="castle-starfall-mosaic-ground" data-testid="ground-starfall">
          <rect x="0" y="380" width="600" height="120" fill="#020617" opacity="0.9" />
          <line x1="0" y1="380" x2="600" y2="380" stroke="#38bdf8" strokeWidth="3" />
          <polygon points="120,410 125,424 112,416 128,416 115,424" fill="#fef08a" />
          <polygon points="300,415 305,429 292,421 308,421 295,429" fill="#e0e7ff" />
          <polygon points="480,410 485,424 472,416 488,416 475,424" fill="#fef08a" />
          <polygon points="210,450 215,464 202,456 218,456 205,464" fill="#38bdf8" />
          <polygon points="390,450 395,464 382,456 398,456 385,464" fill="#fef08a" />
        </g>
      )}
    </>
  );
};

const SUN_ARENA = { cx: 300, cy: 175 } as const;
const SUN_COMPACT = { cx: 300, cy: 62 } as const;

interface SolarPlanetSpec {
  id: string;
  name: string;
  orbitRx: number;
  orbitRy: number;
  r: number;
  periodSec: number;
  initialAngleDeg: number;
  labelColor: string;
  bold?: boolean;
  compactOrbitRx: number;
  compactOrbitRy: number;
  compactR: number;
}

const SOLAR_PLANETS: readonly SolarPlanetSpec[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    orbitRx: 44,
    orbitRy: 18,
    r: 5.5,
    periodSec: 8,
    initialAngleDeg: 215,
    labelColor: '#cbd5e1',
    compactOrbitRx: 34,
    compactOrbitRy: 11,
    compactR: 3.2,
  },
  {
    id: 'venus',
    name: 'Venus',
    orbitRx: 72,
    orbitRy: 30,
    r: 8.5,
    periodSec: 13,
    initialAngleDeg: 145,
    labelColor: '#fde68a',
    compactOrbitRx: 56,
    compactOrbitRy: 17,
    compactR: 4.8,
  },
  {
    id: 'earth',
    name: 'Earth',
    orbitRx: 104,
    orbitRy: 43,
    r: 10,
    periodSec: 18,
    initialAngleDeg: 35,
    labelColor: '#93c5fd',
    compactOrbitRx: 82,
    compactOrbitRy: 24,
    compactR: 5.5,
  },
  {
    id: 'mars',
    name: 'Mars',
    orbitRx: 136,
    orbitRy: 56,
    r: 7.5,
    periodSec: 25,
    initialAngleDeg: 310,
    labelColor: '#fca5a5',
    compactOrbitRx: 108,
    compactOrbitRy: 31,
    compactR: 4.5,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    orbitRx: 178,
    orbitRy: 74,
    r: 20,
    periodSec: 36,
    initialAngleDeg: 195,
    labelColor: '#fde68a',
    bold: true,
    compactOrbitRx: 142,
    compactOrbitRy: 40,
    compactR: 11,
  },
  {
    id: 'saturn',
    name: 'Saturn',
    orbitRx: 218,
    orbitRy: 91,
    r: 16,
    periodSec: 48,
    initialAngleDeg: 335,
    labelColor: '#fef08a',
    bold: true,
    compactOrbitRx: 176,
    compactOrbitRy: 48,
    compactR: 8.5,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    orbitRx: 252,
    orbitRy: 105,
    r: 11.5,
    periodSec: 64,
    initialAngleDeg: 120,
    labelColor: '#a5f3fc',
    compactOrbitRx: 206,
    compactOrbitRy: 55,
    compactR: 6.5,
  },
  {
    id: 'neptune',
    name: 'Neptune',
    orbitRx: 278,
    orbitRy: 116,
    r: 11,
    periodSec: 80,
    initialAngleDeg: 255,
    labelColor: '#a5b4fc',
    compactOrbitRx: 230,
    compactOrbitRy: 60,
    compactR: 6,
  },
  {
    id: 'pluto',
    name: 'Pluto',
    orbitRx: 296,
    orbitRy: 124,
    r: 6,
    periodSec: 96,
    initialAngleDeg: 65,
    labelColor: '#e7e5e4',
    compactOrbitRx: 248,
    compactOrbitRy: 64,
    compactR: 3.5,
  },
];

const ASTEROID_COUNT = 28;
const ASTEROID_NODES = Array.from({ length: ASTEROID_COUNT }, (_, idx) => {
  const baseAngleDeg = (idx * 360) / ASTEROID_COUNT + (idx % 3) * 4;
  const rxOffset = ((idx % 5) - 2) * 2.5;
  const ryOffset = ((idx % 5) - 2) * 1.1;
  const r = 1.1 + (idx % 3) * 0.45;
  const fill = idx % 3 === 0 ? '#cbd5e1' : idx % 3 === 1 ? '#94a3b8' : '#64748b';
  return { idx, baseAngleDeg, rxOffset, ryOffset, r, fill };
});

interface OrbitParams {
  sunCx: number;
  sunCy: number;
  rx: number;
  ry: number;
  initialAngleDeg: number;
  periodSec: number;
  elapsedSec: number;
}

const computeOrbitPos = ({
  sunCx,
  sunCy,
  rx,
  ry,
  initialAngleDeg,
  periodSec,
  elapsedSec,
}: OrbitParams) => {
  const angleRad = ((initialAngleDeg + (elapsedSec / periodSec) * 360) * Math.PI) / 180;
  return {
    x: Number((sunCx + rx * Math.cos(angleRad)).toFixed(2)),
    y: Number((sunCy + ry * Math.sin(angleRad)).toFixed(2)),
  };
};

const renderSpaceDefs = () => (
  <defs>
    <linearGradient id="space-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#050811" />
      <stop offset="45%" stopColor="#131136" />
      <stop offset="80%" stopColor="#1e1b4b" />
      <stop offset="100%" stopColor="#312e81" />
    </linearGradient>
    <linearGradient id="nebula-glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
      <stop offset="50%" stopColor="#818cf8" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
    </linearGradient>
    <radialGradient id="solar-sun-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
      <stop offset="45%" stopColor="#f97316" stopOpacity="0.9" />
      <stop offset="75%" stopColor="#ea580c" stopOpacity="0.45" />
      <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="planet-mercury" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#e2e8f0" />
      <stop offset="60%" stopColor="#94a3b8" />
      <stop offset="100%" stopColor="#475569" />
    </linearGradient>
    <linearGradient id="planet-venus" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fef3c7" />
      <stop offset="55%" stopColor="#f59e0b" />
      <stop offset="100%" stopColor="#b45309" />
    </linearGradient>
    <linearGradient id="planet-earth" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#60a5fa" />
      <stop offset="55%" stopColor="#2563eb" />
      <stop offset="100%" stopColor="#1e3a8a" />
    </linearGradient>
    <linearGradient id="planet-mars" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fca5a5" />
      <stop offset="50%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#991b1b" />
    </linearGradient>
    <linearGradient id="planet-jupiter" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#d97706" />
      <stop offset="22%" stopColor="#fde68a" />
      <stop offset="42%" stopColor="#b45309" />
      <stop offset="60%" stopColor="#fef3c7" />
      <stop offset="78%" stopColor="#ea580c" />
      <stop offset="100%" stopColor="#78350f" />
    </linearGradient>
    <linearGradient id="planet-saturn" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fef08a" />
      <stop offset="55%" stopColor="#eab308" />
      <stop offset="100%" stopColor="#a16207" />
    </linearGradient>
    <linearGradient id="planet-uranus" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#a5f3fc" />
      <stop offset="55%" stopColor="#06b6d4" />
      <stop offset="100%" stopColor="#155e75" />
    </linearGradient>
    <linearGradient id="planet-neptune" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#818cf8" />
      <stop offset="55%" stopColor="#4f46e5" />
      <stop offset="100%" stopColor="#1e1b4b" />
    </linearGradient>
    <linearGradient id="planet-pluto" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#e7e5e4" />
      <stop offset="55%" stopColor="#a8a29e" />
      <stop offset="100%" stopColor="#57534e" />
    </linearGradient>
    <linearGradient id="orbital-pylon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#94a3b8" />
      <stop offset="50%" stopColor="#475569" />
      <stop offset="100%" stopColor="#1e293b" />
    </linearGradient>
  </defs>
);

const renderCompactPlanetDetail = (id: string, x: number, y: number, elapsedSec: number) => {
  if (id === 'earth') {
    const moonAngle = ((elapsedSec / 3) * 360 * Math.PI) / 180;
    const mx = Number((x + 9 * Math.cos(moonAngle)).toFixed(2));
    const my = Number((y + 5 * Math.sin(moonAngle)).toFixed(2));
    return <circle cx={mx} cy={my} r="1.8" fill="#e2e8f0" data-testid="earth-moon-compact" />;
  }
  if (id === 'jupiter') {
    return <ellipse cx={x + 3.5} cy={y + 2} rx="3" ry="1.8" fill="#dc2626" opacity="0.85" />;
  }
  if (id === 'saturn') {
    return (
      <ellipse
        cx={x}
        cy={y}
        rx="18"
        ry="4.5"
        fill="none"
        stroke="#fde68a"
        strokeWidth="2"
        opacity="0.85"
        transform={`rotate(-15 ${x} ${y})`}
      />
    );
  }
  if (id === 'uranus') {
    return (
      <ellipse
        cx={x}
        cy={y}
        rx="3"
        ry="11"
        fill="none"
        stroke="#a5f3fc"
        strokeWidth="1.2"
        opacity="0.7"
        transform={`rotate(20 ${x} ${y})`}
      />
    );
  }
  return null;
};

const renderArenaPlanetDetail = (id: string, x: number, y: number, elapsedSec: number) => {
  if (id === 'mercury') {
    return <circle cx={x - 1.5} cy={y - 1.5} r="1.4" fill="#64748b" opacity="0.75" />;
  }
  if (id === 'venus') {
    return (
      <path
        d={`M ${x - 6} ${y - 1} Q ${x} ${y - 4} ${x + 6} ${y}`}
        fill="none"
        stroke="#fef3c7"
        strokeWidth="1.4"
        opacity="0.65"
      />
    );
  }
  if (id === 'earth') {
    const moonAngle = ((elapsedSec / 4) * 360 * Math.PI) / 180;
    const mx = Number((x + 16 * Math.cos(moonAngle)).toFixed(2));
    const my = Number((y + 8 * Math.sin(moonAngle)).toFixed(2));
    return (
      <>
        <path
          d={`M ${x - 5} ${y - 5} Q ${x} ${y - 7} ${x + 2} ${y - 2} Q ${x + 1} ${y + 3} ${x - 4} ${y + 2} Z`}
          fill="#4ade80"
          opacity="0.9"
        />
        <path
          d={`M ${x + 2} ${y} Q ${x + 7} ${y + 1} ${x + 6} ${y + 5} Q ${x + 3} ${y + 7} ${x + 1} ${y + 3} Z`}
          fill="#22c55e"
          opacity="0.85"
        />
        <ellipse
          cx={x}
          cy={y}
          rx="16"
          ry="8"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="0.6"
          strokeDasharray="2 3"
          opacity="0.4"
        />
        <circle cx={mx} cy={my} r="3" fill="#e2e8f0" data-testid="earth-moon" />
      </>
    );
  }
  if (id === 'mars') {
    return (
      <>
        <ellipse cx={x} cy={y - 5.5} rx="3.5" ry="1.2" fill="#fef2f2" opacity="0.9" />
        <ellipse cx={x + 1.5} cy={y + 1.5} rx="3" ry="1.5" fill="#7f1d1d" opacity="0.55" />
      </>
    );
  }
  if (id === 'jupiter') {
    return (
      <>
        <ellipse
          cx={x + 6}
          cy={y + 5}
          rx="5.5"
          ry="3.2"
          fill="#dc2626"
          stroke="#fef08a"
          strokeWidth="0.7"
          opacity="0.9"
        />
        <circle cx={x - 24} cy={y - 5} r="2" fill="#fde047" opacity="0.85" />
        <circle cx={x + 25} cy={y + 4} r="2.3" fill="#e2e8f0" opacity="0.85" />
      </>
    );
  }
  if (id === 'saturn') {
    return (
      <>
        <ellipse
          cx={x}
          cy={y}
          rx="32"
          ry="8.5"
          fill="none"
          stroke="#fde68a"
          strokeWidth="3.2"
          opacity="0.85"
          transform={`rotate(-16 ${x} ${y})`}
        />
        <ellipse
          cx={x}
          cy={y}
          rx="25"
          ry="6.2"
          fill="none"
          stroke="#ca8a04"
          strokeWidth="1.3"
          opacity="0.75"
          transform={`rotate(-16 ${x} ${y})`}
        />
      </>
    );
  }
  if (id === 'uranus') {
    return (
      <ellipse
        cx={x}
        cy={y}
        rx="5"
        ry="20"
        fill="none"
        stroke="#a5f3fc"
        strokeWidth="1.8"
        opacity="0.75"
        transform={`rotate(22 ${x} ${y})`}
      />
    );
  }
  if (id === 'neptune') {
    return <ellipse cx={x - 3} cy={y - 1.5} rx="3.8" ry="2.2" fill="#1e3a8a" opacity="0.85" />;
  }
  if (id === 'pluto') {
    return (
      <>
        <circle cx={x + 1} cy={y + 1.5} r="2.2" fill="#f5f5f4" opacity="0.85" />
        <circle cx={x + 9.5} cy={y - 5} r="2.2" fill="#a8a29e" />
      </>
    );
  }
  return null;
};

const renderCompactSolarSystem = (elapsedSec: number) => (
  <g className="solar-system-compact" data-testid="solar-system-compact" data-animated="true">
    {SOLAR_PLANETS.map((p) => (
      <ellipse
        key={`orbit-compact-${p.id}`}
        cx={SUN_COMPACT.cx}
        cy={SUN_COMPACT.cy}
        rx={p.compactOrbitRx}
        ry={p.compactOrbitRy}
        fill="none"
        stroke={p.id === 'earth' ? '#38bdf8' : '#6366f1'}
        strokeWidth={p.id === 'earth' ? '0.9' : '0.65'}
        strokeDasharray={p.id === 'pluto' ? '2 4' : '3 4'}
        opacity={p.id === 'earth' ? '0.45' : '0.28'}
        data-orbit={p.id}
      />
    ))}

    <g className="solar-sun-compact" data-testid="solar-sun-compact">
      <circle cx={SUN_COMPACT.cx} cy={SUN_COMPACT.cy} r="26" fill="url(#solar-sun-glow)" />
      <circle cx={SUN_COMPACT.cx} cy={SUN_COMPACT.cy} r="15" fill="#fb923c" opacity="0.85" />
      <circle cx={SUN_COMPACT.cx} cy={SUN_COMPACT.cy} r="11.5" fill="#fde047" />
    </g>

    {SOLAR_PLANETS.map((p) => {
      const pos = computeOrbitPos({
        sunCx: SUN_COMPACT.cx,
        sunCy: SUN_COMPACT.cy,
        rx: p.compactOrbitRx,
        ry: p.compactOrbitRy,
        initialAngleDeg: p.initialAngleDeg,
        periodSec: p.periodSec,
        elapsedSec,
      });
      return (
        <g
          key={p.id}
          className="solar-planet-compact"
          data-planet={p.id}
          data-orbit-rx={p.compactOrbitRx}
          data-orbit-ry={p.compactOrbitRy}
          data-period-sec={p.periodSec}
          data-x={pos.x}
          data-y={pos.y}
        >
          <circle cx={pos.x} cy={pos.y} r={p.compactR} fill={`url(#planet-${p.id})`} />
          {renderCompactPlanetDetail(p.id, pos.x, pos.y, elapsedSec)}
        </g>
      );
    })}
  </g>
);

const renderArenaSolarSystem = (elapsedSec: number) => {
  const pulseR = 54 + 4 * Math.sin(elapsedSec * 2.2);
  return (
    <g className="solar-system-panorama" data-testid="solar-system-panorama" data-animated="true">
      {/* Heliocentric Elliptical Orbits */}
      <g className="solar-orbits" data-testid="solar-orbits">
        {SOLAR_PLANETS.map((p) => (
          <ellipse
            key={`orbit-${p.id}`}
            cx={SUN_ARENA.cx}
            cy={SUN_ARENA.cy}
            rx={p.orbitRx}
            ry={p.orbitRy}
            fill="none"
            stroke={
              p.id === 'earth'
                ? '#38bdf8'
                : p.id === 'jupiter' || p.id === 'saturn'
                  ? '#818cf8'
                  : '#6366f1'
            }
            strokeWidth={p.id === 'earth' ? '1.2' : '0.9'}
            strokeDasharray={p.id === 'pluto' ? '3 6' : '5 5'}
            opacity={p.id === 'earth' ? '0.45' : '0.28'}
            data-orbit={p.id}
          />
        ))}
      </g>

      {/* Revolving Asteroid Belt Ring between Mars (136x56) and Jupiter (178x74) */}
      <g className="asteroid-belt" data-testid="asteroid-belt" opacity="0.7">
        {ASTEROID_NODES.map((node) => {
          const pos = computeOrbitPos({
            sunCx: SUN_ARENA.cx,
            sunCy: SUN_ARENA.cy,
            rx: 157 + node.rxOffset,
            ry: 65 + node.ryOffset,
            initialAngleDeg: node.baseAngleDeg,
            periodSec: 30,
            elapsedSec,
          });
          return (
            <circle
              key={`asteroid-${node.idx}`}
              cx={pos.x}
              cy={pos.y}
              r={node.r}
              fill={node.fill}
            />
          );
        })}
      </g>

      {/* Central Heliocentric Sun */}
      <g
        className="solar-sun"
        data-testid="solar-sun"
        data-cx={SUN_ARENA.cx}
        data-cy={SUN_ARENA.cy}
      >
        <circle
          cx={SUN_ARENA.cx}
          cy={SUN_ARENA.cy}
          r={Number(pulseR.toFixed(2))}
          fill="url(#solar-sun-glow)"
        />
        <circle cx={SUN_ARENA.cx} cy={SUN_ARENA.cy} r="28" fill="#fb923c" opacity="0.88" />
        <circle cx={SUN_ARENA.cx} cy={SUN_ARENA.cy} r="21" fill="#fde047" />
        <circle cx={SUN_ARENA.cx - 6} cy={SUN_ARENA.cy - 6} r="7" fill="#fef9c3" opacity="0.65" />
        <text
          x={SUN_ARENA.cx}
          y={SUN_ARENA.cy + 38}
          textAnchor="middle"
          fill="#fef08a"
          fontSize="9"
          fontWeight="700"
          opacity="0.95"
        >
          SUN
        </text>
      </g>

      {/* Revolving Planets along Heliocentric Orbits */}
      {SOLAR_PLANETS.map((p) => {
        const pos = computeOrbitPos({
          sunCx: SUN_ARENA.cx,
          sunCy: SUN_ARENA.cy,
          rx: p.orbitRx,
          ry: p.orbitRy,
          initialAngleDeg: p.initialAngleDeg,
          periodSec: p.periodSec,
          elapsedSec,
        });
        return (
          <g
            key={p.id}
            className="solar-planet"
            data-planet={p.id}
            data-orbit-rx={p.orbitRx}
            data-orbit-ry={p.orbitRy}
            data-period-sec={p.periodSec}
            data-x={pos.x}
            data-y={pos.y}
          >
            <circle cx={pos.x} cy={pos.y} r={p.r} fill={`url(#planet-${p.id})`} />
            {renderArenaPlanetDetail(p.id, pos.x, pos.y, elapsedSec)}
            <text
              x={pos.x}
              y={pos.y + p.r + 11}
              textAnchor="middle"
              fill={p.labelColor}
              fontSize={p.bold ? '9' : '8'}
              fontWeight={p.bold ? '700' : '600'}
            >
              {p.name}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const BANNER_PALETTES: Record<string, [string, string]> = {
  castle_banner_dragon_fire: ['#ea580c', '#facc15'],
  castle_banner_pegasus: ['#6366f1', '#c7d2fe'],
  castle_banner_phoenix: ['#dc2626', '#f59e0b'],
  castle_banner_griffin: ['#047857', '#e2e8f0'],
  castle_banner_celestial_star: ['#312e81', '#38bdf8'],
  castle_banner_infinite_crown: ['#ca8a04', '#fef08a'],
};

export const RangeBackdrop: React.FC<RangeBackdropProps> = ({
  areaId,
  equippedBanner = 'castle_banner_royal_lion',
  equippedStatue = 'castle_statue_none',
  equippedGround = 'castle_ground_classic_lawn',
  variant = 'arena',
}) => {
  const area = getWorldArea(areaId);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec((prev) => Number((prev + 0.05).toFixed(3)));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const [bannerLeft, bannerRight] = BANNER_PALETTES[equippedBanner] ?? ['#2563eb', '#dc2626'];

  const isCompact = variant === 'compact';

  return (
    <div
      className={`range-backdrop-container area-${areaId} variant-${variant}`}
      data-testid="range-backdrop"
      data-area={areaId}
      data-banner={equippedBanner}
      data-statue={equippedStatue}
      data-ground={equippedGround}
      data-variant={variant}
      aria-hidden="true"
    >
      {/* ========================================================================= */}
      {/* 1. CASTLE COURTYARD BACKDROP                                              */}
      {/* ========================================================================= */}
      {areaId === 'castle' && (
        <svg
          className="range-backdrop-svg castle-backdrop"
          viewBox={isCompact ? '0 0 600 180' : '0 0 600 500'}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="castle-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#f0f9ff" />
            </linearGradient>
            <linearGradient id="castle-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="castle-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
          </defs>

          {isCompact ? (
            /* COMPACT MODE (180h) */
            <>
              {/* Sky */}
              <rect x="0" y="0" width="600" height="180" fill="url(#castle-sky)" />
              <CartographicLayer areaId={areaId} variant="compact" />
              {/* Castle parapets */}
              <CastleTower x={40} baseY={122} width={100} height={54} uid="castle-compact-l" />
              <CastleTower
                x={460}
                baseY={122}
                width={100}
                height={54}
                uid="castle-compact-r"
                flipped
              />

              {/* Statues on Towers */}
              {renderBackdropStatues(equippedStatue, true)}

              {/* Banners & Pennants */}
              {renderBackdropBanners(bannerLeft, bannerRight, true, '#334155')}

              {/* Stone Wall */}
              <rect x="0" y="115" width="600" height="25" fill="#64748b" opacity="0.4" />

              {/* Grass Field */}
              <GrassField y={135} height={45} uid="grass-compact" seed={11} />

              {/* Ground Decorations */}
              {renderBackdropGround(equippedGround, true)}
            </>
          ) : (
            /* FULL ARENA MODE (500h) */
            <>
              {/* Sky spanning the view */}
              <rect x="0" y="0" width="600" height="500" fill="url(#castle-sky)" />
              <CartographicLayer areaId={areaId} variant="arena" />

              {/* Distant Clouds */}
              <path
                d="M 50 40 Q 75 25 110 35 T 160 40 Q 180 28 210 35 T 260 42 Z"
                fill="#ffffff"
                opacity="0.35"
              />
              <path
                d="M 360 30 Q 390 18 430 25 T 480 32 Q 510 20 540 28 T 580 36 Z"
                fill="#ffffff"
                opacity="0.3"
              />

              {/* Distant Connecting Castle Wall & Battlements across center */}
              <rect
                x="100"
                y="240"
                width="400"
                height="140"
                fill="url(#castle-wall)"
                opacity="0.35"
              />
              <ShadeOverlay
                x={100}
                y={240}
                width={400}
                height={140}
                uid="castle-wall-shade"
                strength={0.5}
              />
              <path
                d="M 120 240 L 120 225 L 140 225 L 140 240 L 170 240 L 170 225 L 190 225 L 190 240 L 220 240 L 220 225 L 240 225 L 240 240 L 360 240 L 360 225 L 380 225 L 380 240 L 410 240 L 410 225 L 430 225 L 430 240 L 460 240 L 460 225 L 480 225 L 480 240 Z"
                fill="url(#castle-wall)"
                opacity="0.45"
              />

              {/* Left Grand Bastion Tower (x: 20 to 140, y: 70 to 380) */}
              <CastleTower x={25} baseY={380} width={115} height={310} uid="castle-arena-l" />
              {/* Right Grand Bastion Tower (x: 460 to 580, y: 70 to 380) */}
              <CastleTower
                x={460}
                baseY={380}
                width={115}
                height={310}
                uid="castle-arena-r"
                flipped
              />

              {/* Banners & Pennants flanking the Arena */}
              {renderBackdropBanners(bannerLeft, bannerRight, false, '#334155')}

              {/* Statues on Towers / Battlements */}
              {renderBackdropStatues(equippedStatue, false)}

              {/* Stone Wall Trim */}
              <rect x="0" y="355" width="600" height="25" fill="#64748b" opacity="0.4" />

              {/* Grass Field Courtyard (y: 380 to 500) */}
              <GrassField y={380} height={120} uid="grass-arena" seed={23} />

              {/* Ground Decorations spanning the ground */}
              {renderBackdropGround(equippedGround, false)}
            </>
          )}
        </svg>
      )}

      {/* ========================================================================= */}
      {/* 2. FIRE VILLAGE / EMBER RIDGE BACKDROP                                    */}
      {/* ========================================================================= */}
      {areaId === 'fire_area' && (
        <svg
          className="range-backdrop-svg fire-backdrop"
          viewBox={isCompact ? '0 0 600 180' : '0 0 600 500'}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="fire-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e1b4a" />
              <stop offset="45%" stopColor="#4c1d95" />
              <stop offset="78%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
            <linearGradient id="volcano-rock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#431407" />
              <stop offset="100%" stopColor="#1c0702" />
            </linearGradient>
            <linearGradient id="lava-glow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="1" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {isCompact ? (
            <>
              <rect x="0" y="0" width="600" height="180" fill="url(#fire-sky)" />
              <CartographicLayer areaId={areaId} variant="compact" />
              <polygon points="0,130 90,65 190,130" fill="url(#volcano-rock)" opacity="0.75" />
              <polygon points="140,130 260,50 380,130" fill="url(#volcano-rock)" opacity="0.9" />
              <polygon points="340,130 460,60 570,130" fill="url(#volcano-rock)" opacity="0.8" />
              <polygon points="248,50 272,50 268,62 252,62" fill="#fdba74" />
              <circle cx="120" cy="80" r="2.5" fill="#fef08a" opacity="0.8" />
              <circle cx="180" cy="55" r="2" fill="#fed7aa" opacity="0.7" />
              <circle cx="270" cy="40" r="3" fill="#fef08a" opacity="0.9" />
              <circle cx="390" cy="70" r="2" fill="#f97316" opacity="0.8" />
              <circle cx="480" cy="50" r="2.5" fill="#fef08a" opacity="0.75" />

              {/* Festival village on the slopes, after the reference image */}
              <PagodaHall x={210} baseY={166} width={160} tiers={3} uid="pagoda-c" seed={5} />
              <FireHut x={70} baseY={158} width={36} uid="fire-hut-c1" seed={5} />
              <FireHut x={482} baseY={162} width={32} uid="fire-hut-c2" seed={9} />
              <FireChimney x={82} baseY={138} height={12} uid="fire-chim-c1" />
              <LanternString x1={0} y1={150} x2={210} y2={150} uid="lantern-c1" />
              <LanternString x1={380} y1={152} x2={600} y2={150} uid="lantern-c2" />
              <FireTorch x={40} baseY={170} height={30} uid="fire-torch-c1" />
              <FireTorch x={556} baseY={170} height={30} uid="fire-torch-c2" />
              <Fireworks y={110} seed={29} />

              {/* Promontory & Statues */}
              {renderBackdropStatues(equippedStatue, true)}

              {/* Flanking Standards */}
              {renderBackdropBanners(bannerLeft, bannerRight, true, '#292524')}

              {/* Ground & Lava Veins */}
              <AshGround y={130} height={50} uid="ash-compact" seed={4} />

              {/* Tournament Platform Customization */}
              {renderBackdropGround(equippedGround, true)}
            </>
          ) : (
            <>
              {/* Sky spanning the view */}
              <rect x="0" y="0" width="600" height="500" fill="url(#fire-sky)" />
              <CartographicLayer areaId={areaId} variant="arena" />
              {/* Distant Volcanic peaks */}
              <polygon points="0,380 90,140 210,380" fill="url(#volcano-rock)" opacity="0.7" />
              <polygon points="130,380 270,110 410,380" fill="url(#volcano-rock)" opacity="0.85" />
              <polygon points="340,380 480,130 600,380" fill="url(#volcano-rock)" opacity="0.75" />
              {/* Towering Volcanic Crags on left and right */}
              <polygon points="0,380 0,90 45,70 85,180 130,380" fill="url(#volcano-rock)" />
              <polygon points="470,380 515,180 555,70 600,90 600,380" fill="url(#volcano-rock)" />
              <ShadeOverlay
                x={0}
                y={70}
                width={130}
                height={310}
                uid="fire-cliff-l"
                clipPoints="0,380 0,90 45,70 85,180 130,380"
                strength={0.7}
              />
              <ShadeOverlay
                x={470}
                y={70}
                width={130}
                height={310}
                uid="fire-cliff-r"
                clipPoints="470,380 515,180 555,70 600,90 600,380"
                strength={0.7}
              />
              {/* Glowing caldera crater */}
              <polygon points="256,110 284,110 280,126 260,126" fill="#fdba74" />
              {/* Rising ember sparks across the sky */}
              <circle cx="120" cy="180" r="3" fill="#fef08a" opacity="0.8" />
              <circle cx="180" cy="120" r="2.5" fill="#fed7aa" opacity="0.7" />
              <circle cx="270" cy="80" r="3.5" fill="#fef08a" opacity="0.9" />
              <circle cx="330" cy="65" r="2.5" fill="#fed7aa" opacity="0.85" />
              <circle cx="390" cy="140" r="2.5" fill="#f97316" opacity="0.8" />
              <circle cx="480" cy="110" r="3" fill="#fef08a" opacity="0.75" />
              <circle cx="90" cy="260" r="2.5" fill="#fef08a" opacity="0.75" />
              <circle cx="510" cy="240" r="3" fill="#f97316" opacity="0.85" />
              {/* Festival village among the crags, after the reference image */}
              <PagodaHall x={200} baseY={452} width={220} tiers={4} uid="pagoda-a" seed={17} />
              <PagodaHall x={30} baseY={470} width={120} tiers={2} uid="pagoda-a-l" seed={12} />
              <PagodaHall x={450} baseY={468} width={120} tiers={2} uid="pagoda-a-r" seed={21} />
              <FireChimney x={60} baseY={430} height={18} uid="fire-chim-a1" />
              <FireChimney x={540} baseY={428} height={16} uid="fire-chim-a3" />
              <LanternString x1={0} y1={430} x2={200} y2={430} uid="lantern-a1" />
              <LanternString x1={420} y1={430} x2={600} y2={430} uid="lantern-a2" />
              <LanternString x1={160} y1={330} x2={440} y2={330} uid="lantern-a3" />
              <FireTorch x={120} baseY={470} height={48} uid="fire-torch-a1" />
              <FireTorch x={300} baseY={485} height={52} uid="fire-torch-a2" />
              <FireTorch x={560} baseY={472} height={46} uid="fire-torch-a3" />
              <FireBanner x={255} baseY={480} height={86} uid="fire-banner-a1" tone="ember" />
              <FireBanner x={430} baseY={490} height={74} uid="fire-banner-a2" tone="gold" />
              {/* Drifting embers above the lava veins */}
              <EmberField y={380} height={120} seed={31} />
              {/* Festival fireworks in the night sky */}
              <Fireworks y={360} seed={37} />
              {/* Basalt Promontory & Monument Statues */}
              {renderCenterPromontory(equippedStatue, false, '#431407', '#ea580c')}
              {renderBackdropStatues(equippedStatue, false)}
              {/* Flanking Standards */}
              {renderBackdropBanners(bannerLeft, bannerRight, false, '#292524')}
              {/* Lava crack ground (y: 380 to 500) */}
              <AshGround y={380} height={120} uid="ash-arena" seed={8} />{' '}
              <path
                d="M 0 410 Q 150 395 300 415 T 600 405"
                stroke="url(#lava-glow)"
                strokeWidth="5"
                fill="none"
              />
              <path
                d="M 0 455 Q 200 440 360 465 T 600 450"
                stroke="url(#lava-glow)"
                strokeWidth="3.5"
                fill="none"
                opacity="0.8"
              />
              {/* Tournament Platform Customization */}
              {renderBackdropGround(equippedGround, false)}
            </>
          )}
        </svg>
      )}

      {/* ========================================================================= */}
      {/* 3. ICE KINGDOM / FROSTED GLADE BACKDROP                                   */}
      {/* ========================================================================= */}
      {areaId === 'ice_area' && (
        <svg
          className="range-backdrop-svg ice-backdrop"
          viewBox={isCompact ? '0 0 600 180' : '0 0 600 500'}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="ice-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1d2e" />
              <stop offset="45%" stopColor="#164e63" />
              <stop offset="78%" stopColor="#38bdf8" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#8fc6e8" />
            </linearGradient>
            <linearGradient id="ice-spire" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="50%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {isCompact ? (
            <>
              <rect x="0" y="0" width="600" height="180" fill="url(#ice-sky)" />
              <CartographicLayer areaId={areaId} variant="compact" />
              <polygon points="50,130 90,45 130,130" fill="url(#ice-spire)" opacity="0.8" />
              <polygon points="80,130 110,60 140,130" fill="#bae6fd" opacity="0.6" />
              <polygon points="450,130 500,40 540,130" fill="url(#ice-spire)" opacity="0.85" />
              <polygon points="490,130 525,55 560,130" fill="#bae6fd" opacity="0.6" />

              {/* Ice-crystal bursts over the citadel, after the reference image */}
              <IceSparkles y={110} seed={23} />

              {/* Frozen citadel rising behind the range, after the reference image */}
              <IceCitadel x={220} baseY={166} width={160} tiers={3} uid="citadel-c" seed={5} />
              <IceTower x={70} baseY={158} width={34} uid="ice-tower-c1" seed={5} />
              <IceTower x={488} baseY={162} width={30} uid="ice-tower-c2" seed={9} />
              <FrostLightString x1={0} y1={148} x2={210} y2={148} uid="frost-lights-c1" />
              <FrostLightString x1={390} y1={150} x2={600} y2={148} uid="frost-lights-c2" />
              <FrostBrazier x={40} baseY={170} height={30} uid="frost-brazier-c1" />
              <FrostBrazier x={556} baseY={170} height={30} uid="frost-brazier-c2" />

              {/* Glacial Promontory & Statues */}
              {renderCenterPromontory(equippedStatue, true, '#e0f2fe', '#38bdf8')}
              {renderBackdropStatues(equippedStatue, true)}

              {/* Flanking Standards */}
              {renderBackdropBanners(bannerLeft, bannerRight, true, '#94a3b8')}

              {/* Ground & Snow Drifts */}
              <FrostGround y={130} height={50} uid="frost-compact" seed={4} />

              {/* Tournament Platform Customization */}
              {renderBackdropGround(equippedGround, true)}
            </>
          ) : (
            <>
              {/* Sky spanning the view */}
              <rect x="0" y="0" width="600" height="500" fill="url(#ice-sky)" />
              <CartographicLayer areaId={areaId} variant="arena" />

              {/* Distant Glacial Mountains */}
              <polygon points="60,380 180,160 300,380" fill="#bae6fd" opacity="0.5" />
              <polygon points="260,380 390,140 520,380" fill="#bae6fd" opacity="0.45" />

              {/* Towering Glacial Ice Spires flanking the Arena */}
              <polygon points="20,380 70,80 120,380" fill="url(#ice-spire)" opacity="0.85" />
              <polygon points="65,380 100,130 140,380" fill="#bae6fd" opacity="0.65" />
              <polygon points="460,380 500,130 535,380" fill="#bae6fd" opacity="0.65" />
              <polygon points="480,380 530,80 580,380" fill="url(#ice-spire)" opacity="0.85" />
              <ShadeOverlay
                x={20}
                y={80}
                width={120}
                height={300}
                uid="ice-spire-l"
                clipPoints="20,380 70,80 120,380"
                strength={0.6}
              />
              <ShadeOverlay
                x={480}
                y={80}
                width={100}
                height={300}
                uid="ice-spire-r"
                clipPoints="480,380 530,80 580,380"
                strength={0.6}
              />

              {/* Frozen citadel among the spires, after the reference image */}
              <IceCitadel x={195} baseY={452} width={210} tiers={4} uid="citadel-a" seed={17} />
              <IceTower x={35} baseY={468} width={56} uid="ice-tower-a1" seed={12} />
              <IceTower x={505} baseY={466} width={54} uid="ice-tower-a2" seed={21} />
              <FrostLightString x1={0} y1={428} x2={200} y2={428} uid="frost-lights-a1" />
              <FrostLightString x1={410} y1={428} x2={600} y2={428} uid="frost-lights-a2" />
              <FrostLightString x1={160} y1={330} x2={440} y2={330} uid="frost-lights-a3" />
              <FrostBrazier x={120} baseY={470} height={48} uid="frost-brazier-a1" />
              <FrostBrazier x={300} baseY={485} height={52} uid="frost-brazier-a2" />
              <FrostBrazier x={560} baseY={472} height={46} uid="frost-brazier-a3" />
              {/* Ice-crystal bursts in the night sky */}
              <IceSparkles y={360} seed={41} />

              {/* Glacial Promontory & Statues */}
              {renderCenterPromontory(equippedStatue, false, '#e0f2fe', '#38bdf8')}
              {renderBackdropStatues(equippedStatue, false)}

              {/* Flanking Standards */}
              {renderBackdropBanners(bannerLeft, bannerRight, false, '#94a3b8')}

              {/* Snow field Ground (y: 380 to 500) */}
              <FrostGround y={380} height={120} uid="frost-arena" seed={8} />

              {/* Tournament Platform Customization */}
              {renderBackdropGround(equippedGround, false)}
            </>
          )}
        </svg>
      )}

      {/* ========================================================================= */}
      {/* 4. WIND TEMPLE / ZEPHYR PLATEAU BACKDROP                                  */}
      {/* ========================================================================= */}
      {areaId === 'wind_area' && (
        <svg
          className="range-backdrop-svg wind-backdrop"
          viewBox={isCompact ? '0 0 600 180' : '0 0 600 500'}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wind-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7fa39b" />
              <stop offset="40%" stopColor="#a9c4bb" />
              <stop offset="72%" stopColor="#dfe7da" />
              <stop offset="100%" stopColor="#f2efe0" />
            </linearGradient>
            <linearGradient id="temple-pillars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#115e59" />
            </linearGradient>
          </defs>

          {isCompact ? (
            <>
              <rect x="0" y="0" width="600" height="180" fill="url(#wind-sky)" />
              <CartographicLayer areaId={areaId} variant="compact" />
              {/* Floating island foot with drifting stones and clouds */}
              <CloudBank cx={70} cy={56} scale={0.55} uid="cloud-compact-l" />
              <CloudBank cx={540} cy={70} scale={0.5} uid="cloud-compact-r" />
              <FloatingStone cx={40} cy={96} r={5} seed={11} />
              <FloatingStone cx={566} cy={110} r={4} seed={13} />
              <WindSparkles y={80} seed={23} />

              {/* Forested temple mound, after the reference image */}
              <polygon
                points="60,180 140,86 260,120 340,78 470,124 560,180"
                fill="#365314"
                opacity="0.9"
              />
              <circle cx="150" cy="118" r="26" fill="#4d7c0f" />
              <circle cx="330" cy="102" r="30" fill="#4d7c0f" />
              <circle cx="450" cy="126" r="24" fill="#3f6212" />
              <circle cx="240" cy="128" r="20" fill="#65a30d" />
              <circle cx="392" cy="128" r="18" fill="#65a30d" />
              <TempleHall x={236} baseY={160} width={128} tiers={3} uid="hall-compact" seed={7} />
              <PrayerFlagString x1={90} y1={128} x2={230} y2={130} uid="flags-compact-l" />
              <PrayerFlagString x1={372} y1={130} x2={510} y2={126} uid="flags-compact-r" />
              <IncenseBrazier x={210} baseY={166} height={18} uid="brazier-compact-l" />
              <IncenseBrazier x={392} baseY={166} height={18} uid="brazier-compact-r" />
              <CloudBank cx={120} cy={44} scale={0.4} uid="cloud-compact-h" />

              {/* Sky Temple Dais & Statues */}
              {renderCenterPromontory(equippedStatue, true, '#115e59', '#2dd4bf')}
              {renderBackdropStatues(equippedStatue, true)}

              {/* Flanking Standards */}
              {renderBackdropBanners(bannerLeft, bannerRight, true, '#0d9488')}

              {/* Jade terrace ground */}
              <ZephyrGround y={130} height={50} uid="zephyr-compact" seed={5} />

              {/* Tournament Platform Customization */}
              {renderBackdropGround(equippedGround, true)}
            </>
          ) : (
            <>
              {/* Sky spanning the view */}
              <rect x="0" y="0" width="600" height="500" fill="url(#wind-sky)" />
              <CartographicLayer areaId={areaId} variant="arena" />

              {/* Zephyr trails in the high sky */}
              <path
                d="M 30 80 Q 90 40 160 80 T 260 80"
                stroke="#e8ede0"
                strokeWidth="2.5"
                strokeDasharray="10 8"
                fill="none"
                opacity="0.7"
              />
              <path
                d="M 380 64 Q 450 34 520 60"
                stroke="#e8ede0"
                strokeWidth="2"
                strokeDasharray="8 6"
                fill="none"
                opacity="0.6"
              />

              {/* Floating mountain: forested mass over the dark rock foot */}
              <path
                d="M 40 500 Q 80 420 60 340 Q 90 250 150 200 L 430 500 Z"
                fill="#292524"
                opacity="0.9"
              />
              <path
                d="M 90 380 Q 120 260 190 180 Q 260 110 340 100 Q 420 110 450 190 Q 470 280 470 380 L 470 500 L 90 500 Z"
                fill="#365314"
              />
              {/* Foliage billows catching the light */}
              <circle cx="150" cy="210" r="52" fill="#4d7c0f" />
              <circle cx="230" cy="150" r="58" fill="#4d7c0f" />
              <circle cx="330" cy="120" r="62" fill="#65a30d" />
              <circle cx="410" cy="170" r="50" fill="#4d7c0f" />
              <circle cx="120" cy="300" r="60" fill="#3f6212" />
              <circle cx="200" cy="260" r="64" fill="#4d7c0f" />
              <circle cx="300" cy="220" r="60" fill="#65a30d" />
              <circle cx="392" cy="260" r="54" fill="#3f6212" />
              <circle cx="150" cy="380" r="58" fill="#3f6212" />
              <circle cx="260" cy="330" r="62" fill="#4d7c0f" />
              <circle cx="370" cy="340" r="52" fill="#65a30d" />
              <circle cx="450" cy="380" r="46" fill="#3f6212" />
              {/* Stone stair climbing to the gates */}
              <path d="M 258 500 L 286 500 L 254 300 L 232 300 Z" fill="#d6d3d1" opacity="0.95" />
              {[500, 470, 440, 410, 380, 350, 320].map((sy, i) => (
                <line
                  key={`step${i}`}
                  x1={286 - (sy - 300) * 0.018}
                  y1={sy}
                  x2={254 - (sy - 300) * 0.017}
                  y2={sy}
                  stroke="#a8a29e"
                  strokeWidth="2"
                  opacity="0.85"
                />
              ))}

              {/* Tiered halls climbing toward the summit, after the reference image */}
              <TempleHall x={196} baseY={452} width={168} tiers={4} uid="hall-great" seed={9} />
              <TempleHall x={92} baseY={430} width={92} tiers={3} uid="hall-left" seed={12} />
              <TempleHall x={408} baseY={436} width={96} tiers={3} uid="hall-right" seed={17} />
              <TempleHall x={244} baseY={288} width={104} tiers={2} uid="hall-upper" seed={23} />
              <PrayerFlagString x1={0} y1={420} x2={196} y2={424} uid="flags-arena-l" />
              <PrayerFlagString x1={364} y1={424} x2={600} y2={418} uid="flags-arena-r" />
              <PrayerFlagString x1={160} y1={310} x2={440} y2={306} uid="flags-arena-high" />
              <IncenseBrazier x={130} baseY={474} height={44} uid="brazier-arena-l" />
              <IncenseBrazier x={470} baseY={474} height={44} uid="brazier-arena-r" />
              <IncenseBrazier x={300} baseY={496} height={52} uid="brazier-arena-c" />

              {/* Drifting clouds and shattered stones around the island */}
              <CloudBank cx={90} cy={130} scale={0.8} uid="cloud-a1" />
              <CloudBank cx={510} cy={92} scale={1} uid="cloud-a2" />
              <CloudBank cx={60} cy={330} scale={0.65} uid="cloud-a3" />
              <CloudBank cx={545} cy={300} scale={0.7} uid="cloud-a4" />
              <FloatingStone cx={38} cy={210} r={9} seed={5} />
              <FloatingStone cx={560} cy={200} r={7} seed={9} />
              <FloatingStone cx={520} cy={160} r={5} seed={14} />
              <FloatingStone cx={80} cy={160} r={6} seed={21} />
              <KiteGlider cx={498} cy={158} uid="kite-arena" />
              <WindSparkles y={340} seed={31} />

              {/* Sky Temple Dais & Statues */}
              {renderCenterPromontory(equippedStatue, false, '#115e59', '#2dd4bf')}
              {renderBackdropStatues(equippedStatue, false)}

              {/* Flanking Standards */}
              {renderBackdropBanners(bannerLeft, bannerRight, false, '#0d9488')}

              {/* High-altitude jade terrace (y: 380 to 500) */}
              <ZephyrGround y={380} height={120} uid="zephyr-arena" seed={8} />

              {/* Tournament Platform Customization */}
              {renderBackdropGround(equippedGround, false)}
            </>
          )}
        </svg>
      )}

      {/* ========================================================================= */}
      {/* 5. EARTH MOUNTAIN / STONE BASTION BACKDROP                                */}
      {/* ========================================================================= */}
      {areaId === 'earth_area' && (
        <svg
          className="range-backdrop-svg earth-backdrop"
          viewBox={isCompact ? '0 0 600 180' : '0 0 600 500'}
          preserveAspectRatio="none"
        >
          {isCompact ? (
            <>
              <EarthSky height={180} uid="earth-compact" />
              <CartographicLayer areaId={areaId} variant="compact" />
              <StormClouds y={46} seed={31} />
              <path
                d="M 0 126 Q 120 108 250 119 T 600 113 L 600 131 L 0 131 Z"
                fill="#3d4542"
                opacity="0.5"
              />
              <CragSpur
                x={-40}
                baseY={132}
                width={180}
                height={94}
                uid="earth-compact-l"
                seed={17}
              />
              <CragSpur
                x={468}
                baseY={132}
                width={186}
                height={104}
                uid="earth-compact-r"
                seed={19}
                flip
              />
              <CliffRuin x={448} baseY={124} width={96} uid="earth-compact-ruin" />
              <HeatherDrift y={110} height={16} seed={41} clumps={7} />

              {/* Granite Altar Dais & Statues */}
              {renderCenterPromontory(equippedStatue, true, '#5c635c', '#b8bfae')}
              {renderBackdropStatues(equippedStatue, true)}

              {/* Flanking Standards */}
              {renderBackdropBanners(bannerLeft, bannerRight, true, '#3d4542')}

              <EarthGround y={130} height={50} uid="earth-compact-ground" />

              {/* Tournament Platform Customization */}
              {renderBackdropGround(equippedGround, true)}
            </>
          ) : (
            <>
              {/* Storm-dusk sky spanning the view */}
              <EarthSky height={500} uid="earth-arena" />
              <CartographicLayer areaId={areaId} variant="arena" />
              <StormClouds y={158} seed={7} />
              <defs>
                <linearGradient id="earth-gorge-haze" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f2a3d" stopOpacity="0" />
                  <stop offset="100%" stopColor="#23292a" stopOpacity="0.72" />
                </linearGradient>
              </defs>
              <rect x="0" y="150" width="600" height="242" fill="url(#earth-gorge-haze)" />

              {/* Distant moor ridges behind the crags */}
              <path
                d="M 0 352 Q 110 302 240 330 T 600 312 L 600 392 L 0 392 Z"
                fill="#3d4542"
                opacity="0.4"
              />
              <path
                d="M 0 332 Q 150 294 320 326 T 600 316 L 600 392 L 0 392 Z"
                fill="#55633f"
                opacity="0.5"
              />
              <path
                d="M 0 372 Q 150 332 300 356 T 600 344 L 600 392 L 0 392 Z"
                fill="#23292a"
                opacity="0.5"
              />

              {/* Granite crags framing the gorge */}
              <CragSpur x={-70} baseY={392} width={330} height={260} uid="earth-crag-l" seed={11} />
              <CragSpur
                x={340}
                baseY={392}
                width={330}
                height={300}
                uid="earth-crag-r"
                seed={29}
                flip
              />
              <CliffRuin x={14} baseY={226} width={140} uid="earth-ruin" seed={9} />
              <CragSpur
                x={-30}
                baseY={392}
                width={180}
                height={126}
                uid="earth-crag-stub-l"
                seed={47}
              />
              <CragSpur
                x={462}
                baseY={392}
                width={170}
                height={104}
                uid="earth-crag-stub-r"
                seed={53}
                flip
              />
              <GorgeMist y={300} seed={23} />

              {/* Granite Altar Dais & Statues */}
              {renderCenterPromontory(equippedStatue, false, '#5c635c', '#b8bfae')}
              {renderBackdropStatues(equippedStatue, false)}

              {/* Flanking Standards */}
              {renderBackdropBanners(bannerLeft, bannerRight, false, '#3d4542')}

              {/* Rocky crag forecourt (y: 380 to 500) */}
              <EarthGround y={380} height={120} uid="earth-ground-main" />
              <HeatherDrift y={368} height={34} seed={13} clumps={14} />

              {/* Tournament Platform Customization */}
              {renderBackdropGround(equippedGround, false)}
            </>
          )}
        </svg>
      )}

      {/* ========================================================================= */}
      {/* 6. SPACE STATION / ORBITAL OBSERVATORY BACKDROP (SOLAR SYSTEM - 9 PLANETS) */}
      {/* ========================================================================= */}
      {areaId === 'space_area' && (
        <svg
          className="range-backdrop-svg space-backdrop"
          viewBox={isCompact ? '0 0 600 180' : '0 0 600 500'}
          preserveAspectRatio="none"
        >
          {renderSpaceDefs()}

          {isCompact ? (
            <>
              <StationSky height={180} uid="space-compact" />
              <CartographicLayer areaId={areaId} variant="compact" />
              <MilkyWay height={180} uid="space-milky-c" />
              <Starfield height={172} seed={61} count={30} />
              <CometTrail x={516} y={24} angle={-16} length={54} uid="space-comet-c" />
              <OrbitalRing cx={300} cy={70} rx={310} ry={52} modules={5} />
              {renderCompactSolarSystem(elapsedSec)}
              <StationSpire x={16} baseY={134} width={64} height={78} uid="space-spire-c-l" />
              <StationSpire x={520} baseY={134} width={64} height={78} uid="space-spire-c-r" flip />
              {renderCenterPromontory(equippedStatue, true, '#1e293b', '#818cf8')}
              {renderBackdropStatues(equippedStatue, true)}
              {renderBackdropBanners(bannerLeft, bannerRight, true, '#6366f1')}
              <OrbitalDeck y={130} height={50} uid="space-deck-compact" />
              {renderBackdropGround(equippedGround, true)}
            </>
          ) : (
            <>
              <StationSky height={500} uid="space-arena" />
              <CartographicLayer areaId={areaId} variant="arena" />
              <MilkyWay height={500} uid="space-milky-a" />
              <Starfield height={486} seed={97} count={115} />
              <CometTrail x={468} y={72} angle={-22} length={92} uid="space-comet-a1" />
              <CometTrail x={168} y={236} angle={14} length={46} uid="space-comet-a2" />
              <OrbitalRing cx={300} cy={210} rx={338} ry={152} modules={8} />
              {renderArenaSolarSystem(elapsedSec)}
              <StationSpire x={104} baseY={386} width={86} height={212} uid="space-spire-l" />
              <StationSpire x={410} baseY={386} width={86} height={212} uid="space-spire-r" flip />
              {renderCenterPromontory(equippedStatue, false, '#1e293b', '#818cf8')}
              {renderBackdropStatues(equippedStatue, false)}
              {renderBackdropBanners(bannerLeft, bannerRight, false, '#6366f1')}
              <OrbitalDeck y={380} height={120} uid="space-deck-arena" />
              {renderBackdropGround(equippedGround, false)}
            </>
          )}
        </svg>
      )}

      {/* Atmospheric Realm Banner Bar */}
      <div className="realm-banner-overlay" data-testid="realm-banner-overlay">
        <span className="realm-icon">{area.icon}</span>
        <span className="realm-name">{area.name}</span>
        <span className="realm-title">— {area.title}</span>
      </div>
    </div>
  );
};
