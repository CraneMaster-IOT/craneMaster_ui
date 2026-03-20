// CraneMaster — Chart Components
// RunTimeBarChart, DirectionDonut, DailyBarChart

import React, { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { formatDuration } from '../api';
import { downloadChartPNG, buildFilename } from '../utils/export';
import { EmptyState } from './index';

// ─────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const fwd = payload.find(p => p.dataKey === 'fwd');
  const rev = payload.find(p => p.dataKey === 'rev');
  const total = (fwd?.value || 0) + (rev?.value || 0);
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{label}</div>
      {fwd && (
        <div className="tooltip-row">
          <span className="tooltip-dot" style={{ background: '#00D4AA' }} />
          FWD: {formatDuration(fwd.value)}
        </div>
      )}
      {rev && (
        <div className="tooltip-row">
          <span className="tooltip-dot" style={{ background: '#7C3AED' }} />
          REV: {formatDuration(rev.value)}
        </div>
      )}
      <div className="tooltip-row" style={{ borderTop: '1px solid #21262D', marginTop: 6, paddingTop: 6 }}>
        <span className="tooltip-dot" style={{ background: '#8B949E' }} />
        Total: {formatDuration(total)}
      </div>
    </div>
  );
}

function CustomDonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="custom-tooltip">
      <div className="tooltip-row">
        <span className="tooltip-dot" style={{ background: entry.payload.color }} />
        {entry.name}: {formatDuration(entry.value)}
      </div>
    </div>
  );
}

