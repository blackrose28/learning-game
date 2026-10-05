import React from 'react';
import type { ElementType } from '@math-archer/learning-engine';

export interface WizardGraphicProps {
  state: 'idle' | 'drawing' | 'released';
  element?: ElementType | null;
  className?: string;
  equippedOutfit?: string;
  equippedBow?: string;
}

const OUTFIT_SKINS: Record<
  string,
  { primary: string; secondary: string; stroke: string; feather: string; arm: string }
> = {
  outfit_classic_green: {
    primary: '#15803d',
    secondary: '#14532d',
    stroke: '#0f381e',
    feather: '#ef4444',
    arm: '#15803d',
  },
  outfit_ember_crimson: {
    primary: '#dc2626',
    secondary: '#991b1b',
    stroke: '#450a0a',
    feather: '#f59e0b',
    arm: '#dc2626',
  },
  outfit_frost_azure: {
    primary: '#0284c7',
    secondary: '#0369a1',
    stroke: '#082f49',
    feather: '#38bdf8',
    arm: '#0284c7',
  },
  outfit_zephyr_emerald: {
    primary: '#059669',
    secondary: '#065f46',
    stroke: '#022c22',
    feather: '#34d399',
    arm: '#059669',
  },
  outfit_royal_gold: {
    primary: '#d97706',
    secondary: '#b45309',
    stroke: '#451a03',
    feather: '#fbbf24',
    arm: '#d97706',
  },
  outfit_shadow_stalker: {
    primary: '#312e81',
    secondary: '#1e1b4b',
    stroke: '#0f172a',
    feather: '#818cf8',
    arm: '#312e81',
  },
  outfit_ember_knight: {
    primary: '#991b1b',
    secondary: '#450a0a',
    stroke: '#18181b',
    feather: '#f97316',
    arm: '#7f1d1d',
  },
  outfit_guardian_iron: {
    primary: '#1e40af',
    secondary: '#1e293b',
    stroke: '#0f172a',
    feather: '#94a3b8',
    arm: '#1e3a8a',
  },
  outfit_mystic_sage: {
    primary: '#7e22ce',
    secondary: '#581c87',
    stroke: '#3b0764',
    feather: '#c084fc',
    arm: '#7e22ce',
  },
  outfit_phoenix_flame: {
    primary: '#c2410c',
    secondary: '#7c2d12',
    stroke: '#431407',
    feather: '#fde047',
    arm: '#c2410c',
  },
  outfit_frost_monarch: {
    primary: '#0369a1',
    secondary: '#082f49',
    stroke: '#0c4a6e',
    feather: '#bae6fd',
    arm: '#0369a1',
  },
  outfit_celestial_aurora: {
    primary: '#4338ca',
    secondary: '#0f766e',
    stroke: '#1e1b4b',
    feather: '#22d3ee',
    arm: '#4338ca',
  },
  outfit_dragon_slayer: {
    primary: '#065f46',
    secondary: '#022c22',
    stroke: '#064e3b',
    feather: '#fbbf24',
    arm: '#047857',
  },
  outfit_divine_archon: {
    primary: '#f8fafc',
    secondary: '#d97706',
    stroke: '#b45309',
    feather: '#fef08a',
    arm: '#f1f5f9',
  },
};

const STAFF_SKINS: Record<
  string,
  {
    shaft0: string;
    shaft100: string;
    orb0: string;
    orb100: string;
    headpiece: string;
    glow: string;
  }
