import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './ParentGate.css';

interface ParentGateProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ParentGate: React.FC<ParentGateProps> = ({ onSuccess, onCancel }) => {
  const { unlockParentWithPin, unlockParentWithCredentials, isLoading, parentPin } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [usePasswordMode, setUsePasswordMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('parent@math-archer.local');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleKeyPress = async (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMessage(null);

      // Auto-submit when 4th digit entered
      if (nextPin.length === 4) {
        const success = await unlockParentWithPin(nextPin);
        if (success) {
          onSuccess?.();
        } else {
          setErrorMessage('Incorrect Parent PIN. Please try again.');
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const success = await unlockParentWithCredentials(email, password);
    if (success) {
      onSuccess?.();
    } else {
      setErrorMessage('Invalid parent email or password. Please try again.');
    }
  };

  return (
    <div className="parent-gate-container" data-testid="parent-gate">
      <div className="parent-gate-card">
        <div className="parent-gate-icon">🔒</div>
        <h2 className="parent-gate-title">Parent Dashboard Protected</h2>
        <p className="parent-gate-desc">
          Pedagogical analytics, practice goals, and child profile settings are restricted to
          parents. Please enter your 4-digit Parent PIN to continue.
        </p>

        {errorMessage && (
          <div className="parent-gate-error" data-testid="parent-gate-error">
            {errorMessage}
          </div>
        )}

        {!usePasswordMode ? (
          <div className="parent-gate-form">
            {/* Visual PIN boxes */}
            <div className="pin-display-group" data-testid="pin-display">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`pin-digit-box ${pin.length > idx ? 'filled' : ''}`}
                  data-testid={`pin-digit-${idx}`}
                >
                  {pin.length > idx ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Numeric keypad */}
            <div className="keypad-grid" data-testid="keypad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="keypad-btn"
                  data-testid={`keypad-${digit}`}
                  onClick={() => handleKeyPress(digit)}
                  disabled={isLoading || pin.length >= 4}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                className="keypad-btn action-btn"
                data-testid="keypad-clear"
                onClick={handleClear}
                disabled={isLoading || pin.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="keypad-btn"
                data-testid="keypad-0"
                onClick={() => handleKeyPress('0')}
                disabled={isLoading || pin.length >= 4}
              >
                0
              </button>
              <button
                type="button"
                className="keypad-btn action-btn"
                data-testid="keypad-backspace"
                onClick={handleBackspace}
                disabled={isLoading || pin.length === 0}
              >
                ⌫
              </button>
            </div>

            <div className="hint-pill" data-testid="parent-pin-hint">
              💡 {parentPin === '1234' ? 'Demo Parent PIN' : 'Parent PIN'}: <strong>{parentPin || '1234'}</strong>
            </div>

            <button
              type="button"
              className="toggle-mode-link"
              data-testid="toggle-password-mode"
              onClick={() => {
                setUsePasswordMode(true);
                setErrorMessage(null);
              }}
            >
              Or unlock with parent email & password
            </button>
          </div>
        ) : (
          <form
            onSubmit={handlePasswordSubmit}
            className="parent-gate-form"
            data-testid="password-form"
          >
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Parent Email
              </label>
              <input
                type="email"
                data-testid="parent-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  marginTop: 4,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Parent Password
              </label>
              <input
                type="password"
                data-testid="parent-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  marginTop: 4,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-unlock"
              data-testid="submit-password-btn"
              disabled={isLoading || !password}
            >
              {isLoading ? 'Verifying...' : 'Unlock Dashboard'}
            </button>

            <button
              type="button"
              className="toggle-mode-link"
              data-testid="toggle-pin-mode"
              onClick={() => {
                setUsePasswordMode(false);
                setErrorMessage(null);
              }}
            >
              Use 4-digit PIN instead
            </button>
          </form>
        )}

        <div className="parent-gate-actions">
          {onCancel && (
            <button
              type="button"
              className="btn-back-to-game"
              data-testid="gate-back-to-game-btn"
              onClick={onCancel}
            >
              🏹 Back to Math Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
