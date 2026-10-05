import {
  generateDailyCollection,
  generateInstructionChainV2,
  generateUnknownStartV2,
  type MissionFamily,
  type MissionSupport,
  type ReasoningMission,
} from '@math-archer/learning-engine';

export const familyLabels: Record<MissionFamily, string> = {
  instruction_chain: 'Chuỗi lệnh',
  daily_collection: 'Sưu tầm mỗi ngày',
  unknown_start: 'Tìm số lúc đầu',
};

export interface NewMissionRequest {
  family: MissionFamily;
  seed: number;
  support: MissionSupport;
  /** How many missions of this family the child has already started. */
  startedInFamily: number;
}

/** Missions after the original example stay within 20 for two more missions, then range to 99. */
const EASY_MISSIONS = 3;

/**
 * The first mission in each family is the parent's original school example; the next two use
 * small numbers so the new challenge is the wording. Wording alternates after that.
 */
export function createMission({
  family,
  seed,
  support,
  startedInFamily,
}: NewMissionRequest): ReasoningMission {
  const first = startedInFamily === 0;
  const wording = startedInFamily % 2 === 0 ? ('school' as const) : ('plain' as const);
  const stage = startedInFamily < EASY_MISSIONS ? ('easy' as const) : ('standard' as const);
  const options = { seed, support, wording, stage };
  switch (family) {
    case 'daily_collection':
      return generateDailyCollection({
        ...options,
        ...(first
          ? {
              // Hải has 8 thẻ Kun, 1 more each day for 5 days: 13.
              parameters: { name: 'Hải', object: 'kun_cards', start: 8, perDay: 1, days: 5 },
            }
          : {}),
      });
    case 'unknown_start':
      return generateUnknownStartV2({
        ...options,
        ...(first
          ? {
              // After eating 4 and giving a dozen away, Mai has 34 left: 48 at the start.
              parameters: {
                name: 'Mai',
                item: 'candy',
                changes: [
                  { kind: 'loss', action: 'eat', count: 4, unit: 'one' },
                  { kind: 'loss', action: 'give_sister', count: 1, unit: 'chuc' },
                ],
                remaining: 34,
              },
            }
          : {}),
      });
    default:
      return generateInstructionChainV2({
        seed,
        support,
        wording,
        ...(first
          ? {
              // The original school example: hiệu của 14 và số liền sau của số 7, rồi cộng với 9.
              parameters: {
                relation: { kind: 'successor', number: 7 },
                combine: 'difference',
                other: 14,
                finalOperation: 'add',
                amount: 9,
              },
            }
          : {}),
      });
  }
}
