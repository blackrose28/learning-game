import React from 'react';
import type { ElementType, CharacterType } from '@math-archer/learning-engine';
import { ElementalArrowGraphic } from './ElementalArrowGraphic';
import { getArrowEffectVisual } from './arrowEffects';

export interface TrainingDummyProps {
  expression: string;
  hitState: 'idle' | 'hit' | 'miss';
  activeElement?: ElementType | null;
  className?: string;
  equippedEffect?: string;
  character?: CharacterType;
}

export const TrainingDummy: React.FC<TrainingDummyProps> = ({
  expression,
  hitState,
  activeElement,
  className = '',
  equippedEffect = 'arrow_effect_classic',
  character = 'archer',
}) => {
  const effectVisual = getArrowEffectVisual(equippedEffect);

  const elementGlow =
    activeElement === 'fire'
      ? '#f97316'
      : activeElement === 'ice'
        ? '#06b6d4'
        : activeElement === 'wind'
          ? '#10b981'
          : activeElement === 'earth'
            ? '#d97706'
            : '#f59e0b';

  return (
    <div
      className={`target-card dummy-target-card hit-${hitState} effect-${effectVisual.id} ${
        hitState === 'hit'
          ? 'target-impact-hit dummy-hit-wobble'
          : hitState === 'miss'
            ? 'target-impact-miss'
            : ''
      } ${className}`}
      data-testid="target-card"
      data-target-type="dummy"
      data-hit-state={hitState}
      data-effect={equippedEffect}
      style={
        {
          '--effect-primary': effectVisual.primaryColor,
          '--effect-glow': effectVisual.glowColor,
        } as React.CSSProperties
      }
    >
      {/* Wooden Cross Base & Stand */}
      <div className="target-stand dummy-stand" aria-hidden="true">
        <div className="dummy-base-timber base-h" />
        <div className="dummy-base-timber base-v" />
        <div className="dummy-post" />
        <div className="dummy-spring" />
      </div>

      {/* Target Face / Dummy Mannequin */}
      <div className="target-face dummy-face-container" data-testid="target-face">
        <svg
          className="dummy-svg"
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <filter id="dummyDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity="0.2" />
            </filter>

            {/* Burlap Straw Radial Gradient */}
            <radialGradient id="burlapGrad" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="60%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>

            {/* Wood Post Gradient */}
            <linearGradient id="dummyWoodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Hit Shockwave Glow */}
            <radialGradient id="dummyHitPulseGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={elementGlow} stopOpacity="0.8" />
              <stop offset="60%" stopColor={elementGlow} stopOpacity="0.2" />
              <stop offset="100%" stopColor={elementGlow} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Dummy Center Support Post */}
          <rect x="114" y="90" width="12" height="145" rx="3" fill="url(#dummyWoodGrad)" />

          {/* Outstretched Wooden Practice Cross Arms */}
          <rect
            x="25"
            y="95"
            width="190"
            height="14"
            rx="4"
            fill="url(#dummyWoodGrad)"
            filter="url(#dummyDropShadow)"
          />
          {/* Arm Rope Wrappings */}
          <line x1="45" y1="95" x2="45" y2="109" stroke="#fde68a" strokeWidth="3" />
          <line x1="52" y1="95" x2="52" y2="109" stroke="#fde68a" strokeWidth="3" />
          <line x1="188" y1="95" x2="188" y2="109" stroke="#fde68a" strokeWidth="3" />
          <line x1="195" y1="95" x2="195" y2="109" stroke="#fde68a" strokeWidth="3" />

          {/* Dummy Burlap Stuffed Torso */}
          <path
            d="M 80 80 Q 120 70 160 80 C 170 115 168 150 156 180 Q 120 190 84 180 C 72 150 70 115 80 80 Z"
            fill="url(#burlapGrad)"
            stroke="#92400e"
            strokeWidth="2.5"
            filter="url(#dummyDropShadow)"
          />

          {/* Torso Rope Belt & Criss-Cross Stitching */}
          <path d="M 82 145 Q 120 152 158 145" stroke="#78350f" strokeWidth="4.5" fill="none" />
          {/* Straw Stitch Marks (X X X) */}
          <path d="M 94 100 L 102 108 M 102 100 L 94 108" stroke="#92400e" strokeWidth="1.8" />
          <path d="M 138 100 L 146 108 M 146 100 L 138 108" stroke="#92400e" strokeWidth="1.8" />
          <path d="M 100 162 L 108 170 M 108 162 L 100 170" stroke="#92400e" strokeWidth="1.8" />
          <path d="M 132 162 L 140 170 M 140 162 L 132 170" stroke="#92400e" strokeWidth="1.8" />

          {/* Dummy Head (Round burlap ball with friendly face & straw hair) */}
          <g className="dummy-head">
            {/* Straw Tufts on Top */}
            <path
              d="M 112 35 L 105 16 M 120 33 L 120 12 M 128 35 L 135 16"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Head Ball */}
            <circle
              cx="120"
              cy="52"
              r="26"
              fill="url(#burlapGrad)"
              stroke="#92400e"
              strokeWidth="2.5"
              filter="url(#dummyDropShadow)"
            />
            {/* Friendly Button Eyes */}
            <circle cx="110" cy="48" r="4.5" fill="#78350f" />
            <line x1="108" y1="46" x2="112" y2="50" stroke="#fde68a" strokeWidth="1.2" />
            <line x1="112" y1="46" x2="108" y2="50" stroke="#fde68a" strokeWidth="1.2" />

            <circle cx="130" cy="48" r="4.5" fill="#78350f" />
            <line x1="128" y1="46" x2="132" y2="50" stroke="#fde68a" strokeWidth="1.2" />
            <line x1="132" y1="46" x2="128" y2="50" stroke="#fde68a" strokeWidth="1.2" />

            {/* Stitched Warm Smile */}
            <path
              d="M 111 60 Q 120 67 129 60"
              stroke="#78350f"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Smile Stitch Ticks */}
            <line x1="114" y1="60" x2="114" y2="64" stroke="#78350f" strokeWidth="1.5" />
            <line x1="120" y1="62" x2="120" y2="66" stroke="#78350f" strokeWidth="1.5" />
            <line x1="126" y1="60" x2="126" y2="64" stroke="#78350f" strokeWidth="1.5" />

            {/* Rosy Straw Cheeks */}
            <circle cx="104" cy="56" r="3.5" fill="#fca5a5" opacity="0.6" />
            <circle cx="136" cy="56" r="3.5" fill="#fca5a5" opacity="0.6" />
          </g>

          {/* Center Target Chest Plate (Behind the Expression Overlay) */}
          <g className="dummy-target-crest">
            <circle cx="120" cy="125" r="28" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
            <circle cx="120" cy="125" r="22" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
            <circle cx="120" cy="125" r="14" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
            <circle cx="120" cy="125" r="6" fill="#dc2626" />
          </g>

          {/* Kinetic Hit Shockwave Glow */}
          {hitState === 'hit' && (
            <circle
              cx="120"
              cy="125"
              r="90"
              fill="url(#dummyHitPulseGlow)"
              className="target-hit-shockwave"
            />
          )}
        </svg>

        {/* Embedded Projectile on Hit */}
        {hitState === 'hit' && (
          <div
            className={`embedded-arrow element-${activeElement || 'fire'} effect-${effectVisual.id}`}
            data-testid="embedded-arrow"
            data-element={activeElement || 'fire'}
            data-effect={equippedEffect}
            aria-hidden="true"
          >
            <ElementalArrowGraphic
              element={activeElement || 'fire'}
              variant="embedded"
              equippedEffect={equippedEffect}
              character={character}
            />
          </div>
        )}
      </div>

      {/* Target Bullseye Indicator Badge */}
      <div className="target-bullseye-indicator">TRAINING DUMMY</div>

      {/* Question Math Expression */}
      <div className="question-expression-wrapper">
        <div className="question-expression" data-testid="question-expression">
          {expression}
        </div>
      </div>

      {/* Impact Visual Effects */}
      {hitState === 'hit' && (
        <div
          className={`target-hit-effect element-${activeElement || 'fire'} effect-${effectVisual.id}`}
          data-testid="target-hit-effect"
          data-element={activeElement || 'fire'}
          data-effect={equippedEffect}
        >
          <span className="hit-stars" data-testid="hit-stars" aria-hidden="true">
            {effectVisual.impactGlyphs}
          </span>
          <span
            className="hit-effect-badge"
            data-testid="hit-effect-badge"
            style={{
              color: effectVisual.primaryColor,
              textShadow: `0 0 8px ${effectVisual.glowColor}`,
            }}
          >
            {effectVisual.icon} {effectVisual.name}
          </span>
          {activeElement && (
            <span className="hit-element-badge" data-testid="hit-element-badge">
              {activeElement === 'fire' && '🔥 Flame Combustion!'}
              {activeElement === 'ice' && '❄️ Frost Shatter!'}
              {activeElement === 'wind' && '💨 Zephyr Tempest!'}
              {activeElement === 'earth' && '🪨 Seismic Impact!'}
            </span>
          )}
          <div
            className="hit-ring-burst"
            aria-hidden="true"
            style={{
              borderColor: effectVisual.primaryColor,
              boxShadow: `0 0 16px ${effectVisual.glowColor}`,
            }}
          />
          <div
            className="hit-sparkle-burst"
            aria-hidden="true"
            style={{
              background: `radial-gradient(circle, ${effectVisual.glowColor} 0%, transparent 70%)`,
            }}
          />
        </div>
      )}

      {hitState === 'miss' && (
        <div
          className={`target-miss-effect element-${activeElement || 'fire'}`}
          data-testid="target-miss-effect"
          data-element={activeElement || 'fire'}
        >
          <span className="miss-deflect-icon" aria-hidden="true">
            💨 Miss!
          </span>
          {activeElement && (
            <span className="miss-element-detail" data-testid="miss-element-detail">
              {activeElement === 'fire' && '🔥 (Fizzled)'}
              {activeElement === 'ice' && '❄️ (Chipped)'}
              {activeElement === 'wind' && '💨 (Whisked)'}
              {activeElement === 'earth' && '🪨 (Clattered)'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
