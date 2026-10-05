import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryStorage, type MissionFamily } from '@math-archer/learning-engine';
import { ReasoningTraining } from './ReasoningTraining';
import { loadMissionWorkspace, loadReasoningProgress } from '../sync/missions';
import { gamepadManager, XboxButton } from '../input/gamepad';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const setupFamily = (family: MissionFamily) => {
  const storage = createMemoryStorage();
  render(
    <ReasoningTraining playerId="child" storage={storage} families={[family]} onBack={vi.fn()} />
  );
  return storage;
};
const attemptOf = (storage: ReturnType<typeof createMemoryStorage>) =>
  loadMissionWorkspace('child', storage).items[0].local;
const choose = (storage: ReturnType<typeof createMemoryStorage>, stepIndex: number) => {
  const step = attemptOf(storage).mission.steps[stepIndex];
  const index = step.choices.findIndex((choice) => choice.id === step.correctChoiceId);
  fireEvent.keyDown(screen.getByRole('region'), { key: String(index + 1) });
};
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
const card = (digit: number) => screen.getByRole('button', { name: new RegExp(`^Thẻ ${digit}`) });
const slot = (index: number) =>
  screen.getAllByRole('button', { name: /^Số thứ (nhất|hai), hàng/ })[index];
/** Place digits into slots 0–3 in the order [first tens, first units, second tens, second units]. */
const place = (digits: number[]) =>
  digits.forEach((digit, index) => {
    fireEvent.click(card(digit));
    fireEvent.click(slot(index));
  });
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Xác nhận cách xếp' }));

