import { useEffect, useState, useRef } from 'react';
import {
  gamepadManager,
  XboxButton,
  type ControllerDirection,
  type ControllerState,
  type GamepadListener,
} from './gamepad';

export interface UseGamepadOptions {
  onButtonDown?: (button: XboxButton) => void;
  onButtonUp?: (button: XboxButton) => void;
  onDirection?: (direction: ControllerDirection) => void;
  enabled?: boolean;
}

let nextListenerId = 1;

export function useGamepad(options: UseGamepadOptions = {}): ControllerState {
  const { onButtonDown, onButtonUp, onDirection, enabled = true } = options;

  const [state, setState] = useState<ControllerState>(() => gamepadManager.getState());
  const listenerIdRef = useRef<string>(`gamepad-listener-${nextListenerId++}`);

  // Keep callback refs fresh without re-subscribing
  const onButtonDownRef = useRef(onButtonDown);
  onButtonDownRef.current = onButtonDown;

  const onButtonUpRef = useRef(onButtonUp);
  onButtonUpRef.current = onButtonUp;

  const onDirectionRef = useRef(onDirection);
  onDirectionRef.current = onDirection;

  useEffect(() => {
    const unsubState = gamepadManager.onStateChange((newState) => {
      setState(newState);
    });

    if (!enabled) {
      return unsubState;
    }

    const listener: GamepadListener = {
      id: listenerIdRef.current,
      onButtonDown: (btn) => {
        if (enabled) {
          onButtonDownRef.current?.(btn);
        }
      },
      onButtonUp: (btn) => {
        if (enabled) {
          onButtonUpRef.current?.(btn);
        }
      },
      onDirection: (dir) => {
        if (enabled) {
          onDirectionRef.current?.(dir);
        }
      },
    };

    const unsubListener = gamepadManager.subscribe(listener);

    return () => {
      unsubListener();
      unsubState();
    };
  }, [enabled]);

  return state;
}

export { XboxButton, type ControllerDirection, type ControllerState };
