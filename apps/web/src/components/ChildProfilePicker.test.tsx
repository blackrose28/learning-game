import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChildProfilePicker } from './ChildProfilePicker';
import { AuthProvider } from '../context/AuthContext';

describe('ChildProfilePicker Component (Task 7.1)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders available child archer profiles without requiring complicated passwords', () => {
    render(
      <AuthProvider>
        <ChildProfilePicker />
      </AuthProvider>
    );

    expect(screen.getByTestId('child-profile-picker')).toBeInTheDocument();
    expect(screen.getByText(/Who is Playing\?/i)).toBeInTheDocument();
    expect(screen.getByTestId('child-profile-grid')).toBeInTheDocument();
    expect(screen.getByTestId('child-card-player-local')).toHaveTextContent('Alex');
    expect(screen.getByTestId('child-card-child_mia')).toHaveTextContent('Mia');
  });

  it('allows child to select profile and enter simple 4-digit PIN', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <AuthProvider>
        <ChildProfilePicker onSelect={onSelect} onClose={onClose} />
      </AuthProvider>
    );

    // Click on Alex's card
    fireEvent.click(screen.getByTestId('child-card-player-local'));
    expect(screen.getByTestId('child-pin-section')).toBeInTheDocument();

    // Enter Alex's PIN: 1234
    fireEvent.click(screen.getByTestId('child-keypad-1'));
    fireEvent.click(screen.getByTestId('child-keypad-2'));
    fireEvent.click(screen.getByTestId('child-keypad-3'));
    fireEvent.click(screen.getByTestId('child-keypad-4'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows helpful error feedback when incorrect PIN is entered', async () => {
    render(
      <AuthProvider>
        <ChildProfilePicker />
      </AuthProvider>
    );

    // Click on Alex's card
    fireEvent.click(screen.getByTestId('child-card-player-local'));

    // Enter incorrect PIN: 9999
    fireEvent.click(screen.getByTestId('child-keypad-9'));
    fireEvent.click(screen.getByTestId('child-keypad-9'));
    fireEvent.click(screen.getByTestId('child-keypad-9'));
    fireEvent.click(screen.getByTestId('child-keypad-9'));

    await waitFor(() => {
      expect(screen.getByTestId('child-picker-error')).toBeInTheDocument();
      expect(screen.getByTestId('child-picker-error')).toHaveTextContent(/Incorrect PIN/i);
    });
  });

  it('rejects entering Alex PIN (1234) for Mia (5678)', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <AuthProvider>
        <ChildProfilePicker onSelect={onSelect} onClose={onClose} />
      </AuthProvider>
    );

    // Click on Mia's card
    fireEvent.click(screen.getByTestId('child-card-child_mia'));
    expect(screen.getByTestId('child-pin-section')).toBeInTheDocument();

    // Enter Alex's PIN (1234) for Mia
    fireEvent.click(screen.getByTestId('child-keypad-1'));
    fireEvent.click(screen.getByTestId('child-keypad-2'));
    fireEvent.click(screen.getByTestId('child-keypad-3'));
    fireEvent.click(screen.getByTestId('child-keypad-4'));

    await waitFor(() => {
      expect(screen.getByTestId('child-picker-error')).toBeInTheDocument();
      expect(screen.getByTestId('child-picker-error')).toHaveTextContent(/Incorrect PIN/i);
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('allows logging in as Mia when entering Mia correct PIN (5678)', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <AuthProvider>
        <ChildProfilePicker onSelect={onSelect} onClose={onClose} />
      </AuthProvider>
    );

    // Click on Mia's card
    fireEvent.click(screen.getByTestId('child-card-child_mia'));

    // Enter Mia's PIN: 5678
    fireEvent.click(screen.getByTestId('child-keypad-5'));
    fireEvent.click(screen.getByTestId('child-keypad-6'));
    fireEvent.click(screen.getByTestId('child-keypad-7'));
    fireEvent.click(screen.getByTestId('child-keypad-8'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
