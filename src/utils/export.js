// CraneMaster — Export Utilities
// CSV and PNG export logic for all tables and charts

import html2canvas from 'html2canvas';

// ─────────────────────────────────────────────
// CSV EXPORT
// ─────────────────────────────────────────────

/**
 * Download an array of rows as a CSV file
 * @param {Array} rows — array of objects
 * @param {Array} columns — [{ label: 'Column Name', key: 'objectKey' }]
 * @param {string} filename — output filename e.g. "LT1_sessions_7D.csv"
 */
export function downloadCSV(rows, columns, filename) {
  const header = columns.map(c => c.label).join(',');
  const body = rows
    .map(row =>
      columns
        .map(c => {
          const val = row[c.key] ?? '';
          const str = String(val);
          // Wrap in quotes if contains comma, newline, or quotes
          return str.includes(',') || str.includes('\n') || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// PNG EXPORT
// ─────────────────────────────────────────────

/**
 * Export a chart container div as a PNG
 * @param {React.RefObject} containerRef — ref on the chart's wrapper div
 * @param {string} filename — output filename e.g. "LT1_runtime_7D.png"
 */
export async function downloadChartPNG(containerRef, filename) {
  if (!containerRef?.current) return;
  const canvas = await html2canvas(containerRef.current, {
    backgroundColor: null, // preserve transparent/dark backgrounds
    scale: 2,              // 2× resolution for crisp export
    useCORS: true,
    logging: false,
  });
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─────────────────────────────────────────────
// FILENAME GENERATOR
// ─────────────────────────────────────────────

/**
 * Build a consistent export filename
 * e.g. LT1_runtime_7D_2026-03-19_17-43-20.png
 * e.g. system_downtime_2026-03-19_17-43-20.csv
 */
export function buildFilename(motorName, type, range, ext) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  if (range) {
    return `${motorName}_${type}_${range}_${date}_${time}.${ext}`;
  }
  return `${motorName}_${type}_${date}_${time}.${ext}`;
}
