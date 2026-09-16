export * from './curriculum';
export * from './questions';
export * from './distractors';
export * from './skills';
export * from './recommendations';
export * from './simulation';
export * from './session';
export * from './teaching';
export * from './history';
export * from './dashboard';

export interface EngineInfo {
  name: string;
  version: string;
  status: 'ready' | 'initializing';
}

export function getEngineInfo(): EngineInfo {
  return {
    name: '@math-archer/learning-engine',
    version: '0.1.0',
    status: 'ready',
  };
}
