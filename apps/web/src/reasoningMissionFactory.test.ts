import { describe, expect, it } from 'vitest';
import { validateMission } from '@math-archer/learning-engine';
import { createMission } from './reasoningMissionFactory';

describe('reasoning mission factory', () => {
  it('starts every family with the parent’s original example and its checked answer', () => {
    const answers = {
      instruction_chain: 15,
      daily_collection: 13,
      unknown_start: 48,
    } as const;
    for (const family of Object.keys(answers) as (keyof typeof answers)[]) {
      const mission = createMission({ family, seed: 5, support: 'guided', startedInFamily: 0 });
      expect(validateMission(mission)).toBe(true);
      expect(mission.family).toBe(family);
      expect(mission.wording).toBe('school');
      expect(Number(mission.steps.at(-1)!.correctChoiceId.replace('value_', ''))).toBe(
        answers[family]
      );
    }
  });

  it('keeps early story missions within 20, alternates wording, then widens the range', () => {
    for (const family of ['daily_collection', 'unknown_start'] as const) {
      for (let started = 1; started <= 2; started++) {
        for (let seed = 0; seed < 200; seed++) {
          const mission = createMission({
            family,
            seed,
            support: 'guided',
            startedInFamily: started,
          });
          expect(mission.wording).toBe(started % 2 ? 'plain' : 'school');
          expect(
            Number(mission.steps.at(-1)!.correctChoiceId.replace('value_', ''))
          ).toBeLessThanOrEqual(20);
        }
      }
      const later = Array.from({ length: 300 }, (_, seed) =>
        Number(
          createMission({ family, seed, support: 'independent', startedInFamily: 6 })
            .steps.at(-1)!
            .correctChoiceId.replace('value_', '')
        )
      );
      expect(Math.max(...later)).toBeGreaterThan(20);
    }
  });
});
