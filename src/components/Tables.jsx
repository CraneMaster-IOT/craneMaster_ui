// CraneMaster — Table Components
// SessionTable and DowntimeTable with sort, filter, paginate, CSV export

import React, { useState, useMemo } from 'react';
import { formatDuration } from '../api';
import { downloadCSV, buildFilename } from '../utils/export';
import { StatusBadge, LiveDuration, EmptyState } from './index';

const PAGE_SIZE = 25;

// ─────────────────────────────────────────────
// SESSION TABLE
// Used on Motor Detail page
// ─────────────────────────────────────────────
export function SessionTable({ sessions, motorName, range }) {
  const [sortKey, setSortKey] = useState('started_at');
  const [sortDir, setSortDir] = useState('desc');
  const [filterDir, setFilterDir] = useState('ALL');
  const [minDuration, setMinDuration] = useState('');
  const [page, setPage] = useState(1);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let rows = sessions || [];
    if (filterDir !== 'ALL') {
      rows = rows.filter(r => (r.orientation || '').toUpperCase().startsWith(filterDir[0]));
    }
    if (minDuration) {
      const minSecs = parseInt(minDuration) * 60;
      rows = rows.filter(r => {
        const secs = typeof r.duration === 'number' ? r.duration : parseDuration(r.duration);
        return secs >= minSecs;
      });
    }
    rows = [...rows].sort((a, b) => {
      let aVal = a[sortKey], bVal = b[sortKey];
      if (sortKey === 'duration') {
        aVal = typeof a.duration === 'number' ? a.duration : parseDuration(a.duration);
        bVal = typeof b.duration === 'number' ? b.duration : parseDuration(b.duration);
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [sessions, sortKey, sortDir, filterDir, minDuration]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sortArrow = (key) => {
    if (sortKey !== key) return <span className="sort-arrow">↕</span>;
    return <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleCSV = () => {
    const filename = buildFilename(motorName || 'motor', 'sessions', range, 'csv');
    const cols = [
      { label: 'session_id', key: 'session_id' },
      { label: 'motor_name', key: 'motor_name' },
      { label: 'orientation', key: 'orientation' },
      { label: 'started_at', key: 'started_at' },
      { label: 'stopped_at', key: 'stopped_at' },
      { label: 'duration_formatted', key: 'duration' },
    ];
    downloadCSV(filtered, cols, filename);
  };

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <div className="table-filters">
          <select
            className="filter-select"
            value={filterDir}
            onChange={e => { setFilterDir(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Directions</option>
            <option value="FWD">FWD Only</option>
            <option value="REV">REV Only</option>
          </select>
          <input
            className="filter-input"
            type="number"
            placeholder="Min duration (min)"
            value={minDuration}
            onChange={e => { setMinDuration(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="table-row-count">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} sessions
          </span>
          <button className="export-btn" onClick={handleCSV}>↓ CSV</button>
        </div>
      </div>

      {paginated.length === 0 ? (
        <EmptyState message="No sessions match the current filters" />
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('_row')}>#</th>
                <th onClick={() => handleSort('started_at')}>Started {sortArrow('started_at')}</th>
                <th onClick={() => handleSort('stopped_at')}>Stopped {sortArrow('stopped_at')}</th>
                <th onClick={() => handleSort('duration')}>Duration {sortArrow('duration')}</th>
                <th onClick={() => handleSort('orientation')}>Direction {sortArrow('orientation')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((session, i) => {
                const isRunning = !session.stopped_at;
                const dir = (session.orientation || '').toUpperCase();
                const isFwd = dir.startsWith('F');
                const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                const secs = typeof session.duration === 'number' ? session.duration : parseDuration(session.duration);

                return (
                  <tr key={session.session_id || i}>
                    <td style={{ color: 'var(--text-muted)', width: 40 }}>{rowNum}</td>
                    <td title={session.started_at}>
                      {new Date(session.started_at).toLocaleString()}
                    </td>
                    <td title={session.stopped_at}>
                      {isRunning
                        ? <StatusBadge type="running" label="RUNNING" />
                        : new Date(session.stopped_at).toLocaleString()}
                    </td>
                    <td>
                      {isRunning
                        ? <span style={{ color: 'var(--teal)' }}>
                            <LiveDuration since={session.started_at} />
                          </span>
                        : (typeof session.duration === 'string'
                            ? session.duration
                            : formatDuration(secs))}
                    </td>
                    <td>
                      <StatusBadge
                        type={isFwd ? 'fwd' : 'rev'}
                        label={isFwd ? '→ FWD' : '← REV'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="table-pagination">
            <span className="table-row-count">Page {page} of {totalPages}</span>
            <div className="pagination-btns">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                return (
                  <button
                    key={p}
                    className={`page-btn${page === p ? ' active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DOWNTIME TABLE
// Used on System Status page
// ─────────────────────────────────────────────
export function DowntimeTable({ downtime }) {
  const [sortKey, setSortKey] = useState('start_time');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const sorted = useMemo(() => {
    return [...(downtime || [])].sort((a, b) => {
      let aVal = a[sortKey], bVal = b[sortKey];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [downtime, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sortArrow = (key) => {
    if (sortKey !== key) return <span className="sort-arrow">↕</span>;
    return <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleCSV = () => {
    const now = new Date();
    const date = now.toISOString().slice(0,10);
    const time = now.toTimeString().slice(0,8).replace(/:/g,'-');
    const filename = `system_downtime_${date}_${time}.csv`;
    const cols = [
      { label: 'id', key: 'id' },
      { label: 'start_time', key: 'start_time' },
      { label: 'end_time', key: 'end_time' },
      { label: 'duration_seconds', key: 'duration' },
      { label: 'duration_formatted', key: '_formatted' },
    ];
    const rows = sorted.map(r => ({
      ...r,
      _formatted: formatDuration(r.duration),
    }));
    downloadCSV(rows, cols, filename);
  };

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <span className="table-row-count">{sorted.length} downtime events</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="table-row-count">
            Showing {Math.min((page-1)*PAGE_SIZE+1, sorted.length)}–{Math.min(page*PAGE_SIZE, sorted.length)}
          </span>
          <button className="export-btn" onClick={handleCSV}>↓ CSV</button>
        </div>
      </div>

      {paginated.length === 0 ? (
        <EmptyState message="No downtime events recorded" />
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('_row')}>#</th>
                <th onClick={() => handleSort('start_time')}>Start {sortArrow('start_time')}</th>
                <th onClick={() => handleSort('end_time')}>End {sortArrow('end_time')}</th>
                <th onClick={() => handleSort('duration')}>Duration {sortArrow('duration')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((event, i) => {
                const isOngoing = !event.end_time;
                const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                return (
                  <tr key={event.id || i}>
                    <td style={{ color: 'var(--text-muted)', width: 40 }}>{rowNum}</td>
                    <td title={event.start_time}>
                      {new Date(event.start_time).toLocaleString()}
                    </td>
                    <td>
                      {isOngoing
                        ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>ONGOING</span>
                        : <span title={event.end_time}>{new Date(event.end_time).toLocaleString()}</span>}
                    </td>
                    <td>
                      {isOngoing
                        ? <span style={{ color: 'var(--red)' }}>
                            <LiveDuration since={event.start_time} />
                          </span>
                        : formatDuration(event.duration)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="table-pagination">
            <span className="table-row-count">Page {page} of {totalPages}</span>
            <div className="pagination-btns">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2 + i, totalPages));
                return (
                  <button key={p} className={`page-btn${page===p?' active':''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                );
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────
function parseDuration(str) {
  if (!str || str === '—') return 0;
  const match = str.match(/(\d+)h\s*(\d+)m\s*(\d+)s/);
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
}
