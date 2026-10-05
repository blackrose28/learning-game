import {
  generateDailyCollection,
  generateGrowingGapSequence,
  generateInstructionChainV2,
  generateMaxSumDigitCards,
  generateUnknownStartV2,
  type DailyCollectionParameters,
  type GrowingGapSequenceParameters,
  type InstructionChainV2Parameters,
  type MaxSumDigitCardsParameters,
  type MissionFamily,
  type MissionSupport,
  type ReasoningMission,
  type UnknownStartV2Parameters,
} from '@math-archer/learning-engine';

export const familyLabels: Record<MissionFamily, string> = {
  instruction_chain: 'Chuỗi lệnh',
  daily_collection: 'Sưu tầm mỗi ngày',
  unknown_start: 'Tìm số lúc đầu',
  growing_gap_sequence: 'Dãy số có quy luật',
  max_sum_digit_cards: 'Xếp thẻ số',
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

/** The parent's original school examples, one per family. */
const ORIGINALS: {
  daily_collection: DailyCollectionParameters;
  unknown_start: UnknownStartV2Parameters;
  growing_gap_sequence: GrowingGapSequenceParameters;
  max_sum_digit_cards: MaxSumDigitCardsParameters;
  instruction_chain: InstructionChainV2Parameters;
} = {
  // Hải has 8 thẻ Kun, 1 more each day for 5 days: 13.
  daily_collection: { name: 'Hải', object: 'kun_cards', start: 8, perDay: 1, days: 5 },
  // After eating 4 and giving a dozen away, Mai has 34 left: 48 at the start.
  unknown_start: {
    name: 'Mai',
    item: 'candy',
    changes: [
      { kind: 'loss', action: 'eat', count: 4, unit: 'one' },
      { kind: 'loss', action: 'give_sister', count: 1, unit: 'chuc' },
    ],
    remaining: 34,
  },
  // 0; 2; 6; 12; 20; …: gaps +2, +4, +6, … so the seventh term is 42.
  growing_gap_sequence: { first: 0, firstGap: 2, gapStep: 2, shown: 5, target: 7 },
  // Cards 3, 2, 5, 4, 1: use four of them once each; the best total is 95.
  max_sum_digit_cards: { name: 'Hà', cards: [3, 2, 5, 4, 1] },
  // The original school example: hiệu của 14 và số liền sau của số 7, rồi cộng với 9.
  instruction_chain: {
    relation: { kind: 'successor', number: 7 },
    combine: 'difference',
    other: 14,
    finalOperation: 'add',
    amount: 9,
  },
};

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
        ...(first ? { parameters: ORIGINALS.daily_collection } : {}),
      });
    case 'unknown_start':
      return generateUnknownStartV2({
        ...options,
        ...(first ? { parameters: ORIGINALS.unknown_start } : {}),
      });
    case 'growing_gap_sequence':
      return generateGrowingGapSequence({
        ...options,
        ...(first ? { parameters: ORIGINALS.growing_gap_sequence } : {}),
      });
    case 'max_sum_digit_cards':
      return generateMaxSumDigitCards({
        ...options,
        ...(first ? { parameters: ORIGINALS.max_sum_digit_cards } : {}),
      });
    default:
      return generateInstructionChainV2({
        seed,
        support,
        wording,
        ...(first ? { parameters: ORIGINALS.instruction_chain } : {}),
      });
  }
}

/**
 * Like createMission, but retries other seeds so the child is not given a problem whose text they
 * already attempted. The original example (first in a family) is never retried.
 */
export function createDistinctMission(
  request: NewMissionRequest,
  seenPrompts: ReadonlySet<string>
): ReasoningMission {
  let mission = createMission(request);
  for (let tries = 1; tries < 25 && seenPrompts.has(mission.prompt); tries++) {
    mission = createMission({ ...request, seed: (request.seed + tries * 2654435761) >>> 0 });
  }
  return mission;
}
