import React, { useState } from 'react';
import { getEngineInfo, solveExpression, type Skill } from '@math-archer/learning-engine';

export const App: React.FC = () => {
  const engineInfo = getEngineInfo();
  const [sampleExpression] = useState({ left: 8, right: 7, op: 'add' as const });
  const activeSkill: Skill = 'cross_10_addition';

  const result = solveExpression(
    sampleExpression.left,
    sampleExpression.right,
    sampleExpression.op
  );

  return (
    <main
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: 720,
        margin: '40px auto',
        padding: '0 20px',
        color: '#1f2937',
      }}
    >
      <header style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
          🏹 Math Archer
        </h1>
        <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
          Adaptive Archery Math Practice for Children
        </p>
      </header>

      <section
        style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>System Status</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.8 }}>
          <li>
            <strong>Learning Engine Package:</strong> {engineInfo.name} (v{engineInfo.version})
          </li>
          <li>
            <strong>Engine Status:</strong>{' '}
            <span style={{ color: '#059669', fontWeight: 600 }}>{engineInfo.status}</span>
          </li>
          <li>
            <strong>Initial Skill Target:</strong> <code>{activeSkill}</code>
          </li>
        </ul>
      </section>

      <section
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0, color: '#1e40af' }}>
          Learning Engine Integration Test
        </h2>
        <p style={{ margin: '8px 0' }}>
          Evaluation test:{' '}
          <code>
            {sampleExpression.left} + {sampleExpression.right} = {result}
          </code>
        </p>
        <p style={{ margin: '8px 0', fontSize: 14, color: '#4b5563' }}>
          ✓ Workspace dependency successfully resolved from <code>packages/learning-engine</code>.
        </p>
      </section>
    </main>
  );
};
