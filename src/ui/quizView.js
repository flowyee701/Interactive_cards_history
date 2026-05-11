const selectors = {
  answerButtons: "[data-answer]",
  answerBar: "[data-answers]",
  nextButton: "[data-action='next']",
  restartButton: "[data-action='restart']",
  periodSelect: "[data-control='period']",
  shuffleToggle: "[data-control='shuffle']"
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
    resultSummary: root.querySelector("[data-result-summary]"),
    source: root.querySelector("[data-source]"),
    questionCounter: root.querySelector("[data-question-counter]"),
    progressLabel: root.querySelector("[data-progress-label]"),
    progressFill: root.querySelector("[data-progress-fill]"),
    accuracy: root.querySelector("[data-accuracy]"),
    periods: root.querySelector("[data-periods]"),
    periodSelect: root.querySelector(selectors.periodSelect),
    shuffleToggle: root.querySelector(selectors.shuffleToggle),
    answerBar: root.querySelector(selectors.answerBar),
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
  view.answerBar.addEventListener("click", (event) => {
    const button = event.target.closest(selectors.answerButtons);

    if (!button || button.disabled) {
      return;
    }

    handlers.onAnswer(readAnswerValue(button.dataset.answer));
  });

  view.nextButton.addEventListener("click", handlers.onNext);
  view.restartButton.addEventListener("click", handlers.onRestart);
  view.periodSelect.addEventListener("change", () => handlers.onPeriodChange(view.periodSelect.value));
  view.shuffleToggle.addEventListener("change", () => handlers.onShuffleChange(view.shuffleToggle.checked));

  window.addEventListener("keydown", (event) => {
    const trueFalseButton = view.answerBar.querySelector(`[data-answer="${event.key.toLowerCase() === "t"}"]`);

    if (event.key.toLowerCase() === "t" && trueFalseButton && !trueFalseButton.disabled) {
      handlers.onAnswer(true);
    }

    if (event.key.toLowerCase() === "f" && trueFalseButton && !trueFalseButton.disabled) {
      handlers.onAnswer(false);
    }

    if (event.key === "Enter") {
      handlers.onNext();
    }

    const numberAnswer = Number(event.key);
    if (numberAnswer >= 1 && numberAnswer <= 4) {
      const button = getAnswerButtons(view)[numberAnswer - 1];

      if (button && !button.disabled) {
        handlers.onAnswer(readAnswerValue(button.dataset.answer));
      }
    }
  });
}

