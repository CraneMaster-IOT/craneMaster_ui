// CraneMaster — API Layer
// All Supabase communication goes through this file ONLY.
// No component should ever construct a fetch URL itself.

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'count=exact',
};

// ─────────────────────────────────────────────
// PAGINATION HELPER
// Supabase caps at 1000 rows by default.
// This fetches all pages for any growing table.
// ─────────────────────────────────────────────
async function paginate(endpoint, params = {}) {
  const PAGE_SIZE = 1000;
  let offset = 0;
  let allRows = [];

  while (true) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    Object.entries({ ...params, limit: PAGE_SIZE, offset }).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );

    const res = await fetch(url.toString(), { headers: HEADERS });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase error ${res.status}: ${text}`);
    }

    const batch = await res.json();
    allRows = [...allRows, ...batch];

    const contentRange = res.headers.get('Content-Range') || '0/0';
    const total = parseInt(contentRange.split('/')[1], 10);
    offset += PAGE_SIZE;
    if (offset >= total || batch.length === 0) break;
  }

  return allRows;
}

// ─────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────

/**
 * GET all 6 motors live state + system_online boolean
 * Endpoint: GET /rest/v1/motor_current_state
 */
export async function getLiveState() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/motor_current_state`);
  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getLiveState failed ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * GET all closed sessions for one or all motors, paginated
 * Endpoint: GET /rest/v1/motor_session_history
 * @param {number|null} motorId — pass null to fetch all motors
 */
export async function getSessionHistory(motorId = null) {
  const params = {
    'stopped_at': 'not.is.null',
    order: 'started_at.desc',
  };
  if (motorId !== null) {
    params['motor_id'] = `eq.${motorId}`;
  }
  return paginate('motor_session_history', params);
}

/**
 * GET lifetime total runtime per motor via RPC
 * Endpoint: POST /rest/v1/rpc/get_total_runtime_per_motor
 */
export async function getTotalRuntime() {
  const url = `${SUPABASE_URL}/rest/v1/rpc/get_total_runtime_per_motor`;
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getTotalRuntime failed ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * GET all downtime sessions, paginated
 * Endpoint: GET /rest/v1/system_downtime
 * NOTE: duration field returns raw integer seconds from DB
 */
export async function getDowntime() {
  return paginate('system_downtime', { order: 'start_time.desc' });
}

// ─────────────────────────────────────────────
// FORMATTING UTILITIES
// ─────────────────────────────────────────────

/**
 * Format raw seconds (from system_downtime) to HHh MMm SSs
 */
export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/**
 * Parse a formatted duration string "HHh MMm SSs" to total seconds
 * Used when session_history returns pre-formatted strings
 */
export function parseDurationToSeconds(str) {
  if (!str || str === '—') return 0;
  const match = str.match(/(\d+)h\s*(\d+)m\s*(\d+)s/);
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
}

// ─────────────────────────────────────────────
// CLIENT-SIDE FILTERING
// No extra API calls — all derived from in-memory arrays
// ─────────────────────────────────────────────

export function filterByRange(sessions, range) {
  const now = new Date();
  const cutoffs = {
    '1H':  new Date(now - 1 * 60 * 60 * 1000),
    '24H': new Date(now - 24 * 60 * 60 * 1000),
    '7D':  new Date(now - 7 * 24 * 60 * 60 * 1000),
    '30D': new Date(now - 30 * 24 * 60 * 60 * 1000),
    '1Y':  new Date(now - 365 * 24 * 60 * 60 * 1000),
    'ALL': new Date(0),
  };
  const cutoff = cutoffs[range] || new Date(0);
  return sessions.filter(s => new Date(s.started_at) >= cutoff);
}

/**
 * Build chart buckets for the runtime bar chart
 * Returns array of { period, fwd, rev } with seconds values
 */
export function buildChartData(sessions, range) {
  const filtered = filterByRange(sessions, range);

  const getBucket = (dateStr) => {
    const d = new Date(dateStr);
    if (range === '1H') {
      // per minute
      return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    } else if (range === '24H') {
      // per hour
      return `${d.toLocaleDateString()} ${d.getHours()}:00`;
    } else if (range === '7D' || range === '30D') {
      // per day
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } else if (range === '1Y') {
      // per week
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } else {
      // ALL — per month
      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    }
  };

  const buckets = {};
  filtered.forEach(s => {
    const key = getBucket(s.started_at);
    if (!buckets[key]) buckets[key] = { period: key, fwd: 0, rev: 0 };
    const secs = typeof s.duration === 'number' ? s.duration : parseDurationToSeconds(s.duration);
    const dir = (s.orientation || '').toUpperCase();
    if (dir === 'FWD' || dir === 'FORWARD') {
      buckets[key].fwd += secs;
    } else {
      buckets[key].rev += secs;
    }
  });

  return Object.values(buckets);
}

/**
 * Build direction donut data for a motor in a range
 */
export function buildDonutData(sessions, range) {
  const filtered = filterByRange(sessions, range);
  let fwd = 0, rev = 0;
  filtered.forEach(s => {
    const secs = typeof s.duration === 'number' ? s.duration : parseDurationToSeconds(s.duration);
    const dir = (s.orientation || '').toUpperCase();
    if (dir === 'FWD' || dir === 'FORWARD') fwd += secs;
    else rev += secs;
  });
  return [
    { name: 'FWD', value: fwd, color: '#00D4AA' },
    { name: 'REV', value: rev, color: '#7C3AED' },
  ];
}

/**
 * Compute stats for a set of sessions in a range
 */
export function computeStats(sessions, range) {
  const filtered = filterByRange(sessions, range).filter(s => s.stopped_at);
  const total = filtered.reduce((sum, s) => {
    const secs = typeof s.duration === 'number' ? s.duration : parseDurationToSeconds(s.duration);
    return sum + secs;
  }, 0);
  const fwdTotal = filtered
    .filter(s => (s.orientation || '').toUpperCase().startsWith('F'))
    .reduce((sum, s) => sum + (typeof s.duration === 'number' ? s.duration : parseDurationToSeconds(s.duration)), 0);
  const revTotal = total - fwdTotal;
  const max = filtered.reduce((m, s) => {
    const secs = typeof s.duration === 'number' ? s.duration : parseDurationToSeconds(s.duration);
    return Math.max(m, secs);
  }, 0);
  return {
    totalSecs: total,
    count: filtered.length,
    avg: filtered.length > 0 ? Math.floor(total / filtered.length) : 0,
    longest: max,
    fwd: fwdTotal,
    rev: revTotal,
  };
}
