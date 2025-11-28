const STORAGE_KEYS = {
  SESSION: 'quiz-session'
};

export const saveSession = (sessionData) => {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
};

export const getSession = () => {
  const data = localStorage.getItem(STORAGE_KEYS.SESSION);
  return data ? JSON.parse(data) : null;
};

export const clearSession = () => {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
};