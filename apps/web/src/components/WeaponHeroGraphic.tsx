import React from 'react';
import { getCosmeticItem } from '@math-archer/learning-engine';
import type { CharacterGraphicProps } from './CharacterGraphic';
import { ELEMENTAL_PROFILES } from './elementalVisuals';
import './WeaponHeroes.css';

export const WeaponHeroGraphic: React.FC<
  CharacterGraphicProps & { character: 'gunner' | 'warrior' }
> = ({
  character,
  state,
  element,
  equippedOutfit = 'outfit_classic_green',
  equippedBow = 'bow_recurve_oak',
  className = '',
}) => {
  const outfit = getCosmeticItem(equippedOutfit)?.preview;
  const weapon = getCosmeticItem(equippedBow)?.preview;
  const primary = outfit?.primaryColor || '#15803d';
  const secondary = outfit?.secondaryColor || '#14532d';
  const accent = outfit?.accentColor || '#fbbf24';
  const metal = weapon?.primaryColor || '#94a3b8';
  const glow = element
    ? ELEMENTAL_PROFILES[element].secondaryColor
    : weapon?.glowColor || '#fbbf24';
  const gunner = character === 'gunner';

  return (
    <div
      className={`archer-graphic-container ${character}-graphic-container state-${state} ${className}`}
      data-testid={`${character}-graphic`}
      data-state={state}
      data-outfit={equippedOutfit}
      data-bow={equippedBow}
    >
      <svg className="archer-svg" viewBox="0 0 120 110" fill="none" aria-hidden="true">
        <path
          d="M48 51 L35 87 Q54 94 76 84 L70 51Z"
          fill={secondary}
          stroke="#334155"
          strokeWidth="1.5"
        />
        <path
          d="M52 76 L48 98 M67 76 L73 98"
          stroke="#334155"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path d="M43 99 H53 M68 99 H79" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M48 49 Q60 45 73 50 L75 77 Q61 85 48 77Z"
          fill={primary}
          stroke={secondary}
          strokeWidth="2"
        />
        {gunner ? (
          <path d="M52 51 L67 76 M55 61 L71 61" stroke={accent} strokeWidth="4" />
        ) : (
          <>
            <path
              d="M52 52 L69 52 L72 67 L60 75 L50 67Z"
              fill="#cbd5e1"
              stroke={accent}
              strokeWidth="2"
            />
            <path d="M60 54 V69 M54 60 H66" stroke={primary} strokeWidth="3" />
          </>
        )}
        <path d="M48 75 H75" stroke="#78350f" strokeWidth="5" />
        <rect x="58" y="72" width="7" height="6" rx="1" fill={accent} />
        <circle cx="61" cy="35" r="13" fill="#fed7aa" stroke="#c2410c" />
        <circle cx="56" cy="35" r="1.8" fill="#1e293b" />
        <circle cx="66" cy="35" r="1.8" fill="#1e293b" />
        <path d="M57 41 Q61 45 66 40" stroke="#9a3412" strokeWidth="1.3" strokeLinecap="round" />
        {gunner ? (
          <g data-testid="gunner-goggles">
            <path
              d="M46 29 Q47 15 63 17 Q77 18 76 29Z"
              fill={primary}
              stroke={secondary}
              strokeWidth="2"
            />
            <path d="M43 29 H79" stroke={secondary} strokeWidth="4" />
            <rect
              x="50"
              y="21"
              width="10"
              height="7"
              rx="3"
              fill="#67e8f9"
              stroke={accent}
              strokeWidth="2"
            />
            <rect
              x="63"
              y="21"
              width="10"
              height="7"
              rx="3"
              fill="#67e8f9"
              stroke={accent}
              strokeWidth="2"
            />
          </g>
        ) : (
          <g data-testid="warrior-helmet">
            <path
              d="M46 31 Q44 14 61 14 Q77 15 77 31 L70 28 L61 23 L51 29Z"
              fill="#cbd5e1"
              stroke={secondary}
              strokeWidth="2"
            />
            <path d="M61 14 V26" stroke={accent} strokeWidth="4" />
            <path d="M61 14 Q62 4 72 6" stroke={primary} strokeWidth="6" strokeLinecap="round" />
          </g>
        )}
        <path d="M50 53 L39 67" stroke={primary} strokeWidth="8" strokeLinecap="round" />
        <circle cx="39" cy="68" r="4" fill="#fed7aa" />
        <g
          className={`${character}-weapon-arm`}
          style={{
            transformOrigin: '69px 54px',
            transform:
              state === 'drawing'
                ? gunner
                  ? 'rotate(-5deg)'
                  : 'rotate(-65deg)'
                : state === 'released'
                  ? gunner
                    ? 'translate(-4px, 0)'
                    : 'rotate(25deg)'
                  : 'rotate(0deg)',
            transition: 'transform 0.18s ease-out',
          }}
        >
          <path d="M70 54 L86 60" stroke={primary} strokeWidth="8" strokeLinecap="round" />
          <circle cx="87" cy="60" r="4" fill="#fed7aa" />
          {gunner ? (
            <g data-testid="gunner-gun">
              <path d="M86 56 L82 68 H88 L92 57" fill="#78350f" stroke="#451a03" />
              <rect
                x="83"
                y="46"
                width="29"
                height="11"
                rx="3"
                fill={metal}
                stroke="#334155"
                strokeWidth="2"
              />
              <rect
                x="102"
                y="48"
                width="15"
                height="7"
                rx="2"
                fill={weapon?.secondaryColor || '#475569'}
              />
              <path d="M89 44 H104" stroke={accent} strokeWidth="3" />
              <circle cx="96" cy="51" r="3" fill={glow} />
              {state === 'released' && (
                <path
                  data-testid="gunner-muzzle-flash"
                  d="M117 51 L124 43 L122 50 L132 51 L122 54 L126 61Z"
                  fill={glow}
                  stroke="#fef08a"
                />
              )}
            </g>
          ) : state !== 'released' ? (
            <g data-testid="warrior-held-axe">
              <path d="M87 65 L92 29" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
              <path
                d="M91 29 Q101 21 109 25 Q106 36 96 40 L91 37 L85 38 Q80 34 81 29Z"
                fill={metal}
                stroke={weapon?.secondaryColor || '#475569'}
                strokeWidth="2"
              />
              <path d="M108 26 Q105 35 97 38" stroke={glow} strokeWidth="3" />
            </g>
          ) : (
            <path
              data-testid="warrior-release-swoosh"
              d="M85 38 Q108 35 115 57"
              stroke={glow}
              strokeWidth="3"
              strokeDasharray="5 3"
            />
          )}
          {state === 'drawing' && (
            <circle
              cx="101"
              cy="40"
              r="19"
              stroke={glow}
              strokeWidth="2"
              strokeDasharray="3 4"
              className="weapon-charge"
            />
          )}
        </g>
      </svg>
    </div>
  );
};
