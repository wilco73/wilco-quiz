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

  // ✅ NOUVEAU: Charger lobbies ET teams pour avoir les scores à jour
  const loadLobbiesAndTeams = async () => {
    try {
      const [lobbiesData, teamsData] = await Promise.all([
        api.fetchLobbies(),
        api.fetchTeams()
      ]);

      // ✅ Ne mettre à jour que si changements
      const lobbiesChanged = JSON.stringify(lobbiesData) !== JSON.stringify(lobbies);
      const teamsChanged = JSON.stringify(teamsData) !== JSON.stringify(teams);

      if (lobbiesChanged) {
        setLobbies(lobbiesData);
      }

      if (teamsChanged) {
        setTeams(teamsData);
      }
    } catch (error) {
      console.error('Erreur chargement lobbies et teams:', error);
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
      let counter = 0;

      pollingIntervalRef.current = setInterval(() => {
        // ✅ Recharger lobbies chaque seconde
        loadLobbies();

        // ✅ Recharger teams seulement toutes les 5 secondes
        counter++;
        if (counter % 5 === 0) {
          loadTeams();
        }
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [shouldPoll]);

  // ✅ Ajouter fonction loadTeams
  const loadTeams = async () => {
    try {
      const teamsData = await api.fetchTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Erreur chargement teams:', error);
    }
  };

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
    loadLobbies,
    loadLobbiesAndTeams
  };
};