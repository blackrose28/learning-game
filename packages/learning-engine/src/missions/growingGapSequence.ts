import { createMulberry32 } from '../questions/generator';
import { assertSeed, boundedNumericChoices, isInt } from './shared';
import type {
  GrowingGapSequenceMission,
  GrowingGapSequenceParameters,
  MissionDiagram,
  MissionHintLevel,
  MissionStep,
  MissionStepId,
  MissionSupport,
} from './types';

export interface GrowingGapSequenceOptions {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  /** `easy`: small numbers, one term past the list. `standard`: up to two terms past it. */
  stage?: 'easy' | 'standard';
  parameters?: GrowingGapSequenceParameters;
}

const MAX_TERM = 99;

/** Builds a clean copy, so unknown fields can never ride along in a stored mission. */
function normalizeParameters(
  parameters: GrowingGapSequenceParameters
): GrowingGapSequenceParameters {
  return {
    first: parameters?.first,
    firstGap: parameters?.firstGap,
    gapStep: parameters?.gapStep,
    shown: parameters?.shown,
    target: parameters?.target,
  };
}

/**
 * The declared rule: gap k (term k to term k+1) is `firstGap + (k − 1) × gapStep`. A finite list
 * fits many rules, so the problem always states this one.
 */
export function solveGrowingGapSequence(parameters: GrowingGapSequenceParameters) {
  const { first, firstGap, gapStep, shown, target } =
    parameters ?? ({} as GrowingGapSequenceParameters);
  if (
    !isInt(first, 0, 20) ||
    !isInt(firstGap, 1, 4) ||
    !isInt(gapStep, 1, 3) ||
    !isInt(shown, 4, 5) ||
    !isInt(target, shown + 1, shown + 2)
  ) {
    throw new Error('Growing-gap sequences require reviewed starts, gaps, and positions');
  }
  const terms = [first];
  const gaps: number[] = [];
  for (let k = 1; k < target; k++) {
    const gap = firstGap + (k - 1) * gapStep;
    gaps.push(gap);
    terms.push(terms[k - 1] + gap);
  }
  if (terms[target - 1] > MAX_TERM) throw new Error('Sequence terms must stay within 99');
  return { terms, gaps, answer: terms[target - 1] };
}

function randomParameters(
  pick: (min: number, max: number) => number,
  stage: 'easy' | 'standard'
): GrowingGapSequenceParameters {
  if (stage === 'easy') {
    const shown = pick(4, 5);
    return {
      first: pick(0, 9),
      firstGap: pick(1, 3),
      gapStep: pick(1, 2),
      shown,
      target: shown + 1,
    };
  }
  const shown = pick(4, 5);
  return {
    first: pick(0, 20),
    firstGap: pick(1, 4),
    gapStep: pick(1, 3),
    shown,
    target: shown + pick(1, 2),
  };
}

function calculationObjective(value: number) {
  return value > 20 ? ('calculation_over_20' as const) : ('calculation' as const);
}

export function generateGrowingGapSequence(
  options: GrowingGapSequenceOptions
): GrowingGapSequenceMission {
  assertSeed(options.seed);
  const support = options.support ?? 'guided';
  const wording = options.wording ?? 'school';
  const stage = options.stage ?? 'standard';
  if (
    !['guided', 'independent'].includes(support) ||
    !['school', 'plain'].includes(wording) ||
    !['easy', 'standard'].includes(stage)
  ) {
    throw new Error('Unsupported mission support, wording, or stage');
  }
  // Separate streams: choice order never depends on whether parameters were supplied.
  const paramRng = createMulberry32(options.seed);
  const shuffleRng = createMulberry32((options.seed ^ 0x9e3779b9) >>> 0);
  const pick = (min: number, max: number) => min + Math.floor(paramRng() * (max - min + 1));
  const parameters = normalizeParameters(options.parameters ?? randomParameters(pick, stage));
  const solution = solveGrowingGapSequence(parameters);
  const { first, firstGap, gapStep, shown, target } = parameters;
  const { terms, gaps, answer } = solution;
  const last = terms[shown - 1];
  const lastGap = gaps[shown - 2];
  const nextGap = gaps[shown - 1];

  const steps: MissionStep[] = [
    {
      id: 'term_position',
      objective: 'term_position',
      dependsOn: [],
      prompt: `Trong dãy này, ${last} là số thứ mấy?`,
      // Distractors: counting from zero, off by one, and the value instead of the position.
      choices: boundedNumericChoices(shown, [shown - 1, shown + 1, last], shuffleRng),
      correctChoiceId: `value_${shown}`,
    },
    {
      id: 'observe_gap',
      objective: 'gap_observation',
      dependsOn: ['term_position'],
      prompt: `Từ ${terms[shown - 2]} đến ${last} tăng thêm bao nhiêu?`,
      // Distractors: a fixed gap, the gap before, the value, and one gap too far.
      choices: boundedNumericChoices(
        lastGap,
        [firstGap, gaps[shown - 3], last, lastGap + gapStep],
        shuffleRng
      ),
      correctChoiceId: `value_${lastGap}`,
    },
    {
      id: 'next_gap',
      objective: 'extend_rule',
      dependsOn: ['observe_gap'],
      prompt: `Các bước tăng là ${gaps.slice(0, shown - 1).join(', ')}. Bước tăng tiếp theo là bao nhiêu?`,
      // Distractors: repeat the gap, restart, skip one, and the next term instead of the gap.
      choices: boundedNumericChoices(
        nextGap,
        [lastGap, firstGap, nextGap + gapStep, last + nextGap],
        shuffleRng
      ),
      correctChoiceId: `value_${nextGap}`,
    },
  ];
  if (target === shown + 2) {
    const next = terms[shown];
    steps.push({
      id: 'next_term',
      objective: calculationObjective(next),
      dependsOn: ['next_gap'],
      prompt: `Số thứ ${shown + 1} là số nào?`,
      choices: boundedNumericChoices(
        next,
        [last + lastGap, nextGap, last + nextGap + gapStep, last],
        shuffleRng
      ),
      correctChoiceId: `value_${next}`,
    });
  }
  const before = terms[target - 2];
  const previousGap = gaps[target - 3];
  steps.push({
    id: 'final',
    objective: calculationObjective(answer),
    dependsOn: [steps[steps.length - 1].id],
    prompt: `Số thứ ${target} là số nào?`,
    // Distractors: stop at the earlier term, repeat the previous gap, repeat the last listed gap
    // (forgetting that gaps grow), and the gap itself.
    choices: boundedNumericChoices(
      answer,
      [
        before,
        before + previousGap,
        last + lastGap * (target - shown),
        gaps[target - 2],
        answer + gapStep,
      ],
      shuffleRng
    ),
    correctChoiceId: `value_${answer}`,
  });

  const listed = terms.slice(0, shown).join('; ');
  const rule = `mỗi bước tăng nhiều hơn bước trước ${gapStep} đơn vị`;
  const prompt =
    wording === 'school'
      ? `Viết số thứ ${target} vào dãy số có quy luật sau: ${listed}; … Quy luật: ${rule}.`
      : `${rule[0].toUpperCase()}${rule.slice(1)}. Các số đầu là ${listed}. Số ở vị trí thứ ${target} là số nào?`;

  return {
    schemaVersion: 1,
    id: `growing_gap_sequence_v1:${options.seed}:${first}+${firstGap}+${gapStep}:${shown}>${target}:${wording}:${support}`,
    templateId: 'growing_gap_sequence_v1',
    family: 'growing_gap_sequence',
    locale: 'vi',
    seed: options.seed,
    wording,
    support,
    parameters,
    prompt,
    solution,
    steps,
  };
}

