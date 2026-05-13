import assert from "node:assert/strict";

import {
  answerCurrentQuestion,
  createQuizSession,
  filterQuestions,
  getSessionStats,
  goToNextQuestion,
  shuffleQuestions
} from "../src/core/quizEngine.js";

const questions = [
  { id: "q1", period: "1950-е", answer: true },
  { id: "q2", period: "1960-е", answer: false },
  { id: "q3", period: "1970-е", answer: true },
  { id: "q4", period: "1970-е", answer: false },
  {
    id: "q5",
    period: "СССР",
    type: "multiple_choice",
    answer: "b",
    options: [
      { id: "a", label: "Wrong" },
      { id: "b", label: "Correct" }
    ]
  }
];

const session = createQuizSession(questions);
assert.equal(session.currentIndex, 0);
assert.equal(session.score, 0);
assert.equal(session.isComplete, false);

const answeredCorrectly = answerCurrentQuestion(session, true);
assert.equal(answeredCorrectly.score, 1);
assert.equal(answeredCorrectly.streak, 1);
assert.equal(answeredCorrectly.answered, 1);
assert.equal(answeredCorrectly.lastAnswer.isCorrect, true);

const duplicateAnswer = answerCurrentQuestion(answeredCorrectly, false);
assert.equal(duplicateAnswer, answeredCorrectly);

const nextSession = goToNextQuestion(answeredCorrectly);
assert.equal(nextSession.currentIndex, 1);
assert.equal(nextSession.lastAnswer, null);
assert.equal(nextSession.isComplete, false);

const answeredWrong = answerCurrentQuestion(nextSession, true);
assert.equal(answeredWrong.score, 1);
assert.equal(answeredWrong.streak, 0);
assert.equal(answeredWrong.answered, 2);
assert.deepEqual(getSessionStats(answeredWrong), {
  total: 5,
  progress: 40,
  accuracy: 50,
  remaining: 3
});

assert.deepEqual(
  filterQuestions(questions, "1970-е").map((question) => question.id),
  ["q3", "q4"]
);

assert.deepEqual(
  shuffleQuestions(questions, () => 0).map((question) => question.id),
  ["q2", "q3", "q4", "q5", "q1"]
);

assert.deepEqual(
  questions.map((question) => question.id),
  ["q1", "q2", "q3", "q4", "q5"]
);

const multipleChoiceSession = createQuizSession([questions[4]]);
const answeredMultipleChoice = answerCurrentQuestion(multipleChoiceSession, "b");
assert.equal(answeredMultipleChoice.score, 1);
assert.equal(answeredMultipleChoice.lastAnswer.correctAnswer, "b");

const timedOutSession = answerCurrentQuestion(createQuizSession([questions[4]]), null, { timedOut: true });
assert.equal(timedOutSession.score, 0);
assert.equal(timedOutSession.lastAnswer.timedOut, true);

console.log("quizEngine tests passed");