describe('growing-gap sequence Training', () => {
  it('plays the original seventh-term question to 42 with numbered, blank-until-answered terms', () => {
    const storage = setupFamily('growing_gap_sequence');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(
      screen.getByText(
        'Viết số thứ 7 vào dãy số có quy luật sau: 0; 2; 6; 12; 20; … Quy luật: mỗi bước tăng nhiều hơn bước trước 2 đơn vị.'
      )
    ).toBeVisible();
    const diagram = screen.getByRole('figure', { name: 'Các số thứ tự' });
    expect(diagram).toHaveTextContent('Thứ 1: 0');
    expect(diagram).toHaveTextContent('Thứ 6: ? (+□)');
    expect(diagram).not.toHaveTextContent('42');
    for (let i = 0; i < 5; i++) {
      choose(storage, i);
      next();
    }
    expect(screen.getByText('Hoàn thành!')).toBeVisible();
    expect(screen.getByText(/Số thứ 7 là 42/)).toBeVisible();
    const progress = loadReasoningProgress('child', storage);
    expect(progress.families.growing_gap_sequence?.completedMissions).toBe(1);
    expect(progress.objectives.term_position?.firstCorrect).toBe(1);
    expect(progress.objectives.extend_rule?.firstCorrect).toBe(1);
  });

  it('explains a position-versus-value mistake and keeps it as the first response', () => {
    const storage = setupFamily('growing_gap_sequence');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    fireEvent.click(screen.getByRole('button', { name: /^.*20$/ }));
    expect(attemptOf(storage).responses[0]).toMatchObject({
      stepId: 'term_position',
      correct: false,
    });
    expect(screen.getByText(/Vị trí khác với giá trị/)).toBeVisible();
    next();
    choose(storage, 0);
    expect(attemptOf(storage).responses[1]).toMatchObject({ correct: true, assisted: true });
    expect(loadReasoningProgress('child', storage).objectives.term_position?.firstCorrect).toBe(0);
  });

  it('shows only the question and final answers independently', () => {
    const storage = setupFamily('growing_gap_sequence');
    fireEvent.click(screen.getByRole('button', { name: 'Tự giải' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(screen.queryByText(/là số thứ mấy/)).not.toBeInTheDocument();
    expect(screen.getByText('Số thứ 7 là số nào?')).toBeVisible();
    choose(storage, 4);
    expect(
      loadReasoningProgress('child', storage).families.growing_gap_sequence?.independentSuccesses
    ).toBe(1);
  });
});

describe('digit-card Training', () => {
  const reachBoard = (storage: ReturnType<typeof createMemoryStorage>) => {
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    for (let i = 0; i < 3; i++) {
      choose(storage, i);
      next();
    }
  };

  it('places cards by select-then-place and completes the original question with 95', () => {
    const storage = setupFamily('max_sum_digit_cards');
    expect(screen.queryByRole('button', { name: 'Xác nhận cách xếp' })).not.toBeInTheDocument();
    reachBoard(storage);
    expect(
      screen.getByText(
        'Hà có 5 thẻ số: 3, 2, 5, 4, 1. Hà chọn 4 thẻ số để lập thành 2 số có hai chữ số và cộng chúng lại với nhau. Hỏi tổng lớn nhất của hai số Hà lập được là bao nhiêu?'
      )
    ).toBeVisible();
    expect(
      screen.getByText('Xếp 4 trong 5 thẻ vào các ô để tổng của hai số lớn nhất.')
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Xác nhận cách xếp' })).toBeDisabled();
    place([5, 3, 4, 2]);
    expect(screen.getByRole('button', { name: 'Xác nhận cách xếp' })).toBeEnabled();
    // The board never shows a running total.
    expect(screen.queryByText(/95/)).not.toBeInTheDocument();
    submit();
    expect(attemptOf(storage).responses.at(-1)).toMatchObject({
      stepId: 'final',
      choiceId: 'cards:5-3-4-2',
      correct: true,
    });
    expect(screen.getByText(/53 \+ 42 = 95/)).toBeVisible();
    next();
    expect(screen.getByText('Hoàn thành!')).toBeVisible();
    const progress = loadReasoningProgress('child', storage);
    expect(progress.families.max_sum_digit_cards?.completedMissions).toBe(1);
    expect(progress.objectives.place_value?.firstCorrect).toBe(1);
    expect(progress.objectives.maximize_sum?.firstCorrect).toBe(1);
  });

  it('accepts a different optimal arrangement', () => {
    const storage = setupFamily('max_sum_digit_cards');
    reachBoard(storage);
    place([4, 2, 5, 3]);
    submit();
    expect(attemptOf(storage).responses.at(-1)).toMatchObject({ correct: true });
  });

  it('never lets a card be placed twice, and supports taking back, moving, and reset', () => {
    const storage = setupFamily('max_sum_digit_cards');
    reachBoard(storage);
    fireEvent.click(card(5));
    expect(card(5)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(slot(0));
    // A placed card is unavailable in the bank, so it cannot go in a second slot.
    expect(screen.getByRole('button', { name: 'Thẻ 5, đã đặt' })).toBeDisabled();
    expect(slot(0)).toHaveAccessibleName('Số thứ nhất, hàng chục: 5');
    // Tapping a filled slot returns its card and keeps it selected, so the next slot moves it.
    fireEvent.click(slot(0));
    expect(slot(0)).toHaveAccessibleName('Số thứ nhất, hàng chục: trống');
    expect(card(5)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(slot(3));
    expect(slot(3)).toHaveAccessibleName('Số thứ hai, hàng đơn vị: 5');
    // Placing a different card over a filled slot sends the old card back to the bank.
    fireEvent.click(card(4));
    fireEvent.click(slot(3));
    expect(slot(3)).toHaveAccessibleName('Số thứ hai, hàng đơn vị: 4');
    expect(card(5)).toBeEnabled();
    // Deselect, then reset.
    fireEvent.click(card(5));
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn' }));
    expect(card(5)).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Làm lại' }));
    expect(slot(3)).toHaveAccessibleName('Số thứ hai, hàng đơn vị: trống');
    expect(card(4)).toBeEnabled();
    expect(attemptOf(storage).responses).toHaveLength(3);
  });

  it('keeps a wrong arrangement as the first response, explains it, and retries on an empty board', () => {
    const storage = setupFamily('max_sum_digit_cards');
    reachBoard(storage);
    place([5, 4, 3, 2]);
    submit();
    expect(attemptOf(storage).responses.at(-1)).toMatchObject({
      choiceId: 'cards:5-4-3-2',
      correct: false,
    });
    expect(screen.getByText(/54 \+ 32 = 86/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Xác nhận cách xếp' })).toBeDisabled();
    next();
    expect(slot(0)).toHaveAccessibleName('Số thứ nhất, hàng chục: trống');
    place([5, 3, 4, 2]);
    submit();
    expect(attemptOf(storage).responses.at(-1)).toMatchObject({ correct: true, assisted: true });
    expect(loadReasoningProgress('child', storage).objectives.maximize_sum?.firstCorrect).toBe(0);
  });

  it('shows the board straight away, with no diagram or guided prompts, independently', () => {
    const storage = setupFamily('max_sum_digit_cards');
    fireEvent.click(screen.getByRole('button', { name: 'Tự giải' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(screen.queryByText(/giá trị bao nhiêu/)).not.toBeInTheDocument();
    place([4, 2, 5, 3]);
    submit();
    expect(
      loadReasoningProgress('child', storage).families.max_sum_digit_cards?.independentSuccesses
    ).toBe(1);
  });

  it('is operable from the controller: A selects and places, directions move focus', () => {
    const storage = setupFamily('max_sum_digit_cards');
    reachBoard(storage);
    // Focus starts on the first card in the bank.
    expect(card(3)).toHaveFocus();
    act(() => gamepadManager.simulateButtonDown(XboxButton.A));
    act(() => gamepadManager.simulateButtonUp(XboxButton.A));
    expect(card(3)).toHaveAttribute('aria-pressed', 'true');
    // Right moves focus forward through the bank, then on to the slots.
    for (let i = 0; i < 5; i++) act(() => gamepadManager.simulateDirection('right'));
    expect(slot(0)).toHaveFocus();
    act(() => gamepadManager.simulateButtonDown(XboxButton.A));
    act(() => gamepadManager.simulateButtonUp(XboxButton.A));
    expect(slot(0)).toHaveAccessibleName('Số thứ nhất, hàng chục: 3');
    expect(attemptOf(storage).responses).toHaveLength(3);
  });

  it('does not treat digit keys as answers on the card step', () => {
    const storage = setupFamily('max_sum_digit_cards');
    reachBoard(storage);
    fireEvent.keyDown(screen.getByRole('region'), { key: '1' });
    expect(attemptOf(storage).responses).toHaveLength(3);
  });
});
