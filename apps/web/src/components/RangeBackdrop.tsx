import React from 'react';
import { type WorldAreaId, getWorldArea } from '@math-archer/learning-engine';

export interface RangeBackdropProps {
  areaId: WorldAreaId;
  equippedBanner?: string;
  equippedStatue?: string;
  equippedGround?: string;
  variant?: 'arena' | 'compact';
}

export const RangeBackdrop: React.FC<RangeBackdropProps> = ({
  areaId,
  equippedBanner = 'castle_banner_royal_lion',
  equippedStatue = 'castle_statue_none',
  equippedGround = 'castle_ground_classic_lawn',
  variant = 'arena',
}) => {
  const area = getWorldArea(areaId);

  // Banner colors
  let bannerLeft = '#2563eb';
  let bannerRight = '#dc2626';

  if (equippedBanner === 'castle_banner_dragon_fire') {
    bannerLeft = '#ea580c';
    bannerRight = '#facc15';
  } else if (equippedBanner === 'castle_banner_pegasus') {
    bannerLeft = '#6366f1';
    bannerRight = '#c7d2fe';
  } else if (equippedBanner === 'castle_banner_phoenix') {
    bannerLeft = '#dc2626';
    bannerRight = '#f59e0b';
  } else if (equippedBanner === 'castle_banner_griffin') {
    bannerLeft = '#047857';
    bannerRight = '#e2e8f0';
  } else if (equippedBanner === 'castle_banner_celestial_star') {
    bannerLeft = '#312e81';
    bannerRight = '#38bdf8';
  } else if (equippedBanner === 'castle_banner_infinite_crown') {
    bannerLeft = '#ca8a04';
    bannerRight = '#fef08a';
  }

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
              {/* Castle parapets */}
              <path
                d="M 40 120 L 40 70 L 60 70 L 60 80 L 80 80 L 80 70 L 100 70 L 100 80 L 120 80 L 120 70 L 140 70 L 140 120 Z"
                fill="url(#castle-wall)"
                opacity="0.8"
              />
              <path
                d="M 460 120 L 460 70 L 480 70 L 480 80 L 500 80 L 500 70 L 520 70 L 520 80 L 540 80 L 540 70 L 560 70 L 560 120 Z"
                fill="url(#castle-wall)"
                opacity="0.8"
              />

              {/* Statues on Towers */}
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
                  <rect x="282" y="60" width="36" height="55" rx="4" fill="#f8fafc" stroke="#fbbf24" strokeWidth="2" />
                  <circle cx="300" cy="48" r="8" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
                  <circle cx="300" cy="48" r="12" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="310" y1="42" x2="322" y2="34" stroke="#38bdf8" strokeWidth="2" />
                </g>
              )}

              {/* Banners & Pennants */}
              <line x1="90" y1="70" x2="90" y2="45" stroke="#334155" strokeWidth="2" />
              <polygon points="90,45 115,54 90,63" fill={bannerLeft} />
              <line x1="510" y1="70" x2="510" y2="45" stroke="#334155" strokeWidth="2" />
              <polygon points="510,45 535,54 510,63" fill={bannerRight} />

              {/* Stone Wall */}
              <rect x="0" y="115" width="600" height="25" fill="#64748b" opacity="0.4" />

              {/* Grass Field */}
              <rect x="0" y="135" width="600" height="45" fill="url(#castle-grass)" />
              <line x1="0" y1="135" x2="600" y2="135" stroke="#22c55e" strokeWidth="2" />

              {/* Ground Decorations */}
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
                  <rect x="0" y="135" width="600" height="45" fill="#1e293b" />
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
                  <rect x="0" y="135" width="600" height="45" fill="#0f172a" />
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
                  <rect x="0" y="135" width="600" height="45" fill="#f8fafc" />
                  <line x1="0" y1="135" x2="600" y2="135" stroke="#ca8a04" strokeWidth="2.5" />
                  <line x1="0" y1="155" x2="600" y2="155" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="10 5" />
                </g>
              )}

              {equippedGround === 'castle_ground_starfall_mosaic' && (
                <g className="castle-starfall-mosaic-ground" data-testid="ground-starfall">
                  <rect x="0" y="135" width="600" height="45" fill="#020617" />
                  <line x1="0" y1="135" x2="600" y2="135" stroke="#38bdf8" strokeWidth="2" />
                  <polygon points="120,140 123,148 115,143 125,143 117,148" fill="#fef08a" />
                  <polygon points="300,142 303,150 295,145 305,145 297,150" fill="#e0e7ff" />
                  <polygon points="480,140 483,148 475,143 485,143 477,148" fill="#fef08a" />
                </g>
              )}
            </>
          ) : (
            /* FULL ARENA MODE (500h) - Spans entire GameScreen view */
            <>
              {/* Sky spanning the view */}
              <rect x="0" y="0" width="600" height="500" fill="url(#castle-sky)" />

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
              <rect x="100" y="240" width="400" height="140" fill="url(#castle-wall)" opacity="0.35" />
              <path
                d="M 120 240 L 120 225 L 140 225 L 140 240 L 170 240 L 170 225 L 190 225 L 190 240 L 220 240 L 220 225 L 240 225 L 240 240 L 360 240 L 360 225 L 380 225 L 380 240 L 410 240 L 410 225 L 430 225 L 430 240 L 460 240 L 460 225 L 480 225 L 480 240 Z"
                fill="url(#castle-wall)"
                opacity="0.45"
              />

              {/* Left Grand Bastion Tower (x: 20 to 140, y: 70 to 380) */}
              <rect x="25" y="85" width="115" height="295" fill="url(#castle-wall)" />
              <path
                d="M 20 85 L 20 50 L 45 50 L 45 64 L 70 64 L 70 50 L 95 50 L 95 64 L 120 64 L 120 50 L 145 50 L 145 85 Z"
                fill="url(#castle-wall)"
              />
              <rect x="15" y="85" width="135" height="8" fill="#475569" />
              <rect x="72" y="140" width="14" height="42" rx="4" fill="#334155" />
              <rect x="72" y="220" width="14" height="42" rx="4" fill="#334155" />

              {/* Right Grand Bastion Tower (x: 460 to 580, y: 70 to 380) */}
              <rect x="460" y="85" width="115" height="295" fill="url(#castle-wall)" />
              <path
                d="M 455 85 L 455 50 L 480 50 L 480 64 L 505 64 L 505 50 L 530 50 L 530 64 L 555 64 L 555 50 L 580 50 L 580 85 Z"
                fill="url(#castle-wall)"
              />
              <rect x="450" y="85" width="135" height="8" fill="#475569" />
              <rect x="514" y="140" width="14" height="42" rx="4" fill="#334155" />
              <rect x="514" y="220" width="14" height="42" rx="4" fill="#334155" />

              {/* Banners & Pennants flanking the Arena */}
              {/* Left Tower Banner */}
              <line x1="82" y1="50" x2="82" y2="15" stroke="#334155" strokeWidth="2.5" />
              <polygon points="82,15 125,28 82,40" fill={bannerLeft} />
              <rect x="66" y="98" width="32" height="65" fill={bannerLeft} rx="2" opacity="0.9" />
              <polygon points="66,163 82,176 98,163" fill={bannerLeft} opacity="0.9" />

              {/* Right Tower Banner */}
              <line x1="518" y1="50" x2="518" y2="15" stroke="#334155" strokeWidth="2.5" />
              <polygon points="518,15 561,28 518,40" fill={bannerRight} />
              <rect x="502" y="98" width="32" height="65" fill={bannerRight} rx="2" opacity="0.9" />
              <polygon points="502,163 518,176 534,163" fill={bannerRight} opacity="0.9" />

              {/* Statues on Towers */}
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
                  <rect x="282" y="60" width="36" height="55" rx="4" fill="#cffafe" stroke="#06b6d4" strokeWidth="1.5" />
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
                  <rect x="288" y="55" width="24" height="60" fill="#fed7aa" stroke="#f97316" rx="2" strokeWidth="1.5" />
                  <circle cx="300" cy="44" r="7" fill="#ea580c" stroke="#c2410c" />
                  <polygon points="293,42 278,35 289,48" fill="#fb923c" />
                  <polygon points="307,42 322,35 311,48" fill="#fb923c" />
                </g>
              )}

              {equippedStatue === 'castle_statue_celestial_archon' && (
                <g className="castle-celestial-archon-statue" data-testid="statue-celestial-archon">
                  <rect x="280" y="55" width="40" height="60" rx="4" fill="#f8fafc" stroke="#fbbf24" strokeWidth="2" />
                  <circle cx="300" cy="42" r="9" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
                  <circle cx="300" cy="42" r="14" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
                  <line x1="312" y1="36" x2="326" y2="28" stroke="#38bdf8" strokeWidth="2.5" />
                </g>
              )}

              {/* Stone Wall Trim */}
              <rect x="0" y="355" width="600" height="25" fill="#64748b" opacity="0.4" />

              {/* Grass Field Courtyard (y: 380 to 500) */}
              <rect x="0" y="380" width="600" height="120" fill="url(#castle-grass)" />
              <line x1="0" y1="380" x2="600" y2="380" stroke="#22c55e" strokeWidth="3" />

              {/* Ground Decorations spanning the ground */}
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
                  <rect x="230" y="405" width="140" height="30" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                  <circle cx="300" cy="420" r="8" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
                  <circle cx="300" cy="420" r="4" fill="#ef4444" />
                </g>
              )}

              {equippedGround === 'castle_ground_obsidian_cobble' && (
                <g className="castle-obsidian-ground" data-testid="ground-obsidian">
                  <rect x="0" y="380" width="600" height="120" fill="#1e293b" />
                  <line x1="0" y1="380" x2="600" y2="380" stroke="#f97316" strokeWidth="3" />
                  <line x1="0" y1="420" x2="600" y2="420" stroke="#f97316" strokeWidth="1.5" opacity="0.6" />
                  <line x1="0" y1="460" x2="600" y2="460" stroke="#f97316" strokeWidth="1.5" opacity="0.6" />
                  <line x1="100" y1="380" x2="100" y2="500" stroke="#334155" strokeWidth="1.5" />
                  <line x1="200" y1="380" x2="200" y2="500" stroke="#334155" strokeWidth="1.5" />
                  <line x1="300" y1="380" x2="300" y2="500" stroke="#334155" strokeWidth="1.5" />
                  <line x1="400" y1="380" x2="400" y2="500" stroke="#334155" strokeWidth="1.5" />
                  <line x1="500" y1="380" x2="500" y2="500" stroke="#334155" strokeWidth="1.5" />
                </g>
              )}

              {equippedGround === 'castle_ground_enchanted_meadow' && (
                <g className="castle-enchanted-ground" data-testid="ground-enchanted">
                  <rect x="0" y="380" width="600" height="120" fill="#0f172a" />
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
                  <rect x="0" y="380" width="600" height="120" fill="#f8fafc" />
                  <line x1="0" y1="380" x2="600" y2="380" stroke="#ca8a04" strokeWidth="3.5" />
                  <line x1="0" y1="420" x2="600" y2="420" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="15 8" />
                  <line x1="0" y1="460" x2="600" y2="460" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="15 8" />
                </g>
              )}

              {equippedGround === 'castle_ground_starfall_mosaic' && (
                <g className="castle-starfall-mosaic-ground" data-testid="ground-starfall">
                  <rect x="0" y="380" width="600" height="120" fill="#020617" />
                  <line x1="0" y1="380" x2="600" y2="380" stroke="#38bdf8" strokeWidth="3" />
                  <polygon points="120,410 125,424 112,416 128,416 115,424" fill="#fef08a" />
                  <polygon points="300,415 305,429 292,421 308,421 295,429" fill="#e0e7ff" />
                  <polygon points="480,410 485,424 472,416 488,416 475,424" fill="#fef08a" />
                  <polygon points="210,450 215,464 202,456 218,456 205,464" fill="#38bdf8" />
                  <polygon points="390,450 395,464 382,456 398,456 385,464" fill="#fef08a" />
                </g>
              )}
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
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="40%" stopColor="#c2410c" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#fed7aa" />
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
              <polygon points="0,130 90,65 190,130" fill="url(#volcano-rock)" opacity="0.75" />
              <polygon points="140,130 260,50 380,130" fill="url(#volcano-rock)" opacity="0.9" />
              <polygon points="340,130 460,60 570,130" fill="url(#volcano-rock)" opacity="0.8" />
              <polygon points="248,50 272,50 268,62 252,62" fill="#fdba74" />
              <circle cx="120" cy="80" r="2.5" fill="#fef08a" opacity="0.8" />
              <circle cx="180" cy="55" r="2" fill="#fed7aa" opacity="0.7" />
              <circle cx="270" cy="40" r="3" fill="#fef08a" opacity="0.9" />
              <circle cx="390" cy="70" r="2" fill="#f97316" opacity="0.8" />
              <circle cx="480" cy="50" r="2.5" fill="#fef08a" opacity="0.75" />
              <rect x="0" y="130" width="600" height="50" fill="#290d05" />
              <path
                d="M 0 145 Q 150 140 300 146 T 600 144"
                stroke="url(#lava-glow)"
                strokeWidth="3"
                fill="none"
              />
            </>
          ) : (
            <>
              {/* Sky spanning the view */}
              <rect x="0" y="0" width="600" height="500" fill="url(#fire-sky)" />

              {/* Distant Volcanic peaks */}
              <polygon points="0,380 90,140 210,380" fill="url(#volcano-rock)" opacity="0.7" />
              <polygon points="130,380 270,110 410,380" fill="url(#volcano-rock)" opacity="0.85" />
              <polygon points="340,380 480,130 600,380" fill="url(#volcano-rock)" opacity="0.75" />

              {/* Towering Volcanic Crags on left and right */}
              <polygon points="0,380 0,90 45,70 85,180 130,380" fill="url(#volcano-rock)" />
              <polygon points="470,380 515,180 555,70 600,90 600,380" fill="url(#volcano-rock)" />

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

              {/* Lava crack ground (y: 380 to 500) */}
              <rect x="0" y="380" width="600" height="120" fill="#290d05" />
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
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="75%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#f0f9ff" />
            </linearGradient>
            <linearGradient id="ice-spire" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="50%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="snow-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>

          {isCompact ? (
            <>
              <rect x="0" y="0" width="600" height="180" fill="url(#ice-sky)" />
              <polygon points="50,130 90,45 130,130" fill="url(#ice-spire)" opacity="0.8" />
              <polygon points="80,130 110,60 140,130" fill="#bae6fd" opacity="0.6" />
              <polygon points="450,130 500,40 540,130" fill="url(#ice-spire)" opacity="0.85" />
              <polygon points="490,130 525,55 560,130" fill="#bae6fd" opacity="0.6" />
              <circle cx="80" cy="30" r="2.5" fill="#ffffff" opacity="0.9" />
              <circle cx="210" cy="50" r="3" fill="#ffffff" opacity="0.8" />
              <circle cx="340" cy="35" r="2" fill="#ffffff" opacity="0.95" />
              <circle cx="430" cy="65" r="2.5" fill="#ffffff" opacity="0.85" />
              <circle cx="560" cy="40" r="2" fill="#ffffff" opacity="0.8" />
              <path
                d="M 0 130 Q 150 120 300 130 T 600 128 L 600 180 L 0 180 Z"
                fill="url(#snow-ground)"
              />
              <line x1="0" y1="130" x2="600" y2="130" stroke="#e2e8f0" strokeWidth="2" />
            </>
          ) : (
            <>
              {/* Sky spanning the view */}
              <rect x="0" y="0" width="600" height="500" fill="url(#ice-sky)" />

              {/* Distant Glacial Mountains */}
              <polygon points="60,380 180,160 300,380" fill="#bae6fd" opacity="0.5" />
              <polygon points="260,380 390,140 520,380" fill="#bae6fd" opacity="0.45" />

              {/* Towering Glacial Ice Spires flanking the Arena */}
              <polygon points="20,380 70,80 120,380" fill="url(#ice-spire)" opacity="0.85" />
              <polygon points="65,380 100,130 140,380" fill="#bae6fd" opacity="0.65" />
              <polygon points="460,380 500,130 535,380" fill="#bae6fd" opacity="0.65" />
              <polygon points="480,380 530,80 580,380" fill="url(#ice-spire)" opacity="0.85" />

              {/* Sparkling Snowflakes across the sky */}
              <circle cx="80" cy="60" r="3" fill="#ffffff" opacity="0.9" />
              <circle cx="150" cy="110" r="2" fill="#ffffff" opacity="0.85" />
              <circle cx="210" cy="80" r="3.5" fill="#ffffff" opacity="0.8" />
              <circle cx="340" cy="55" r="2.5" fill="#ffffff" opacity="0.95" />
              <circle cx="410" cy="115" r="3" fill="#ffffff" opacity="0.85" />
              <circle cx="560" cy="65" r="2.5" fill="#ffffff" opacity="0.8" />
              <circle cx="90" cy="240" r="2.5" fill="#ffffff" opacity="0.75" />
              <circle cx="510" cy="220" r="3" fill="#ffffff" opacity="0.85" />

              {/* Snow field Ground (y: 380 to 500) */}
              <path
                d="M 0 380 Q 150 365 300 380 T 600 375 L 600 500 L 0 500 Z"
                fill="url(#snow-ground)"
              />
              <line x1="0" y1="380" x2="600" y2="380" stroke="#e2e8f0" strokeWidth="3" />
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
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="40%" stopColor="#14b8a6" />
              <stop offset="70%" stopColor="#5eead4" />
              <stop offset="100%" stopColor="#f0fdfa" />
            </linearGradient>
            <linearGradient id="temple-pillars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#115e59" />
            </linearGradient>
          </defs>

          {isCompact ? (
            <>
              <rect x="0" y="0" width="600" height="180" fill="url(#wind-sky)" />
              <path
                d="M 30 50 Q 80 30 140 50 T 220 50"
                stroke="#14b8a6"
                strokeWidth="2.5"
                strokeDasharray="8 6"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M 380 40 Q 440 25 500 45 T 580 40"
                stroke="#14b8a6"
                strokeWidth="2.5"
                strokeDasharray="8 6"
                fill="none"
                opacity="0.6"
              />
              <rect x="60" y="70" width="16" height="60" fill="url(#temple-pillars)" rx="2" />
              <rect x="100" y="70" width="16" height="60" fill="url(#temple-pillars)" rx="2" />
              <rect x="52" y="66" width="72" height="8" fill="#115e59" rx="2" />
              <rect x="480" y="70" width="16" height="60" fill="url(#temple-pillars)" rx="2" />
              <rect x="520" y="70" width="16" height="60" fill="url(#temple-pillars)" rx="2" />
              <rect x="472" y="66" width="72" height="8" fill="#115e59" rx="2" />
              <rect x="0" y="130" width="600" height="50" fill="#134e4a" />
              <rect x="0" y="130" width="600" height="6" fill="#2dd4bf" />
            </>
          ) : (
            <>
              {/* Sky spanning the view */}
              <rect x="0" y="0" width="600" height="500" fill="url(#wind-sky)" />

              {/* Wind vortex swirls across the sky */}
              <path
                d="M 30 80 Q 90 40 160 80 T 260 80"
                stroke="#14b8a6"
                strokeWidth="3.5"
                strokeDasharray="10 8"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M 340 70 Q 420 30 500 70 T 580 65"
                stroke="#14b8a6"
                strokeWidth="3.5"
                strokeDasharray="10 8"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M 60 210 Q 150 170 240 210"
                stroke="#14b8a6"
                strokeWidth="2.5"
                strokeDasharray="8 6"
                fill="none"
                opacity="0.4"
              />
              <path
                d="M 360 200 Q 450 160 540 200"
                stroke="#14b8a6"
                strokeWidth="2.5"
                strokeDasharray="8 6"
                fill="none"
                opacity="0.4"
              />

              {/* Sky Temple Colonnade Pillars flanking the Arena */}
              {/* Left Colonnade */}
              <rect x="40" y="130" width="22" height="250" fill="url(#temple-pillars)" rx="3" />
              <rect x="80" y="130" width="22" height="250" fill="url(#temple-pillars)" rx="3" />
              <rect x="30" y="120" width="82" height="14" fill="#115e59" rx="3" />

              {/* Right Colonnade */}
              <rect x="500" y="130" width="22" height="250" fill="url(#temple-pillars)" rx="3" />
              <rect x="540" y="130" width="22" height="250" fill="url(#temple-pillars)" rx="3" />
              <rect x="490" y="120" width="82" height="14" fill="#115e59" rx="3" />

              {/* High altitude stone terrace (y: 380 to 500) */}
              <rect x="0" y="380" width="600" height="120" fill="#134e4a" />
              <rect x="0" y="380" width="600" height="10" fill="#2dd4bf" />
              <line x1="100" y1="390" x2="100" y2="500" stroke="#0f766e" strokeWidth="2" />
              <line x1="200" y1="390" x2="200" y2="500" stroke="#0f766e" strokeWidth="2" />
              <line x1="300" y1="390" x2="300" y2="500" stroke="#0f766e" strokeWidth="2" />
              <line x1="400" y1="390" x2="400" y2="500" stroke="#0f766e" strokeWidth="2" />
              <line x1="500" y1="390" x2="500" y2="500" stroke="#0f766e" strokeWidth="2" />
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
          <defs>
            <linearGradient id="earth-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="70%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
            <linearGradient id="granite-peak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
            <linearGradient id="stone-monolith" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>

          {isCompact ? (
            <>
              <rect x="0" y="0" width="600" height="180" fill="url(#earth-sky)" />
              <polygon points="0,130 80,40 170,130" fill="url(#granite-peak)" opacity="0.9" />
              <polygon points="120,130 220,55 310,130" fill="url(#granite-peak)" opacity="0.8" />
              <polygon points="420,130 510,35 600,130" fill="url(#granite-peak)" opacity="0.9" />
              <rect
                x="60"
                y="90"
                width="18"
                height="40"
                fill="url(#stone-monolith)"
                transform="rotate(-4 60 90)"
                rx="3"
              />
              <rect
                x="510"
                y="85"
                width="20"
                height="45"
                fill="url(#stone-monolith)"
                transform="rotate(3 510 85)"
                rx="3"
              />
              <rect x="0" y="130" width="600" height="50" fill="#451a03" />
              <line x1="0" y1="130" x2="600" y2="130" stroke="#b45309" strokeWidth="3" />
            </>
          ) : (
            <>
              {/* Sky spanning the view */}
              <rect x="0" y="0" width="600" height="500" fill="url(#earth-sky)" />

              {/* Jagged Canyon peaks */}
              <polygon points="0,380 90,130 200,380" fill="url(#granite-peak)" opacity="0.85" />
              <polygon points="130,380 260,150 380,380" fill="url(#granite-peak)" opacity="0.75" />
              <polygon points="380,380 500,120 600,380" fill="url(#granite-peak)" opacity="0.85" />

              {/* Ancient Standing Monoliths flanking the Arena */}
              <rect
                x="45"
                y="140"
                width="28"
                height="240"
                fill="url(#stone-monolith)"
                transform="rotate(-3 45 140)"
                rx="4"
              />
              <rect
                x="85"
                y="180"
                width="24"
                height="200"
                fill="url(#stone-monolith)"
                transform="rotate(2 85 180)"
                rx="4"
              />
              <rect
                x="490"
                y="180"
                width="24"
                height="200"
                fill="url(#stone-monolith)"
                transform="rotate(-2 490 180)"
                rx="4"
              />
              <rect
                x="530"
                y="140"
                width="28"
                height="240"
                fill="url(#stone-monolith)"
                transform="rotate(3 530 140)"
                rx="4"
              />

              {/* Rocky canyon bedrock ground (y: 380 to 500) */}
              <rect x="0" y="380" width="600" height="120" fill="#451a03" />
              <line x1="0" y1="380" x2="600" y2="380" stroke="#b45309" strokeWidth="4" />
              <line x1="0" y1="420" x2="600" y2="420" stroke="#78350f" strokeWidth="2" strokeDasharray="20 10" />
              <line x1="0" y1="460" x2="600" y2="460" stroke="#78350f" strokeWidth="2" strokeDasharray="20 10" />
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
