/**
 * Xbox Gamepad & Controller Input Manager for Math Archer.
 *
 * Implements HTML5 Gamepad API polling, edge-detection, analog stick deadzones,
 * directional repeat throttling, and dual keyboard/gamepad simulation for 10-foot Xbox TV experience.
 */

export enum XboxButton {
  A = 0,
  B = 1,
  X = 2,
  Y = 3,
  LB = 4,
  RB = 5,
  LT = 6,
  RT = 7,
  View = 8, // Back / Select
  Menu = 9, // Start
  LS = 10,
  RS = 11,
  DPadUp = 12,
  DPadDown = 13,
  DPadLeft = 14,
  DPadRight = 15,
  Xbox = 16,
}

export type ControllerDirection = 'up' | 'down' | 'left' | 'right';

export interface GamepadListener {
  id: string;
  onButtonDown?: (button: XboxButton) => void;
  onButtonUp?: (button: XboxButton) => void;
  onDirection?: (direction: ControllerDirection) => void;
}

export interface ControllerState {
  isConnected: boolean;
  isActive: boolean;
  gamepadId: string | null;
}

const STICK_DEADZONE = 0.45;
const INITIAL_REPEAT_DELAY_MS = 280;
const REPEAT_INTERVAL_MS = 140;

class GamepadManager {
  private listeners: Map<string, GamepadListener> = new Map();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private stateListeners: Set<(state: ControllerState) => void> = new Set();

  private isConnected = false;
  private isActive = false;
  private gamepadId: string | null = null;