export function renderPeriodOptions(view, periods) {
  periods.forEach((period) => {
    const option = document.createElement("option");
    option.value = period;
    option.textContent = periodLabel(period);
    view.periodSelect.append(option);
  });

  view.periods.replaceChildren(
    ...periods.map((period) => {
      const chip = document.createElement("span");
      chip.className = "period-chip";
      chip.textContent = periodLabel(period);
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
  view.progressLabel.textContent = `${Math.min(session.answered + 1, stats.total)} of ${stats.total}`;
  view.questionCounter.textContent = session.isComplete
    ? `${stats.total} of ${stats.total}`
    : `Question ${Math.min(session.currentIndex + 1, stats.total)} of ${stats.total}`;
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
  view.periodLabel.textContent = periodLabel(question.period);
  view.difficulty.textContent = difficultyLabel(question.difficulty);
  view.tags.replaceChildren(...question.tags.map(createTag));

  renderAnswers(view, question, session.lastAnswer);
  renderResult(view, session, question);
  renderControls(view, session);
}

export function renderStartScreen(view, { period, total, bestScore, shuffleEnabled }) {
  view.card.classList.remove("is-answered");
  view.stats.score.textContent = "0";
  view.stats.streak.textContent = "0";
  view.stats.best.textContent = bestScore;
  view.stats.answered.textContent = "0";
  view.stats.remaining.textContent = total;
  view.progressLabel.textContent = `0 of ${total}`;
  view.questionCounter.textContent = "Ready";
  view.progressFill.style.width = "0%";
  view.accuracy.textContent = "0%";
  view.question.textContent = "Ready to Play?";
  view.periodLabel.textContent = period === "all" ? "All periods" : periodLabel(period);
  view.difficulty.textContent = `${total} cards`;
  view.tags.replaceChildren(createTag(period === "all" ? "full deck" : periodLabel(period)));
  view.answerBar.replaceChildren();
  view.result.hidden = false;
  view.resultBadge.textContent = "New Session";
  view.resultBadge.classList.remove("is-wrong");
  view.explanation.textContent = shuffleEnabled
    ? "Choose a period if you want a focused deck, then start the quiz. Cards will be shuffled."
    : "Review order is on. Cards will follow the exact order from the question file.";
  renderResultSummary(view, [
    ["Cards", String(total)],
    ["Best", String(bestScore)],
    ["Order", shuffleEnabled ? "Shuffle" : "Review"]
  ]);
  clearSource(view);
  view.sessionTitle.textContent = "Ready to Start";
  view.sessionNote.textContent = "The deck will shuffle when you begin. Use number keys 1-4 to answer faster.";
  view.nextButton.disabled = total === 0;
  view.nextButton.textContent = "Start Quiz";
  view.restartButton.disabled = true;
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
    clearResultSummary(view);
    clearSource(view);
    view.sessionTitle.textContent = "Card Opened";
    view.sessionNote.textContent = "Choose an answer, then compare your intuition with the historical context.";
    view.restartButton.disabled = false;
    return;
  }

  const { isCorrect, correctAnswer } = session.lastAnswer;
  const correctAnswerLabel = getAnswerLabel(question, correctAnswer);

  view.result.hidden = false;
  view.resultBadge.textContent = isCorrect
    ? "Correct"
    : `Incorrect, correct answer: ${correctAnswerLabel}`;
  view.resultBadge.classList.toggle("is-wrong", !isCorrect);
  view.explanation.textContent = question.explanation;
  clearResultSummary(view);
  renderSource(view, question.source);
  view.sessionTitle.textContent = isCorrect ? "Exactly" : "Worth Noting";
  view.sessionNote.textContent = isCorrect
    ? "Your streak is growing. The next card is ready."
    : "The explanation helps you understand the context, not just memorize the answer.";
  view.restartButton.disabled = false;
}

function renderControls(view, session) {
  const hasAnswer = Boolean(session.lastAnswer);

  setControlsDisabled(view, hasAnswer || session.isComplete);

  view.nextButton.disabled = !hasAnswer && !session.isComplete;
  view.nextButton.textContent = session.answered >= session.questions.length ? "Results" : "Next";
  view.restartButton.disabled = false;
}

function setControlsDisabled(view, disabled) {
  getAnswerButtons(view).forEach((button) => {
    button.disabled = disabled;
  });
}

function renderEmptyState(view) {
  view.question.textContent = "There are no cards in this deck yet.";
  view.periodLabel.textContent = "Empty";
  view.difficulty.textContent = "no data";
  view.tags.replaceChildren();
  view.answerBar.replaceChildren();
  view.result.hidden = true;
  clearResultSummary(view);
  clearSource(view);
  view.nextButton.disabled = true;
  view.restartButton.disabled = true;
}

function renderCompleteState(view, session, stats) {
  view.card.classList.remove("is-answered");
  view.question.textContent = "Final Score";
  view.periodLabel.textContent = "Results";
  view.questionCounter.textContent = `${stats.total} of ${stats.total}`;
  view.difficulty.textContent = `${stats.accuracy}% accuracy`;
  view.tags.replaceChildren(createTag("session complete"));
  view.answerBar.replaceChildren();
  view.result.hidden = false;
  view.resultBadge.textContent = resultLabel(stats.accuracy);
  view.resultBadge.classList.toggle("is-wrong", stats.accuracy < 50);
  view.explanation.textContent = resultMessage(stats.accuracy);
  renderResultSummary(view, [
    ["Score", `${session.score}/${stats.total}`],
    ["Accuracy", `${stats.accuracy}%`],
    ["Missed", String(stats.total - session.score)]
  ]);
  clearSource(view);
  view.sessionTitle.textContent = "Session Complete";
  view.sessionNote.textContent = "The most memorable questions are often the ones that first seem obvious.";
  getAnswerButtons(view).forEach((button) => {
    button.disabled = true;
  });
  view.nextButton.disabled = false;
  view.nextButton.textContent = "Replay";
  view.restartButton.disabled = false;
}

function createTag(label) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = label;
  return tag;
}

function renderResultSummary(view, items) {
  view.resultSummary.hidden = false;
  view.resultSummary.replaceChildren(
    ...items.map(([label, value]) => {
      const item = document.createElement("span");
      const strong = document.createElement("strong");
      const caption = document.createElement("small");

      strong.textContent = value;
      caption.textContent = label;
      item.append(strong, caption);

      return item;
    })
  );
}

function clearResultSummary(view) {
  view.resultSummary.hidden = true;
  view.resultSummary.replaceChildren();
}

function renderAnswers(view, question, lastAnswer) {
  const options = getQuestionOptions(question);

  view.answerBar.replaceChildren(
    ...options.map((option) => {
      const button = document.createElement("button");
      button.className = "answer-button";
      button.type = "button";
      button.dataset.answer = String(option.value);
      button.textContent = option.label;

      if (lastAnswer) {
        button.classList.toggle("is-selected", option.value === lastAnswer.selectedAnswer);
        button.classList.toggle("is-correct", option.value === lastAnswer.correctAnswer);
        button.classList.toggle(
          "is-wrong",
          option.value === lastAnswer.selectedAnswer && !lastAnswer.isCorrect
        );
      }

      return button;
    })
  );
}

function getQuestionOptions(question) {
  if (question.type === "multiple_choice") {
    return question.options.map((option) => ({
      value: option.id,
      label: `${option.id.toUpperCase()}. ${option.label}`
    }));
  }

  return [
    { value: false, label: "False" },
    { value: true, label: "True" }
  ];
}

function getAnswerLabel(question, answer) {
  const option = getQuestionOptions(question).find((item) => item.value === answer);
  return option ? option.label : String(answer);
}

function getAnswerButtons(view) {
  return [...view.answerBar.querySelectorAll(selectors.answerButtons)];
}

function readAnswerValue(value) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}

