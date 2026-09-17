import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParentGate } from './ParentGate';
import { AuthProvider } from '../context/AuthContext';

describe('ParentGate Component (Task 7.2)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Parent Gate challenge dialog preventing unauthorized access', () => {
    render(
      <AuthProvider>
        <ParentGate />
      </AuthProvider>
    );

    expect(screen.getByTestId('parent-gate')).toBeInTheDocument();
    expect(screen.getByText(/Parent Dashboard Protected/i)).toBeInTheDocument();
    expect(screen.getByTestId('pin-display')).toBeInTheDocument();
    expect(screen.getByTestId('keypad-grid')).toBeInTheDocument();
  });

  it('shows error when an incorrect PIN is entered', async () => {
    render(
      <AuthProvider>
        <ParentGate />
      </AuthProvider>
    );

    // Enter wrong PIN: 9999
    fireEvent.click(screen.getByTestId('keypad-9'));
    fireEvent.click(screen.getByTestId('keypad-9'));
    fireEvent.click(screen.getByTestId('keypad-9'));
    fireEvent.click(screen.getByTestId('keypad-9'));

    await waitFor(() => {
      expect(screen.getByTestId('parent-gate-error')).toBeInTheDocument();
      expect(screen.getByTestId('parent-gate-error')).toHaveTextContent(/Incorrect Parent PIN/i);
    });
  });

  it('unlocks successfully when entering correct 4-digit PIN (1234)', async () => {
    const onSuccess = vi.fn();
    render(
      <AuthProvider>
        <ParentGate onSuccess={onSuccess} />
      </AuthProvider>
    );

    // Enter valid demo PIN: 1234
    fireEvent.click(screen.getByTestId('keypad-1'));
    fireEvent.click(screen.getByTestId('keypad-2'));
    fireEvent.click(screen.getByTestId('keypad-3'));
    fireEvent.click(screen.getByTestId('keypad-4'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('allows navigating back to game screen via Back button', () => {
    const onCancel = vi.fn();
    render(
      <AuthProvider>
        <ParentGate onCancel={onCancel} />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('gate-back-to-game-btn'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('allows toggling to email & password unlock mode', () => {
    render(
      <AuthProvider>
        <ParentGate />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('toggle-password-mode'));
    expect(screen.getByTestId('password-form')).toBeInTheDocument();
    expect(screen.getByTestId('parent-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('parent-password-input')).toBeInTheDocument();

    // Toggle back to PIN mode
    fireEvent.click(screen.getByTestId('toggle-pin-mode'));
    expect(screen.getByTestId('keypad-grid')).toBeInTheDocument();
  });

  it('reflects updated PIN and unlocks with the new PIN when changed', async () => {
    localStorage.setItem('math_archer_parent_pin', '5678');
    const onSuccess = vi.fn();

    render(
      <AuthProvider>
        <ParentGate onSuccess={onSuccess} />
      </AuthProvider>
    );

    // Hint should now reflect the updated PIN
    expect(screen.getByTestId('parent-pin-hint')).toHaveTextContent('5678');

    // Entering old PIN (1234) should fail
    fireEvent.click(screen.getByTestId('keypad-1'));
    fireEvent.click(screen.getByTestId('keypad-2'));
    fireEvent.click(screen.getByTestId('keypad-3'));
    fireEvent.click(screen.getByTestId('keypad-4'));

    await waitFor(() => {
      expect(screen.getByTestId('parent-gate-error')).toHaveTextContent(/Incorrect Parent PIN/i);
    });

    // Entering new PIN (5678) should succeed
    fireEvent.click(screen.getByTestId('keypad-5'));
    fireEvent.click(screen.getByTestId('keypad-6'));
    fireEvent.click(screen.getByTestId('keypad-7'));
    fireEvent.click(screen.getByTestId('keypad-8'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
