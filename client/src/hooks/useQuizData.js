import { useState, useEffect, useRef } from 'react';
import * as api from '../services/api';
import { POLL_INTERVAL } from '../config';

export const useQuizData = (shouldPoll = false) => {
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef(null);

  const loadData = async () => {
    try {
      const [teamsData, participantsData, quizzesData, questionsData, lobbiesData] = await Promise.all([
        api.fetchTeams(),
        api.fetchParticipants(),
        api.fetchQuizzes(),
        api.fetchQuestions(),
        api.fetchLobbies()
      ]);
      
      setTeams(teamsData);
      setParticipants(participantsData);
      setQuizzes(quizzesData);
      setQuestions(questionsData);
      setLobbies(lobbiesData);
      setLoading(false);
    } catch (error) {
      console.error('Erreur de chargement:', error);
      setLoading(false);
    }
  };

  const loadLobbies = async () => {
    try {
      const lobbiesData = await api.fetchLobbies();
      setLobbies(lobbiesData);
    } catch (error) {
      console.error('Erreur chargement lobbies:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (shouldPoll) {
      pollingIntervalRef.current = setInterval(() => {
        loadLobbies();
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [shouldPoll]);

  return {
    teams,
    setTeams,
    participants,
    setParticipants,
    quizzes,
    setQuizzes,
    questions,
    setQuestions,
    lobbies,
    setLobbies,
    loading,
    loadData,
    loadLobbies
  };
};