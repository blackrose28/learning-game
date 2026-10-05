import { canonical } from './shared';
import {
  generateDailyCollection,
  getDailyCollectionDiagram,
  getDailyCollectionFeedback,
  getDailyCollectionHint,
} from './dailyCollection';
import {
  getInstructionChainFeedback,
  getInstructionChainHint,
  validateInstructionChain,
} from './instructionChain';
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

/** The independent view contains no intermediate results, solution keys, or hints. */
export function getMissionView(mission: ReasoningMission, stepId: MissionStepId = 'final') {
  const effectiveStep = mission.support === 'independent' ? 'final' : stepId;
  const step = mission.steps.find((item) => item.id === effectiveStep);
  if (!step) throw new Error('Unknown mission step');
  return {
    missionId: mission.id,
    prompt: mission.prompt,
    stepId: step.id,
    stepPrompt: step.prompt,
    choices: step.choices.map((choice) => ({ ...choice })),
  };
}

export function getMissionHint(mission: ReasoningMission, level: MissionHintLevel): string {
  switch (mission.family) {
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
