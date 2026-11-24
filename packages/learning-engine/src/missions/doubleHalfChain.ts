import { createMulberry32 } from '../questions/generator';
import { assertSeed, boundedNumericChoices, isInt, shuffleWith } from './shared';
import type {
  DoubleHalfChainMission,
  DoubleHalfChainParameters,
  MissionHintLevel,
  MissionStep,
  MissionStepId,
  MissionSupport,
} from './types';

export interface DoubleHalfChainOptions {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  /** `easy`: ×2 with four listed terms, one past. `standard`: ×2, ×3 or ×5, up to two past. */
  stage?: 'easy' | 'standard';
  parameters?: DoubleHalfChainParameters;
}

const MAX_TERM = 99;

/** Builds a clean copy, so unknown fields can never ride along in a stored mission. */
function normalizeParameters(parameters: DoubleHalfChainParameters): DoubleHalfChainParameters {
  return {
    first: parameters?.first,
    ratio: parameters?.ratio,
    shown: parameters?.shown,
    target: parameters?.target,
  };
}

/**
 * The intended rule: each term is `ratio` times the one before. A finite list fits other rules;
 * this is the one the answer is checked against, and the wording names it as a multiplying rule.
 */
export function solveDoubleHalfChain(parameters: DoubleHalfChainParameters) {
  const { first, ratio, shown, target } = parameters ?? ({} as DoubleHalfChainParameters);
  if (
    !isInt(first, 0, 9) ||
    !isInt(ratio, 2, 5) ||
    !isInt(shown, 3, 5) ||
    !isInt(target, shown + 1, shown + 2)
  ) {
    throw new Error('Multiplying chains require reviewed starts, ratios, and positions');
  }
  const terms = [first];
  for (let k = 1; k < target; k++) terms.push(terms[k - 1] * ratio);
  if (terms[target - 1] > MAX_TERM) throw new Error('Chain terms must stay within 99');
  return { terms, answer: terms[target - 1] };
}

function randomParameters(
  pick: (min: number, max: number) => number,
  stage: 'easy' | 'standard'
): DoubleHalfChainParameters {
  const easy = stage === 'easy';
  const ratio = easy ? 2 : ([2, 3, 5] as const)[pick(0, 2)];
  const shown = easy ? 4 : pick(3, 4);
  const target = shown + (easy ? 1 : pick(1, 2));
  // Each step multiplies, so the start must keep the last term within MAX_TERM.
  const maxFirst = Math.floor(MAX_TERM / Math.pow(ratio, target - 1));
  return {
    first: pick(1, Math.max(1, Math.min(easy ? 3 : 9, maxFirst))),
    ratio,
    shown,
    target,
  };
}

function calculationObjective(value: number) {
  return value > 20 ? ('calculation_over_20' as const) : ('calculation' as const);
}