function renderSource(view, source) {
  if (!source) {
    clearSource(view);
    return;
  }

  view.source.hidden = false;
  view.source.href = source.url;
  view.source.textContent = `Source: ${source.title}`;
}

function clearSource(view) {
  view.source.hidden = true;
  view.source.removeAttribute("href");
  view.source.textContent = "";
}

function difficultyLabel(difficulty) {
  const labels = {
    easy: "easy",
    medium: "medium",
    hard: "hard"
  };

  return labels[difficulty] ?? difficulty;
}

function periodLabel(period) {
  return period;
}

function resultLabel(accuracy) {
  if (accuracy >= 90) {
    return "Excellent";
  }

  if (accuracy >= 70) {
    return "Strong Result";
  }

  if (accuracy >= 50) {
    return "Good Start";
  }

  return "Keep Practicing";
}

function resultMessage(accuracy) {
  if (accuracy >= 90) {
    return "You handled this deck with confidence. Replay it later to keep the facts fresh.";
  }

  if (accuracy >= 70) {
    return "Solid performance. The missed cards are the best ones to review next.";
  }

  if (accuracy >= 50) {
    return "You have the basics. Replay the deck once more and watch the explanations closely.";
  }

  return "Use the explanations as a short revision guide, then try the deck again.";
}
