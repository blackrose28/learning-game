import { canonical } from './shared';
import {
  generateDailyCollection,
  getDailyCollectionDiagram,
  getDailyCollectionFeedback,
  getDailyCollectionHint,
} from './dailyCollection';
import {
  generateGrowingGapSequence,
  getGrowingGapSequenceDiagram,
  getGrowingGapSequenceFeedback,
  getGrowingGapSequenceHint,
} from './growingGapSequence';
import {
  getInstructionChainFeedback,
  getInstructionChainHint,
  validateInstructionChain,
} from './instructionChain';
import {
  generateMaxSumDigitCards,
  getMaxSumDigitCardsDiagram,
  getMaxSumDigitCardsFeedback,
  getMaxSumDigitCardsHint,
} from './maxSumDigitCards';
import {
  generateUnknownStart,
  getUnknownStartDiagram,
  getUnknownStartFeedback,
  getUnknownStartHint,
} from './unknownStart';
import {
  generateUnknownStartV2,
  getUnknownStartV2Diagram,
  getUnknownStartV2Feedback,
  getUnknownStartV2Hint,
} from './unknownStartV2';
import type {
  MissionChoice,
  MissionDiagram,
  MissionHintLevel,
  MissionStep,
  MissionStepId,
  ReasoningMission,
} from './types';

/** Regenerate the versioned template to verify all solution, choice, and prompt fields. */
export function validateMission(value: unknown): value is ReasoningMission {
  if (!value || typeof value !== 'object') return false;
  const mission = value as ReasoningMission;
  try {
    if (!mission.parameters || !mission.support || !mission.wording) return false;
    const options = { seed: mission.seed, support: mission.support, wording: mission.wording };
    switch (mission.templateId) {
      case 'daily_collection_v1':
        return (
          canonical(value) ===
          canonical(generateDailyCollection({ ...options, parameters: mission.parameters }))
        );
      case 'unknown_start_v1':
        return (
          canonical(value) ===
          canonical(generateUnknownStart({ ...options, parameters: mission.parameters }))
        );
      case 'unknown_start_v2':
        return (
          canonical(value) ===
          canonical(generateUnknownStartV2({ ...options, parameters: mission.parameters }))
        );
      case 'growing_gap_sequence_v1':
        return (
          canonical(value) ===
          canonical(generateGrowingGapSequence({ ...options, parameters: mission.parameters }))
        );
      case 'max_sum_digit_cards_v1':
        return (
          canonical(value) ===
          canonical(generateMaxSumDigitCards({ ...options, parameters: mission.parameters }))
        );
      default:
        return validateInstructionChain(value);
    }
  } catch {
    return false;
  }
}

/** A step may accept several equivalent plans; otherwise exactly one choice is correct. */
export function isAcceptedChoice(step: MissionStep, choiceId: string): boolean {
  return (step.acceptedChoiceIds ?? [step.correctChoiceId]).includes(choiceId);
}

export interface MissionView {
  missionId: string;
  prompt: string;
  stepId: MissionStepId;
  stepPrompt: string;
  choices: MissionChoice[];
  /** Present on card steps only: the bank to place from. `choices` is empty there. */
  input?: 'cards';
  cards?: number[];
}

/** The independent view contains no intermediate results, solution keys, or hints. */
export function getMissionView(
  mission: ReasoningMission,
  stepId: MissionStepId = 'final'
): MissionView {
  const effectiveStep = mission.support === 'independent' ? 'final' : stepId;
  const step = mission.steps.find((item) => item.id === effectiveStep);
  if (!step) throw new Error('Unknown mission step');
  return {
    missionId: mission.id,
    prompt: mission.prompt,
    stepId: step.id,
    stepPrompt: step.prompt,
    choices: step.choices.map((choice) => ({ ...choice })),
    // Card steps are answered by placing the bank's cards; the bank is already in the problem.
    ...(step.input === 'cards' ? { input: 'cards' as const, cards: [...(step.cards ?? [])] } : {}),
  };
}

export function getMissionHint(mission: ReasoningMission, level: MissionHintLevel): string {
  switch (mission.family) {
    case 'growing_gap_sequence':
      return getGrowingGapSequenceHint(mission, level);
    case 'max_sum_digit_cards':
      return getMaxSumDigitCardsHint(mission, level);
    case 'daily_collection':
      return getDailyCollectionHint(mission, level);
    case 'unknown_start':
      return mission.templateId === 'unknown_start_v2'
        ? getUnknownStartV2Hint(mission, level)
        : getUnknownStartHint(mission, level);
    default:
      return getInstructionChainHint(mission, level);
  }
}

/** Short, specific remediation shown after a wrong first response. */
export function getMissionStepFeedback(mission: ReasoningMission, stepId: MissionStepId): string {
  switch (mission.family) {
    case 'growing_gap_sequence':
      return getGrowingGapSequenceFeedback(mission, stepId);
    case 'max_sum_digit_cards':
      return getMaxSumDigitCardsFeedback(mission, stepId);
    case 'daily_collection':
      return getDailyCollectionFeedback(mission, stepId);
    case 'unknown_start':
      return mission.templateId === 'unknown_start_v2'
        ? getUnknownStartV2Feedback(mission, stepId)
        : getUnknownStartFeedback(mission, stepId);
    default:
      return getInstructionChainFeedback(mission, stepId);
  }
}

/** Guided-only picture for a story family; unanswered steps stay blank. */
export function getMissionDiagram(
  mission: ReasoningMission,
  completed: readonly MissionStepId[]
): MissionDiagram | null {
  switch (mission.family) {
    case 'growing_gap_sequence':
      return getGrowingGapSequenceDiagram(mission, completed);
    case 'max_sum_digit_cards':
      return getMaxSumDigitCardsDiagram(mission, completed);
    case 'daily_collection':
      return getDailyCollectionDiagram(mission, completed);
    case 'unknown_start':
      return mission.templateId === 'unknown_start_v2'
        ? getUnknownStartV2Diagram(mission, completed)
        : getUnknownStartDiagram(mission, completed);
    default:
      return null;
  }
}
