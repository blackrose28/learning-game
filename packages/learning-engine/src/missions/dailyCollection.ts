import { createMulberry32 } from '../questions/generator';
import { assertSeed, boundedNumericChoices, isInt, shuffleWith, STORY_NAMES } from './shared';
import type {
  DailyCollectionMission,
  DailyCollectionParameters,
  DailyObjectKey,
  MissionChoice,
  MissionDiagram,
  MissionHintLevel,
  MissionStep,
  MissionStepId,
  MissionSupport,
} from './types';

export interface DailyCollectionOptions {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  /** `easy`: one per day, totals within 20. `standard`: one to five per day, totals within 99. */
  stage?: 'easy' | 'standard';
  parameters?: DailyCollectionParameters;
}

const MAX_TOTAL = 99;

const OBJECTS: Record<
  DailyObjectKey,
  { noun: string; short: string; gatherSchool: string; gatherPlain: string }
> = {
  kun_cards: {
    noun: 'thẻ Kun',
    short: 'thẻ',
    gatherSchool: 'sưu tầm thêm được',
    gatherPlain: 'sưu tầm được',
  },
  stickers: {
    noun: 'nhãn dán',
    short: 'nhãn dán',
    gatherSchool: 'có thêm',
    gatherPlain: 'có thêm',
  },
  marbles: {
    noun: 'viên bi',
    short: 'viên bi',
    gatherSchool: 'nhặt thêm được',
    gatherPlain: 'nhặt được',
  },
  stamps: {
    noun: 'con tem',
    short: 'con tem',
    gatherSchool: 'sưu tầm thêm được',
    gatherPlain: 'sưu tầm được',
  },
  shells: {
    noun: 'vỏ sò',
    short: 'vỏ sò',
    gatherSchool: 'nhặt thêm được',
    gatherPlain: 'nhặt được',
  },
};
const OBJECT_KEYS = Object.keys(OBJECTS) as DailyObjectKey[];

/** Builds a clean copy, so unknown fields can never ride along in a stored mission. */
function normalizeParameters(parameters: DailyCollectionParameters): DailyCollectionParameters {
  return {
    name: parameters?.name,
    object: parameters?.object,
    start: parameters?.start,
    perDay: parameters?.perDay,
    days: parameters?.days,
  };
}

export function solveDailyCollection(parameters: DailyCollectionParameters) {
  const { name, object, start, perDay, days } = parameters ?? ({} as DailyCollectionParameters);
  if (
    !(STORY_NAMES as readonly string[]).includes(name) ||
    !OBJECT_KEYS.includes(object) ||
    !isInt(start, 1, 60) ||
    !isInt(perDay, 1, 5) ||
    !isInt(days, 2, 7) ||
    start + perDay * days > MAX_TOTAL
  ) {
    throw new Error('Daily collection requires reviewed names, objects, and totals within 99');
  }
  const added = perDay * days;
  return { added, answer: start + added };
}

function randomParameters(
  pick: (min: number, max: number) => number,
  stage: 'easy' | 'standard'
): DailyCollectionParameters {
  const name = STORY_NAMES[pick(0, STORY_NAMES.length - 1)];
  const object = OBJECT_KEYS[pick(0, OBJECT_KEYS.length - 1)];
  if (stage === 'easy') {
    const days = pick(2, 6);
    return { name, object, start: pick(2, 20 - days), perDay: 1, days };
  }
  return { name, object, start: pick(2, 40), perDay: pick(1, 5), days: pick(2, 7) };
}

