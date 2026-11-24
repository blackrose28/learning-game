import { createMulberry32 } from '../questions/generator';
import { assertSeed, boundedNumericChoices, isInt, shuffleWith, STORY_NAMES } from './shared';
import type {
  MissionHintLevel,
  MissionStep,
  MissionStepId,
  MissionSupport,
  RemainderDecisionMission,
  RemainderDecisionParameters,
} from './types';

export interface RemainderDecisionOptions {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  /** `easy`: totals within 20. `standard`: totals within 99. */
  stage?: 'easy' | 'standard';
  parameters?: RemainderDecisionParameters;
}

const MAX_TOTAL = 99;

const ITEM_VI: Record<RemainderDecisionParameters['item'], string> = {
  marble: 'viên bi',
  candy: 'cái kẹo',
  sticker: 'hình dán',
  book: 'quyển sách',
};

const CONTAINER_VI: Record<RemainderDecisionParameters['container'], string> = {
  box: 'hộp',
  bag: 'túi',
  tray: 'khay',
};

/** Builds a clean copy, so unknown fields can never ride along in a stored mission. */
function normalizeParameters(parameters: RemainderDecisionParameters): RemainderDecisionParameters {
  return {
    name: parameters?.name,
    item: parameters?.item,
    container: parameters?.container,
    total: parameters?.total,
    perContainer: parameters?.perContainer,
  };
}

/**
 * Physical objects in containers: the remainder always needs one more container, so the answer is
 * the next whole quotient. Zero-remainder division has its own families, and the remainder here is
 * never discarded, because every reviewed item is a real object.
 */
export function solveRemainderDecision(parameters: RemainderDecisionParameters) {
  const { name, item, container, total, perContainer } =
    parameters ?? ({} as RemainderDecisionParameters);
  if (
    !(STORY_NAMES as readonly string[]).includes(name) ||
    !(item in ITEM_VI) ||
    !(container in CONTAINER_VI) ||
    !isInt(total, 3, MAX_TOTAL) ||
    !isInt(perContainer, 2, 9)
  ) {
    throw new Error('Remainder missions require a reviewed name, items, and container capacity');
  }
  const quotient = Math.floor(total / perContainer);
  const remainder = total % perContainer;
  if (quotient < 2 || remainder === 0) {
    throw new Error('Remainder missions need at least two full containers and a leftover');
  }
  return { quotient, remainder, answer: quotient + 1 };
}

function randomParameters(
  pick: (min: number, max: number) => number,
  stage: 'easy' | 'standard'
): RemainderDecisionParameters {
  const items = ['marble', 'candy', 'sticker', 'book'] as const;
  const containers = ['box', 'bag', 'tray'] as const;
  const easy = stage === 'easy';
  const perContainer = pick(2, easy ? 5 : 9);
  const quotient = pick(2, easy ? 4 : 12);
  const remainder = pick(1, perContainer - 1);
  return {
    name: STORY_NAMES[pick(0, STORY_NAMES.length - 1)],
    item: items[pick(0, items.length - 1)],
    container: containers[pick(0, containers.length - 1)],
    total: Math.min(quotient * perContainer + remainder, MAX_TOTAL),
    perContainer,
  };
}

function calculationObjective(value: number) {
  return value > 20 ? ('calculation_over_20' as const) : ('calculation' as const);
}

