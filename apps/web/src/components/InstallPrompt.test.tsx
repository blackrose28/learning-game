import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstallPrompt } from './InstallPrompt';
import * as pwa from '../pwa';

describe('Task 8.1 — Make it installable: InstallPrompt Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders nothing when not installable and not in standalone mode', () => {
    vi.spyOn(pwa, 'isStandaloneMode').mockReturnValue(false);
    vi.spyOn(pwa, 'canInstallPrompt').mockReturnValue(false);

    const { container } = render(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders install banner when forceShow is true or install prompt is available', () => {
    vi.spyOn(pwa, 'isStandaloneMode').mockReturnValue(false);
    vi.spyOn(pwa, 'canInstallPrompt').mockReturnValue(true);

    render(<InstallPrompt forceShow />);
    expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
    expect(screen.getByText(/Install Math Archer/i)).toBeInTheDocument();
    expect(screen.getByTestId('pwa-install-btn')).toBeInTheDocument();
  });

  it('calls promptInstall when install button is clicked', async () => {
    vi.spyOn(pwa, 'isStandaloneMode').mockReturnValue(false);
    vi.spyOn(pwa, 'canInstallPrompt').mockReturnValue(true);
    const promptSpy = vi.spyOn(pwa, 'promptInstall').mockResolvedValue('accepted');

    render(<InstallPrompt forceShow />);
    const installBtn = screen.getByTestId('pwa-install-btn');
    fireEvent.click(installBtn);

    await waitFor(() => {
      expect(promptSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('dismisses banner and sets localStorage flag when close button is clicked', () => {
    vi.spyOn(pwa, 'isStandaloneMode').mockReturnValue(false);
    vi.spyOn(pwa, 'canInstallPrompt').mockReturnValue(true);

    render(<InstallPrompt forceShow />);
    const dismissBtn = screen.getByTestId('pwa-dismiss-btn');
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
    expect(localStorage.getItem('math_archer_pwa_dismissed')).toBe('true');
  });

  it('renders standalone badge when running in standalone mode', () => {
    vi.spyOn(pwa, 'isStandaloneMode').mockReturnValue(true);

    render(<InstallPrompt />);
    expect(screen.getByTestId('standalone-badge')).toBeInTheDocument();
    expect(screen.getByText(/App Mode/i)).toBeInTheDocument();
  });
});
