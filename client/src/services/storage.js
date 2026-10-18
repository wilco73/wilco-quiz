const STORAGE_KEYS = {
  SESSION: 'quiz-session'
};

export const saveSession = (sessionData) => {
  try { localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData)); } catch (e) { /* stockage bloqué */ }
};

export const getSession = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
};

export const clearSession = () => {
  try { localStorage.removeItem(STORAGE_KEYS.SESSION); } catch (e) { /* ignore */ }
};