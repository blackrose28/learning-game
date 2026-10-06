import React, { useId } from 'react';
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
  const shellClipId = useId();

  return (
    <div
      className={`archer-graphic-container ${character}-graphic-container state-${state} ${className}`}
      data-testid={`${character}-graphic`}
      data-state={state}
      data-weapon={gunner ? 'shotgun' : 'axe'}
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
        {/* Head and headgear are scaled up from the neck so the hero reads at phone sizes. */}
        <g transform="translate(61 46) scale(1.2) translate(-61 -46)" data-testid="hero-head">
          {/* Same face as the archer: oval, glossy eyes, forelock and smile. */}
          <ellipse cx="61" cy="36" rx="9" ry="10" fill="#fed7aa" />
          <path d="M54 30 Q59 34 57 38" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
          {state === 'drawing' ? (
            <>
              <circle cx="58" cy="35" r="1.5" fill="#1e293b" />
              <path d="M62 36 L66 35" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="58" cy="35" r="1.5" fill="#1e293b" />
              <circle cx="64" cy="35" r="1.5" fill="#1e293b" />
              <circle cx="58.5" cy="34.5" r="0.5" fill="#ffffff" />
              <circle cx="64.5" cy="34.5" r="0.5" fill="#ffffff" />
            </>
          )}
          <path d="M59 41 Q62 43 65 41" stroke="#9a3412" strokeWidth="1.2" strokeLinecap="round" />
          {gunner ? (
            <g data-testid="gunner-goggles">
              {/* Peaked cap with the goggles pushed up on the crown. */}
              <path
                d="M49 30 Q47 14 61 14 Q75 14 73 30 Q61 25 49 30Z"
                fill={primary}
                stroke={secondary}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M64 28 Q75 25 83 30 Q74 32 64 30Z"
                fill={secondary}
                stroke="#0f172a"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path d="M48 23 Q61 18 74 23" stroke="#334155" strokeWidth="4" />
              <circle cx="55" cy="21" r="4.5" fill="#67e8f9" stroke={accent} strokeWidth="2" />
              <circle cx="67" cy="21" r="4.5" fill="#67e8f9" stroke={accent} strokeWidth="2" />
              <path d="M53 19.5 L55.5 18.5 M65 19.5 L67.5 18.5" stroke="#ecfeff" strokeWidth="1" />
            </g>
          ) : (
            <g data-testid="warrior-helmet">
              {/* Steel dome with a gold brow band and a pair of horns. */}
              <path
                d="M49 24 Q38 22 38 9 Q45 15 53 18Z"
                fill="#fef3c7"
                stroke="#a16207"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M73 24 Q84 22 84 9 Q77 15 69 18Z"
                fill="#fef3c7"
                stroke="#a16207"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M48 30 Q47 14 61 14 Q75 14 74 30 Q61 25 48 30Z"
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M48.5 29 Q61 24.5 73.5 29" stroke={accent} strokeWidth="3.5" />
              <circle cx="61" cy="24.5" r="2.2" fill={primary} stroke={secondary} strokeWidth="1" />
              <path
                d="M54 19 Q58 16 63 16"
                stroke="#f8fafc"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
        {!gunner && (
          <>
            <path d="M51 53 Q38 60 39 77" stroke={primary} strokeWidth="7" strokeLinecap="round" />
            <circle cx="39" cy="79" r="4" fill="#fed7aa" />
          </>
        )}
        <g
          className={`${character}-weapon-arm`}
          style={{
            transformOrigin: '66px 54px',
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
          {gunner && (
            <path
              className="shotgun-support-arm"
              d="M50 54 Q53 72 69 71 L104 60"
              stroke={primary}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          <path d="M66 54 Q75 67 86 60" stroke={primary} strokeWidth="7" strokeLinecap="round" />
          <circle cx="87" cy="60" r="4" fill="#fed7aa" />
          {gunner ? (
            <g data-testid="gunner-gun" className="gunner-shotgun">
              <g data-testid="gunner-shotgun">
                <path
                  d="M68 51 L82 48 L88 54 L75 62 L66 59Z"
                  fill="#78350f"
                  stroke="#451a03"
                  strokeWidth="2"
                />
                <rect
                  x="81"
                  y="47"
                  width="16"
                  height="11"
                  rx="2"
                  fill={metal}
                  stroke="#334155"
                  strokeWidth="2"
                />
                <path d="M85 57 L82 66 H87 L91 57" fill="#78350f" stroke="#451a03" />
                <path d="M90 58 Q97 66 99 56" stroke="#334155" strokeWidth="2" />
                <rect
                  x="95"
                  y="47"
                  width="24"
                  height="5"
                  rx="1"
                  fill={weapon?.secondaryColor || '#475569'}
                  stroke="#334155"
                />
                <path d="M96 55 H116" stroke={metal} strokeWidth="3" />
                <path d="M114 45 H117" stroke={accent} strokeWidth="2" />
                <g className="shotgun-pump" data-testid="shotgun-pump">
                  <rect
                    x="99"
                    y="52"
                    width="13"
                    height="7"
                    rx="2"
                    fill="#92400e"
                    stroke="#451a03"
                  />
                  <path d="M102 53 V58 M106 53 V58 M110 53 V58" stroke={accent} />
                </g>
                <circle cx="89" cy="51" r="2.5" fill={glow} />
                <rect x="90" y="57" width="7" height="3" rx="1" fill="#0f172a" />
                {state === 'reloading' && (
                  <g data-testid="shotgun-reload">
                    <defs>
                      <clipPath id={shellClipId}>
                        {/* The shell disappears into the receiver, not with the hand. */}
                        <rect x="55" y="59" width="48" height="24" />
                      </clipPath>
                    </defs>
                    <g clipPath={`url(#${shellClipId})`}>
                      <g className="shotgun-shell" data-testid="shotgun-shell">
                        <rect
                          x="92"
                          y="60"
                          width="4"
                          height="11"
                          rx="1"
                          fill="#dc2626"
                          stroke="#7f1d1d"
                          strokeWidth="0.6"
                        />
                        <path d="M92 70 H96" stroke="#fbbf24" strokeWidth="2" />
                      </g>
                    </g>
                  </g>
                )}
                <g className="shotgun-support-hand" data-testid="shotgun-support-hand">
                  <circle
                    cx="104"
                    cy="60"
                    r="4"
                    fill="#fed7aa"
                    stroke="#c2410c"
                    strokeWidth="0.6"
                  />
                  <path
                    d="M101 59 L106 57"
                    stroke="#fed7aa"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>
              </g>
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
