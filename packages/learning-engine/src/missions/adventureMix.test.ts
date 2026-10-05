import { describe, expect, it } from 'vitest';
import { startMissionAttempt } from './attempt';
import { generateDailyCollection } from './dailyCollection';
import { generateInstructionChainV2 } from './instructionChainV2';
import {
  ADVENTURE_MISSION_INTERVAL,
  chooseAdventureMission,
  isAdventureInclusionEnabled,
  shouldOfferAdventureMission,
} from './adventureMix';
import { defaultReasoningSettings, isReasoningSettings, type ReasoningSettings } from './progress';

const on: ReasoningSettings = {
  schemaVersion: 1,
  enabledFamilies: ['instruction_chain'],
  adventureEnabled: true,
};

describe('Adventure inclusion', () => {
  it('is off for legacy and default settings', () => {
    expect(isAdventureInclusionEnabled(defaultReasoningSettings())).toBe(false);
    expect(
      isAdventureInclusionEnabled({ schemaVersion: 1, enabledFamilies: ['instruction_chain'] })
    ).toBe(false);
    expect(shouldOfferAdventureMission(defaultReasoningSettings(), 100)).toBe(false);
  });

  it('never offers a mission when every family is disabled', () => {
    expect(shouldOfferAdventureMission({ ...on, enabledFamilies: [] }, 100)).toBe(false);
  });

  it('offers at most one mission per five arrows', () => {
    expect(shouldOfferAdventureMission(on, ADVENTURE_MISSION_INTERVAL - 1)).toBe(false);
    expect(shouldOfferAdventureMission(on, ADVENTURE_MISSION_INTERVAL)).toBe(true);
  });

  it('validates the stored flag', () => {
    expect(isReasoningSettings(on)).toBe(true);
    expect(isReasoningSettings({ ...on, adventureEnabled: 'yes' })).toBe(false);
  });
});

describe('chooseAdventureMission', () => {
  it('returns nothing without an enabled family', () => {
    expect(chooseAdventureMission('child', [], [])).toBeNull();
  });

  it('starts a new family guided and rotates to the least recently practised family', () => {
    const chain = startMissionAttempt(
      generateInstructionChainV2({ seed: 1, support: 'guided' }),
      'child',
      'a',
      '2026-10-05T10:00:00.000Z'
    );
    expect(
      chooseAdventureMission('child', [], ['instruction_chain', 'daily_collection'])
    ).toMatchObject({ family: 'instruction_chain', reason: 'rotation' });
    const next = chooseAdventureMission(
      'child',
      [chain],
      ['instruction_chain', 'daily_collection']
    );
    expect(next).toMatchObject({ family: 'daily_collection', reason: 'rotation' });
    expect(next?.support).toMatchObject({ support: 'guided', change: 'start' });
    const daily = startMissionAttempt(
      generateDailyCollection({ seed: 2, support: 'guided' }),
      'child',
      'b',
      '2026-10-05T11:00:00.000Z'
    );
    expect(
      chooseAdventureMission('child', [chain, daily], ['instruction_chain', 'daily_collection'])
        ?.family
    ).toBe('instruction_chain');
  });

  it('never chooses a disabled family', () => {
    expect(chooseAdventureMission('child', [], ['max_sum_digit_cards'])?.family).toBe(
      'max_sum_digit_cards'
    );
  });
});
