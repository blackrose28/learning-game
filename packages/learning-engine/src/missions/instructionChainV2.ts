import { createMulberry32 } from '../questions/generator';
import { assertSeed } from './shared';
import type {
  InstructionChainMissionV2,
  InstructionChainV2Parameters,
  MissionChoice,
  MissionHintLevel,
  MissionObjective,
  MissionStep,
  MissionStepId,
  MissionSupport,
  NumberRelation,
} from './types';

export interface InstructionChainV2Options {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  parameters?: InstructionChainV2Parameters;
}

const MAX_RESULT = 20;

function isInt(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/** Builds a clean copy, so unknown fields can never ride along in a stored mission. */
function normalizeParameters(
  parameters: InstructionChainV2Parameters
): InstructionChainV2Parameters {
  const { relation } = parameters;
  const kind = relation?.kind;
  const normalizedRelation: NumberRelation =
    kind === 'greater' || kind === 'less'
      ? { kind, number: relation.number, offset: (relation as { offset: number }).offset }
      : { kind: kind as 'successor' | 'predecessor', number: relation?.number };
  return {
    relation: normalizedRelation,
    combine: parameters.combine,
    other: parameters.other,
    finalOperation: parameters.finalOperation,
    amount: parameters.amount,
  };
}

export function solveInstructionChainV2(parameters: InstructionChainV2Parameters) {
  const { relation, combine, other, finalOperation, amount } = parameters;
  let found: number;
  switch (relation?.kind) {
    case 'successor':
      found = relation.number + 1;
      break;
    case 'predecessor':
      found = relation.number - 1;
      break;
    case 'greater':
    case 'less': {
      if (!isInt(relation.offset, 2, 5)) throw new Error('Offset must be between 2 and 5');
      found =
        relation.kind === 'greater'
          ? relation.number + relation.offset
          : relation.number - relation.offset;
      break;
    }
    default:
      throw new Error('Unsupported number relation');
  }
  if (
    !isInt(relation.number, 1, MAX_RESULT) ||
    !isInt(found, 1, MAX_RESULT) ||
    !isInt(other, 1, MAX_RESULT) ||
    !isInt(amount, 1, 9) ||
    !['difference', 'sum'].includes(combine) ||
    !['add', 'subtract'].includes(finalOperation)
  ) {
    throw new Error('Instruction chain requires positive quantities and results within 20');
  }
  const combined = combine === 'difference' ? other - found : other + found;
  const answer = finalOperation === 'add' ? combined + amount : combined - amount;
  if (!isInt(combined, 1, MAX_RESULT) || !isInt(answer, 1, MAX_RESULT)) {
    throw new Error('Instruction chain requires positive quantities and results within 20');
  }
  return { found, combined, answer };
}

const combineWord = (combine: 'difference' | 'sum') => (combine === 'difference' ? 'hiệu' : 'tổng');
const capitalized = (word: string) => word[0].toUpperCase() + word.slice(1);
const combineSymbol = (combine: 'difference' | 'sum') => (combine === 'difference' ? '−' : '+');
const finalSymbol = (operation: 'add' | 'subtract') => (operation === 'add' ? '+' : '−');

/** Phrase inside the problem text; "school" follows textbook wording, "plain" rephrases it. */
function relationPhrase(relation: NumberRelation, wording: 'school' | 'plain'): string {
  const n = relation.number;
  switch (relation.kind) {
    case 'successor':
      return wording === 'school' ? `số liền sau của số ${n}` : `số ngay sau ${n}`;
    case 'predecessor':
      return wording === 'school' ? `số liền trước của số ${n}` : `số ngay trước ${n}`;
    case 'greater':
      return wording === 'school'
        ? `số lớn hơn ${n} là ${relation.offset} đơn vị`
        : `số hơn ${n} là ${relation.offset} đơn vị`;
    case 'less':
      return wording === 'school'
        ? `số bé hơn ${n} là ${relation.offset} đơn vị`
        : `số kém ${n} là ${relation.offset} đơn vị`;
  }
}

/** Phrase inside a guided step question; it always teaches the textbook term. */
function stepQuestion(relation: NumberRelation): string {
  const n = relation.number;
  switch (relation.kind) {
    case 'successor':
      return `Số liền sau của ${n} là số nào?`;
    case 'predecessor':
      return `Số liền trước của ${n} là số nào?`;
    case 'greater':
      return `Số lớn hơn ${n} là ${relation.offset} đơn vị là số nào?`;
    case 'less':
      return `Số bé hơn ${n} là ${relation.offset} đơn vị là số nào?`;
  }
}

function relationObjective(relation: NumberRelation): MissionObjective {
  switch (relation.kind) {
    case 'successor':
      return 'successor_vocabulary';
    case 'predecessor':
      return 'predecessor_vocabulary';
    case 'greater':
      return 'greater_by_vocabulary';
    case 'less':
      return 'less_by_vocabulary';
  }
}

/** Numbers a child plausibly picks when misreading the relation. */
function relationDistractors(relation: NumberRelation): number[] {
  const n = relation.number;
  switch (relation.kind) {
    case 'successor':
      return [n - 1, n, n + 2];
    case 'predecessor':
      return [n + 1, n, n - 2];
    case 'greater':
      return [n - relation.offset, n + 1, n + relation.offset + 1];
    case 'less':
      return [n + relation.offset, n - 1, n - relation.offset - 1];
  }
}

export function generateInstructionChainV2(
  options: InstructionChainV2Options
): InstructionChainMissionV2 {
  assertSeed(options.seed);
  const support = options.support ?? 'guided';
  const wording = options.wording ?? 'school';
  if (!['guided', 'independent'].includes(support) || !['school', 'plain'].includes(wording)) {
    throw new Error('Unsupported mission support or wording');
  }
  // Separate streams: choice order never depends on whether parameters were supplied.
  const paramRng = createMulberry32(options.seed);
  const shuffleRng = createMulberry32((options.seed ^ 0x9e3779b9) >>> 0);
  const pick = (min: number, max: number) => min + Math.floor(paramRng() * (max - min + 1));
  const generated = options.parameters ? null : randomParameters(pick);
  const parameters = normalizeParameters(options.parameters ?? generated!);
  const solution = solveInstructionChainV2(parameters);
  const { relation, combine, other, finalOperation, amount } = parameters;
  const { found, combined, answer } = solution;

  function shuffle<T>(values: T[]): T[] {
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(shuffleRng() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }
  const numericChoices = (correct: number, candidates: number[]): MissionChoice[] => {
    const values = [correct];
    for (const candidate of [...candidates, ...Array.from({ length: 21 }, (_, i) => i)]) {
      if (
        Number.isInteger(candidate) &&
        candidate >= 0 &&
        candidate <= 30 &&
        !values.includes(candidate)
      ) {
        values.push(candidate);
      }
      if (values.length === 4) break;
    }
    return shuffle(values.map((value) => ({ id: `value_${value}`, label: String(value), value })));
  };
  const textChoices = (candidates: [string, string][]): MissionChoice[] => {
    const seen = new Set<string>();
    const unique = candidates.filter(([, label]) => !seen.has(label) && seen.add(label));
    return shuffle(unique.slice(0, 4).map(([id, label]) => ({ id, label, value: id })));
  };

  const symbol = combineSymbol(combine);
  const expression = `${other} ${symbol} ${found}`;
  const operateOn = (base: number) => {
    const value = combine === 'difference' ? other - base : other + base;
    return finalOperation === 'add' ? value + amount : value - amount;
  };
  const resultAction = (subject: string) =>
    finalOperation === 'add' ? `Cộng ${subject} với ${amount}` : `Trừ ${subject} đi ${amount}`;
  const oppositeAction = (subject: string) =>
    finalOperation === 'add' ? `Trừ ${subject} đi ${amount}` : `Cộng ${subject} với ${amount}`;

  const steps: MissionStep[] = [
    {
      id: 'find_number',
      objective: relationObjective(relation),
      dependsOn: [],
      prompt: stepQuestion(relation),
      choices: numericChoices(found, relationDistractors(relation)),
      correctChoiceId: `value_${found}`,
    },
    {
      id: 'combine',
      objective: combine === 'difference' ? 'difference_vocabulary' : 'sum_vocabulary',
      dependsOn: ['find_number'],
      prompt: `${capitalized(combineWord(combine))} của ${other} và ${found} được viết như thế nào?`,
      choices: textChoices([
        ['correct_expression', expression],
        [
          'reverse_or_swap',
          combine === 'difference' ? `${found} − ${other}` : `${other} − ${found}`,
        ],
        [
          'wrong_operation',
          combine === 'difference' ? `${other} + ${found}` : `${found} − ${other}`,
        ],
        ['original_number', `${other} ${symbol} ${relation.number}`],
        [
          'original_number_other_operation',
          `${other} ${combine === 'difference' ? '+' : '−'} ${relation.number}`,
        ],
      ]),
      correctChoiceId: 'correct_expression',
    },
    {
      id: 'next_operation',
      objective: 'step_order',
      dependsOn: ['combine'],
      prompt: `Sau khi tính ${expression}, con làm gì tiếp?`,
      choices: textChoices([
        ['apply_to_result', resultAction('kết quả vừa tìm được')],
        ['opposite_operation', oppositeAction('kết quả vừa tìm được')],
        ['apply_to_other', resultAction(String(other))],
        ['stop', 'Dừng lại'],
      ]),
      correctChoiceId: 'apply_to_result',
    },
    {
      id: 'final',
      objective: 'calculation',
      dependsOn: ['next_operation'],
      prompt: 'Kết quả cuối cùng là bao nhiêu?',
      choices: numericChoices(answer, [
        combined,
        operateOn(relation.number),
        finalOperation === 'add' ? other + amount : other - amount,
        answer + 1,
        answer - 1,
      ]),
      correctChoiceId: `value_${answer}`,
    },
  ];

  const finalPhrase = finalOperation === 'add' ? `cộng với ${amount}` : `trừ đi ${amount}`;
  const prompt =
    wording === 'school'
      ? `Lấy ${combineWord(combine)} của ${other} và ${relationPhrase(relation, wording)} rồi ${finalPhrase} thì được kết quả là bao nhiêu?`
      : `Tìm ${relationPhrase(relation, wording)}. Lấy ${other} ${combine === 'difference' ? 'trừ đi' : 'cộng với'} số vừa tìm được, sau đó ${finalOperation === 'add' ? `thêm ${amount} vào` : `bớt ${amount} ở`} kết quả. Em được số nào?`;
  const relationId =
    relation.kind === 'greater' || relation.kind === 'less'
      ? `${relation.kind}${relation.number}by${relation.offset}`
      : `${relation.kind}${relation.number}`;

  return {
    schemaVersion: 1,
    id: `instruction_chain_v2:${options.seed}:${relationId}:${combine}${other}:${finalOperation}${amount}:${wording}:${support}`,
    templateId: 'instruction_chain_v2',
    family: 'instruction_chain',
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

/** Every combination here is solvable within 20 with positive intermediate results. */
function randomParameters(
  pick: (min: number, max: number) => number
): InstructionChainV2Parameters {
  const kinds = ['successor', 'predecessor', 'greater', 'less'] as const;
  const kind = kinds[pick(0, 3)];
  const relation: NumberRelation =
    kind === 'successor'
      ? { kind, number: pick(1, 12) }
      : kind === 'predecessor'
        ? { kind, number: pick(2, 13) }
        : kind === 'greater'
          ? { kind, number: pick(1, 12), offset: pick(2, 5) }
          : (() => {
              const offset = pick(2, 5);
              return { kind, number: pick(offset + 1, 15), offset };
            })();
  const found = solveInstructionChainV2Relation(relation);
  const combine = pick(0, 1) === 0 ? ('difference' as const) : ('sum' as const);
  const other =
    combine === 'difference'
      ? pick(found + 1, Math.min(MAX_RESULT, found + 10))
      : pick(1, Math.min(10, MAX_RESULT - found - 1));
  const combined = combine === 'difference' ? other - found : other + found;
  const canAdd = combined + 1 <= MAX_RESULT;
  const canSubtract = combined >= 2;
  const finalOperation =
    canAdd && (!canSubtract || pick(0, 1) === 0) ? ('add' as const) : ('subtract' as const);
  const amount =
    finalOperation === 'add'
      ? pick(1, Math.min(9, MAX_RESULT - combined))
      : pick(1, Math.min(9, combined - 1));
  return { relation, combine, other, finalOperation, amount };
}

function solveInstructionChainV2Relation(relation: NumberRelation): number {
  switch (relation.kind) {
    case 'successor':
      return relation.number + 1;
    case 'predecessor':
      return relation.number - 1;
    case 'greater':
      return relation.number + relation.offset;
    case 'less':
      return relation.number - relation.offset;
  }
}

export function getInstructionChainV2Hint(
  mission: InstructionChainMissionV2,
  level: MissionHintLevel
): string {
  const { relation, combine, other, finalOperation, amount } = mission.parameters;
  const { found, combined, answer } = mission.solution;
  switch (level) {
    case 'strategy': {
      const relationHint =
        relation.kind === 'successor'
          ? 'Số liền sau là số đứng ngay sau, hơn số đã cho 1 đơn vị.'
          : relation.kind === 'predecessor'
            ? 'Số liền trước là số đứng ngay trước, kém số đã cho 1 đơn vị.'
            : relation.kind === 'greater'
              ? `“Lớn hơn ${relation.offset} đơn vị” nghĩa là thêm ${relation.offset} vào số đã cho.`
              : `“Bé hơn ${relation.offset} đơn vị” nghĩa là bớt ${relation.offset} từ số đã cho.`;
      const combineHint =
        combine === 'difference'
          ? '“Hiệu” là kết quả của phép trừ.'
          : '“Tổng” là kết quả của phép cộng.';
      return `Tìm số cần dùng trước. ${relationHint} ${combineHint} Từ “rồi” cho biết bước tiếp theo.`;
    }
    case 'partial':
      return `${relation.number} → □; ${other} ${combineSymbol(combine)} □ = △; △ ${finalSymbol(finalOperation)} ${amount} = ?`;
    case 'worked': {
      const relationSentence =
        relation.kind === 'successor'
          ? `Số liền sau của ${relation.number} là ${found}.`
          : relation.kind === 'predecessor'
            ? `Số liền trước của ${relation.number} là ${found}.`
            : `Số ${relation.kind === 'greater' ? 'lớn' : 'bé'} hơn ${relation.number} là ${relation.offset} đơn vị: ${relation.number} ${relation.kind === 'greater' ? '+' : '−'} ${relation.offset} = ${found}.`;
      const finalSentence =
        finalOperation === 'add'
          ? `Cộng ${combined} với ${amount} được ${answer}.`
          : `Trừ ${combined} đi ${amount} được ${answer}.`;
      return `${relationSentence} ${capitalized(combineWord(combine))} của ${other} và ${found} là ${combined}. ${finalSentence}`;
    }
    default:
      throw new Error('Unknown mission hint level');
  }
}

export function getInstructionChainV2Feedback(
  mission: InstructionChainMissionV2,
  stepId: MissionStepId
): string {
  const { relation, combine } = mission.parameters;
  switch (stepId) {
    case 'find_number':
      return relation.kind === 'successor'
        ? '“Số liền sau” là số ngay sau số đã cho.'
        : relation.kind === 'predecessor'
          ? '“Số liền trước” là số ngay trước số đã cho.'
          : relation.kind === 'greater'
            ? `“Lớn hơn ${relation.offset} đơn vị” nghĩa là số đó nằm sau ${relation.number} và cách ${relation.number} ${relation.offset} đơn vị.`
            : `“Bé hơn ${relation.offset} đơn vị” nghĩa là số đó nằm trước ${relation.number} và cách ${relation.number} ${relation.offset} đơn vị.`;
    case 'combine':
      return combine === 'difference'
        ? '“Hiệu” dùng phép trừ. Giữ đúng thứ tự hai số trong đề.'
        : '“Tổng” dùng phép cộng hai số trong đề.';
    case 'next_operation':
      return 'Từ “rồi” yêu cầu dùng kết quả vừa tính cho bước tiếp theo.';
    default:
      return 'Đọc lại từng việc trong đề, rồi kiểm tra phép tính.';
  }
}
