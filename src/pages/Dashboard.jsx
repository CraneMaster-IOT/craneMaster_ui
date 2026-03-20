// CraneMaster — Dashboard Page (/)
// Main overview: system status card + 6 motor cards

import React from 'react';
import { SystemStatusCard, MotorCard, LoadingState, ErrorState } from '../components/index';

export default function Dashboard({
  liveState, totalRuntime, downtime,
  loading, error, onRetry
}) {
  if (loading) return <LoadingState message="Loading CraneMaster..." />;
  if (error)   return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <div>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          letterSpacing: 3,
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}>
          OVERVIEW
        </h1>
        <p style={{
          fontFamily: 'var(--font-data)',
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 4,
          letterSpacing: '0.5px',
        }}>
          6-Motor Crane Monitoring System · Live
        </p>
      </div>

      {/* System status card */}
      <SystemStatusCard liveState={liveState} downtime={downtime} />

      {/* Motor cards grid */}
      {liveState.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            fontFamily: 'var(--font-data)',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          No motor data available. Check your Supabase connection.
        </div>
      ) : (
        <div className="motor-grid">
          {liveState.map(motor => (
            <MotorCard
              key={motor.motor_id}
              motor={motor}
              totalRuntime={totalRuntime}
            />
          ))}
        </div>
      )}
    </div>
  );
}