export function getGrowingGapSequenceHint(
  mission: GrowingGapSequenceMission,
  level: MissionHintLevel
): string {
  const { gapStep, shown, target } = mission.parameters;
  const { terms, gaps, answer } = mission.solution;
  switch (level) {
    case 'strategy':
      return `Con thử tính mỗi số hơn số ngay trước nó bao nhiêu. Bài này có quy luật: mỗi bước tăng nhiều hơn bước trước ${gapStep} đơn vị.`;
    case 'partial': {
      const cells = terms.map((term, index) => {
        const known = index < shown;
        const gap = index === 0 ? '' : ` (+${known ? gaps[index - 1] : '□'})`;
        return `Thứ ${index + 1}: ${known ? term : '□'}${gap}`;
      });
      return cells.join(' | ');
    }
    case 'worked': {
      const lines: string[] = [];
      for (let index = shown; index < target; index++) {
        const ordinal = index === shown ? 'Sau' : 'Rồi';
        lines.push(
          `${ordinal} ${terms[index - 1]}, cộng ${gaps[index - 1]} được ${terms[index]} là số thứ ${index + 1}.`
        );
      }
      return `${lines.join(' ')} Số thứ ${target} là ${answer}.`;
    }
    default:
      throw new Error('Unknown mission hint level');
  }
}

export function getGrowingGapSequenceFeedback(
  mission: GrowingGapSequenceMission,
  stepId: MissionStepId
): string {
  const { gapStep } = mission.parameters;
  switch (stepId) {
    case 'term_position':
      return 'Số thứ mấy là vị trí trong dãy, tính từ số đầu tiên là số thứ 1. Vị trí khác với giá trị của số.';
    case 'observe_gap':
      return 'Lấy số sau trừ số ngay trước nó để biết nó tăng thêm bao nhiêu.';
    case 'next_gap':
      return `Mỗi bước tăng nhiều hơn bước trước ${gapStep} đơn vị. Nhìn bước tăng gần nhất rồi tăng thêm ${gapStep}.`;
    case 'next_term':
      return 'Lấy số vừa có, cộng với bước tăng vừa tìm được.';
    default:
      return 'Đọc lại quy luật, rồi cộng từng bước tăng mới vào số ngay trước.';
  }
}

/** Numbered terms with their gaps. A term and its gap stay blank until their step is answered. */
export function getGrowingGapSequenceDiagram(
  mission: GrowingGapSequenceMission,
  completed: readonly MissionStepId[]
): MissionDiagram | null {
  if (mission.support !== 'guided') return null;
  const { shown, target } = mission.parameters;
  const { terms, gaps } = mission.solution;
  const done = new Set(completed);
  const cell = (index: number) => {
    const position = index + 1;
    if (index < shown) {
      return `Thứ ${position}: ${terms[index]}${index === 0 ? '' : ` (+${gaps[index - 1]})`}`;
    }
    const shownNow =
      position === target ? done.has('final') : position === shown + 1 && done.has('next_term');
    const gapNow = position === shown + 1 ? done.has('next_gap') : done.has('final');
    return `Thứ ${position}: ${shownNow ? terms[index] : '?'} (+${gapNow ? gaps[index - 1] : '□'})`;
  };
  return {
    caption: 'Các số thứ tự',
    rows: [Array.from({ length: target }, (_, index) => cell(index))],
  };
}
