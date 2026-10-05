import { useEffect, useRef, useState } from 'react';
import {
  compareMissionAttempts,
  getActiveMissionStep,
  getMissionDiagram,
  getMissionHint,
  getMissionStepFeedback,
  getMissionView,
  recordMissionHint,
  recordMissionResponse,
  startMissionAttempt,
  type MissionAttempt,
  type MissionFamily,
  type MissionHintLevel,
  type MissionStepId,
  type MissionSupport,
  type SessionStorageAdapter,
} from '@math-archer/learning-engine';
import type { MathArcherApiClient } from '../api/client';
import {
  getResumableMission,
  loadMissionWorkspace,
  queueMissionAttempt,
  syncMissionAttempts,
} from '../sync/missions';
import { useGamepad, XboxButton } from '../input/useGamepad';
import { createMission, familyLabels } from '../reasoningMissionFactory';
import './ReasoningTraining.css';

export interface ReasoningTrainingProps {
  playerId: string;
  onBack: () => void;
  /** Families the parent has enabled. Defaults to the original pilot family. */
  families?: MissionFamily[];
  api?: MathArcherApiClient;
  storage?: SessionStorageAdapter;
}
// Use real browser storage so an unavailable/quota-limited store cannot silently become an ephemeral save.
const browserStorage: SessionStorageAdapter = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};
const elements = ['🔥 Lửa', '❄️ Băng', '🌬️ Gió', '🌿 Đất'];
const hintLabels = ['Gợi ý cách làm', 'Sơ đồ còn thiếu', 'Xem bài giải'];
const hintLevels: MissionHintLevel[] = ['strategy', 'partial', 'worked'];
const defaultFamilies: MissionFamily[] = ['instruction_chain'];
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function ReasoningTraining({
  playerId,
  onBack,
  families = defaultFamilies,
  api,
  storage = browserStorage,
}: ReasoningTrainingProps) {
  const [attempt, setAttempt] = useState<MissionAttempt | null>(null);
  const [support, setSupport] = useState<MissionSupport>('guided');
  const [chosenFamily, setChosenFamily] = useState<MissionFamily>(families[0]);
  const family = families.includes(chosenFamily) ? chosenFamily : families[0];
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [feedback, setFeedback] = useState<{
    stepId: MissionStepId;
    text: string;
    correct?: boolean;
  } | null>(null);
  const [syncText, setSyncText] = useState('');
  const root = useRef<HTMLElement>(null);
  const startedStep = useRef(Date.now());
  const busy = useRef(false);

  useEffect(() => {
    const refresh = () => {
      try {
        const workspace = loadMissionWorkspace(playerId, storage);
        const conflict = workspace.items.some((item) => item.conflict);
        setBlocked(conflict);
        if (conflict)
          setError(
            'Lịch sử trên hai thiết bị khác nhau. Nhờ bố mẹ mở bảng tiến bộ để chọn lịch sử.'
          );
        setAttempt((current) => {
          const saved = current
            ? workspace.items.find((item) => item.local.id === current.id)?.local
            : getResumableMission(playerId, storage);
          return saved ?? current;
        });
      } catch (cause) {
        setError(errorText(cause));
        setBlocked(true);
      }
    };
    refresh();
    window.addEventListener('math-archer-reasoning-change', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('math-archer-reasoning-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [playerId, storage]);

  const sync = () => {
    if (!api) {
      setSyncText('Đã lưu trên thiết bị này.');
      return;
    }
    void syncMissionAttempts(playerId, api, storage).then((result) => {
      setSyncText(
        result.status === 'synced'
          ? 'Đã đồng bộ.'
          : result.status === 'conflict'
            ? 'Nhờ bố mẹ kiểm tra lịch sử trên hai thiết bị.'
            : 'Đã lưu trên thiết bị. Sẽ thử đồng bộ lại.'
      );
    });
  };
  // Write before displaying feedback or moving to another step. Never reset failed data.
  const persist = (next: MissionAttempt) => {
    const workspace = loadMissionWorkspace(playerId, storage);
    if (workspace.items.some((item) => item.conflict))
      throw new Error('Nhờ bố mẹ kiểm tra lịch sử trước khi tiếp tục.');
    queueMissionAttempt(next, storage);
    const saved = loadMissionWorkspace(playerId, storage).items.find(
      (item) => item.local.id === next.id
    )!.local;
    setAttempt(saved);
    if (compareMissionAttempts(next, saved) !== 'unchanged')
      throw new Error('Bài đã thay đổi trên thiết bị khác. Hãy đọc bước hiện tại.');
    setError('');
    sync();
  };
  const start = () => {
    if (busy.current || blocked) return;
    busy.current = true;
    try {
      const history = loadMissionWorkspace(playerId, storage);
      const mission = createMission({
        family,
        seed: crypto.getRandomValues(new Uint32Array(1))[0],
        support,
        startedInFamily: history.items.filter((item) => item.local.mission.family === family)
          .length,
      });
      persist(
        startMissionAttempt(mission, playerId, crypto.randomUUID(), new Date().toISOString())
      );
      setFeedback(null);
      startedStep.current = Date.now();
    } catch (cause) {
      setError(`Chưa lưu được bài. ${errorText(cause)}`);
    } finally {
      busy.current = false;
    }
  };
  const stepId = attempt ? getActiveMissionStep(attempt) : null;
  const displayedStep = feedback?.stepId ?? stepId;
  const view = attempt && displayedStep ? getMissionView(attempt.mission, displayedStep) : null;
  const diagram = attempt
    ? getMissionDiagram(
        attempt.mission,
        attempt.responses.filter((response) => response.correct).map((response) => response.stepId)
      )
    : null;
  const answer = (choiceId: string) => {
    if (!attempt || !stepId || feedback || blocked || busy.current) return;
    busy.current = true;
    try {
      const next = recordMissionResponse(attempt, {
        eventId: crypto.randomUUID(),
        stepId,
        choiceId,
        timestamp: new Date().toISOString(),
        responseTimeMs: Math.max(0, Date.now() - startedStep.current),
      });
      persist(next);
      const response = next.responses.at(-1)!;
      const label = view!.choices.find((choice) => choice.id === choiceId)!.label;
      setFeedback({
        stepId,
        correct: response.correct,
        text: response.correct
          ? `Đúng rồi: ${label}.`
          : `Con đã chọn ${label}. ${getMissionStepFeedback(attempt.mission, stepId)} Bấm Tiếp tục để thử lại.`,
      });
    } catch (cause) {
      setError(`Chưa lưu được câu trả lời. Hãy thử lại. ${errorText(cause)}`);
    } finally {
      busy.current = false;
    }
  };
  const hint = () => {
    if (!attempt || !stepId || feedback || blocked || busy.current) return;
    busy.current = true;
    try {
      const level = hintLevels[Math.min(attempt.hints.length, 2)];
      const next = recordMissionHint(attempt, {
        eventId: crypto.randomUUID(),
        stepId,
        level,
        timestamp: new Date().toISOString(),
      });
      persist(next);
      setFeedback({ stepId, text: getMissionHint(attempt.mission, level) });
    } catch (cause) {
      setError(`Chưa lưu được gợi ý. ${errorText(cause)}`);
    } finally {
      busy.current = false;
    }
  };
  const advance = () => {
    setFeedback(null);
    startedStep.current = Date.now();
  };

  const controls = () =>
    Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
  const moveFocus = (delta: number) => {
    const buttons = controls();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(index + delta + buttons.length) % buttons.length]?.focus();
  };
  useGamepad({
    onDirection: (direction) => moveFocus(direction === 'left' || direction === 'up' ? -1 : 1),
    onButtonDown: (button) => {
      if (button === XboxButton.B) onBack();
      if (button === XboxButton.A) {
        const target = document.activeElement as HTMLButtonElement;
        if (controls().includes(target)) target.click();
        else controls()[0]?.focus();
      }
    },
  });
  useEffect(() => {
    startedStep.current = Date.now();
    if (feedback) root.current?.querySelector<HTMLButtonElement>('[data-continue]')?.focus();
    else root.current?.querySelector<HTMLButtonElement>('[data-primary]')?.focus();
  }, [feedback, displayedStep, attempt?.id]);

  return (
    <section
      ref={root}
      className="reasoning-training"
      lang="vi"
      aria-label="Luyện đọc đề và lập kế hoạch"
      onKeyDown={(event) => {
        // This panel uses native button activation; stop the global keyboard-to-gamepad bridge from also activating it.
        event.stopPropagation();
        if (event.repeat) {
          event.preventDefault();
          return;
        }
        if (event.key === 'Escape') onBack();
        if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          moveFocus(event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1);
        }
        const keyed = /^[1-4]$/.test(event.key) ? view?.choices[Number(event.key) - 1] : undefined;
        if (keyed && !feedback) {
          event.preventDefault();
          answer(keyed.id);
        }
      }}
    >
      <button onClick={onBack}>← Về luyện tính</button>
      <h1>🏹 Đọc đề, chọn bước</h1>
      <p>Luyện tập không giới hạn. Đọc chậm, nghĩ kỹ rồi chọn. Không dùng mũi tên hằng ngày.</p>
      {error && <p role="alert">{error}</p>}
      {!attempt || (attempt.completedAt && !feedback) ? (
        <>
          {attempt?.completedAt && (
            <div role="status" className="mission-complete">
              <h2>Hoàn thành!</h2>
              <p>{getMissionHint(attempt.mission, 'worked')}</p>
              <p>
                {attempt.mission.support === 'independent' &&
                !attempt.hints.length &&
                !attempt.responses.some((r) => !r.correct)
                  ? 'Con đã tự giải bài này.'
                  : 'Con đã luyện các bước giải bài.'}
              </p>
            </div>
          )}
          {families.length > 1 && (
            <fieldset disabled={blocked}>
              <legend>Chọn loại bài</legend>
              {families.map((item) => (
                <button
                  key={item}
                  aria-pressed={family === item}
                  onClick={() => setChosenFamily(item)}
                >
                  {familyLabels[item]}
                </button>
              ))}
            </fieldset>
          )}
          <fieldset disabled={blocked}>
            <legend>Chọn cách luyện cho bài tiếp theo</legend>
            <button aria-pressed={support === 'guided'} onClick={() => setSupport('guided')}>
              Từng bước
            </button>
            <button
              aria-pressed={support === 'independent'}
              onClick={() => setSupport('independent')}
            >
              Tự giải
            </button>
          </fieldset>
          <button data-primary disabled={blocked} onClick={start}>
            {attempt ? 'Bài tiếp theo' : 'Bắt đầu'}
          </button>
        </>
      ) : (
        <>
          <p className="mission-support">
            {attempt.mission.support === 'guided' ? 'Từng bước' : 'Tự giải'}
          </p>
          <div className="mission-problem" lang="vi">
            <strong>Đề bài</strong>
            <p>{attempt.mission.prompt}</p>
          </div>
          {diagram && (
            <figure className="mission-diagram" aria-label={diagram.caption}>
              <figcaption>{diagram.caption}</figcaption>
              {diagram.rows.map((row, rowIndex) => (
                <ol key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <li key={cellIndex}>{cell}</li>
                  ))}
                </ol>
              ))}
            </figure>
          )}
          {view && (
            <>
              <h2>{view.stepPrompt}</h2>
              <div className="mission-choices">
                {view.choices.map((choice, index) => (
                  <button
                    key={choice.id}
                    className={`mission-choice element-${index}`}
                    disabled={!!feedback || blocked}
                    data-primary={index === 0 ? true : undefined}
                    onClick={() => answer(choice.id)}
                  >
                    <span>
                      {elements[index]} · {index + 1}
                    </span>
                    <strong>{choice.label}</strong>
                  </button>
                ))}
              </div>
              {!feedback && (
                <button disabled={blocked} onClick={hint}>
                  {hintLabels[Math.min(attempt.hints.length, 2)]}
                </button>
              )}
            </>
          )}
          {feedback && (
            <div
              role="status"
              className={`mission-feedback ${feedback.correct === true ? 'correct' : ''}`}
            >
              <p>
                {feedback.correct === true ? '🎯 ' : ''}
                {feedback.text}
              </p>
              <button data-continue disabled={blocked} onClick={advance}>
                Tiếp tục
              </button>
            </div>
          )}
        </>
      )}
      <p role="status" className="mission-sync">
        {syncText}
      </p>
      <p className="mission-controls">
        Chạm để chọn · Phím 1–4 hoặc Tab / Enter · Tay cầm: di chuyển, A chọn, B quay lại
      </p>
    </section>
  );
}
