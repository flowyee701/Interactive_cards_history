export function createQuizSession(questions) {
  return {
    questions,
    currentIndex: 0,
    score: 0,
    streak: 0,
    answered: 0,
    lastAnswer: null,
    isComplete: questions.length === 0
  };
}

export function shuffleQuestions(questions, random = Math.random) {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function getCurrentQuestion(session) {
  return session.questions[session.currentIndex] ?? null;
}

export function answerCurrentQuestion(session, selectedAnswer, meta = {}) {
  const question = getCurrentQuestion(session);

  if (!question || session.lastAnswer) {
    return session;
  }

  const isCorrect = question.answer === selectedAnswer;

  return {
    ...session,
    score: session.score + (isCorrect ? 1 : 0),
    streak: isCorrect ? session.streak + 1 : 0,
    answered: session.answered + 1,
    lastAnswer: {
      selectedAnswer,
      isCorrect,
      correctAnswer: question.answer,
      timedOut: Boolean(meta.timedOut)
    }
  };
}

export function goToNextQuestion(session) {
  const nextIndex = session.currentIndex + 1;
  const isComplete = nextIndex >= session.questions.length;

  return {
    ...session,
    currentIndex: nextIndex,
    lastAnswer: null,
    isComplete
  };
}

export function filterQuestions(questions, period) {
  if (period === "all") {
    return questions;
  }

  return questions.filter((question) => question.period === period);
}

export function getSessionStats(session) {
  const total = session.questions.length;
  const progress = total === 0 ? 0 : Math.round((session.answered / total) * 100);
  const accuracy = session.answered === 0 ? 0 : Math.round((session.score / session.answered) * 100);

  return {
    total,
    progress,
    accuracy,
    remaining: Math.max(total - session.answered, 0)
  };
}
