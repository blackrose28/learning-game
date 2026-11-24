import React from 'react';
import type { CharacterType, ElementType } from '@math-archer/learning-engine';
import { ELEMENTAL_PROFILES } from './elementalVisuals';
import './CharacterSprite.css';

export interface CharacterGraphicProps {
  character?: CharacterType;
  state: 'idle' | 'drawing' | 'released' | 'reloading';
  element?: ElementType | null;
  className?: string;
  equippedOutfit?: string;
  equippedBow?: string;
}

const HERO_SPRITES: Record<CharacterType, string> = {
  archer: '/sprites/archer.webp',
  wizard: '/sprites/wizard.webp',
  warrior: '/sprites/warrior.webp',
  gunner: '/sprites/gunner.webp',
};

export const CharacterGraphic: React.FC<CharacterGraphicProps> = ({
  character = 'archer',
  state,
  element,
  className = '',
  equippedOutfit,
  equippedBow,
}) => {
  const glow = element ? ELEMENTAL_PROFILES[element].glowColor : null;
  return (
    <div
      className={`character-graphic character-graphic--${character} state-${state} ${className}`.trim()}
      data-testid={`${character}-graphic`}
      data-state={state}
      data-outfit={equippedOutfit}
      data-bow={equippedBow}
      style={glow ? ({ '--character-glow': glow } as React.CSSProperties) : undefined}
    >
      {glow && <span className="character-graphic-aura" aria-hidden="true" />}
      <img
        className="character-sprite"
        src={HERO_SPRITES[character]}
        alt=""
        draggable={false}
        decoding="async"
      />
      {character === 'gunner' && state === 'released' && (
        <span
          className="character-muzzle-flash"
          data-testid="gunner-muzzle-flash"
          aria-hidden="true"
        />
      )}
      {character === 'warrior' && state === 'released' && (
        <span
          className="character-release-swoosh"
          data-testid="warrior-release-swoosh"
          aria-hidden="true"
        />
      )}
      {character === 'gunner' && state === 'reloading' && (
        <span className="character-reload-shell" data-testid="shotgun-reload" aria-hidden="true" />
      )}
    </div>
  );
};
