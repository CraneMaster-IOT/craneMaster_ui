// CraneMaster — Reusable Components
// StatusBadge, LiveClock, RangeSelector, SystemStatusCard, MotorCard

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
export function StatusBadge({ type, label }) {
  const classes = {
    on: 'badge badge-on',
    off: 'badge badge-off',
    fwd: 'badge badge-fwd',
    rev: 'badge badge-rev',
    online: 'badge badge-online',
    offline: 'badge badge-offline',
    running: 'badge badge-running',
  };
  const dots = {
    on: '●', off: '●',
    fwd: '→', rev: '←',
    online: '●', offline: '●',
    running: '●',
  };
  return (
    <span className={classes[type] || 'badge badge-off'}>
      <span>{dots[type] || '●'}</span>
      {label || type?.toUpperCase()}
    </span>
  );
}

// ─────────────────────────────────────────────
// LIVE CLOCK
// ─────────────────────────────────────────────
export function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const day = days[time.getDay()];
  const date = String(time.getDate()).padStart(2, '0');
  const month = months[time.getMonth()];
  const year = time.getFullYear();
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');

  return (
    <span className="live-clock">
      {day} {date} {month} {year} &nbsp; {hh}:{mm}:{ss}
    </span>
  );
}

// ─────────────────────────────────────────────
// RANGE SELECTOR
// ─────────────────────────────────────────────
export function RangeSelector({ value, onChange }) {
  const ranges = ['1H', '24H', '7D', '30D', '1Y', 'ALL'];
  return (
    <div className="range-selector">
      {ranges.map(r => (
        <button
          key={r}
          className={`range-btn${value === r ? ' active' : ''}`}
          onClick={() => onChange(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// LIVE DURATION COUNTER
// Counts up from a start timestamp in real time
// ─────────────────────────────────────────────
export function LiveDuration({ since }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(since).getTime()) / 1000);
      setSecs(Math.max(0, diff));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [since]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return (
    <span>
      {String(h).padStart(2,'0')}h {String(m).padStart(2,'0')}m {String(s).padStart(2,'0')}s
    </span>
  );
}

// ─────────────────────────────────────────────
// SYSTEM STATUS CARD (used on Dashboard)
// ─────────────────────────────────────────────
export function SystemStatusCard({ liveState, downtime }) {
  const isOnline = liveState?.some(m => m.system_online) ?? false;
  const lastUpdate = liveState?.[0]?.last_updated;

  const totalDowntimeEvents = downtime?.length || 0;
  const currentDowntime = downtime?.find(d => !d.end_time);
  const lastHeartbeat = lastUpdate
    ? new Date(lastUpdate).toLocaleString()
    : '—';
  const lastHeartbeatUTC = lastUpdate
    ? new Date(lastUpdate).toUTCString()
    : '—';

  let offlineSince = null;
  if (!isOnline && currentDowntime?.start_time) {
    const diffSecs = Math.floor((Date.now() - new Date(currentDowntime.start_time)) / 1000);
    const h = Math.floor(diffSecs / 3600);
    const m = Math.floor((diffSecs % 3600) / 60);
    const s = diffSecs % 60;
    offlineSince = `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  }

  return (
    <Link to="/system" className={`system-status-card${isOnline ? '' : ' offline'}`}>
      <div className="system-status-inner">
        <div className="system-status-main">
          <div className={`status-orb${isOnline ? '' : ' offline'}`} />
          <div className="system-status-text">
            <div className="status-title gradient-text">
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
            <div className="status-subtitle">
              {isOnline
                ? `Last heartbeat: ${lastHeartbeat}`
                : `OFFLINE SINCE: ${offlineSince || '—'} ago`}
            </div>
          </div>
        </div>

        <div className="system-status-meta">
          <div className="meta-item">
            <div className="meta-label">Downtime Events</div>
            <div className="meta-value">{totalDowntimeEvents}</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">Last Updated</div>
            <div
              className="meta-value"
              style={{ position: 'relative', cursor: 'default' }}
              title={lastHeartbeatUTC}
            >
              {lastHeartbeat}
            </div>
          </div>
          <div className="meta-item">
            <div className="meta-label">View Details</div>
            <div className="meta-value" style={{ color: 'var(--teal)' }}>→</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// MOTOR CARD (used on Dashboard)
// ─────────────────────────────────────────────
export function MotorCard({ motor, totalRuntime }) {
  const isOn = (motor.current_status || '').toUpperCase() === 'ON';
  const orientation = (motor.current_orientation || '').toUpperCase();
  const motorTotal = totalRuntime?.find(t => t.motor_id === motor.motor_id);

  const lastRunFormatted = motor.last_updated
    ? (() => {
        const d = new Date(motor.last_updated);
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const dayName = days[d.getDay()];
        const date = String(d.getDate()).padStart(2,'0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        let hours = d.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const hh = String(hours).padStart(2,'0');
        const mm = String(d.getMinutes()).padStart(2,'0');
        const ss = String(d.getSeconds()).padStart(2,'0');
        return `${dayName}, ${date} ${month} ${year}  ·  ${hh}:${mm}:${ss} ${ampm}`;
      })()
    : '—';

  return (
    <Link
      to={`/motor/${motor.motor_id}`}
      className={`motor-card${isOn ? ' is-on' : ''}`}
    >
      <div className="motor-card-header">
        <div>
          <div className="motor-name">{motor.motor_name || `M${motor.motor_id}`}</div>
        </div>
        <div className="motor-id-badge">
          {motor.motor_id ? `M${String(motor.motor_id).padStart(2,'0')}` : '—'}
        </div>
      </div>

      <div className="motor-card-badges">
        <StatusBadge type={isOn ? 'on' : 'off'} label={isOn ? 'ON' : 'OFF'} />
        {isOn && orientation === 'FWD' && <StatusBadge type="fwd" label="→ FWD" />}
        {isOn && (orientation === 'REV' || orientation === 'REVERSE') && <StatusBadge type="rev" label="← REV" />}
        {!isOn && <StatusBadge type="off" label="— IDLE" />}
      </div>

      <div className="motor-runtime">
        <div className="motor-runtime-label">
          {isOn ? 'Running For' : 'Last Run'}
        </div>
        <div className={`motor-runtime-value${isOn ? ' live' : ''}`} style={!isOn ? { fontSize: 13, lineHeight: 1.5 } : {}}>
          {isOn && motor.running_since
            ? <LiveDuration since={motor.running_since} />
            : lastRunFormatted}
        </div>
        {isOn && motor.running_since && (
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
            Since {new Date(motor.running_since).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="motor-lifetime">
        <span className="label">Lifetime</span>
        <span className="value">{motorTotal?.total_runtime || '—'}</span>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// LOADING / ERROR / EMPTY STATES
// ─────────────────────────────────────────────
export function LoadingState({ message = 'Loading data...' }) {
  return (
    <div className="state-container">
      <div className="spinner" />
      <div className="state-subtitle">{message}</div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-container">
      <div className="empty-icon">⚠</div>
      <div className="state-title">Connection Error</div>
      <div className="state-subtitle">{message || 'Failed to load data'}</div>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          ↺ &nbsp; Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = 'No data recorded yet' }) {
  return (
    <div className="state-container">
      <div className="empty-icon">📊</div>
      <div className="state-title">No Data</div>
      <div className="state-subtitle">{message}</div>
    </div>
  );
}
