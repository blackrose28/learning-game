import { useEffect, useRef, useState } from 'react';
import {
  chooseAdventureMission,
  compareMissionAttempts,
  computeReasoningProgress,
  describeCardArrangement,
  getActiveMissionStep,
  getMissionDiagram,
  getMissionHint,
  getMissionStepFeedback,
  getMissionView,
  recordMissionHint,
  recommendFocus,
  recommendSupport,
  recordMissionResponse,
  startMissionAttempt,
  summarizeIndependentStability,
  type MissionAttempt,
  type SupportRecommendation,
  type MissionFamily,
  type MissionHintLevel,
  type MissionMode,
  type MissionStepId,
  type MissionSupport,
  type SessionStorageAdapter,
} from '@math-archer/learning-engine';
import type { MathArcherApiClient } from '../api/client';
import type { AdventureMissionCompletion } from '../adventureMission';
import {
  getResumableMission,
  loadMissionWorkspace,
  queueMissionAttempt,
  resetMissionWorkspace,
  syncMissionAttempts,
} from '../sync/missions';
import { useGamepad, XboxButton } from '../input/useGamepad';
import { createDistinctMission, familyLabels } from '../reasoningMissionFactory';
import { DigitCardBoard } from './DigitCardBoard';
import './ReasoningTraining.css';

