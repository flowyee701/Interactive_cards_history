export function createCompetitionSession(questions, playerNames) {
  const players = normalizePlayerNames(playerNames).map((name, index) => ({
    id: `player-${index + 1}`,
    name,
    score: 0,
    streak: 0,
    answered: 0
  }));

  return {
    questions,
    players,
    currentIndex: 0,
    currentPlayerIndex: getPlayerIndexForQuestion(0, players.length),
    lastAnswer: null,
    isComplete: questions.length === 0
  };
}

export function answerCompetitionQuestion(session, selectedAnswer, meta = {}) {
  const question = getCompetitionQuestion(session);

  if (!question || session.lastAnswer || session.isComplete) {
    return session;
  }

  const activePlayer = session.players[session.currentPlayerIndex];
  const isCorrect = question.answer === selectedAnswer;
  const players = session.players.map((player, index) => {
    if (index !== session.currentPlayerIndex) {
      return player;
    }

    return {
      ...player,
      score: player.score + (isCorrect ? 1 : 0),
      streak: isCorrect ? player.streak + 1 : 0,
      answered: player.answered + 1
    };
  });

  return {
    ...session,
    players,
    lastAnswer: {
      selectedAnswer,
      isCorrect,
      correctAnswer: question.answer,
      playerName: activePlayer.name,
      timedOut: Boolean(meta.timedOut)
    }
  };
}

export function advanceCompetition(session) {
  if (session.isComplete || !session.lastAnswer) {
    return session;
  }

  const nextQuestionIndex = session.currentIndex + 1;

  return {
    ...session,
    currentIndex: nextQuestionIndex,
    currentPlayerIndex: getPlayerIndexForQuestion(nextQuestionIndex, session.players.length),
    lastAnswer: null,
    isComplete: nextQuestionIndex >= session.questions.length
  };
}

export function getCompetitionQuestion(session) {
  return session.questions[session.currentIndex] ?? null;
}

export function getCompetitionStats(session) {
  const total = session.questions.length;
  const completedQuestions = Math.min(
    session.currentIndex + (session.lastAnswer || session.isComplete ? 1 : 0),
    total
  );
  const totalTurns = total;
  const answeredTurns = session.players.reduce((sum, player) => sum + player.answered, 0);
  const correctTurns = session.players.reduce((sum, player) => sum + player.score, 0);
  const progress = total === 0 ? 0 : Math.round((completedQuestions / total) * 100);
  const accuracy = answeredTurns === 0 ? 0 : Math.round((correctTurns / answeredTurns) * 100);

  return {
    total,
    totalTurns,
    answeredTurns,
    progress,
    accuracy,
    remaining: Math.max(total - completedQuestions, 0),
    completedQuestions
  };
}

function getPlayerIndexForQuestion(questionIndex, playerCount) {
  return playerCount === 0 ? 0 : questionIndex % playerCount;
}

export function getLeaderboard(players) {
  return players
    .map((player, index) => ({ ...player, order: index }))
    .sort((left, right) => right.score - left.score || right.streak - left.streak || left.order - right.order);
}

export function getCompetitionWinner(players) {
  const leaderboard = getLeaderboard(players);
  const highScore = leaderboard[0]?.score ?? 0;
  const winners = leaderboard.filter((player) => player.score === highScore);

  return winners.length === 1 ? winners[0] : null;
}

export function normalizePlayerNames(playerNames) {
  const names = playerNames
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (names.length >= 2) {
    return names;
  }

  return ["Player 1", "Player 2"];
}
