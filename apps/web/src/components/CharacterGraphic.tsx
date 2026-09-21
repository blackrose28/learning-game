import React from 'react';
import type { CharacterType } from '@math-archer/learning-engine';
import { ArcherGraphic, type ArcherGraphicProps } from './ArcherGraphic';
import { WizardGraphic } from './WizardGraphic';

export interface CharacterGraphicProps extends Omit<ArcherGraphicProps, 'state'> {
  character?: CharacterType;
  state: 'idle' | 'drawing' | 'released';
}

export const CharacterGraphic: React.FC<CharacterGraphicProps> = ({
  character = 'archer',
  state,
  element,
  className = '',
  equippedOutfit,
  equippedBow,
}) => {
  if (character === 'wizard') {
    return (
      <WizardGraphic
        state={state}
        element={element}
        className={className}
        equippedOutfit={equippedOutfit}
        equippedBow={equippedBow}
      />
    );
  }

  return (
    <ArcherGraphic
      state={state}
      element={element}
      className={className}
      equippedOutfit={equippedOutfit}
      equippedBow={equippedBow}
    />
  );
};
