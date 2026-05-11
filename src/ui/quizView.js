const selectors = {
  answerButtons: "[data-answer]",
  nextButton: "[data-action='next']",
  restartButton: "[data-action='restart']",
  periodSelect: "[data-control='period']"
};

export function createQuizView(root = document) {
  return {
    card: root.querySelector("[data-card]"),
    question: root.querySelector("[data-question]"),
    periodLabel: root.querySelector("[data-period-label]"),
    difficulty: root.querySelector("[data-difficulty]"),
    tags: root.querySelector("[data-tags]"),
    result: root.querySelector("[data-result]"),
    resultBadge: root.querySelector("[data-result-badge]"),
    explanation: root.querySelector("[data-explanation]"),
    progressLabel: root.querySelector("[data-progress-label]"),
    progressFill: root.querySelector("[data-progress-fill]"),
    accuracy: root.querySelector("[data-accuracy]"),
    periods: root.querySelector("[data-periods]"),
    periodSelect: root.querySelector(selectors.periodSelect),
    answerButtons: [...root.querySelectorAll(selectors.answerButtons)],
    nextButton: root.querySelector(selectors.nextButton),
    restartButton: root.querySelector(selectors.restartButton),
    sessionTitle: root.querySelector("[data-session-title]"),
    sessionNote: root.querySelector("[data-session-note]"),
    stats: {
      score: root.querySelector("[data-stat='score']"),
      streak: root.querySelector("[data-stat='streak']"),
      best: root.querySelector("[data-stat='best']"),
      answered: root.querySelector("[data-stat='answered']"),
      remaining: root.querySelector("[data-stat='remaining']")
    }
  };
}

export function bindQuizEvents(view, handlers) {
  view.answerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handlers.onAnswer(button.dataset.answer === "true");
    });
  });

  view.nextButton.addEventListener("click", handlers.onNext);
  view.restartButton.addEventListener("click", handlers.onRestart);
  view.periodSelect.addEventListener("change", () => handlers.onPeriodChange(view.periodSelect.value));

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "t") {
      handlers.onAnswer(true);
    }

    if (event.key.toLowerCase() === "f") {
      handlers.onAnswer(false);
    }

    if (event.key === "Enter") {
      handlers.onNext();
    }
  });
}

export function renderPeriodOptions(view, periods) {
  periods.forEach((period) => {
    const option = document.createElement("option");
    option.value = period;
    option.textContent = period;
    view.periodSelect.append(option);
  });

  view.periods.replaceChildren(
    ...periods.map((period) => {
      const chip = document.createElement("span");
      chip.className = "period-chip";
      chip.textContent = period;
      return chip;
    })
  );
}

export function renderSession(view, session, stats, bestScore) {
  const question = session.questions[session.currentIndex];

  view.stats.score.textContent = session.score;
  view.stats.streak.textContent = session.streak;
  view.stats.best.textContent = bestScore;
  view.stats.answered.textContent = session.answered;
  view.stats.remaining.textContent = stats.remaining;
  view.progressLabel.textContent = `${Math.min(session.answered + 1, stats.total)} из ${stats.total}`;
  view.progressFill.style.width = `${stats.progress}%`;
  view.accuracy.textContent = `${stats.accuracy}%`;

  if (session.isComplete) {
    renderCompleteState(view, session, stats);
    return;
  }

  if (!question) {
    renderEmptyState(view);
    return;
  }

  view.card.classList.toggle("is-answered", Boolean(session.lastAnswer));
  view.question.textContent = question.question;
  view.periodLabel.textContent = question.period;
  view.difficulty.textContent = difficultyLabel(question.difficulty);
  view.tags.replaceChildren(...question.tags.map(createTag));

  renderResult(view, session, question);
  renderControls(view, session);
}

export function playCardChange(view, updateContent) {
  view.card.classList.remove("is-entering", "is-answered");
  view.card.classList.add("is-leaving");
  setControlsDisabled(view, true);

  window.setTimeout(() => {
    updateContent();
    view.card.classList.remove("is-leaving");
    view.card.classList.add("is-entering");

    window.setTimeout(() => {
      view.card.classList.remove("is-entering");
    }, 380);
  }, 170);
}

function renderResult(view, session, question) {
  if (!session.lastAnswer) {
    view.result.hidden = true;
    view.resultBadge.textContent = "";
    view.resultBadge.classList.remove("is-wrong");
    view.explanation.textContent = "";
    view.sessionTitle.textContent = "Карточка открыта";
    view.sessionNote.textContent = "Ответь на утверждение и сравни интуицию с историческим контекстом.";
    return;
  }

  const { isCorrect, correctAnswer } = session.lastAnswer;

  view.result.hidden = false;
  view.resultBadge.textContent = isCorrect
    ? "Верно"
    : `Неверно, правильный ответ: ${correctAnswer ? "правда" : "ложь"}`;
  view.resultBadge.classList.toggle("is-wrong", !isCorrect);
  view.explanation.textContent = question.explanation;
  view.sessionTitle.textContent = isCorrect ? "Точно" : "Есть нюанс";
  view.sessionNote.textContent = isCorrect
    ? "Серия растет. Следующая карточка уже рядом."
    : "Пояснение помогает поймать контекст, а не просто запомнить ответ.";
}

function renderControls(view, session) {
  const hasAnswer = Boolean(session.lastAnswer);

  setControlsDisabled(view, hasAnswer || session.isComplete);

  view.nextButton.disabled = !hasAnswer && !session.isComplete;
  view.nextButton.textContent = session.answered >= session.questions.length ? "Итог" : "Дальше";
}

function setControlsDisabled(view, disabled) {
  view.answerButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function renderEmptyState(view) {
  view.question.textContent = "В этой подборке пока нет карточек.";
  view.periodLabel.textContent = "Пусто";
  view.difficulty.textContent = "mock";
  view.tags.replaceChildren();
  view.result.hidden = true;
  view.answerButtons.forEach((button) => {
    button.disabled = true;
  });
  view.nextButton.disabled = true;
}

function renderCompleteState(view, session, stats) {
  view.card.classList.remove("is-answered");
  view.question.textContent = `Готово: ${session.score} из ${stats.total}`;
  view.periodLabel.textContent = "Итог";
  view.difficulty.textContent = `${stats.accuracy}%`;
  view.tags.replaceChildren(createTag("сессия завершена"));
  view.result.hidden = false;
  view.resultBadge.textContent = stats.accuracy >= 80 ? "Отличный результат" : "Есть куда расти";
  view.resultBadge.classList.toggle("is-wrong", stats.accuracy < 50);
  view.explanation.textContent = "Можно пройти подборку еще раз или выбрать другой период.";
  view.sessionTitle.textContent = "Сессия завершена";
  view.sessionNote.textContent = "Лучшие вопросы для запоминания часто те, где ответ сначала кажется очевидным.";
  view.answerButtons.forEach((button) => {
    button.disabled = true;
  });
  view.nextButton.disabled = false;
  view.nextButton.textContent = "Заново";
}

function createTag(label) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = label;
  return tag;
}

function difficultyLabel(difficulty) {
  const labels = {
    easy: "легко",
    medium: "средне",
    hard: "сложно"
  };

  return labels[difficulty] ?? difficulty;
}
