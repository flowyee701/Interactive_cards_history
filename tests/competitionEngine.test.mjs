import assert from "node:assert/strict";

import {
  advanceCompetition,
  answerCompetitionQuestion,
  createCompetitionSession,
  getCompetitionStats,
  getLeaderboard,
  normalizePlayerNames
} from "../src/core/competitionEngine.js";

const questions = [
  { id: "q1", answer: "a" },
  { id: "q2", answer: "b" }
];

const session = createCompetitionSession(questions, ["Anna", "Boris", ""]);
assert.deepEqual(
  session.players.map((player) => player.name),
  ["Anna", "Boris"]
);
assert.equal(session.currentIndex, 0);
assert.equal(session.currentPlayerIndex, 0);
assert.equal(session.isComplete, false);

const annaCorrect = answerCompetitionQuestion(session, "a");
assert.equal(annaCorrect.players[0].score, 1);
assert.equal(annaCorrect.players[0].streak, 1);
assert.equal(annaCorrect.lastAnswer.playerName, "Anna");

const duplicateAnswer = answerCompetitionQuestion(annaCorrect, "b");
assert.equal(duplicateAnswer, annaCorrect);

const borisTurn = advanceCompetition(annaCorrect);
assert.equal(borisTurn.currentIndex, 1);
assert.equal(borisTurn.currentPlayerIndex, 1);
assert.equal(borisTurn.lastAnswer, null);
assert.equal(borisTurn.questions[borisTurn.currentIndex].id, "q2");

const borisCorrect = answerCompetitionQuestion(borisTurn, "b");
assert.equal(borisCorrect.players[1].score, 1);
assert.equal(borisCorrect.players[1].streak, 1);
assert.deepEqual(getCompetitionStats(borisCorrect), {
  total: 2,
  totalTurns: 2,
  answeredTurns: 2,
  progress: 100,
  accuracy: 100,
  remaining: 0,
  completedQuestions: 2
});

const completed = advanceCompetition(borisCorrect);
assert.equal(completed.isComplete, true);
assert.equal(getCompetitionStats(completed).progress, 100);

assert.deepEqual(normalizePlayerNames(["Only one"]), ["Player 1", "Player 2"]);
const timedOut = answerCompetitionQuestion(createCompetitionSession([questions[0]], ["A", "B"]), null, {
  timedOut: true
});
assert.equal(timedOut.players[0].score, 0);
assert.equal(timedOut.lastAnswer.timedOut, true);
assert.deepEqual(
  getLeaderboard([
    { id: "a", name: "A", score: 1, streak: 0 },
    { id: "b", name: "B", score: 1, streak: 2 },
    { id: "c", name: "C", score: 0, streak: 0 }
  ]).map((player) => player.name),
  ["B", "A", "C"]
);

console.log("competitionEngine tests passed");
