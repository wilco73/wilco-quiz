import { API_URL } from '../config';

// ==================== ADMIN ====================
export const adminLogin = async (username, password) => {
  const res = await fetch(`${API_URL}/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res.json();
};

// ==================== TEAMS ====================
export const fetchTeams = async () => {
  const res = await fetch(`${API_URL}/teams`);
  return res.json();
};

export const saveTeams = async (teams) => {
  const res = await fetch(`${API_URL}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teams)
  });
  return res.json();
};

// ==================== PARTICIPANTS ====================
export const fetchParticipants = async () => {
  const res = await fetch(`${API_URL}/participants`);
  return res.json();
};

export const saveParticipants = async (participants) => {
  const res = await fetch(`${API_URL}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(participants)
  });
  return res.json();
};

// ==================== QUIZZES ====================
export const fetchQuizzes = async () => {
  const res = await fetch(`${API_URL}/quizzes`);
  return res.json();
};

export const saveQuizzes = async (quizzes) => {
  const res = await fetch(`${API_URL}/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quizzes)
  });
  return res.json();
};

// ==================== QUESTIONS ====================
export const fetchQuestions = async () => {
  const res = await fetch(`${API_URL}/questions`);
  return res.json();
};

export const saveQuestions = async (questions) => {
  const res = await fetch(`${API_URL}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questions)
  });
  return res.json();
};

// ==================== LOBBIES ====================
export const fetchLobbies = async () => {
  const res = await fetch(`${API_URL}/lobbies`);
  return res.json();
};

export const createLobby = async (quizId) => {
  const res = await fetch(`${API_URL}/create-lobby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quizId })
  });
  return res.json();
};

export const joinLobby = async (lobbyId, participantId, pseudo, teamName) => {
  const res = await fetch(`${API_URL}/join-lobby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId, participantId, pseudo, teamName })
  });
  return res.json();
};

export const leaveLobby = async (lobbyId, participantId) => {
  const res = await fetch(`${API_URL}/leave-lobby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId, participantId })
  });
  return res.json();
};

export const startQuiz = async (lobbyId) => {
  const res = await fetch(`${API_URL}/start-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId })
  });
  return res.json();
};

export const submitAnswer = async (lobbyId, participantId, answer) => {
  const res = await fetch(`${API_URL}/submit-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId, participantId, answer })
  });
  return res.json();
};

export const nextQuestion = async (lobbyId) => {
  const res = await fetch(`${API_URL}/next-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId })
  });
  return res.json();
};

// ✅ CORRECTION 3: Ajout de questionIndex dans la signature
export const validateAnswer = async (lobbyId, participantId, questionIndex, isCorrect) => {
  const res = await fetch(`${API_URL}/validate-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId, participantId, questionIndex, isCorrect })
  });
  return res.json();
};

export const deleteLobby = async (lobbyId) => {
  const res = await fetch(`${API_URL}/delete-lobby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId })
  });
  return res.json();
};