export function generateDoubleHalfChain(options: DoubleHalfChainOptions): DoubleHalfChainMission {
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
  const solution = solveDoubleHalfChain(parameters);
  const { first, ratio, shown, target } = parameters;
  const { terms, answer } = solution;
  const last = terms[shown - 1];
  const gaps = terms.slice(1, shown).map((term, index) => term - terms[index]);

  const steps: MissionStep[] = [
    {
      id: 'observe_ratio',
      objective: 'ratio_observation',
      dependsOn: [],
      prompt: `Từ ${terms[0]} đến ${terms[1]}, số được gấp lên mấy lần?`,
      // Distractors: the additive gap (the key trap), off-by-one factors, and the start itself.
      choices: boundedNumericChoices(ratio, [gaps[0], ratio + 1, ratio - 1, first], shuffleRng),
      correctChoiceId: `value_${ratio}`,
    },
    {
      id: 'next_ratio',
      objective: 'extend_ratio',
      dependsOn: ['observe_ratio'],
      prompt: `Các khoảng cách giữa hai số liền nhau là ${gaps.join(', ')}. Vậy quy luật của dãy là gì?`,
      choices: shuffleWith(
        [
          { id: `multiply_${ratio}`, label: `Nhân ${ratio} mỗi lần`, value: `multiply_${ratio}` },
          { id: 'add_first_gap', label: `Cộng ${gaps[0]} mỗi lần`, value: 'add_first_gap' },
          {
            id: 'add_last_gap',
            label: `Cộng ${gaps[gaps.length - 1]} mỗi lần`,
            value: 'add_last_gap',
          },
          {
            id: `multiply_${ratio + 1}`,
            label: `Nhân ${ratio + 1} mỗi lần`,
            value: `multiply_${ratio + 1}`,
          },
        ],
        shuffleRng
      ),
      correctChoiceId: `multiply_${ratio}`,
    },
  ];
  if (target === shown + 2) {
    const next = terms[shown];
    steps.push({
      id: 'next_term',
      objective: calculationObjective(next),
      dependsOn: ['next_ratio'],
      prompt: `Số thứ ${shown + 1} là số nào?`,
      // Distractors: stop at the additive step, double the multiplying step, and the earlier term.
      choices: boundedNumericChoices(
        next,
        [last + gaps[gaps.length - 1], last * ratio * ratio, last, next + first],
        shuffleRng
      ),
      correctChoiceId: `value_${next}`,
    });
  }
  const before = terms[target - 2];
  steps.push({
    id: 'final',
    objective: calculationObjective(answer),
    dependsOn: [steps[steps.length - 1].id],
    prompt: `Số thứ ${target} là số nào?`,
    // Distractors: stop at the additive step, one multiplying step short, and one too far.
    choices: boundedNumericChoices(
      answer,
      [before + gaps[gaps.length - 1], before, answer * ratio, answer + first],
      shuffleRng
    ),
    correctChoiceId: `value_${answer}`,
  });

  const listed = terms.slice(0, shown).join('; ');
  const prompt =
    wording === 'school'
      ? `Dãy số sau được lập theo quy luật nhân: ${listed}; … Số thứ ${target} của dãy là bao nhiêu?`
      : `Các số đầu là ${listed}. Mỗi số gấp lên như số trước nó. Số thứ ${target} là bao nhiêu?`;

  return {
    schemaVersion: 1,
    id: `double_half_chain_v1:${options.seed}:${first}x${ratio}:${shown}>${target}:${wording}:${support}`,
    templateId: 'double_half_chain_v1',
    family: 'double_half_chain',
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

export function getDoubleHalfChainHint(
  mission: DoubleHalfChainMission,
  level: MissionHintLevel
): string {
  const { shown, target } = mission.parameters;
  const { terms, answer } = mission.solution;
  switch (level) {
    case 'strategy':
      return 'Con thử nhân mỗi số với số ngay trước nó xem gấp lên mấy lần, rồi dùng lần nhân đó cho các số tiếp theo.';
    case 'partial': {
      const cells = terms.map((term, index) => {
        const known = index < shown;
        const factor = index === 0 ? '' : ` (×${mission.parameters.ratio})`;
        return `Thứ ${index + 1}: ${known ? term : '□'}${factor}`;
      });
      return cells.join(' | ');
    }
    case 'worked': {
      const lines: string[] = [];
      for (let index = shown; index < target; index++) {
        const ordinal = index === shown ? 'Sau' : 'Rồi';
        lines.push(
          `${ordinal} ${terms[index - 1]}, nhân ${mission.parameters.ratio} được ${terms[index]} là số thứ ${index + 1}.`
        );
      }
      return `${lines.join(' ')} Số thứ ${target} là ${answer}.`;
    }
    default:
      throw new Error('Unknown mission hint level');
  }
}

export function getDoubleHalfChainFeedback(
  mission: DoubleHalfChainMission,
  stepId: MissionStepId
): string {
  const { ratio } = mission.parameters;
  switch (stepId) {
    case 'observe_ratio':
      return 'Lấy số sau chia số ngay trước nó để biết nó gấp lên mấy lần.';
    case 'next_ratio':
      return 'Khoảng cách cộng thêm mỗi lần một khác, nên quy luật không phải là cộng. Mỗi số gấp lên đúng bằng nhau.';
    case 'next_term':
      return `Lấy số vừa có, nhân ${ratio} lần nữa.`;
    default:
      return `Mỗi số bằng số ngay trước nó nhân ${ratio}. Nhân tiếp từ số cuối đã liệt kê.`;
  }
}