> = {
  bow_recurve_oak: {
    shaft0: '#92400e',
    shaft100: '#78350f',
    orb0: '#fde047',
    orb100: '#d97706',
    headpiece: '#b45309',
    glow: '#facc15',
  },
  bow_ember_blaze: {
    shaft0: '#ea580c',
    shaft100: '#7c2d12',
    orb0: '#fef08a',
    orb100: '#ea580c',
    headpiece: '#fdba74',
    glow: '#f97316',
  },
  bow_frost_crystal: {
    shaft0: '#38bdf8',
    shaft100: '#0369a1',
    orb0: '#e0f2fe',
    orb100: '#0284c7',
    headpiece: '#bae6fd',
    glow: '#38bdf8',
  },
  bow_zephyr_wind: {
    shaft0: '#10b981',
    shaft100: '#047857',
    orb0: '#a7f3d0',
    orb100: '#059669',
    headpiece: '#34d399',
    glow: '#10b981',
  },
  bow_regal_gold: {
    shaft0: '#fde047',
    shaft100: '#a16207',
    orb0: '#ffffff',
    orb100: '#eab308',
    headpiece: '#fbbf24',
    glow: '#facc15',
  },
  bow_shadow_composite: {
    shaft0: '#475569',
    shaft100: '#1e293b',
    orb0: '#c084fc',
    orb100: '#3b0764',
    headpiece: '#a855f7',
    glow: '#818cf8',
  },
  bow_storm_surge: {
    shaft0: '#0284c7',
    shaft100: '#0c4a6e',
    orb0: '#fef08a',
    orb100: '#38bdf8',
    headpiece: '#facc15',
    glow: '#38bdf8',
  },
  bow_dragon_horn: {
    shaft0: '#b91c1c',
    shaft100: '#450a0a',
    orb0: '#f97316',
    orb100: '#dc2626',
    headpiece: '#f97316',
    glow: '#ef4444',
  },
  bow_crystalline_prism: {
    shaft0: '#c084fc',
    shaft100: '#581c87',
    orb0: '#ffffff',
    orb100: '#a855f7',
    headpiece: '#f472b6',
    glow: '#e879f9',
  },
  bow_phoenix_wing: {
    shaft0: '#ea580c',
    shaft100: '#7c2d12',
    orb0: '#fef08a',
    orb100: '#f97316',
    headpiece: '#fde047',
    glow: '#fb923c',
  },
  bow_master_elemental: {
    shaft0: '#059669',
    shaft100: '#1e1b4b',
    orb0: '#38bdf8',
    orb100: '#dc2626',
    headpiece: '#fbbf24',
    glow: '#10b981',
  },
  bow_celestial_harp: {
    shaft0: '#6366f1',
    shaft100: '#1e1b4b',
    orb0: '#f472b6',
    orb100: '#818cf8',
    headpiece: '#c7d2fe',
    glow: '#a5b4fc',
  },
  bow_mythic_sovereign: {
    shaft0: '#ca8a04',
    shaft100: '#713f12',
    orb0: '#38bdf8',
    orb100: '#facc15',
    headpiece: '#fde047',
    glow: '#facc15',
  },
  bow_divine_infinity: {
    shaft0: '#ffffff',
    shaft100: '#ca8a04',
    orb0: '#38bdf8',
    orb100: '#fef08a',
    headpiece: '#fef08a',
    glow: '#67e8f9',
  },
};

