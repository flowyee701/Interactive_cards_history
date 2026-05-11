const QUESTIONS_URL = "./data/questions.json";

export async function loadQuestions() {
  const response = await fetch(QUESTIONS_URL);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить вопросы: ${response.status}`);
  }

  const questions = await response.json();
  validateQuestions(questions);

  return questions;
}

function validateQuestions(questions) {
  if (!Array.isArray(questions)) {
    throw new Error("Файл вопросов должен быть массивом.");
  }

  const ids = new Set();

  questions.forEach((question, index) => {
    const path = `questions[${index}]`;

    if (!question.id || ids.has(question.id)) {
      throw new Error(`${path}: id отсутствует или повторяется.`);
    }

    ids.add(question.id);

    if (question.type !== "true_false") {
      throw new Error(`${path}: сейчас поддерживается только type=true_false.`);
    }

    if (typeof question.answer !== "boolean") {
      throw new Error(`${path}: answer должен быть boolean.`);
    }

    if (!question.question || !question.explanation || !question.period) {
      throw new Error(`${path}: не хватает текста вопроса, объяснения или периода.`);
    }
  });
}
