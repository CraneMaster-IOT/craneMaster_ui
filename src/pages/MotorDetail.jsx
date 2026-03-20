// CraneMaster — Motor Detail Page (/motor/:id)

import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  filterByRange, buildChartData, buildDonutData,
  computeStats, formatDuration
} from '../api';
import {
  StatusBadge, RangeSelector, LiveDuration,
  LoadingState, ErrorState
} from '../components/index';
import { RunTimeBarChart, DirectionDonut, DailyBarChart } from '../components/Charts';
import { SessionTable } from '../components/Tables';

export default function MotorDetail({
  liveState, allSessions, totalRuntime,
  loading, error, onRetry
}) {
  const { id } = useParams();
  const motorId = parseInt(id, 10);
  const [range, setRange] = useState('7D');

  // ── ALL hooks must come before any early returns ──
  const motor = liveState.find(m => m.motor_id === motorId);

  const motorSessions = useMemo(
    () => allSessions.filter(s => s.motor_id === motorId),
    [allSessions, motorId]
  );
  const rangeSessions = useMemo(
    () => filterByRange(motorSessions, range),
    [motorSessions, range]
  );
  const stats    = useMemo(() => computeStats(motorSessions, range),   [motorSessions, range]);
  const chartData = useMemo(() => buildChartData(motorSessions, range), [motorSessions, range]);
  const donutData = useMemo(() => buildDonutData(motorSessions, range), [motorSessions, range]);

  // ── Early returns AFTER all hooks ──
  if (loading) return <LoadingState message="Loading motor data..." />;
  if (error)   return <ErrorState message={error} onRetry={onRetry} />;
  if (!motor)  return <ErrorState message={`Motor #${motorId} not found`} onRetry={onRetry} />;

  const isOn = (motor.current_status || '').toUpperCase() === 'ON';
  const orientation = (motor.current_orientation || '').toUpperCase();


  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <Link to="/" className="back-btn">← Back</Link>
        <div>
          <div className="breadcrumb" style={{ marginBottom: 4 }}>
            <Link to="/">Dashboard</Link>
            <span className="sep">›</span>
            <span>Motor Detail</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              letterSpacing: 3,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}>
              {motor.motor_name || `Motor ${motorId}`}
            </h1>
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}>
              M{String(motorId).padStart(2,'0')}
            </span>
          </div>
        </div>

        {/* Status badges */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
          <StatusBadge type={isOn ? 'on' : 'off'} label={isOn ? 'ON' : 'OFF'} />
          {isOn && orientation.startsWith('F') && <StatusBadge type="fwd" label="→ FWD" />}
          {isOn && (orientation.startsWith('R')) && <StatusBadge type="rev" label="← REV" />}
          {isOn && motor.running_since && (
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: 14,
              fontWeight: 600, color: 'var(--teal)'
            }}>
              <LiveDuration since={motor.running_since} />
            </span>
          )}
        </div>
      </div>

      {/* Range selector */}
      <RangeSelector value={range} onChange={setRange} />

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Runtime</div>
          <div className="stat-value">{formatDuration(stats.totalSecs)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Runs</div>
          <div className="stat-value">{stats.count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Duration</div>
          <div className="stat-value">{formatDuration(stats.avg)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Longest Run</div>
          <div className="stat-value">{formatDuration(stats.longest)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">FWD Time</div>
          <div className="stat-value" style={{ color: 'var(--teal)' }}>
            {formatDuration(stats.fwd)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">REV Time</div>
          <div className="stat-value" style={{ color: 'var(--violet)' }}>
            {formatDuration(stats.rev)}
          </div>
        </div>
      </div>

      {/* Chart row */}
      <div className="chart-row">
        <RunTimeBarChart
          data={chartData}
          motorName={motor.motor_name}
          range={range}
          title="Runtime Timeline"
        />
        <DirectionDonut
          data={donutData}
          motorName={motor.motor_name}
          range={range}
        />
      </div>

      {/* Daily chart (fixed 30 days) */}
      <DailyBarChart sessions={motorSessions} motorName={motor.motor_name} />

      {/* Session history table */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          letterSpacing: 2,
          color: 'var(--text-primary)',
          marginBottom: 16,
        }}>
          RUN HISTORY
        </h2>
      </div>
      <SessionTable
        sessions={rangeSessions}
        motorName={motor.motor_name}
        range={range}
      />
    </div>
  );
}