const yTickFormatter = (val) => {
  const h = Math.floor(val / 3600);
  const m = Math.floor((val % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ─────────────────────────────────────────────
// RUNTIME BAR CHART
// ─────────────────────────────────────────────
export function RunTimeBarChart({ data, motorName, range, title }) {
  const containerRef = useRef(null);

  const handleExport = async () => {
    const filename = buildFilename(motorName || 'motor', 'runtime', range, 'png');
    await downloadChartPNG(containerRef, filename);
  };

  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">{title || 'Runtime Timeline'}</span>
        </div>
        <EmptyState message="No sessions in this range" />
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">{title || 'Runtime Timeline'}</span>
        <button className="export-btn" onClick={handleExport}>↓ PNG</button>
      </div>
      <div ref={containerRef}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
            <XAxis
              dataKey="period"
              tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={yTickFormatter}
              tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(0,212,170,0.05)' }} />
            <Legend
              wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)' }}
            />
            <Bar dataKey="fwd" name="FWD" stackId="a" fill="#00D4AA" radius={[0,0,0,0]} />
            <Bar dataKey="rev" name="REV" stackId="a" fill="#7C3AED" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DIRECTION DONUT CHART
// ─────────────────────────────────────────────
export function DirectionDonut({ data, motorName, range }) {
  const containerRef = useRef(null);
  const total = data?.reduce((sum, d) => sum + d.value, 0) || 0;

  const handleExport = async () => {
    const filename = buildFilename(motorName || 'motor', 'direction', range, 'png');
    await downloadChartPNG(containerRef, filename);
  };

  const isEmpty = !data || total === 0;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">Direction Split</span>
        {!isEmpty && <button className="export-btn" onClick={handleExport}>↓ PNG</button>}
      </div>
      {isEmpty ? (
        <EmptyState message="No sessions in this range" />
      ) : (
        <div ref={containerRef}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomDonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend below */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
            {data.map(d => (
              <div key={d.name} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 600,
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: d.color, marginBottom: 2
                }}>
                  {d.name}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatDuration(d.value)}
                </div>
              </div>
            ))}
          </div>

          {/* Centre label — absolute overlay */}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 600,
              letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)'
            }}>
              Total Runtime
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              {formatDuration(total)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DAILY BAR CHART (last 30 days fixed)
// ─────────────────────────────────────────────
export function DailyBarChart({ sessions, motorName }) {
  const containerRef = useRef(null);

  // Build last 30 days
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const data = last30.map(day => {
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const dayLabel = day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    const daySessions = (sessions || []).filter(s => {
      const started = new Date(s.started_at);
      return started >= day && started < nextDay && s.stopped_at;
    });

    let total = 0, fwd = 0, rev = 0;
    daySessions.forEach(s => {
      const secs = typeof s.duration === 'number' ? s.duration : parseDurationToSeconds(s.duration);
      total += secs;
      if ((s.orientation || '').toUpperCase().startsWith('F')) fwd += secs;
      else rev += secs;
    });

    return { period: dayLabel, fwd, rev, total };
  });

  const handleExport = async () => {
    const filename = buildFilename(motorName || 'motor', 'daily', '30D', 'png');
    await downloadChartPNG(containerRef, filename);
  };

  const hasData = data.some(d => d.total > 0);

  return (
    <div className="chart-card" style={{ marginBottom: 28 }}>
      <div className="chart-header">
        <span className="chart-title">Daily Runtime — Last 30 Days</span>
        {hasData && <button className="export-btn" onClick={handleExport}>↓ PNG</button>}
      </div>
      {!hasData ? (
        <EmptyState message="No activity in the last 30 days" />
      ) : (
        <div ref={containerRef}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
              <XAxis
                dataKey="period"
                tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false}
                interval={4}
              />
              <YAxis
                tickFormatter={yTickFormatter}
                tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false} width={56}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(0,212,170,0.05)' }} />
              <Bar dataKey="fwd" name="FWD" stackId="a" fill="#00D4AA" />
              <Bar dataKey="rev" name="REV" stackId="a" fill="#7C3AED" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DOWNTIME BAR CHART (System page)
// ─────────────────────────────────────────────
export function DowntimeBarChart({ downtime }) {
  const containerRef = useRef(null);

  const data = (downtime || [])
    .filter(d => d.end_time && d.duration != null)
    .slice(0, 50)
    .reverse()
    .map((d, i) => ({
      period: new Date(d.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      duration: typeof d.duration === 'number' ? d.duration : 0,
      key: i,
    }));

  const maxDuration = Math.max(...data.map(d => d.duration), 1);

  const handleExport = async () => {
    const now = new Date();
    const filename = `system_downtime_${now.toISOString().slice(0,10)}.png`;
    await downloadChartPNG(containerRef, filename);
  };

  if (!data.length) {
    return (
      <div className="chart-card" style={{ marginBottom: 28 }}>
        <div className="chart-header"><span className="chart-title">Downtime Timeline</span></div>
        <EmptyState message="No downtime events recorded" />
      </div>
    );
  }

  return (
    <div className="chart-card" style={{ marginBottom: 28 }}>
      <div className="chart-header">
        <span className="chart-title">Downtime Timeline</span>
        <button className="export-btn" onClick={handleExport}>↓ PNG</button>
      </div>
      <div ref={containerRef}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
            <XAxis
              dataKey="period"
              tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false} axisLine={false}
            />
            <YAxis
              tickFormatter={yTickFormatter}
              tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false} axisLine={false} width={56}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0];
                const raw = downtime.find(d =>
                  new Date(d.start_time).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) === label
                );
                return (
                  <div className="custom-tooltip">
                    <div className="tooltip-label">{label}</div>
                    <div className="tooltip-row">
                      <span className="tooltip-dot" style={{ background: '#EF4444' }} />
                      Duration: {formatDuration(entry.value)}
                    </div>
                    {raw && (
                      <>
                        <div className="tooltip-row" style={{ fontSize: 10, color: '#8B949E' }}>
                          Start: {new Date(raw.start_time).toLocaleString()}
                        </div>
                        {raw.end_time && (
                          <div className="tooltip-row" style={{ fontSize: 10, color: '#8B949E' }}>
                            End: {new Date(raw.end_time).toLocaleString()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              }}
              cursor={{ fill: 'rgba(239,68,68,0.05)' }}
            />
            <Bar dataKey="duration" name="Duration" radius={[3,3,0,0]}>
              {data.map((entry, i) => {
                const intensity = entry.duration / maxDuration;
                const r = Math.round(180 + 75 * intensity);
                const gb = Math.round(80 - 60 * intensity);
                return <Cell key={i} fill={`rgb(${r},${gb},${gb})`} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// helper used in DailyBarChart
function parseDurationToSeconds(str) {
  if (!str || str === '—') return 0;
  const match = str.match(/(\d+)h\s*(\d+)m\s*(\d+)s/);
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
}
