import { useState } from 'react';
import { formatCardArrangement } from '@math-archer/learning-engine';

export interface DigitCardBoardProps {
  /** The bank, in the order the problem lists it. */
  cards: readonly number[];
  disabled?: boolean;
  /** Called with the slots encoded for `recordMissionResponse`. */
  onSubmit: (arrangementId: string) => void;
}

const SLOT_LABELS = [
  'Số thứ nhất, hàng chục',
  'Số thứ nhất, hàng đơn vị',
  'Số thứ hai, hàng chục',
  'Số thứ hai, hàng đơn vị',
];

/**
 * Select-then-place digit slots. Tap a card, then a slot; tap a filled slot to take its card back
 * (it stays selected, so the next slot tapped moves it). No dragging, and no running sum, so the
 * board never supplies the calculation.
 */
export function DigitCardBoard({ cards, disabled = false, onSubmit }: DigitCardBoardProps) {
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null, null]);
  const [selected, setSelected] = useState<number | null>(null);
  const placed = slots.filter((slot): slot is number => slot !== null);
  const full = placed.length === slots.length;

  const placeInto = (index: number) => {
    if (selected === null) {
      // Take the card back and keep it selected, so tapping another slot moves it.
      if (slots[index] !== null) {
        setSelected(slots[index]);
        setSlots(slots.map((slot, i) => (i === index ? null : slot)));
      }
      return;
    }
    // Whatever was in the slot returns to the bank, because slots hold one card each.
    setSlots(slots.map((slot, i) => (i === index ? selected : slot)));
    setSelected(null);
  };

  return (
    <div className="digit-card-board" role="group" aria-label="Xếp thẻ số">
      <p id="digit-card-bank-label">Thẻ có thể chọn</p>
      <div className="digit-card-bank" role="group" aria-labelledby="digit-card-bank-label">
        {cards.map((card, index) => {
          const used = placed.includes(card);
          return (
            <button
              key={card}
              className="digit-card"
              data-primary={index === 0 ? true : undefined}
              disabled={disabled || used}
              aria-pressed={selected === card}
              aria-label={`Thẻ ${card}${used ? ', đã đặt' : selected === card ? ', đang chọn' : ''}`}
              onClick={() => setSelected(selected === card ? null : card)}
            >
              {card}
            </button>
          );
        })}
      </div>
      <div className="digit-card-slots">
        {[0, 2].map((first) => (
          <div className="digit-card-row" key={first}>
            <strong>{first === 0 ? 'Số thứ nhất' : 'Số thứ hai'}</strong>
            {[first, first + 1].map((index) => (
              <button
                key={index}
                className="digit-card-slot"
                disabled={disabled}
                aria-label={`${SLOT_LABELS[index]}: ${slots[index] ?? 'trống'}`}
                onClick={() => placeInto(index)}
              >
                <small>{index % 2 === 0 ? 'Chục' : 'Đơn vị'}</small>
                <span>{slots[index] ?? ''}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="digit-card-actions">
        <button disabled={disabled || selected === null} onClick={() => setSelected(null)}>
          Bỏ chọn
        </button>
        <button
          disabled={disabled || (placed.length === 0 && selected === null)}
          onClick={() => {
            setSlots([null, null, null, null]);
            setSelected(null);
          }}
        >
          Làm lại
        </button>
        <button
          disabled={disabled || !full}
          onClick={() => onSubmit(formatCardArrangement(slots as number[]))}
        >
          Xác nhận cách xếp
        </button>
      </div>
      <p role="status" className="digit-card-status">
        {selected === null
          ? full
            ? 'Đã đặt đủ 4 thẻ. Bấm Xác nhận cách xếp.'
            : 'Chọn một thẻ, rồi chọn ô để đặt.'
          : `Đang chọn thẻ ${selected}. Chọn một ô để đặt.`}
      </p>
    </div>
  );
}
