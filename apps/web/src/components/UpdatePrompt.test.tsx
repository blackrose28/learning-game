import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpdatePrompt } from './UpdatePrompt';
import * as updates from '../updates';

vi.mock('../updates', () => ({
  subscribeToUpdates: vi.fn(() => () => {}),
  checkForUpdates: vi.fn().mockResolvedValue(undefined),
  checkLatestVersion: vi.fn().mockResolvedValue('current'),
  gameVersion: { id: 'test-release', label: 'v0.1.0 · test' },
  reloadLatestVersion: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => vi.clearAllMocks());

describe('UpdatePrompt', () => {
  it('always displays the running version and shows the result of a manual check', async () => {
    render(<UpdatePrompt activeTab="game" />);
    fireEvent.click(screen.getByRole('button', { name: /Check for updates, current version/ }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('You have the latest version')
    );
    expect(updates.checkLatestVersion).toHaveBeenCalledOnce();
    expect(screen.getByText('v0.1.0 · test')).toBeInTheDocument();
  });

  it('shows failed checks and offers reload when a manual check finds a release', async () => {
    vi.mocked(updates.checkLatestVersion).mockRejectedValueOnce(new Error('You are offline.'));
    render(<UpdatePrompt activeTab="game" />);
    const button = screen.getByRole('button', { name: /Check for updates, current version/ });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('You are offline'));
    vi.mocked(updates.checkLatestVersion).mockResolvedValueOnce('ready');
    fireEvent.click(button);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reload to update' })).toBeInTheDocument()
    );
  });

  it('checks on game navigation, browser focus, tab return, and reconnect; cleans up listeners', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const { rerender, unmount } = render(<UpdatePrompt activeTab="game" />);
    expect(screen.queryByRole('button', { name: 'Reload to update' })).toBeNull();
    expect(updates.checkForUpdates).toHaveBeenCalledTimes(1);
    rerender(<UpdatePrompt activeTab="world" />);
    fireEvent(window, new Event('focus'));
    fireEvent(document, new Event('visibilitychange'));
    fireEvent(window, new Event('online'));
    expect(updates.checkForUpdates).toHaveBeenCalledTimes(5);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    expect(updates.checkForUpdates).toHaveBeenCalledTimes(5);
    unmount();
    fireEvent(window, new Event('focus'));
    expect(updates.checkForUpdates).toHaveBeenCalledTimes(5);
    vi.restoreAllMocks();
  });

  it('shows a ready release without reloading and allows retry if activation fails', async () => {
    render(<UpdatePrompt activeTab="game" />);
    const listener = vi.mocked(updates.subscribeToUpdates).mock.calls[0][0];
    act(() => listener(true));
    expect(updates.reloadLatestVersion).not.toHaveBeenCalled();
    vi.mocked(updates.reloadLatestVersion).mockRejectedValueOnce(new Error('timeout'));
    fireEvent.click(screen.getByRole('button', { name: 'Reload to update' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Please try again'));
    fireEvent.click(screen.getByRole('button', { name: 'Reload to update' }));
    expect(updates.reloadLatestVersion).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reloading…' })).toBeDisabled());
  });
});
