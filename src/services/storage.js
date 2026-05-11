const BEST_SCORE_KEY = "interactive-history.best-score";

export function getBestScore(scope = "all") {
  const scopedScore = localStorage.getItem(createBestScoreKey(scope));

  if (scopedScore !== null) {
    return normalizeScore(scopedScore);
  }

  if (scope === "all") {
    return normalizeScore(localStorage.getItem(BEST_SCORE_KEY));
  }

  return 0;
}

export function saveBestScore(score, scope = "all") {
  const bestScore = getBestScore(scope);

  if (score > bestScore) {
    localStorage.setItem(createBestScoreKey(scope), String(score));
    return score;
  }

  return bestScore;
}

function createBestScoreKey(scope) {
  return `${BEST_SCORE_KEY}.${scope}`;
}

function normalizeScore(value) {
  const score = Number(value ?? 0);
  return Number.isFinite(score) ? score : 0;
}