export function generateDailyCollection(options: DailyCollectionOptions): DailyCollectionMission {
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
  const solution = solveDailyCollection(parameters);
  const { name, object, start, perDay, days } = parameters;
  const { added, answer } = solution;
  const { noun, short, gatherSchool, gatherPlain } = OBJECTS[object];

  const textChoices = (candidates: [string, string][]): MissionChoice[] => {
    const seen = new Set<string>();
    const unique = candidates.filter(([, label]) => !seen.has(label) && seen.add(label));
    return shuffleWith(
      unique.slice(0, 4).map(([id, label]) => ({ id, label, value: id })),
      shuffleRng
    );
  };

  const steps: MissionStep[] = [
    {
      id: 'start_amount',
      objective: 'starting_amount',
      dependsOn: [],
      prompt: `Trước khi có thêm ${short} mỗi ngày, ${name} có mấy ${short}?`,
      choices: boundedNumericChoices(start, [perDay, days, answer, added], shuffleRng),
      correctChoiceId: `value_${start}`,
    },
    {
      id: 'repeated_change',
      objective: 'repeated_change',
      dependsOn: ['start_amount'],
      prompt:
        perDay === 1
          ? `Sau ${days} ngày, ${name} có thêm được mấy ${short}?`
          : `Mỗi ngày ${name} có thêm ${perDay} ${short}. Sau ${days} ngày, ${name} có thêm được tất cả mấy ${short}?`,
      choices: boundedNumericChoices(
        added,
        [perDay, perDay * (days - 1), start, days, added + perDay],
        shuffleRng
      ),
      correctChoiceId: `value_${added}`,
    },
    {
      id: 'plan',
      objective: 'choose_operation',
      dependsOn: ['repeated_change'],
      prompt: `Muốn biết tất cả số ${short}, con chọn phép tính nào?`,
      choices: textChoices([
        ['add_all', `${start} + ${added}`],
        ['subtract_added', `${start} − ${added}`],
        ['one_day_only', `${start} + ${perDay}`],
        ['missed_day', `${start} + ${added - perDay}`],
        ['extra_day', `${start} + ${added + perDay}`],
      ]),
      correctChoiceId: 'add_all',
    },
    {
      id: 'final',
      objective: answer > 20 ? 'calculation_over_20' : 'calculation',
      dependsOn: ['plan'],
      prompt: `${name} có tất cả bao nhiêu ${noun}?`,
      choices: boundedNumericChoices(
        answer,
        [start + perDay, start + added - perDay, added, start + days, start + added + perDay],
        shuffleRng
      ),
      correctChoiceId: `value_${answer}`,
    },
  ];

  const prompt =
    wording === 'school'
      ? `${name} có ${start} ${noun}. Mỗi ngày, ${name} ${gatherSchool} ${perDay} ${short}${perDay === 1 ? ' nữa' : ''}. Hỏi sau ${days} ngày, ${name} có tất cả bao nhiêu ${noun}?`
      : `Trong ${days} ngày, mỗi ngày ${name} ${gatherPlain} ${perDay} ${short}. Trước đó ${name} đã có ${start} ${noun}. Bây giờ ${name} có bao nhiêu ${noun}?`;

  return {
    schemaVersion: 1,
    id: `daily_collection_v1:${options.seed}:${object}:${STORY_NAMES.indexOf(name as (typeof STORY_NAMES)[number])}:${start}:${perDay}x${days}:${wording}:${support}`,
    templateId: 'daily_collection_v1',
    family: 'daily_collection',
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

export function getDailyCollectionHint(
  mission: DailyCollectionMission,
  level: MissionHintLevel
): string {
  const { name, object, start, perDay, days } = mission.parameters;
  const { added, answer } = mission.solution;
  const { short } = OBJECTS[object];
  switch (level) {
    case 'strategy':
      return `${name} đã có một số ${short} từ trước. Con cần tính cả số ${short} có sẵn và số ${short} có thêm sau mỗi ngày.${perDay > 1 ? ` Mỗi ngày thêm ${perDay}, nên cộng lặp lại cho từng ngày.` : ''}`;
    case 'partial':
      return `Có sẵn: □ | ${Array.from({ length: days }, (_, i) => `Ngày ${i + 1}: +${perDay}`).join(' | ')} | Tất cả: ?`;
    case 'worked': {
      const repeated = Array.from({ length: days }, () => perDay).join(' + ');
      return `Sau ${days} ngày, ${name} có thêm ${repeated} = ${added} ${short}. ${name} có tất cả: ${start} + ${added} = ${answer} ${short}.`;
    }
    default:
      throw new Error('Unknown mission hint level');
  }
}

export function getDailyCollectionFeedback(
  mission: DailyCollectionMission,
  stepId: MissionStepId
): string {
  const { short } = OBJECTS[mission.parameters.object];
  const { perDay } = mission.parameters;
  switch (stepId) {
    case 'start_amount':
      return `Số ${short} có sẵn là số ${short} trước khi ngày đầu tiên bắt đầu có thêm.`;
    case 'repeated_change':
      return `Mỗi ngày có thêm ${perDay} ${short}. Đếm từng ngày, không bỏ sót ngày nào, rồi cộng lặp lại.`;
    case 'plan':
      return `Số ${short} có sẵn vẫn còn, và số ${short} có thêm được thêm vào. Con ghép hai phần đó lại.`;
    default:
      return 'Đọc lại đề, rồi kiểm tra phép cộng ở bước trước.';
  }
}

/** Day slots stay blank until the child has answered the matching step. */
export function getDailyCollectionDiagram(
  mission: DailyCollectionMission,
  completed: readonly MissionStepId[]
): MissionDiagram | null {
  if (mission.support !== 'guided') return null;
  const { start, perDay, days } = mission.parameters;
  const { answer } = mission.solution;
  const done = new Set(completed);
  return {
    caption: 'Các ngày',
    rows: [
      [
        `Có sẵn: ${done.has('start_amount') ? start : '□'}`,
        ...Array.from(
          { length: days },
          (_, i) => `Ngày ${i + 1}: ${done.has('repeated_change') ? `+${perDay}` : '□'}`
        ),
        `Tất cả: ${done.has('final') ? answer : '?'}`,
      ],
    ],
  };
}
