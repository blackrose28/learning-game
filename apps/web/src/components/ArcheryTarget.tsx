import React from 'react';
import type { ElementType } from '@math-archer/learning-engine';
import { ElementalArrowGraphic } from './ElementalArrowGraphic';

export interface ArcheryTargetProps {
  expression: string;
  hitState: 'idle' | 'hit' | 'miss';
  activeElement?: ElementType | null;
  className?: string;
  equippedEffect?: string;
}

export const ArcheryTarget: React.FC<ArcheryTargetProps> = ({
  expression,
  hitState,
  activeElement,
  className = '',
  equippedEffect = 'arrow_effect_classic',
}) => {
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
      className={`target-card hit-${hitState} ${
        hitState === 'hit' ? 'target-impact-hit' : hitState === 'miss' ? 'target-impact-miss' : ''
      } ${className}`}
      data-testid="target-card"
      data-hit-state={hitState}
      data-effect={equippedEffect}
    >
      {/* Wooden Archery Stand Tripod Backdrop */}
      <div className="target-stand" aria-hidden="true">
        <div className="stand-leg leg-left" />
        <div className="stand-leg leg-back" />
        <div className="stand-leg leg-right" />
        <div className="stand-crossbar" />
      </div>

      {/* Target Face with Archery Concentric Rings */}
      <div className="target-face" data-testid="target-face">
        {/* SVG Archery Target Rings */}
        <svg
          className="target-rings-svg"
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Target Face Shadow */}
            <filter id="targetDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.18" />
            </filter>

            {/* Bullseye Gold Radial Gradient */}
            <radialGradient id="bullseyeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="70%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>

            {/* Target Rim Wood */}
            <linearGradient id="targetRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            {/* Elemental hit glow */}
            <radialGradient id="hitPulseGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={elementGlow} stopOpacity="0.8" />
              <stop offset="60%" stopColor={elementGlow} stopOpacity="0.2" />
              <stop offset="100%" stopColor={elementGlow} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Target Wooden Base & Border */}
          <circle
            cx="120"
            cy="120"
            r="116"
            fill="url(#targetRim)"
            filter="url(#targetDropShadow)"
          />
          <circle cx="120" cy="120" r="110" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />

          {/* Archery Scoring Rings: White -> Black -> Blue -> Red -> Gold */}
          {/* Ring 1 & 2: White rings (Outer 108px & 98px) */}
          <circle cx="120" cy="120" r="108" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="120" cy="120" r="94" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

          {/* Ring 3 & 4: Slate/Black rings (80px & 66px) */}
          <circle cx="120" cy="120" r="80" fill="#334155" stroke="#1e293b" strokeWidth="1" />
          <circle cx="120" cy="120" r="66" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />

          {/* Ring 5 & 6: Sky/Cyan Blue rings (52px & 38px) */}
          <circle cx="120" cy="120" r="52" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
          <circle cx="120" cy="120" r="38" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />

          {/* Ring 7 & 8: Vivid Red rings (26px & 16px) */}
          <circle cx="120" cy="120" r="26" fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
          <circle cx="120" cy="120" r="16" fill="#b91c1c" stroke="#991b1b" strokeWidth="1" />

          {/* Ring 9 & 10: Golden Bullseye (9px & Center 10-X ring) */}
          <circle
            cx="120"
            cy="120"
            r="10"
            fill="url(#bullseyeGrad)"
            stroke="#d97706"
            strokeWidth="1"
          />
          <circle cx="120" cy="120" r="4" fill="#fef08a" stroke="#b45309" strokeWidth="0.8" />
          {/* Center Crosshair + */}
          <line x1="117" y1="120" x2="123" y2="120" stroke="#78350f" strokeWidth="0.8" />
          <line x1="120" y1="117" x2="120" y2="123" stroke="#78350f" strokeWidth="0.8" />

          {/* Kinetic Hit Shockwave Glow */}
          {hitState === 'hit' && (
            <circle
              cx="120"
              cy="120"
              r="105"
              fill="url(#hitPulseGlow)"
              className="target-hit-shockwave"
            />
          )}
        </svg>

        {/* Embedded Arrow (Stuck in the Bullseye on Hit with distinct elemental geometry) */}
        {hitState === 'hit' && (
          <div
            className={`embedded-arrow element-${activeElement || 'fire'}`}
            data-testid="embedded-arrow"
            data-element={activeElement || 'fire'}
            aria-hidden="true"
          >
            <ElementalArrowGraphic element={activeElement || 'fire'} variant="embedded" />
          </div>
        )}
      </div>

      {/* Target Bullseye Indicator Badge */}
      <div className="target-bullseye-indicator">TARGET</div>

      {/* Question Math Expression (Clearly legible contrast shield) */}
      <div className="question-expression-wrapper">
        <div className="question-expression" data-testid="question-expression">
          {expression}
        </div>
      </div>

      {/* Impact Visual Effects with Distinct Elemental Feedback */}
      {hitState === 'hit' && (
        <div
          className={`target-hit-effect element-${activeElement || 'fire'}`}
          data-testid="target-hit-effect"
          data-element={activeElement || 'fire'}
        >
          <span className="hit-stars" aria-hidden="true">
            ✨🎯✨
          </span>
          {activeElement && (
            <span className="hit-element-badge" data-testid="hit-element-badge">
              {activeElement === 'fire' && '🔥 Flame Combustion!'}
              {activeElement === 'ice' && '❄️ Frost Shatter!'}
              {activeElement === 'wind' && '💨 Zephyr Tempest!'}
              {activeElement === 'earth' && '🪨 Seismic Impact!'}
            </span>
          )}
          <div className="hit-ring-burst" aria-hidden="true" />
          <div className="hit-sparkle-burst" aria-hidden="true" />
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
