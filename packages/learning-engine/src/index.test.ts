import { describe, it, expect } from 'vitest';
import { getEngineInfo, solveExpression } from './index';

describe('learning-engine', () => {
  it('returns engine metadata', () => {
    const info = getEngineInfo();
    expect(info.name).toBe('@math-archer/learning-engine');
    expect(info.version).toBe('0.1.0');
    expect(info.status).toBe('ready');
  });

  it('correctly solves addition and subtraction expressions', () => {
    expect(solveExpression(8, 7, 'add')).toBe(15);
    expect(solveExpression(17, 9, 'subtract')).toBe(8);
  });
});
