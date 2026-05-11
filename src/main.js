import {
  answerCurrentQuestion,
  createQuizSession,
  filterQuestions,
  getSessionStats,
  goToNextQuestion
} from "./core/quizEngine.js";
import { loadQuestions } from "./services/questionRepository.js";
import { getBestScore, saveBestScore } from "./services/storage.js";
import {
  bindQuizEvents,
  createQuizView,
  playCardChange,
  renderPeriodOptions,
  renderSession
} from "./ui/quizView.js";

const view = createQuizView();

let allQuestions = [];
let activePeriod = "all";
let session = createQuizSession([]);
let bestScore = getBestScore();
let isTransitioning = false;

init();

async function init() {
  try {
    allQuestions = await loadQuestions();
    const periods = [...new Set(allQuestions.map((question) => question.period))].sort();

    renderPeriodOptions(view, periods);
    resetSession();

    bindQuizEvents(view, {
      onAnswer: handleAnswer,
      onNext: handleNext,
      onRestart: resetSession,
      onPeriodChange: handlePeriodChange
    });
  } catch (error) {
    renderLoadError(error);
  }
}

function handleAnswer(answer) {
  if (isTransitioning) {
    return;
  }

  session = answerCurrentQuestion(session, answer);
  bestScore = saveBestScore(session.score);
  render();
}

function handleNext() {
  if (isTransitioning) {
    return;
  }

  if (session.isComplete) {
    transitionTo(() => resetSession());
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
  transitionTo(() => resetSession());
}

function resetSession() {
  const questions = filterQuestions(allQuestions, activePeriod);
  session = createQuizSession(questions);
  render();
}

function render() {
  const stats = getSessionStats(session);
  bestScore = saveBestScore(session.score);
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
  view.question.textContent = "Не получилось загрузить карточки.";
  view.periodLabel.textContent = "Ошибка";
  view.difficulty.textContent = "данные";
  view.sessionTitle.textContent = "Проверь данные";
  view.sessionNote.textContent = error.message;
  view.answerButtons.forEach((button) => {
    button.disabled = true;
  });
  view.nextButton.disabled = true;
}
