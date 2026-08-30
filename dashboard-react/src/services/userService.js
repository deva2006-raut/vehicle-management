// userService — frontend client for the backend user system.
// Handles signup/login/logout, session restore, profile & saved locations.
// The token is kept ONLY in localStorage (client-side); the user's password
// is never stored or logged anywhere on the frontend.

const TOKEN_KEY = 'vroom_session_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

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

export const userService = {
  async signup({ name, email, password }) {
    const data = await request('/api/auth/signup', { method: 'POST', body: { name, email, password } });
    saveToken(data.user.token);
    return data.user;
  },

  async login({ email, password }) {
    const data = await request('/api/auth/login', { method: 'POST', body: { email, password } });
    saveToken(data.user.token);
    return data.user;
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      /* ignore network errors on logout */
    }
    saveToken('');
  },

  async me() {
    const token = getToken();
    if (!token) return null;
    try {
      const data = await request('/api/auth/me');
      return data.user;
    } catch (e) {
      saveToken('');
      return null;
    }
  },

  async updateProfile(patch) {
    const data = await request('/api/profile', { method: 'PUT', body: patch });
    return data.user;
  },

  async addSavedLocation(location) {
    const data = await request('/api/saved-locations', { method: 'POST', body: location });
    return data.location;
  },

  async deleteSavedLocation(id) {
    await request(`/api/saved-locations/${id}`, { method: 'DELETE' });
  },

  async toggleFavorite(id, favorite) {
    const data = await request(`/api/saved-locations/${id}/favorite`, { method: 'PATCH', body: { favorite } });
    return data.location;
  },

  async addHistory(entry) {
    const data = await request('/api/history', { method: 'POST', body: entry });
    return data.history;
  },

  async clearHistory() {
    await request('/api/history', { method: 'DELETE' });
  }
};
