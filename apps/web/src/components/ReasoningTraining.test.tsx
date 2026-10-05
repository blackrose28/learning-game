import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import {
  createMemoryStorage,
  generateInstructionChain,
  startMissionAttempt,
} from '@math-archer/learning-engine';
import { ReasoningTraining } from './ReasoningTraining';
import {
  loadMissionWorkspace,
  queueMissionAttempt,
  getMissionWorkspaceKey,
  loadReasoningProgress,
} from '../sync/missions';
import { gamepadManager, XboxButton } from '../input/gamepad';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const problem =
  'Lấy hiệu của 14 và số liền sau của số 7 rồi cộng với 9 thì được kết quả là bao nhiêu?';
const setup = () => {
  const storage = createMemoryStorage();
  const back = vi.fn();
  return {
    storage,
    back,
    ...render(<ReasoningTraining playerId="child" storage={storage} onBack={back} />),
  };
};
const current = (storage: ReturnType<typeof createMemoryStorage>) =>
  loadMissionWorkspace('child', storage).items[0].local;
const choose = (storage: ReturnType<typeof createMemoryStorage>, stepIndex: number) => {
  const step = current(storage).mission.steps[stepIndex];
  const index = step.choices.findIndex((choice) => choice.id === step.correctChoiceId);
  fireEvent.keyDown(screen.getByRole('region'), { key: String(index + 1) });
};
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

describe('instruction-chain Training', () => {
  it('keeps the problem visible, saves before explicit advancement and completes exactly once', () => {
    const { storage } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    for (let i = 0; i < 4; i++) {
      choose(storage, i);
      expect(current(storage).responses).toHaveLength(i + 1);
      expect(screen.getByText(current(storage).mission.steps[i].prompt)).toBeVisible();
      expect(screen.getByText(problem)).toBeVisible();
      expect(screen.getByRole('button', { name: 'Tiếp tục' })).toHaveFocus();
      next();
    }
    expect(screen.getByText('Hoàn thành!')).toBeVisible();
    expect(loadReasoningProgress('child', storage).completedMissions).toBe(1);
    expect(loadReasoningProgress('child', storage).independentSuccesses).toBe(0);
    expect(storage.getItem('math_archer_progress_child')).toBeNull();
  });
  it('keeps wrong first responses and escalating hints as assisted evidence', () => {
    const { storage } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    fireEvent.click(screen.getByRole('button', { name: /7$/ }));
    expect(current(storage).responses[0].correct).toBe(false);
    next();
    ['Gợi ý cách làm', 'Sơ đồ còn thiếu', 'Xem bài giải'].forEach((label, index) => {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(current(storage).hints).toHaveLength(index + 1);
      next();
    });
    choose(storage, 0);
    expect(current(storage).responses[1].assisted).toBe(true);
    expect(
      loadReasoningProgress('child', storage).objectives.successor_vocabulary?.firstCorrect
    ).toBe(0);
  });
  it('shows only the final question independently and offers a new wording next', () => {
    const { storage } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tự giải' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(screen.queryByText('Số liền sau của 7 là số nào?')).not.toBeInTheDocument();
    expect(screen.queryByText('Hiệu của 14 và 8 được viết như thế nào?')).not.toBeInTheDocument();
    choose(storage, 3);
    expect(current(storage).responses[0].stepId).toBe('final');
    expect(loadReasoningProgress('child', storage).independentSuccesses).toBe(1);
    expect(loadReasoningProgress('child', storage).objectives).toEqual({});
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Bài tiếp theo' }));
    expect(loadMissionWorkspace('child', storage).items[1].local.mission.wording).toBe('plain');
  });
  it('resumes after reload and prevents failed writes from showing feedback or hints', () => {
    const { storage, unmount } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    choose(storage, 0);
    unmount();
    render(<ReasoningTraining playerId="child" storage={storage} onBack={vi.fn()} />);
    expect(screen.getByText('Hiệu của 14 và 8 được viết như thế nào?')).toBeVisible();
    const write = vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    choose(storage, 1);
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa lưu được câu trả lời');
    expect(current(storage).responses).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Tiếp tục' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý cách làm' }));
    expect(current(storage).hints).toHaveLength(0);
    expect(screen.queryByText(/Tìm số liền sau trước/)).not.toBeInTheDocument();
    write.mockRestore();
    choose(storage, 1);
    expect(current(storage).responses).toHaveLength(2);
  });
  it('preserves unsupported data and blocks conflicts for parent recovery', () => {
    const storage = createMemoryStorage();
    const raw = '{"schemaVersion":99}';
    storage.setItem(getMissionWorkspaceKey('child'), raw);
    const rendered = render(
      <ReasoningTraining playerId="child" storage={storage} onBack={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled();
    expect(storage.getItem(getMissionWorkspaceKey('child'))).toBe(raw);
    rendered.unmount();
    storage.removeItem(getMissionWorkspaceKey('child'));
    const attempt = startMissionAttempt(
      generateInstructionChain({ seed: 42 }),
      'child',
      'id',
      new Date().toISOString()
    );
    queueMissionAttempt(attempt, storage);
    const workspace = loadMissionWorkspace('child', storage);
    workspace.items[0].conflict = true;
    workspace.items[0].server = { attempt, revision: 1 };
    storage.setItem(getMissionWorkspaceKey('child'), JSON.stringify(workspace));
    render(<ReasoningTraining playerId="child" storage={storage} onBack={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('hai thiết bị');
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled();
  });
  it('supports controller focus and ignores held keyboard activation', () => {
    const { storage, back } = setup();
    act(() => gamepadManager.simulateButtonDown(XboxButton.A));
    act(() => gamepadManager.simulateButtonUp(XboxButton.A));
    expect(screen.getByText(problem)).toBeVisible();
    choose(storage, 0);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Tiếp tục' }), {
      key: 'Enter',
      repeat: true,
    });
    expect(screen.getByText('Số liền sau của 7 là số nào?')).toBeVisible();
    act(() => gamepadManager.simulateButtonDown(XboxButton.A));
    act(() => gamepadManager.simulateButtonUp(XboxButton.A));
    expect(screen.getByText('Hiệu của 14 và 8 được viết như thế nào?')).toBeVisible();
    act(() => gamepadManager.simulateDirection('down'));
    expect(document.activeElement?.tagName).toBe('BUTTON');
    act(() => gamepadManager.simulateButtonDown(XboxButton.B));
    act(() => gamepadManager.simulateButtonUp(XboxButton.B));
    expect(back).toHaveBeenCalledOnce();
  });
});
