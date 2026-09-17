import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ChildPublicProfile } from '../api/client';
import './ChildProfilePicker.css';

interface ChildProfilePickerProps {
  onClose?: () => void;
  onSelect?: (child: ChildPublicProfile) => void;
}

const AVATAR_MAP: Record<string, string> = {
  'archer-1': '🏹',
  'archer-2': '🎯',
  'archer-fire': '🔥',
  'archer-ice': '❄️',
  'archer-wind': '💨',
  'archer-earth': '🌿',
};

export const ChildProfilePicker: React.FC<ChildProfilePickerProps> = ({ onClose, onSelect }) => {
  const { availableChildren, activeChild, loginAsChild, isLoading } = useAuth();
  const [selectedChild, setSelectedChild] = useState<ChildPublicProfile | null>(activeChild);
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectCard = async (child: ChildPublicProfile) => {
    setSelectedChild(child);
    setPin('');
    setErrorMessage(null);

    // If child doesn't require a PIN, log in immediately!
    if (!child.hasPin) {
      const ok = await loginAsChild(child.id);
      if (ok) {
        onSelect?.(child);
        onClose?.();
      }
    }
  };

  const handleKeyPress = async (digit: string) => {
    if (!selectedChild) return;
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMessage(null);

      if (nextPin.length === 4) {
        const ok = await loginAsChild(selectedChild.id, nextPin);
        if (ok) {
          onSelect?.(selectedChild);
          onClose?.();
        } else {
          setErrorMessage('Oops! Incorrect PIN. Try again 🎯');
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  return (
    <div className="child-picker-overlay" data-testid="child-profile-picker">
      <div className="child-picker-modal">
        <div className="child-picker-header">
          <h2>🏹 Who is Playing?</h2>
          <p>Select your archer profile to start your math adventure!</p>
        </div>

        {errorMessage && (
          <div className="child-picker-error" data-testid="child-picker-error">
            {errorMessage}
          </div>
        )}

        {/* Profile cards */}
        <div className="child-grid" data-testid="child-profile-grid">
          {availableChildren.map((child) => {
            const isSelected = selectedChild?.id === child.id;
            const emoji = AVATAR_MAP[child.avatar] || '🏹';
            return (
              <div
                key={child.id}
                className={`child-card ${isSelected ? 'selected' : ''}`}
                data-testid={`child-card-${child.id}`}
                onClick={() => handleSelectCard(child)}
              >
                <div className="child-avatar-circle">{emoji}</div>
                <div className="child-name">{child.name}</div>
                <div className="child-grade">{child.grade}</div>
                <div className="child-pin-badge">
                  {child.hasPin ? '🔒 4-digit PIN' : '✨ Quick Start'}
                </div>
              </div>
            );
          })}
        </div>

        {/* PIN input if selected child has PIN */}
        {selectedChild && selectedChild.hasPin && (
          <div className="child-pin-section" data-testid="child-pin-section">
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#1f2937' }}>
              Hi {selectedChild.name}! Enter your 4-digit code:
            </h3>

            <div className="pin-display-group">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`pin-digit-box ${pin.length > idx ? 'filled' : ''}`}
                  data-testid={`child-pin-digit-${idx}`}
                >
                  {pin.length > idx ? '●' : ''}
                </div>
              ))}
            </div>

            <div className="keypad-grid" style={{ maxWidth: 280, margin: '14px auto 0' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="keypad-btn"
                  data-testid={`child-keypad-${digit}`}
                  onClick={() => handleKeyPress(digit)}
                  disabled={isLoading || pin.length >= 4}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                className="keypad-btn action-btn"
                data-testid="child-keypad-clear"
                onClick={handleClear}
                disabled={isLoading || pin.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="keypad-btn"
                data-testid="child-keypad-0"
                onClick={() => handleKeyPress('0')}
                disabled={isLoading || pin.length >= 4}
              >
                0
              </button>
              <button
                type="button"
                className="keypad-btn action-btn"
                data-testid="child-keypad-backspace"
                onClick={handleBackspace}
                disabled={isLoading || pin.length === 0}
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {onClose && (
          <button
            type="button"
            className="btn-close-picker"
            data-testid="close-child-picker-btn"
            onClick={onClose}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
