// CraneMaster — App.jsx
// Global state, polling, routing

import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { getLiveState, getSessionHistory, getTotalRuntime, getDowntime } from './api';
import { LiveClock } from './components/index';
import Dashboard from './pages/Dashboard';
import MotorDetail from './pages/MotorDetail';
import SystemStatus from './pages/SystemStatus';

import './styles/global.css';

// ─────────────────────────────────────────────
// HEADER COMPONENT (always visible)
// ─────────────────────────────────────────────
function AppHeader({ liveState }) {
  const isOnline = liveState?.some(m => m.system_online) ?? null;
  const runningCount = liveState?.filter(m =>
    (m.current_status || '').toUpperCase() === 'ON'
  ).length ?? 0;

  return (
    <header className="app-header">
      <Link to="/" className="header-brand">
        {/* Geometric crane icon */}
        <div className="brand-icon">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Simplified crane arm icon */}
            <rect x="2" y="14" width="16" height="2" rx="1" fill="white" fillOpacity="0.9"/>
            <rect x="8" y="4" width="2" height="12" rx="1" fill="white" fillOpacity="0.9"/>
            <rect x="8" y="4" width="8" height="2" rx="1" fill="white" fillOpacity="0.7"/>
            <rect x="14" y="4" width="2" height="6" rx="1" fill="white" fillOpacity="0.7"/>
            <circle cx="5" cy="15" r="2" fill="white" fillOpacity="0.6"/>
            <circle cx="13" cy="15" r="2" fill="white" fillOpacity="0.6"/>
          </svg>
        </div>
        <span className="brand-name">CraneMaster</span>
      </Link>

      <div className="header-center">
        <LiveClock />
      </div>

      <div className="header-right">
        <span className="running-count">{runningCount} / 6 RUNNING</span>
        <Link
          to="/system"
          className="system-indicator"
          title="System Status"
        >
          <span className={`indicator-dot${isOnline === false ? ' offline' : ''}`} />
          <span className={`indicator-label${isOnline === false ? ' offline' : ''}`}>
            {isOnline === null ? '...' : isOnline ? 'LIVE' : 'OFFLINE'}
          </span>
        </Link>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [liveState, setLiveState]       = useState([]);
  const [allSessions, setAllSessions]   = useState([]);
  const [totalRuntime, setTotalRuntime] = useState([]);
  const [downtime, setDowntime]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [lastRefresh, setLastRefresh]   = useState(null);

  // ── Initial full load ──────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [live, sessions, runtime, dt] = await Promise.all([
        getLiveState(),
        getSessionHistory(),
        getTotalRuntime(),
        getDowntime(),
      ]);
      setLiveState(live);
      setAllSessions(sessions);
      setTotalRuntime(runtime);
      setDowntime(dt);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Initial load failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Poll live state every 10 seconds ──────
  const pollLive = useCallback(async () => {
    try {
      const live = await getLiveState();
      setLiveState(live);
      setError(null);
    } catch (err) {
      console.error('Live poll failed:', err);
      // Don't surface every poll error — only if no data
    }
  }, []);

  // ── Refresh all data every 60 seconds ─────
  const refreshAll = useCallback(async () => {
    try {
      const [sessions, runtime, dt] = await Promise.all([
        getSessionHistory(),
        getTotalRuntime(),
        getDowntime(),
      ]);
      setAllSessions(sessions);
      setTotalRuntime(runtime);
      setDowntime(dt);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Data refresh failed:', err);
    }
  }, []);

  useEffect(() => {
    loadAll();

    const liveInterval = setInterval(pollLive, 10_000);
    const dataInterval = setInterval(refreshAll, 60_000);

    return () => {
      clearInterval(liveInterval);
      clearInterval(dataInterval);
    };
  }, [loadAll, pollLive, refreshAll]);

  const sharedProps = {
    liveState, allSessions, totalRuntime, downtime,
    loading, error, lastRefresh,
    onRetry: loadAll,
  };

  return (
    <HashRouter>
      <div className="app-layout">
        <AppHeader liveState={liveState} />
        <main className="app-main">
          <Routes>
            <Route path="/"           element={<Dashboard {...sharedProps} />} />
            <Route path="/motor/:id"  element={<MotorDetail {...sharedProps} />} />
            <Route path="/system"     element={<SystemStatus {...sharedProps} />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
