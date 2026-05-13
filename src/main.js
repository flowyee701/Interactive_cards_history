import {
  answerCurrentQuestion,
  createQuizSession,
  filterQuestions,
  getSessionStats,
  goToNextQuestion,
  shuffleQuestions
} from "./core/quizEngine.js";
import {
  advanceCompetition,
  answerCompetitionQuestion,
  createCompetitionSession,
  getCompetitionStats,
  normalizePlayerNames
} from "./core/competitionEngine.js";
import { loadQuestions } from "./services/questionRepository.js";
import { getBestScore, saveBestScore } from "./services/storage.js";
import {
  bindQuizEvents,
  createQuizView,
  playCardChange,
  renderPeriodOptions,
  renderCompetitionSession,
  renderSession,
  renderStartScreen,
  syncRoomSettings
} from "./ui/quizView.js";

const view = createQuizView();

let allQuestions = [];
let activePeriod = "all";
let activeMode = "solo";
let session = createQuizSession([]);
let competitionSession = createCompetitionSession([], ["Player 1", "Player 2"]);
let bestScore = getBestScore(activePeriod);
let isTransitioning = false;
let hasStarted = false;
let shuffleEnabled = true;
let questionLimit = "10";
let timerDuration = 30;
let remainingSeconds = timerDuration;
let timerId = null;

init();

async function init() {
  try {
    allQuestions = await loadQuestions();
    const periods = [...new Set(allQuestions.map((question) => question.period))].sort();

    renderPeriodOptions(view, periods);
    renderStart();

    bindQuizEvents(view, {
      onAnswer: handleAnswer,
      onNext: handleNext,
      onRestart: handleRestart,
      onPeriodChange: handlePeriodChange,
      onModeChange: handleModeChange,
      onQuestionLimitChange: handleQuestionLimitChange,
      onTimerChange: handleTimerChange,
      onShuffleChange: handleShuffleChange
    });
  } catch (error) {
    renderLoadError(error);
  }
}

function handleAnswer(answer) {
  if (isTransitioning || !hasStarted) {
    return;
  }

  stopTimer();

  if (activeMode === "competition") {
    competitionSession = answerCompetitionQuestion(competitionSession, answer);
    render();
    return;
  }

  session = answerCurrentQuestion(session, answer);
  bestScore = saveBestScore(session.score, activePeriod);
  render();
}

function handleNext() {
  if (isTransitioning) {
    return;
  }

  if (!hasStarted) {
    stopTimer();
    transitionTo(() => startSession());
    return;
  }

  if (activeMode === "competition") {
    if (competitionSession.isComplete) {
      stopTimer();
      transitionTo(() => startSession());
      return;
    }

    if (!competitionSession.lastAnswer) {
      return;
    }

    transitionTo(() => {
      competitionSession = advanceCompetition(competitionSession);
      render();
      startTimerIfNeeded();
    });
    return;
  }

  if (session.isComplete) {
    stopTimer();
    transitionTo(() => startSession());
    return;
  }

  if (!session.lastAnswer && !session.isComplete) {
    return;
  }

  transitionTo(() => {
    session = goToNextQuestion(session);
    render();
    startTimerIfNeeded();
  });
}

function handlePeriodChange(period) {
  if (isTransitioning) {
    return;
  }

  activePeriod = period;
  hasStarted = false;
  stopTimer();
  transitionTo(() => renderStart());
}

function handleModeChange(mode) {
  if (isTransitioning) {
    return;
  }

  activeMode = mode;
  hasStarted = false;
  stopTimer();
  transitionTo(() => renderStart());
}

function handleQuestionLimitChange(limit) {
  questionLimit = limit;

  if (!hasStarted) {
    renderStart();
  }
}

function handleTimerChange(duration) {
  timerDuration = duration;
  remainingSeconds = duration;

  if (!hasStarted) {
    renderStart();
  }
}

