import React from 'react';
import type { ElementalArrowGraphicProps } from './ElementalArrowGraphic';
import { ELEMENTAL_PROFILES, renderEffectMotifs } from './elementalVisuals';
import { getArrowEffectVisual } from './arrowEffects';
import './WeaponHeroes.css';

export const WeaponProjectileGraphic: React.FC<
  ElementalArrowGraphicProps & { character: 'gunner' | 'warrior' }
> = ({ character, element, variant = 'quiver', equippedEffect, className = '' }) => {
  const profile = ELEMENTAL_PROFILES[element];
  const effect = getArrowEffectVisual(equippedEffect);
  const embedded = variant === 'embedded';
  const axe = character === 'warrior';
  return (
    <div
      className={`${embedded ? 'elemental-arrow embedded-variant' : 'elemental-arrow-graphic'} weapon-projectile character-${character} variant-${variant} element-${element} effect-${effect.id} ${className}`}
      data-testid={`${embedded ? 'embedded-arrow' : 'elemental-arrow'}-${element}`}
      data-character={character}
      data-effect={equippedEffect}
      data-projectile={axe ? 'axe' : 'bullet'}
      aria-label={`${element} ${axe ? 'axe' : 'bullet'}`}
    >
      <svg
        className={embedded ? 'embedded-arrow-svg' : 'arrow-vector-svg'}
        viewBox={embedded ? '0 0 60 120' : '0 0 140 36'}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="effectRainbowGrad">
            <stop stopColor="#ef4444" />
            <stop offset="25%" stopColor="#facc15" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="75%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <g transform={embedded ? 'translate(12 110) rotate(-90)' : undefined}>
          <g
            data-testid="arrow-effect-overlay"
            stroke={effect.primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 12 Q35 6 55 12 M8 24 Q35 30 53 24" strokeDasharray={'4 3'} />
            <circle cx="25" cy="18" r="2" fill={effect.glowColor} />
            <circle cx="40" cy="8" r="2" fill={effect.glowColor} />
            <circle cx="48" cy="27" r="2" fill={effect.glowColor} />
          </g>
          <g data-particle-type={effect.particleType}>{renderEffectMotifs(effect, 'horizontal')}</g>
          {axe ? (
            <g
              className={variant === 'projectile' ? 'spinning-axe' : ''}
              data-testid="warrior-axe"
              style={{ transformOrigin: '88px 18px' }}
            >
              <path d="M61 29 L98 8" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
              <path
                d="M92 10 Q102 1 118 5 Q119 15 109 23 L98 19 L92 15 L85 19 L79 12 L87 6Z"
                fill={profile.primaryColor}
                stroke={profile.accentColor}
                strokeWidth="2"
              />
              <path d="M117 6 Q116 16 109 21" stroke={profile.secondaryColor} strokeWidth="3" />
              <circle cx="94" cy="12" r="3" fill={effect.glowColor} />
            </g>
          ) : (
            <g data-testid="gunner-bullet">
              <path
                d="M54 18 H115"
                stroke={profile.secondaryColor}
                strokeWidth="7"
                strokeLinecap="round"
                opacity="0.35"
              />
              <rect
                x="89"
                y="11"
                width="22"
                height="14"
                rx="3"
                fill={profile.primaryColor}
                stroke={profile.accentColor}
                strokeWidth="2"
              />
              <path
                d="M111 11 Q135 18 111 25Z"
                fill={profile.secondaryColor}
                stroke={profile.accentColor}
                strokeWidth="2"
              />
              <path d="M91 12 V24" stroke={effect.glowColor} strokeWidth="3" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
