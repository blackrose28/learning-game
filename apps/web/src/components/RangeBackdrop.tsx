import React from 'react';
import { type WorldAreaId, getWorldArea } from '@math-archer/learning-engine';

export interface RangeBackdropProps {
  areaId: WorldAreaId;
  equippedBanner?: string;
  equippedStatue?: string;
  equippedGround?: string;
}

export const RangeBackdrop: React.FC<RangeBackdropProps> = ({
  areaId,
  equippedBanner = 'castle_banner_royal_lion',
  equippedStatue = 'castle_statue_none',
  equippedGround = 'castle_ground_classic_lawn',
}) => {
  const area = getWorldArea(areaId);

  // Banner colors
  const bannerLeft =
    equippedBanner === 'castle_banner_dragon_fire'
      ? '#ea580c'
      : equippedBanner === 'castle_banner_pegasus'
        ? '#6366f1'
        : '#2563eb';
  const bannerRight =
    equippedBanner === 'castle_banner_dragon_fire'
      ? '#facc15'
      : equippedBanner === 'castle_banner_pegasus'
        ? '#c7d2fe'
        : '#dc2626';

  return (
    <div
      className={`range-backdrop-container area-${areaId}`}
      data-testid="range-backdrop"
      data-area={areaId}
      data-banner={equippedBanner}
      data-statue={equippedStatue}
      data-ground={equippedGround}
      aria-hidden="true"
    >
      {/* Castle Courtyard Backdrop */}
      {areaId === 'castle' && (
        <svg
          className="range-backdrop-svg castle-backdrop"
          viewBox="0 0 600 180"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="castle-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#eff6ff" />
            </linearGradient>
            <linearGradient id="castle-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id="castle-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
          </defs>
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
              {/* Left Gargoyle */}
              <path
                d="M 50 68 C 45 60 48 52 56 50 C 62 50 66 56 64 68 Z"
                fill="#475569"
                stroke="#334155"
                strokeWidth="1"
              />
              <polygon points="46,54 40,48 48,50" fill="#334155" />
              {/* Right Gargoyle */}
              <path
                d="M 544 68 C 540 60 542 52 550 50 C 556 50 560 56 558 68 Z"
                fill="#475569"
                stroke="#334155"
                strokeWidth="1"
              />
              <polygon points="562,54 568,48 560,50" fill="#334155" />
            </g>
          )}

          {equippedStatue === 'castle_statue_golden_archer' && (
            <g className="castle-golden-archer-statue" data-testid="statue-golden-archer">
              {/* Center Tower Archway & Hero Monument */}
              <rect x="285" y="65" width="30" height="50" rx="3" fill="#cbd5e1" stroke="#64748b" />
              <path d="M 285 65 Q 300 48 315 65 Z" fill="#94a3b8" />
              {/* Golden Archer Silhouette Statue */}
              <circle cx="300" cy="54" r="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
              <path d="M 296 59 L 304 59 L 306 74 L 294 74 Z" fill="#fbbf24" stroke="#d97706" />
              <line x1="304" y1="59" x2="312" y2="52" stroke="#b45309" strokeWidth="2" />
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
              {/* Rose bushes & blossoms along border */}
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
              {/* Champion Plinth with Golden Target Wreath */}
              <rect x="270" y="138" width="60" height="12" rx="2" fill="#e2e8f0" stroke="#94a3b8" />
              <circle cx="300" cy="144" r="4.5" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
              <circle cx="300" cy="144" r="2" fill="#ef4444" />
            </g>
          )}
        </svg>
      )}

      {/* Fire Village / Ember Ridge Backdrop */}
      {areaId === 'fire_area' && (
        <svg
          className="range-backdrop-svg fire-backdrop"
          viewBox="0 0 600 180"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="fire-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="60%" stopColor="#f97316" />
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
          {/* Sky */}
          <rect x="0" y="0" width="600" height="180" fill="url(#fire-sky)" />
          {/* Distant Volcanic peaks */}
          <polygon points="0,130 90,65 190,130" fill="url(#volcano-rock)" opacity="0.75" />
          <polygon points="140,130 260,50 380,130" fill="url(#volcano-rock)" opacity="0.9" />
          <polygon points="340,130 460,60 570,130" fill="url(#volcano-rock)" opacity="0.8" />
          {/* Glowing caldera crater */}
          <polygon points="248,50 272,50 268,62 252,62" fill="#fdba74" />
          {/* Rising ember sparks */}
          <circle cx="120" cy="80" r="2.5" fill="#fef08a" opacity="0.8" />
          <circle cx="180" cy="55" r="2" fill="#fed7aa" opacity="0.7" />
          <circle cx="270" cy="40" r="3" fill="#fef08a" opacity="0.9" />
          <circle cx="390" cy="70" r="2" fill="#f97316" opacity="0.8" />
          <circle cx="480" cy="50" r="2.5" fill="#fef08a" opacity="0.75" />
          {/* Lava crack ground */}
          <rect x="0" y="130" width="600" height="50" fill="#290d05" />
          <path
            d="M 0 145 Q 150 140 300 146 T 600 144"
            stroke="url(#lava-glow)"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      )}

      {/* Ice Kingdom / Frosted Glade Backdrop */}
      {areaId === 'ice_area' && (
        <svg
          className="range-backdrop-svg ice-backdrop"
          viewBox="0 0 600 180"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="ice-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="70%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#f0f9ff" />
            </linearGradient>
            <linearGradient id="ice-spire" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
            <linearGradient id="snow-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>
          {/* Sky */}
          <rect x="0" y="0" width="600" height="180" fill="url(#ice-sky)" />
          {/* Glacial ice spires */}
          <polygon points="50,130 90,45 130,130" fill="url(#ice-spire)" opacity="0.8" />
          <polygon points="80,130 110,60 140,130" fill="#bae6fd" opacity="0.6" />
          <polygon points="450,130 500,40 540,130" fill="url(#ice-spire)" opacity="0.85" />
          <polygon points="490,130 525,55 560,130" fill="#bae6fd" opacity="0.6" />
          {/* Gentle snowflakes */}
          <circle cx="80" cy="30" r="2.5" fill="#ffffff" opacity="0.9" />
          <circle cx="210" cy="50" r="3" fill="#ffffff" opacity="0.8" />
          <circle cx="340" cy="35" r="2" fill="#ffffff" opacity="0.95" />
          <circle cx="430" cy="65" r="2.5" fill="#ffffff" opacity="0.85" />
          <circle cx="560" cy="40" r="2" fill="#ffffff" opacity="0.8" />
          {/* Snow field */}
          <path
            d="M 0 130 Q 150 120 300 130 T 600 128 L 600 180 L 0 180 Z"
            fill="url(#snow-ground)"
          />
          <line x1="0" y1="130" x2="600" y2="130" stroke="#e2e8f0" strokeWidth="2" />
        </svg>
      )}

      {/* Wind Temple / Zephyr Plateau Backdrop */}
      {areaId === 'wind_area' && (
        <svg
          className="range-backdrop-svg wind-backdrop"
          viewBox="0 0 600 180"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wind-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="60%" stopColor="#99f6e4" />
              <stop offset="100%" stopColor="#f0fdfa" />
            </linearGradient>
            <linearGradient id="temple-pillars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#115e59" />
            </linearGradient>
          </defs>
          {/* Sky */}
          <rect x="0" y="0" width="600" height="180" fill="url(#wind-sky)" />
          {/* Wind vortex swirls */}
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
          {/* Sky Temple Pillars */}
          <rect x="60" y="70" width="16" height="60" fill="url(#temple-pillars)" rx="2" />
          <rect x="100" y="70" width="16" height="60" fill="url(#temple-pillars)" rx="2" />
          <rect x="52" y="66" width="72" height="8" fill="#115e59" rx="2" />
          <rect x="480" y="70" width="16" height="60" fill="url(#temple-pillars)" rx="2" />
          <rect x="520" y="70" width="16" height="60" fill="url(#temple-pillars)" rx="2" />
          <rect x="472" y="66" width="72" height="8" fill="#115e59" rx="2" />
          {/* High altitude stone terrace */}
          <rect x="0" y="130" width="600" height="50" fill="#134e4a" />
          <rect x="0" y="130" width="600" height="6" fill="#2dd4bf" />
        </svg>
      )}

      {/* Earth Mountain / Stone Bastion Backdrop */}
      {areaId === 'earth_area' && (
        <svg
          className="range-backdrop-svg earth-backdrop"
          viewBox="0 0 600 180"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="earth-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="65%" stopColor="#fde68a" />
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
          {/* Sky */}
          <rect x="0" y="0" width="600" height="180" fill="url(#earth-sky)" />
          {/* Jagged Canyon peaks */}
          <polygon points="0,130 80,40 170,130" fill="url(#granite-peak)" opacity="0.9" />
          <polygon points="120,130 220,55 310,130" fill="url(#granite-peak)" opacity="0.8" />
          <polygon points="420,130 510,35 600,130" fill="url(#granite-peak)" opacity="0.9" />
          {/* Ancient Standing Stones */}
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
          {/* Rocky canyon terrain */}
          <rect x="0" y="130" width="600" height="50" fill="#451a03" />
          <line x1="0" y1="130" x2="600" y2="130" stroke="#b45309" strokeWidth="3" />
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