function handleRestart() {
  if (isTransitioning) {
    return;
  }

  hasStarted = false;
  stopTimer();
  transitionTo(() => renderStart());
}

function handleShuffleChange(enabled) {
  shuffleEnabled = enabled;

  if (!hasStarted) {
    renderStart();
  }
}

function startSession() {
  hasStarted = true;
  const questions = filterQuestions(allQuestions, activePeriod);
  const orderedDeck = shuffleEnabled ? shuffleQuestions(questions) : questions;
  const deck = limitQuestions(orderedDeck, questionLimit);
  stopTimer();

  if (activeMode === "competition") {
    competitionSession = createCompetitionSession(deck, getPlayerNames());
  } else {
    session = createQuizSession(deck);
  }

  render();
  startTimerIfNeeded();
}

function renderStart() {
  const questions = filterQuestions(allQuestions, activePeriod);
  const selectedTotal = getLimitedQuestionCount(questions.length, questionLimit);
  session = createQuizSession([]);
  competitionSession = createCompetitionSession([], getPlayerNames());
  bestScore = getBestScore(activePeriod);
  syncRoomSettings(view, activeMode);
  renderStartScreen(view, {
    period: activePeriod,
    mode: activeMode,
    total: selectedTotal,
    availableTotal: questions.length,
    bestScore,
    shuffleEnabled,
    players: getPlayerNames(),
    questionLimit,
    timerDuration
  });
}

function render() {
  syncRoomSettings(view, activeMode);

  if (activeMode === "competition") {
    renderCompetitionSession(view, competitionSession, getCompetitionStats(competitionSession), getTimerState());
    return;
  }

  const stats = getSessionStats(session);
  bestScore = saveBestScore(session.score, activePeriod);
  renderSession(view, session, stats, bestScore, getTimerState());
}

function getPlayerNames() {
  return normalizePlayerNames(view.playerInputs.map((input) => input.value));
}

function limitQuestions(questions, limit) {
  if (limit === "all") {
    return questions;
  }

  return questions.slice(0, Number(limit));
}

function getLimitedQuestionCount(total, limit) {
  if (limit === "all") {
    return total;
  }

  return Math.min(total, Number(limit));
}

function startTimerIfNeeded() {
  stopTimer();

  if (!timerDuration || !hasStarted || isCurrentSessionComplete() || hasCurrentAnswer()) {
    render();
    return;
  }

  remainingSeconds = timerDuration;
  render();
  timerId = window.setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      handleTimerExpired();
      return;
    }

    render();
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function handleTimerExpired() {
  stopTimer();

  if (!hasStarted || isTransitioning || isCurrentSessionComplete() || hasCurrentAnswer()) {
    return;
  }

  remainingSeconds = 0;

  if (activeMode === "competition") {
    competitionSession = answerCompetitionQuestion(competitionSession, null, { timedOut: true });
  } else {
    session = answerCurrentQuestion(session, null, { timedOut: true });
    bestScore = saveBestScore(session.score, activePeriod);
  }

  render();
}

function getTimerState() {
  return {
    duration: timerDuration,
    remaining: remainingSeconds,
    isActive: Boolean(timerId)
  };
}

function isCurrentSessionComplete() {
  return activeMode === "competition" ? competitionSession.isComplete : session.isComplete;
}

function hasCurrentAnswer() {
  return activeMode === "competition" ? Boolean(competitionSession.lastAnswer) : Boolean(session.lastAnswer);
}

function transitionTo(updateContent) {
  isTransitioning = true;
  playCardChange(view, () => {
    updateContent();
    isTransitioning = false;
  });
}

function renderLoadError(error) {
  view.question.textContent = "Could not load the cards.";
  view.periodLabel.textContent = "Error";
  view.difficulty.textContent = "data";
  view.sessionTitle.textContent = "Check the data";
  view.sessionNote.textContent = error.message;
  view.answerBar.replaceChildren();
  view.nextButton.disabled = true;
}