export const WizardGraphic: React.FC<WizardGraphicProps> = ({
  state,
  element,
  className = '',
  equippedOutfit = 'outfit_classic_green',
  equippedBow = 'bow_recurve_oak',
}) => {
  const outfit = OUTFIT_SKINS[equippedOutfit] || OUTFIT_SKINS.outfit_classic_green;
  const staff = STAFF_SKINS[equippedBow] || STAFF_SKINS.bow_recurve_oak;

  const elementGlow =
    element === 'fire'
      ? '#f97316'
      : element === 'ice'
        ? '#06b6d4'
        : element === 'wind'
          ? '#10b981'
          : element === 'earth'
            ? '#d97706'
            : staff.glow;

  const isCharging = state === 'drawing';
  const isCasting = state === 'released';

  return (
    <div
      className={`wizard-graphic-container state-${state} ${className}`}
      data-testid="wizard-graphic"
      data-outfit={equippedOutfit}
      data-bow={equippedBow}
      data-state={state}
    >
      <svg
        className="wizard-svg"
        viewBox="0 0 120 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Staff Wood / Metal Gradient */}
          <linearGradient id="wizardStaffGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={staff.shaft0} />
            <stop offset="100%" stopColor={staff.shaft100} />
          </linearGradient>

          {/* Magic Orb Radial Gradient */}
          <radialGradient id="magicOrbGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={staff.orb0} />
            <stop offset="100%" stopColor={staff.orb100} />
          </radialGradient>

          {/* Elemental Aura Glow Filter */}
          <filter id="wizardGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="4"
              floodColor={elementGlow}
              floodOpacity="0.85"
            />
          </filter>

          {/* Wizard Robe Gradient */}
          <linearGradient id="wizardRobeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={outfit.primary} />
            <stop offset="100%" stopColor={outfit.secondary} />
          </linearGradient>

          {/* Wizard Hat Gradient */}
          <linearGradient id="wizardHatGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={outfit.primary} />
            <stop offset="100%" stopColor={outfit.secondary} />
          </linearGradient>
        </defs>

        {/* Wizard Robe Cloak Behind */}
        <g className="wizard-cloak">
          <path
            d="M 64 50 C 64 50 86 58 88 86 C 76 90 54 90 48 86 C 50 64 56 52 64 50 Z"
            fill="url(#wizardRobeGrad)"
            stroke={outfit.stroke}
            strokeWidth="1.5"
          />
          {/* Mystic Hem Trim */}
          <path d="M 49 83 Q 66 89 87 83" stroke={outfit.feather} strokeWidth="2" fill="none" />
        </g>

        {/* Wizard Body & Robe Torso */}
        <g className="wizard-body">
          {/* Main Robe / Chest */}
          <path
            d="M 54 50 C 58 48 70 48 74 50 C 78 64 76 78 72 82 C 68 85 58 85 56 82 C 52 78 50 64 54 50 Z"
            fill="url(#wizardRobeGrad)"
            stroke={outfit.stroke}
            strokeWidth="1.5"
          />
          {/* Robe Lapel Fold */}
          <path d="M 60 50 L 64 68 L 68 50" stroke={outfit.feather} strokeWidth="1.5" fill="none" />
          {/* Magical Waist Belt & Buckle */}
          <path d="M 53 68 Q 64 72 75 69" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          <rect
            x="62"
            y="67"
            width="5"
            height="5"
            rx="1"
            fill="#facc15"
            stroke="#ca8a04"
            strokeWidth="1"
          />
          {/* Spell Pouch on Belt */}
          <circle cx="73" cy="73" r="3" fill="#92400e" stroke="#451a03" strokeWidth="1" />
          <circle cx="73" cy="72" r="1" fill="#facc15" />
        </g>

        {/* Wizard Face & Head */}
        <g className="wizard-head">
          {/* Neck */}
          <rect x="61" y="44" width="6" height="8" rx="2" fill="#fbcfe8" />
          {/* Cute Kid Wizard Head */}
          <circle cx="64" cy="36" r="12" fill="#fed7aa" stroke="#ea580c" strokeWidth="1" />
          {/* Friendly Rosy Cheeks */}
          <circle cx="58" cy="40" r="2.2" fill="#fca5a5" opacity="0.6" />
          <circle cx="70" cy="40" r="2.2" fill="#fca5a5" opacity="0.6" />
          {/* Determined Bright Eyes */}
          <circle cx="59" cy="36" r="1.8" fill="#1e293b" />
          <circle cx="59.5" cy="35.5" r="0.6" fill="#ffffff" />
          <circle cx="69" cy="36" r="1.8" fill="#1e293b" />
          <circle cx="69.5" cy="35.5" r="0.6" fill="#ffffff" />
          {/* Confident Smile */}
          <path
            d="M 61 41 Q 64 43 67 41"
            stroke="#9a3412"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Pointy Wizard Hat with Brim and Magical Star */}
          <g className="wizard-hat">
            {/* Hat Brim */}
            <ellipse
              cx="64"
              cy="28"
              rx="22"
              ry="5"
              fill={outfit.secondary}
              stroke={outfit.stroke}
              strokeWidth="1.5"
            />
            {/* Pointy Hat Cone with Playful Curve */}
            <path
              d="M 48 28 Q 64 8 72 2 C 70 8 78 22 80 28 Z"
              fill="url(#wizardHatGrad)"
              stroke={outfit.stroke}
              strokeWidth="1.5"
            />
            {/* Hat Band */}
            <path d="M 50 26 Q 64 30 78 26" stroke={outfit.feather} strokeWidth="3.5" fill="none" />
            {/* Golden Star / Plume on Hat Tip */}
            <polygon
              points="72,2 73.5,4.5 76,5 74,7 74.5,9.5 72,8 69.5,9.5 70,7 68,5 70.5,4.5"
              fill="#fde047"
              stroke="#ca8a04"
              strokeWidth="0.6"
            />
          </g>
        </g>

        {/* Wizard Magic Staff & Casting Arm */}
        <g
          className={`wizard-staff-arm ${isCharging ? 'staff-charging' : ''} ${
            isCasting ? 'staff-cast' : ''
          }`}
          style={{
            transformOrigin: '54px 56px',
            transform: isCharging
              ? 'rotate(-18deg) translate(-2px, -4px)'
              : isCasting
                ? 'rotate(12deg) translate(4px, 2px)'
                : 'rotate(0deg)',
            transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Wizard Robe Sleeve */}
          <path
            d="M 54 54 C 48 56 36 60 30 64 C 32 68 40 70 48 64 C 52 60 54 56 54 54 Z"
            fill="url(#wizardRobeGrad)"
            stroke={outfit.stroke}
            strokeWidth="1.5"
          />
          {/* Wizard Hand holding staff */}
          <circle cx="28" cy="62" r="3.5" fill="#fed7aa" stroke="#ea580c" strokeWidth="1" />

          {/* Magic Staff Shaft */}
          <line
            x1="28"
            y1="88"
            x2="26"
            y2="18"
            stroke="url(#wizardStaffGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Staff Headpiece Prongs */}
          <path d="M 20 22 Q 26 14 32 22" stroke={staff.headpiece} strokeWidth="2.5" fill="none" />
          <line x1="26" y1="18" x2="26" y2="12" stroke={staff.headpiece} strokeWidth="2.5" />

          {/* Floating Mystical Crystal Orb */}
          <circle
            cx="26"
            cy="12"
            r="6"
            fill="url(#magicOrbGrad)"
            stroke={staff.headpiece}
            strokeWidth="1"
            filter="url(#wizardGlowFilter)"
          />
          <circle cx="24.5" cy="10" r="1.8" fill="#ffffff" opacity="0.8" />

          {/* Charging Arcane Rune Circle & Sparks */}
          {isCharging && (
            <g className="charging-rune-circle" filter="url(#wizardGlowFilter)">
              {/* Concentric magical ring */}
              <circle
                cx="26"
                cy="12"
                r="14"
                stroke={elementGlow}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                fill="none"
              />
              <circle
                cx="26"
                cy="12"
                r="18"
                stroke={elementGlow}
                strokeWidth="1"
                strokeDasharray="2 4"
                fill="none"
              />
              {/* Elemental Spark Motes */}
              <circle cx="16" cy="6" r="2" fill={elementGlow} />
              <circle cx="36" cy="8" r="1.8" fill={elementGlow} />
              <circle cx="28" cy="28" r="2.2" fill={elementGlow} />
              <circle cx="12" cy="18" r="1.5" fill="#ffffff" />
            </g>
          )}

          {/* Casting Energy Burst */}
          {isCasting && (
            <g className="casting-burst" filter="url(#wizardGlowFilter)">
              <circle cx="26" cy="12" r="16" fill={elementGlow} opacity="0.4" />
              <line x1="26" y1="12" x2="10" y2="4" stroke={elementGlow} strokeWidth="2" />
              <line x1="26" y1="12" x2="8" y2="18" stroke={elementGlow} strokeWidth="2" />
              <line x1="26" y1="12" x2="14" y2="26" stroke={elementGlow} strokeWidth="2" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