export interface ReasoningTrainingProps {
  playerId: string;
  onBack: () => void;
  /** Families the parent has enabled. Defaults to the original pilot family. */
  families?: MissionFamily[];
  api?: MathArcherApiClient;
  storage?: SessionStorageAdapter;
  /**
   * Training is unlimited. Adventure offers one parent-enabled mission that spends one arrow when
   * it completes; the family and suggested support come from the child's evidence.
   */
  mode?: MissionMode;
  /** Adventure: spend the arrow and grant the reward. Must be safe to call twice for one attempt. */
  onMissionComplete?: (attempt: MissionAttempt) => AdventureMissionCompletion;
  /** Adventure: the child chose not to do the offered mission now. */
  onDecline?: () => void;
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
/** Say why this support was suggested, with the evidence. The child can always choose otherwise. */
function supportAdvice(advice: SupportRecommendation): string {
  const evidence = `${advice.successes}/${advice.window} bài gần nhất đúng ngay lần đầu, không cần gợi ý`;
  if (advice.change === 'start') return 'Gợi ý: làm từng bước vì đây là loại bài mới.';
  if (advice.change === 'fade') return `Gợi ý: thử tự giải, vì ${evidence}.`;
  if (advice.change === 'restore')
    return 'Gợi ý: làm từng bước, vì hai bài tự giải gần nhất cần giúp đỡ. Con vẫn có thể chọn khác.';
  return advice.support === 'guided'
    ? `Gợi ý: tiếp tục làm từng bước (${evidence}).`
    : `Gợi ý: tiếp tục tự giải (${evidence}).`;
}
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function ReasoningTraining({
  playerId,
  onBack,
  families = defaultFamilies,
  api,
  storage = browserStorage,
  mode = 'training',
  onMissionComplete,
  onDecline,
}: ReasoningTrainingProps) {
  const adventure = mode === 'adventure';
  const [attempt, setAttempt] = useState<MissionAttempt | null>(null);
  // The child's own choice for the next mission; null follows the recommendation.
  const [chosenSupport, setChosenSupport] = useState<MissionSupport | null>(null);
  const [chosenFamily, setChosenFamily] = useState<MissionFamily>(families[0]);
  const trainingFamily = families.includes(chosenFamily) ? chosenFamily : families[0];
  const [completion, setCompletion] = useState<AdventureMissionCompletion | null>(null);
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
            : getResumableMission(playerId, storage, mode);
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
  }, [playerId, storage, mode]);

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
  // Escape hatch for a blocked panel: forget the local history so training can start fresh.
  const reset = () => {
    resetMissionWorkspace(playerId, storage);
    setAttempt(null);
    setFeedback(null);
    setError('');
    setSyncText('');
    setBlocked(false);
  };
  const advice = (() => {
    if (blocked) return null;
    try {
      const attempts = loadMissionWorkspace(playerId, storage).items.map((item) => item.local);
      // Adventure picks the family from the evidence; Training lets the child choose.
      const adventureChoice = adventure
        ? chooseAdventureMission(playerId, attempts, families)
        : null;
      const adviceFamily = adventureChoice?.family ?? trainingFamily;
      return {
        family: adviceFamily,
        support: adventureChoice?.support ?? recommendSupport(attempts, adviceFamily),
        stability: summarizeIndependentStability(attempts, adviceFamily),
        focus: recommendFocus(computeReasoningProgress(playerId, attempts), families),
      };
    } catch {
      return null;
    }
  })();
  const family = adventure && advice ? advice.family : trainingFamily;
  const support = chosenSupport ?? advice?.support.support ?? 'guided';
  const start = () => {
    if (busy.current || blocked) return;
    busy.current = true;
    try {
      const history = loadMissionWorkspace(playerId, storage);
      const inFamily = history.items.filter((item) => item.local.mission.family === family);
      const mission = createDistinctMission(
        {
          family,
          seed: crypto.getRandomValues(new Uint32Array(1))[0],
          support,
          startedInFamily: inFamily.length,
        },
        new Set(inFamily.map((item) => item.local.mission.prompt))
      );
      persist(
        startMissionAttempt(mission, playerId, crypto.randomUUID(), new Date().toISOString(), mode)
      );
      setChosenSupport(null);
      setFeedback(null);
      startedStep.current = Date.now();
    } catch (cause) {
      setError(`Chưa lưu được bài. ${errorText(cause)}`);
    } finally {
      busy.current = false;
    }
  };
  // Leaving an unstarted Adventure offer is declining it, so it is not offered again at once.
  const leave = adventure && !attempt ? (onDecline ?? onBack) : onBack;
  const showStart = !attempt || (attempt.completedAt && !feedback);
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
      // Charged right after the completed attempt is durable; the daily session dedupes repeats.
      if (adventure && next.completedAt && onMissionComplete) {
        try {
          const result = onMissionComplete(next);
          if (result.charged) setCompletion(result);
        } catch (cause) {
          setError(`Bài đã lưu nhưng chưa tính được mũi tên. ${errorText(cause)}`);
        }
      }
      const response = next.responses.at(-1)!;
      const label =
        view!.input === 'cards'
          ? describeCardArrangement(choiceId)
          : view!.choices.find((choice) => choice.id === choiceId)!.label;
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
      if (button === XboxButton.B) leave();
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
        if (event.key === 'Escape') leave();
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
      <button onClick={leave}>
        {adventure
          ? attempt && !attempt.completedAt
            ? '← Tạm dừng, làm tiếp sau'
            : '← Về trò chơi'
          : '← Về luyện tính'}
      </button>
      <h1>{adventure ? '🏹 Nhiệm vụ suy luận' : '🏹 Đọc đề, chọn bước'}</h1>
      <p>
        {adventure
          ? 'Đọc chậm, nghĩ kỹ rồi chọn. Cả nhiệm vụ chỉ dùng 1 mũi tên, khi con làm xong.'
          : 'Luyện tập không giới hạn. Đọc chậm, nghĩ kỹ rồi chọn. Không dùng mũi tên hằng ngày.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {blocked && <button onClick={reset}>Xoá lịch sử luyện tập để bắt đầu lại</button>}
      {showStart && adventure ? (
        attempt?.completedAt ? (
          <div role="status" className="mission-complete">
            <h2>Hoàn thành nhiệm vụ!</h2>
            <p>{getMissionHint(attempt.mission, 'worked')}</p>
            <p>
              {completion
                ? `Nhiệm vụ dùng 1 mũi tên. +${completion.xpAwarded} XP ⭐`
                : 'Nhiệm vụ đã được tính một mũi tên.'}
            </p>
            <button data-primary onClick={onBack}>
              Tiếp tục
            </button>
          </div>
        ) : (
          <>
            <p>
              {advice
                ? `Nhiệm vụ hôm nay: ${familyLabels[advice.family]}.`
                : 'Nhiệm vụ suy luận đang chờ con.'}
            </p>
            <fieldset disabled={blocked}>
              <legend>Chọn cách làm</legend>
              <button
                aria-pressed={support === 'guided'}
                onClick={() => setChosenSupport('guided')}
              >
                Từng bước
              </button>
              <button
                aria-pressed={support === 'independent'}
                onClick={() => setChosenSupport('independent')}
              >
                Tự giải
              </button>
            </fieldset>
            {advice && (
              <p role="note" className="mission-advice">
                {supportAdvice(advice.support)}
              </p>
            )}
            <button data-primary disabled={blocked} onClick={start}>
              Bắt đầu nhiệm vụ
            </button>
            <button onClick={onDecline ?? onBack}>Để sau</button>
          </>
        )
      ) : showStart ? (
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
                  onClick={() => {
                    setChosenFamily(item);
                    setChosenSupport(null);
                  }}
                >
                  {familyLabels[item]}
                </button>
              ))}
            </fieldset>
          )}
          {advice?.focus && families.length > 1 && advice.focus.family !== family && (
            <p role="note" className="mission-advice">
              Gợi ý: con đang cần luyện thêm “{familyLabels[advice.focus.family]}” (
              {Math.round(advice.focus.accuracy * 100)}% đúng ngay lần đầu, qua{' '}
              {advice.focus.observations} lần).{' '}
              <button
                onClick={() => {
                  setChosenFamily(advice.focus!.family);
                  setChosenSupport(null);
                }}
              >
                Chọn loại này
              </button>
            </p>
          )}
          <fieldset disabled={blocked}>
            <legend>Chọn cách luyện cho bài tiếp theo</legend>
            <button aria-pressed={support === 'guided'} onClick={() => setChosenSupport('guided')}>
              Từng bước
            </button>
            <button
              aria-pressed={support === 'independent'}
              onClick={() => setChosenSupport('independent')}
            >
              Tự giải
            </button>
          </fieldset>
          {advice && (
            <p role="note" className="mission-advice">
              {supportAdvice(advice.support)}
              {advice.stability.stable &&
                ` Con tự giải ổn định (${advice.stability.independentMissions} bài, ${Math.round(advice.stability.accuracy * 100)}% đúng ngay lần đầu).`}
            </p>
          )}
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
              {view.input === 'cards' && (
                <DigitCardBoard
                  // A new board after each response, so a retry starts from empty slots.
                  key={attempt.responses.length}
                  cards={view.cards ?? []}
                  disabled={!!feedback || blocked}
                  onSubmit={answer}
                />
              )}
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
        {view?.input === 'cards'
          ? 'Chạm để chọn thẻ rồi chọn ô · Tab / Enter · Tay cầm: di chuyển, A chọn, B quay lại'
          : 'Chạm để chọn · Phím 1–4 hoặc Tab / Enter · Tay cầm: di chuyển, A chọn, B quay lại'}
      </p>
    </section>
  );
}
