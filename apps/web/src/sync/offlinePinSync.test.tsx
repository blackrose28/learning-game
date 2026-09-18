import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ParentDashboard } from '../components/ParentDashboard';
import { ParentGate } from '../components/ParentGate';
import { MathArcherApiClient } from '../api/client';
import {
  loadQueuedPinChange,
  getPinQueueStorageKey,
  clearQueuedPinChange,
  enqueuePinChange,
} from './pinSyncQueue';

describe('Item 7: Offline Parent PIN Change Sync Queue', () => {
  beforeEach(() => {
    localStorage.clear();
    clearQueuedPinChange();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
  });

  it('directly updates backend and does not queue when online', async () => {
    let serverPin = '1234';
    const changePinMock = vi.fn().mockImplementation(async ({ newPin, currentPin }) => {
      if (currentPin && currentPin !== serverPin) {
        throw new Error('Current PIN is incorrect');
      }
      serverPin = newPin;
      return {
        success: true,
        parent: { id: 'parent_default', email: 'parent@test.com', name: 'Test Parent', hasPin: true },
      };
    });

    const mockApiClient = new MathArcherApiClient();
    mockApiClient.changeParentPin = changePinMock;

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    const TestConsumer = () => {
      capturedAuth = useAuth();
      return <div>PIN: {capturedAuth.parentPin}</div>;
    };

    render(
      <AuthProvider apiClient={mockApiClient}>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth?.parentPin).toBe('1234');
    });

    // Change PIN online
    let result = false;
    await act(async () => {
      result = (await capturedAuth?.changeParentPin('4321', '1234')) ?? false;
    });

    expect(result).toBe(true);
    expect(changePinMock).toHaveBeenCalledWith({ newPin: '4321', currentPin: '1234' });
    expect(localStorage.getItem('math_archer_parent_pin')).toBe('4321');
    expect(capturedAuth!.parentPin).toBe('4321');

    // Queue must be empty because sync succeeded immediately
    expect(loadQueuedPinChange()).toBeNull();
    expect(localStorage.getItem(getPinQueueStorageKey())).toBeNull();
    expect(capturedAuth!.hasPendingPinSync).toBe(false);
  });

  it('queues parent PIN update locally when network is offline', async () => {
    const mockApiClient = new MathArcherApiClient();
    // Simulate offline network failure (fetch throws TypeError)
    mockApiClient.changeParentPin = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    const TestConsumer = () => {
      capturedAuth = useAuth();
      return (
        <div>
          <span>PIN: {capturedAuth.parentPin}</span>
          <span>Pending: {capturedAuth.hasPendingPinSync ? 'YES' : 'NO'}</span>
        </div>
      );
    };

    render(
      <AuthProvider apiClient={mockApiClient}>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.parentPin).toBe('1234');
    });

    // Change PIN while offline
    let result = false;
    await act(async () => {
      result = (await capturedAuth?.changeParentPin('9876', '1234')) ?? false;
    });

    expect(result).toBe(true);
    // Local PIN is updated
    expect(capturedAuth!.parentPin).toBe('9876');
    expect(localStorage.getItem('math_archer_parent_pin')).toBe('9876');

    // Queued in storage
    const queued = loadQueuedPinChange();
    expect(queued).not.toBeNull();
    expect(queued?.newPin).toBe('9876');
    expect(queued?.currentPin).toBe('1234');
    expect(capturedAuth!.hasPendingPinSync).toBe(true);
  });

  it('rejects invalid offline PIN attempts without queueing', async () => {
    const mockApiClient = new MathArcherApiClient();
    mockApiClient.changeParentPin = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    const TestConsumer = () => {
      capturedAuth = useAuth();
      return <div>PIN: {capturedAuth.parentPin}</div>;
    };

    render(
      <AuthProvider apiClient={mockApiClient}>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.parentPin).toBe('1234');
    });

    // 1. Incorrect current PIN
    let err1: Error | null = null;
    await act(async () => {
      try {
        await capturedAuth?.changeParentPin('9876', '0000');
      } catch (e: unknown) {
        err1 = e as Error;
      }
    });
    expect(err1!.message).toMatch(/Current PIN is incorrect/i);
    expect(loadQueuedPinChange()).toBeNull();
    expect(capturedAuth!.parentPin).toBe('1234');

    // 2. Malformed new PIN (not 4 digits)
    let err2: Error | null = null;
    await act(async () => {
      try {
        await capturedAuth?.changeParentPin('12', '1234');
      } catch (e: unknown) {
        err2 = e as Error;
      }
    });
    expect(err2!.message).toMatch(/PIN must be exactly 4 digits/i);
    expect(loadQueuedPinChange()).toBeNull();
    expect(capturedAuth!.parentPin).toBe('1234');
  });

  it('automatically pushes queued PIN change to server when online event fires', async () => {
    let serverPin = '1234';
    const changePinMock = vi.fn().mockImplementation(async ({ newPin, currentPin }) => {
      if (currentPin && currentPin !== serverPin) {
        throw new Error('Current PIN is incorrect');
      }
      serverPin = newPin;
      return {
        success: true,
        parent: { id: 'parent_default', email: 'parent@test.com', name: 'Test Parent', hasPin: true },
      };
    });

    const mockApiClient = new MathArcherApiClient();
    mockApiClient.changeParentPin = changePinMock;

    // Simulate being offline during startup
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

    // Simulate pre-existing offline queued PIN change
    enqueuePinChange({ newPin: '7777', currentPin: '1234' });
    localStorage.setItem('math_archer_parent_pin', '7777');

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    const TestConsumer = () => {
      capturedAuth = useAuth();
      return <div>Pending: {capturedAuth.hasPendingPinSync ? 'YES' : 'NO'}</div>;
    };

    render(
      <AuthProvider apiClient={mockApiClient}>
        <TestConsumer />
      </AuthProvider>
    );

    // Initial state reflects queued change because offline
    expect(capturedAuth!.hasPendingPinSync).toBe(true);
    expect(changePinMock).not.toHaveBeenCalled();

    // Now connection returns
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(changePinMock).toHaveBeenCalledWith({ newPin: '7777', currentPin: '1234' });
      expect(serverPin).toBe('7777');
      expect(loadQueuedPinChange()).toBeNull();
      expect(capturedAuth!.hasPendingPinSync).toBe(false);
    });
  });

  it('supports manual flushPinSyncQueue when connection returns', async () => {
    let pushed = false;
    const mockApiClient = new MathArcherApiClient();
    mockApiClient.changeParentPin = vi.fn().mockImplementation(async () => {
      pushed = true;
      return {
        success: true,
        parent: { id: 'parent_default', email: 'parent@test.com', name: 'Test Parent', hasPin: true },
      };
    });

    // Start offline so mount doesn't auto-flush
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

    enqueuePinChange({ newPin: '5555', currentPin: '1234' });

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    const TestConsumer = () => {
      capturedAuth = useAuth();
      return <div>Pending: {capturedAuth.hasPendingPinSync ? 'YES' : 'NO'}</div>;
    };

    render(
      <AuthProvider apiClient={mockApiClient}>
        <TestConsumer />
      </AuthProvider>
    );

    expect(capturedAuth!.hasPendingPinSync).toBe(true);
    expect(pushed).toBe(false);

    // Online again
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

    let flushSuccess = false;
    await act(async () => {
      flushSuccess = (await capturedAuth?.flushPinSyncQueue?.()) ?? false;
    });

    expect(flushSuccess).toBe(true);
    expect(pushed).toBe(true);
    expect(loadQueuedPinChange()).toBeNull();
    expect(capturedAuth!.hasPendingPinSync).toBe(false);
  });

  it('allows changing parent PIN in ParentDashboard while offline and queues it', async () => {
    const mockApiClient = new MathArcherApiClient();
    mockApiClient.changeParentPin = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    render(
      <AuthProvider apiClient={mockApiClient}>
        <ParentDashboard playerId="player-local" apiClient={mockApiClient} />
      </AuthProvider>
    );

    // Open Change PIN modal
    const changePinBtn = await screen.findByTestId('change-parent-pin-btn');
    fireEvent.click(changePinBtn);

    // Enter current PIN and new PIN
    fireEvent.change(screen.getByTestId('current-parent-pin-input'), { target: { value: '1234' } });
    fireEvent.change(screen.getByTestId('new-parent-pin-input'), { target: { value: '8888' } });
    fireEvent.change(screen.getByTestId('confirm-parent-pin-input'), { target: { value: '8888' } });

    // Submit form
    fireEvent.submit(screen.getByTestId('new-parent-pin-input').closest('form')!);

    await waitFor(() => {
      expect(screen.getByTestId('change-pin-success')).toHaveTextContent(/Parent PIN successfully updated/i);
    });

    expect(localStorage.getItem('math_archer_parent_pin')).toBe('8888');
    const queued = loadQueuedPinChange();
    expect(queued?.newPin).toBe('8888');
    expect(queued?.currentPin).toBe('1234');
  });

  it('unlocks with new PIN during pending queue by verifying with old PIN and flushing', async () => {
    let serverPin = '1234';
    const mockApiClient = new MathArcherApiClient();
    mockApiClient.verifyParentPin = vi.fn().mockImplementation(async (pin) => {
      if (pin === serverPin) {
        return {
          valid: true,
          token: 'token-parent-mock',
          parent: { id: 'parent_default', email: 'p@test.com', name: 'Parent', hasPin: true },
        };
      }
      return { valid: false };
    });
    mockApiClient.changeParentPin = vi.fn().mockImplementation(async ({ newPin }) => {
      serverPin = newPin;
      return {
        success: true,
        parent: { id: 'parent_default', email: 'p@test.com', name: 'Parent', hasPin: true },
      };
    });

    // Queued offline PIN change
    enqueuePinChange({ newPin: '6543', currentPin: '1234' });
    localStorage.setItem('math_archer_parent_pin', '6543');

    const onSuccess = vi.fn();
    render(
      <AuthProvider apiClient={mockApiClient}>
        <ParentGate onSuccess={onSuccess} />
      </AuthProvider>
    );

    await screen.findByTestId('keypad-grid');

    // Enter new PIN: 6543
    fireEvent.click(screen.getByTestId('keypad-6'));
    fireEvent.click(screen.getByTestId('keypad-5'));
    fireEvent.click(screen.getByTestId('keypad-4'));
    fireEvent.click(screen.getByTestId('keypad-3'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockApiClient.changeParentPin).toHaveBeenCalledWith({
        newPin: '6543',
        currentPin: '1234',
      });
      expect(serverPin).toBe('6543');
    });
  });
});
