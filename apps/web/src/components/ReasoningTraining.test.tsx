import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import {
  createMemoryStorage,
  generateInstructionChain,
  startMissionAttempt,
  type MissionFamily,
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
  it('offers a reset that clears blocked or unreadable history', () => {
    const storage = createMemoryStorage();
    storage.setItem(getMissionWorkspaceKey('child'), '{"schemaVersion":99}');
    render(<ReasoningTraining playerId="child" storage={storage} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Xoá lịch sử/ }));
    expect(storage.getItem(getMissionWorkspaceKey('child'))).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xoá lịch sử/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeEnabled();
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

const setupFamilies = (families: MissionFamily[]) => {
  const storage = createMemoryStorage();
  return {
    storage,
    ...render(
      <ReasoningTraining playerId="child" storage={storage} families={families} onBack={vi.fn()} />
    ),
  };
};
const attemptOf = (storage: ReturnType<typeof createMemoryStorage>, index = 0) =>
  loadMissionWorkspace('child', storage).items[index].local;

describe('story-family Training', () => {
  it('only shows a type chooser when several families are enabled', () => {
    setupFamilies(['instruction_chain']);
    expect(screen.queryByText('Chọn loại bài')).not.toBeInTheDocument();
    cleanup();
    setupFamilies(['daily_collection', 'unknown_start']);
    expect(screen.getByRole('button', { name: 'Sưu tầm mỗi ngày' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Tìm số lúc đầu' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('plays the original daily-collection question to 13 with the day slots filling in', () => {
    const { storage } = setupFamilies(['daily_collection']);
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(
      screen.getByText(
        'Hải có 8 thẻ Kun. Mỗi ngày, Hải sưu tầm thêm được 1 thẻ nữa. Hỏi sau 5 ngày, Hải có tất cả bao nhiêu thẻ Kun?'
      )
    ).toBeVisible();
    // Blank slots only; nothing from the answer has been revealed yet.
    const diagram = screen.getByRole('figure', { name: 'Các ngày' });
    expect(diagram).toHaveTextContent('Có sẵn: □');
    expect(diagram).toHaveTextContent('Tất cả: ?');
    for (let i = 0; i < 4; i++) {
      choose(storage, i);
      next();
    }
    expect(attemptOf(storage).mission.family).toBe('daily_collection');
    expect(attemptOf(storage).responses.at(-1)).toMatchObject({ stepId: 'final', correct: true });
    expect(screen.getByText('Hoàn thành!')).toBeVisible();
    expect(screen.getByText(/8 \+ 5 = 13 thẻ/)).toBeVisible();
    const progress = loadReasoningProgress('child', storage);
    expect(progress.families.daily_collection?.completedMissions).toBe(1);
    expect(progress.objectives.starting_amount?.firstCorrect).toBe(1);
  });

  it('plays the original unknown-start question to 48, accepting the add-back plan in either order', () => {
    for (const planIndex of [0, 1]) {
      const { storage, unmount } = setupFamilies(['unknown_start']);
      fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
      const mission = attemptOf(storage).mission;
      expect(mission.prompt).toContain('34 cái kẹo');
      expect(screen.getByRole('figure')).toHaveTextContent('Lúc đầu: ?');
      choose(storage, 0); // 1 chục = 10
      expect(screen.getByRole('figure')).toHaveTextContent('cho em gái 1 chục = 10');
      next();
      choose(storage, 1);
      next();
      const plan = mission.steps[2];
      const accepted = plan.acceptedChoiceIds![planIndex];
      fireEvent.keyDown(screen.getByRole('region'), {
        key: String(plan.choices.findIndex((choice) => choice.id === accepted) + 1),
      });
      expect(attemptOf(storage).responses.at(-1)).toMatchObject({ correct: true, assisted: false });
      // The rewind row appears only once the plan is answered.
      expect(screen.getAllByRole('list')).toHaveLength(2);
      next();
      choose(storage, 3);
      next();
      expect(screen.getByText('Hoàn thành!')).toBeVisible();
      expect(screen.getByText(/44 \+ 4 = 48/)).toBeVisible();
      expect(attemptOf(storage).completedAt).toBeDefined();
      unmount();
    }
  });

  it('shows only the school-style final question, with no diagram, in independent practice', () => {
    const { storage } = setupFamilies(['unknown_start']);
    fireEvent.click(screen.getByRole('button', { name: 'Tự giải' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(screen.queryByText(/chục cái kẹo là bao nhiêu/)).not.toBeInTheDocument();
    expect(screen.getByText('Lúc đầu Mai có bao nhiêu cái kẹo?')).toBeVisible();
    choose(storage, 3);
    expect(attemptOf(storage).responses[0]).toMatchObject({ stepId: 'final', correct: true });
    expect(
      loadReasoningProgress('child', storage).families.unknown_start?.independentSuccesses
    ).toBe(1);
  });

  it('starts the chosen family, numbering each family separately', () => {
    const { storage } = setupFamilies(['instruction_chain', 'daily_collection']);
    fireEvent.click(screen.getByRole('button', { name: 'Sưu tầm mỗi ngày' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(attemptOf(storage).mission.parameters).toMatchObject({ start: 8, perDay: 1, days: 5 });
    for (let i = 0; i < 4; i++) {
      choose(storage, i);
      next();
    }
    // The first instruction chain is still the original example, even after a daily mission.
    fireEvent.click(screen.getByRole('button', { name: 'Chuỗi lệnh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bài tiếp theo' }));
    expect(screen.getByText(problem)).toBeVisible();
    expect(
      loadMissionWorkspace('child', storage)
        .items.map((item) => item.local.mission.family)
        .sort()
    ).toEqual(['daily_collection', 'instruction_chain']);
  });

  it('ignores a choice key beyond the number of choices instead of failing', () => {
    const { storage } = setupFamilies(['daily_collection']);
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    const before = attemptOf(storage).responses.length;
    fireEvent.keyDown(screen.getByRole('region'), { key: '9' });
    expect(attemptOf(storage).responses).toHaveLength(before);
  });
});
