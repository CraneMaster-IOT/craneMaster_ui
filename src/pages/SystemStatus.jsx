// CraneMaster — System Status Page (/system)

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatDuration } from '../api';
import { StatusBadge, LiveDuration, LoadingState, ErrorState } from '../components/index';
import { DowntimeBarChart } from '../components/Charts';
import { DowntimeTable } from '../components/Tables';

export default function SystemStatus({
  liveState, downtime, lastRefresh,
  loading, error, onRetry
}) {
  // hooks declared before any early returns

  const isOnline = liveState?.some(m => m.system_online) ?? false;
  const lastUpdate = liveState?.[0]?.last_updated;
  const currentDowntime = downtime?.find(d => !d.end_time);

  // Stats calculations
  const stats = useMemo(() => {
    if (!downtime || downtime.length === 0) {
      return {
        totalEvents: 0,
        longest: 0,
        avgDuration: 0,
        lastOutageAgo: null,
        uptimeToday: null,
        downtimeToday: 0,
      };
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const closed = downtime.filter(d => d.end_time && d.duration != null);
    const longest = Math.max(...closed.map(d => d.duration || 0), 0);
    const totalDuration = closed.reduce((s, d) => s + (d.duration || 0), 0);
    const avg = closed.length > 0 ? Math.floor(totalDuration / closed.length) : 0;

    // Last outage ago
    const lastClosed = [...closed].sort((a,b) => new Date(b.start_time) - new Date(a.start_time))[0];
    let lastOutageAgo = null;
    if (lastClosed) {
      const secs = Math.floor((now - new Date(lastClosed.start_time)) / 1000);
      lastOutageAgo = formatDuration(secs) + ' ago';
    }

    // Downtime today
    const downtimeToday = downtime
      .filter(d => d.start_time && new Date(d.start_time) >= todayStart)
      .reduce((s, d) => s + (d.duration || 0), 0);

    return {
      totalEvents: downtime.length,
      longest,
      avgDuration: avg,
      lastOutageAgo,
      downtimeToday,
    };
  }, [downtime]);

  const lastHeartbeat = lastUpdate
    ? new Date(lastUpdate).toLocaleString()
    : '—';

  const secsAgo = lastUpdate
    ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000)
    : null;

  // ── Early returns after all hooks ──
  if (loading) return <LoadingState message="Loading system status..." />;
  if (error)   return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <Link to="/" className="back-btn">← Back</Link>
        <div>
          <div className="breadcrumb" style={{ marginBottom: 4 }}>
            <Link to="/">Dashboard</Link>
            <span className="sep">›</span>
            <span>System Status</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            letterSpacing: 3,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}>
            SYSTEM STATUS
          </h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <StatusBadge type={isOnline ? 'online' : 'offline'} label={isOnline ? 'ONLINE' : 'OFFLINE'} />
        </div>
      </div>

      {/* Large status card */}
      <div
        className="card"
        style={{
          background: 'var(--bg-base)',
          border: `1px solid ${isOnline ? 'rgba(0,212,170,0.3)' : 'rgba(239,68,68,0.3)'}`,
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: isOnline ? 'var(--accent-gradient)' : 'var(--red)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Orb */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: isOnline ? 'var(--green)' : 'var(--red)',
            boxShadow: isOnline ? '0 0 24px rgba(34,197,94,0.5)' : '0 0 24px rgba(239,68,68,0.5)',
            animation: isOnline ? 'orb-pulse 2.5s ease infinite' : 'none',
            flexShrink: 0,
          }} />
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              letterSpacing: 4,
              background: isOnline ? 'var(--accent-gradient)' : 'none',
              color: isOnline ? undefined : 'var(--red)',
              WebkitBackgroundClip: isOnline ? 'text' : undefined,
              WebkitTextFillColor: isOnline ? 'transparent' : undefined,
              backgroundClip: isOnline ? 'text' : undefined,
            }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
            <div style={{
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4,
            }}>
              Last heartbeat: {lastHeartbeat}
              {secsAgo !== null && ` (${secsAgo}s ago)`}
            </div>
            {!isOnline && currentDowntime && (
              <div style={{
                fontFamily: 'var(--font-data)', fontSize: 14,
                fontWeight: 600, color: 'var(--red)', marginTop: 6,
              }}>
                OFFLINE FOR: <LiveDuration since={currentDowntime.start_time} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Downtime Today</div>
          <div className="stat-value" style={{ color: stats.downtimeToday > 0 ? 'var(--red)' : 'var(--text-primary)' }}>
            {formatDuration(stats.downtimeToday)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Events</div>
          <div className="stat-value">{stats.totalEvents}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Longest Outage</div>
          <div className="stat-value">{formatDuration(stats.longest)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Outage</div>
          <div className="stat-value" style={{ fontSize: 14 }}>
            {stats.lastOutageAgo || '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Outage Duration</div>
          <div className="stat-value">{formatDuration(stats.avgDuration)}</div>
        </div>
      </div>

      {/* Downtime chart */}
      <DowntimeBarChart downtime={downtime} />

      {/* Downtime table */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          letterSpacing: 2,
          color: 'var(--text-primary)',
          marginBottom: 16,
        }}>
          DOWNTIME HISTORY
        </h2>
      </div>
      <DowntimeTable downtime={downtime} />
    </div>
  );
}
