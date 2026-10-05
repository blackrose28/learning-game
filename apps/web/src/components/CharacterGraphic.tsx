import React from 'react';
import type { CharacterType } from '@math-archer/learning-engine';
import { ArcherGraphic, type ArcherGraphicProps } from './ArcherGraphic';
import { WizardGraphic } from './WizardGraphic';
import { WeaponHeroGraphic } from './WeaponHeroGraphic';

export interface CharacterGraphicProps extends Omit<ArcherGraphicProps, 'state'> {
  character?: CharacterType;
  state: 'idle' | 'drawing' | 'released' | 'reloading';
}

export const CharacterGraphic: React.FC<CharacterGraphicProps> = ({
  character = 'archer',
  state,
  element,
  className = '',
  equippedOutfit,
  equippedBow,
}) => {
  if (character === 'gunner' || character === 'warrior') {
    return (
      <WeaponHeroGraphic
        character={character}
        state={state}
        element={element}
        className={className}
        equippedOutfit={equippedOutfit}
        equippedBow={equippedBow}
      />
    );
  }
  if (character === 'wizard') {
    return (
      <WizardGraphic
        state={state === 'reloading' ? 'idle' : state}
        element={element}
        className={className}
        equippedOutfit={equippedOutfit}
        equippedBow={equippedBow}
      />
    );
  }

  return (
    <ArcherGraphic
      state={state === 'reloading' ? 'idle' : state}
      element={element}
      className={className}
      equippedOutfit={equippedOutfit}
      equippedBow={equippedBow}
    />
  );
};