  private prevButtonStates: boolean[] = new Array(20).fill(false);
  private lastDirectionTime: Record<ControllerDirection, number> = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  };
  private directionHeld: Record<ControllerDirection, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  private animationFrameId: number | null = null;
  private isInitialized = false;

  constructor() {
    // Lazy initialized on client
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    window.addEventListener('keydown', this.handleKeyDown);

    // Initial scan
    this.pollGamepads();
  }

  public destroy(): void {
    if (!this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = false;

    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    window.removeEventListener('keydown', this.handleKeyDown);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getState(): ControllerState {
    return {
      isConnected: this.isConnected,
      isActive: this.isActive,
      gamepadId: this.gamepadId,
    };
  }

  public subscribe(listener: GamepadListener): () => void {
    this.init();
    this.listeners.set(listener.id, listener);
    this.startLoop();

    return () => {
      this.listeners.delete(listener.id);
      if (this.listeners.size === 0 && !this.isConnected) {
        this.stopLoop();
      }
    };
  }

  public onStateChange(callback: (state: ControllerState) => void): () => void {
    this.init();
    this.stateListeners.add(callback);
    callback(this.getState());

    return () => {
      this.stateListeners.delete(callback);
    };
  }

  private notifyStateChange(): void {
    const state = this.getState();
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private activateController(): void {
    if (!this.isActive) {
      this.isActive = true;
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.add('controller-active');
      }
      this.notifyStateChange();
    }
  }

  private handleGamepadConnected = (e: GamepadEvent): void => {
    this.isConnected = true;
    this.gamepadId = e.gamepad.id;
    this.activateController();
    this.startLoop();
    this.notifyStateChange();
    for (const cb of this.connectionListeners) {
      cb(true);
    }
  };

  private handleGamepadDisconnected = (e: GamepadEvent): void => {
    const gamepads = this.getGamepads();
    const hasOther = gamepads.some((p) => p !== null && p.id !== e.gamepad.id);
    if (!hasOther) {
      this.isConnected = false;
      this.gamepadId = null;
      this.notifyStateChange();
      for (const cb of this.connectionListeners) {
        cb(false);
      }
    }
  };

  private getGamepads(): (Gamepad | null)[] {
    if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
      try {
        const pads = navigator.getGamepads();
        return pads ? Array.from(pads) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private startLoop(): void {
    if (this.animationFrameId === null && typeof window !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  }

  private stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    this.pollGamepads();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private pollGamepads(): void {
    const pads = this.getGamepads();
    const activePad = pads.find((p) => p && p.connected) || null;

    if (activePad) {
      if (!this.isConnected) {
        this.isConnected = true;
        this.gamepadId = activePad.id;
        this.activateController();
        this.notifyStateChange();
      }

      this.processGamepadInput(activePad);
    }
  }

  private processGamepadInput(pad: Gamepad): void {
    const now = performance.now();

    // 1. Process Buttons
    for (let i = 0; i < pad.buttons.length; i++) {
      const btn = pad.buttons[i];
      const pressed = btn ? (typeof btn === 'object' ? btn.pressed : btn > 0.5) : false;
      const wasPressed = this.prevButtonStates[i] ?? false;

      if (pressed && !wasPressed) {
        this.activateController();
        this.emitButtonDown(i as XboxButton);

        // Also translate D-pad buttons to directions
        if (i === XboxButton.DPadUp) this.emitDirection('up');
        if (i === XboxButton.DPadDown) this.emitDirection('down');
        if (i === XboxButton.DPadLeft) this.emitDirection('left');
        if (i === XboxButton.DPadRight) this.emitDirection('right');
      } else if (!pressed && wasPressed) {
        this.emitButtonUp(i as XboxButton);
      }

      this.prevButtonStates[i] = pressed;
    }

    // 2. Process Left Analog Stick with deadzone & repeat throttling
    const axisX = pad.axes[0] ?? 0;
    const axisY = pad.axes[1] ?? 0;

    const stickDirections: Record<ControllerDirection, boolean> = {
      up: axisY < -STICK_DEADZONE,
      down: axisY > STICK_DEADZONE,
      left: axisX < -STICK_DEADZONE,
      right: axisX > STICK_DEADZONE,
    };

    const directions: ControllerDirection[] = ['up', 'down', 'left', 'right'];
    for (const dir of directions) {
      const isPushed = stickDirections[dir];
      const wasHeld = this.directionHeld[dir];

      if (isPushed) {
        this.activateController();
        if (!wasHeld) {
          // Initial push
          this.directionHeld[dir] = true;
          this.lastDirectionTime[dir] = now;
          this.emitDirection(dir);
        } else {
          // Check repeat rate
          const elapsed = now - this.lastDirectionTime[dir];
          if (elapsed >= INITIAL_REPEAT_DELAY_MS) {
            this.lastDirectionTime[dir] = now - (INITIAL_REPEAT_DELAY_MS - REPEAT_INTERVAL_MS);
            this.emitDirection(dir);
          }
        }
      } else {
        this.directionHeld[dir] = false;
      }
    }
  }

  // Keyboard navigation & Xbox Edge simulated keydown handler
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore if typing in an input element
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    const key = e.key.toLowerCase();

    // D-Pad / Arrow keys
    if (e.key === 'ArrowUp') {
      this.activateController();
      this.emitButtonDown(XboxButton.DPadUp);
      this.emitDirection('up');
      return;
    }
    if (e.key === 'ArrowDown') {
      this.activateController();
      this.emitButtonDown(XboxButton.DPadDown);
      this.emitDirection('down');
      return;
    }
    if (e.key === 'ArrowLeft') {
      this.activateController();
      this.emitButtonDown(XboxButton.DPadLeft);
      this.emitDirection('left');
      return;
    }
    if (e.key === 'ArrowRight') {
      this.activateController();
      this.emitButtonDown(XboxButton.DPadRight);
      this.emitDirection('right');
      return;
    }

    // Direct A, B, X, Y buttons mapping
    if (key === 'a') {
      this.activateController();
      this.emitButtonDown(XboxButton.A);
      return;
    }
    if (key === 'b') {
      this.activateController();
      this.emitButtonDown(XboxButton.B);
      return;
    }
    if (key === 'x') {
      this.activateController();
      this.emitButtonDown(XboxButton.X);
      return;
    }
    if (key === 'y') {
      this.activateController();
      this.emitButtonDown(XboxButton.Y);
      return;
    }

    // Bumpers
    if (key === 'q') {
      this.activateController();
      this.emitButtonDown(XboxButton.LB);
      return;
    }
    if (key === 'e') {
      this.activateController();
      this.emitButtonDown(XboxButton.RB);
      return;
    }

    // Confirm / Cancel
    if (e.key === 'Enter' || e.key === ' ') {
      this.activateController();
      this.emitButtonDown(XboxButton.A);
      return;
    }
    if (e.key === 'Escape') {
      this.activateController();
      this.emitButtonDown(XboxButton.B);
      return;
    }
  };

  public emitButtonDown(button: XboxButton): void {
    for (const listener of this.listeners.values()) {
      listener.onButtonDown?.(button);
    }
  }

  public emitButtonUp(button: XboxButton): void {
    for (const listener of this.listeners.values()) {
      listener.onButtonUp?.(button);
    }
  }

  public emitDirection(direction: ControllerDirection): void {
    for (const listener of this.listeners.values()) {
      listener.onDirection?.(direction);
    }
  }

  // Test Simulation Helpers
  public simulateButtonDown(button: XboxButton): void {
    this.activateController();
    this.emitButtonDown(button);
  }

  public simulateButtonUp(button: XboxButton): void {
    this.emitButtonUp(button);
  }

  public simulateDirection(direction: ControllerDirection): void {
    this.activateController();
    this.emitDirection(direction);
  }

  public simulateConnected(connected: boolean, id = 'Xbox Wireless Controller (STANDARD GAMEPAD)'): void {
    this.isConnected = connected;
    this.gamepadId = connected ? id : null;
    if (connected) {
      this.activateController();
    }
    this.notifyStateChange();
    for (const cb of this.connectionListeners) {
      cb(connected);
    }
  }
}

export const gamepadManager = new GamepadManager();

