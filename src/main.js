import {
  answerCurrentQuestion,
  createQuizSession,
  filterQuestions,
  getSessionStats,
  goToNextQuestion,
  shuffleQuestions
} from "./core/quizEngine.js";
import { loadQuestions } from "./services/questionRepository.js";
import { getBestScore, saveBestScore } from "./services/storage.js";
import {
  bindQuizEvents,
  createQuizView,
  playCardChange,
  renderPeriodOptions,
  renderSession,
  renderStartScreen
} from "./ui/quizView.js";

const view = createQuizView();

let allQuestions = [];
let activePeriod = "all";
let session = createQuizSession([]);
let bestScore = getBestScore(activePeriod);
let isTransitioning = false;
let hasStarted = false;
let shuffleEnabled = true;

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

  session = answerCurrentQuestion(session, answer);
  bestScore = saveBestScore(session.score, activePeriod);
  render();
}

function handleNext() {
  if (isTransitioning) {
    return;
  }

  if (!hasStarted) {
    transitionTo(() => startSession());
    return;
  }

  if (session.isComplete) {
    transitionTo(() => startSession());
    return;
  }

  if (!session.lastAnswer && !session.isComplete) {
    return;
  }

  transitionTo(() => {
    session = goToNextQuestion(session);
    render();
  });
}

function handlePeriodChange(period) {
  if (isTransitioning) {
    return;
  }

  activePeriod = period;
  hasStarted = false;
  transitionTo(() => renderStart());
}

function handleRestart() {
  if (isTransitioning) {
    return;
  }

  hasStarted = false;
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
  session = createQuizSession(shuffleEnabled ? shuffleQuestions(questions) : questions);
  render();
}

function renderStart() {
  const questions = filterQuestions(allQuestions, activePeriod);
  session = createQuizSession([]);
  bestScore = getBestScore(activePeriod);
  renderStartScreen(view, {
    period: activePeriod,
    total: questions.length,
    bestScore,
    shuffleEnabled
  });
}

function render() {
  const stats = getSessionStats(session);
  bestScore = saveBestScore(session.score, activePeriod);
  renderSession(view, session, stats, bestScore);
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
