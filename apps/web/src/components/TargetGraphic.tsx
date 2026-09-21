import React from 'react';
import type { TargetType, CharacterType } from '@math-archer/learning-engine';
import { ArcheryTarget, type ArcheryTargetProps } from './ArcheryTarget';
import { TrainingDummy } from './TrainingDummy';

export interface TargetGraphicProps extends ArcheryTargetProps {
  target?: TargetType;
  character?: CharacterType;
}

export const TargetGraphic: React.FC<TargetGraphicProps> = ({
  target = 'archery_target',
  character = 'archer',
  expression,
  hitState,
  activeElement,
  className = '',
  equippedEffect,
}) => {
  if (target === 'dummy') {
    return (
      <TrainingDummy
        character={character}
        expression={expression}
        hitState={hitState}
        activeElement={activeElement}
        className={className}
        equippedEffect={equippedEffect}
      />
    );
  }

  return (
    <ArcheryTarget
      character={character}
      expression={expression}
      hitState={hitState}
      activeElement={activeElement}
      className={className}
      equippedEffect={equippedEffect}
    />
  );
};
