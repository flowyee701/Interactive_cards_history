const BEST_SCORE_KEY = "interactive-history.best-score";

export function getBestScore() {
  return Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0);
}

export function saveBestScore(score) {
  const bestScore = getBestScore();

  if (score > bestScore) {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
    return score;
  }

  return bestScore;
}