export function generateRemainderDecision(
  options: RemainderDecisionOptions
): RemainderDecisionMission {
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
  const solution = solveRemainderDecision(parameters);
  const { name, item, container, total, perContainer } = parameters;
  const { quotient, remainder, answer } = solution;
  const itemVi = ITEM_VI[item];
  const containerVi = CONTAINER_VI[container];
  const product = quotient * perContainer;

  const steps: MissionStep[] = [
    {
      id: 'quotient',
      objective: 'remainder_quotient',
      dependsOn: [],
      prompt: `${total} chia ${perContainer} được mấy, còn dư mấy?`,
      // Distractors: drop the remainder entirely, one container off, subtract instead of divide.
      choices: boundedNumericChoices(
        quotient,
        [total - perContainer, quotient + 1, quotient - 1, perContainer],
        shuffleRng
      ),
      correctChoiceId: `value_${quotient}`,
    },
    {
      id: 'check_remainder',
      objective: 'remainder_check',
      dependsOn: ['quotient'],
      prompt: `${perContainer} × ${quotient} = ${product}. Vậy còn dư bao nhiêu ${itemVi}?`,
      // Distractors: the capacity, the quotient, and off-by-one leftovers.
      choices: boundedNumericChoices(
        remainder,
        [perContainer, quotient, remainder + 1, remainder - 1],
        shuffleRng
      ),
      correctChoiceId: `value_${remainder}`,
    },
    {
      id: 'round_up',
      objective: 'remainder_decision',
      dependsOn: ['check_remainder'],
      prompt: `Còn dư ${remainder} ${itemVi}. Có cần thêm một ${containerVi} nữa không?`,
      choices: shuffleWith(
        [
          {
            id: 'one_more',
            label: `Cần, dư ${remainder} ${itemVi} phải có ${containerVi} để đựng`,
            value: 'one_more',
          },
          { id: 'enough', label: 'Không cần, số hộp vừa tính là đủ', value: 'enough' },
          {
            id: 'leave_out',
            label: `Không cần, để lại ${remainder} ${itemVi} ngoài`,
            value: 'leave_out',
          },
        ],
        shuffleRng
      ),
      correctChoiceId: 'one_more',
    },
    {
      id: 'final',
      objective: calculationObjective(answer),
      dependsOn: ['round_up'],
      prompt: `Vậy cần ít nhất bao nhiêu ${containerVi}?`,
      // Distractors: the quotient (ignoring the remainder), the product, and one container too many.
      choices: boundedNumericChoices(
        answer,
        [quotient, product, answer + 1, total - product],
        shuffleRng
      ),
      correctChoiceId: `value_${answer}`,
    },
  ];

  const prompt =
    wording === 'school'
      ? `${name} có ${total} ${itemVi}. Mỗi ${containerVi} đựng được ${perContainer} ${itemVi}. Hỏi ${name} cần ít nhất bao nhiêu ${containerVi} để đựng hết ${itemVi}?`
      : `Có ${total} ${itemVi}. Mỗi ${containerVi} đựng được ${perContainer} ${itemVi}. Cần ít nhất bao nhiêu ${containerVi} để đựng hết?`;

  return {
    schemaVersion: 1,
    id: `remainder_decision_v1:${options.seed}:${STORY_NAMES.indexOf(name as (typeof STORY_NAMES)[number])}:${total}:${perContainer}:${wording}:${support}`,
    templateId: 'remainder_decision_v1',
    family: 'remainder_decision',
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

export function getRemainderDecisionHint(
  mission: RemainderDecisionMission,
  level: MissionHintLevel
): string {
  const { total, perContainer, container } = mission.parameters;
  const { quotient, remainder, answer } = mission.solution;
  switch (level) {
    case 'strategy':
      return 'Con chia số vật cho sức chứa của mỗi hộp, rồi xem phần dư: phần dư vẫn cần một hộp để đựng.';
    case 'partial':
      return `${total} : ${perContainer} = ${quotient} (dư ${remainder}). ${quotient} ${container} đựng được ${quotient * perContainer} vật, còn dư ${remainder} vật.`;
    case 'worked':
      return `${total} : ${perContainer} = ${quotient} (dư ${remainder}). ${quotient} ${container} đầy, phần dư ${remainder} vật cần thêm 1 ${container} nữa. Vậy cần ${quotient} + 1 = ${answer} ${container}.`;
    default:
      throw new Error('Unknown mission hint level');
  }
}

export function getRemainderDecisionFeedback(
  _mission: RemainderDecisionMission,
  stepId: MissionStepId
): string {
  switch (stepId) {
    case 'quotient':
      return 'Chia số vật cho sức chứa của mỗi hộp. Số dư ghi ở ngoài: "được mấy, dư mấy".';
    case 'check_remainder':
      return 'Lấy số vật trừ đi số vật đã đựng trong các hộp đầy, phần còn lại là số dư.';
    case 'round_up':
      return 'Phần dư vẫn là những vật thật, nên vẫn cần một hộp để đựng chúng.';
    default:
      return 'Số hộp đầy cộng thêm một hộp cho phần dư.';
  }
}
