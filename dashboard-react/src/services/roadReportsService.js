// roadReportsService — frontend client for the community road-problem
// reporting backend. Reading is public; creating/updating requires the
// logged-in session token managed by userService.

import { getToken } from './userService';

// Canonical report types mirrored from the backend, with UI-friendly details.
export const REPORT_TYPES = {
  pothole: { label: 'Pothole', color: '#f59e0b', icon: '◌', blurb: 'Deep holes or damaged road surface' },
  accident: { label: 'Accident', color: '#ef4444', icon: '⚠', blurb: 'Blocked lane or crash site' },
  closure: { label: 'Road Closure', color: '#8b5cf6', icon: '⊘', blurb: 'Road fully or partially closed' },
  construction: { label: 'Construction', color: '#3b82f6', icon: '🚧', blurb: 'Ongoing roadwork / diversions' },
  traffic: { label: 'Heavy Traffic', color: '#ec4899', icon: '🚦', blurb: 'Severe congestion or jam' },
  waterlogging: { label: 'Waterlogging', color: '#06b6d4', icon: '≈', blurb: 'Flooded / waterlogged stretch' }
};
export const REPORT_TYPE_IDS = Object.keys(REPORT_TYPES);

export const REPORT_STATUS = {
  open: { label: 'Open', color: '#f43f5e' },
  investigating: { label: 'Investigating', color: '#f59e0b' },
  resolved: { label: 'Resolved', color: '#10b981' }
};

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

export const roadReportsService = {
  async list(filter = {}) {
    const params = new URLSearchParams();
    if (filter.type) params.set('type', filter.type);
    if (filter.status) params.set('status', filter.status);
    let qs = params.toString();
    if (qs) qs = '?' + qs;
    const data = await request('/api/reports' + qs);
    return data.reports || [];
  },

  async create(report) {
    const data = await request('/api/reports', { method: 'POST', body: report });
    return data.report;
  },

  async updateStatus(id, status) {
    const data = await request(`/api/reports/${id}`, { method: 'PATCH', body: { status } });
    return data.report;
  },

  async vote(id) {
    const data = await request(`/api/reports/${id}`, { method: 'PATCH', body: { vote: true } });
    return data.report;
  }
};
