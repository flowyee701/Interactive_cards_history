const QUESTIONS_URL = "./data/questions.json";
const SUPPORTED_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const SUPPORTED_TYPES = new Set(["true_false", "multiple_choice"]);

export async function loadQuestions() {
  const response = await fetch(QUESTIONS_URL);

  if (!response.ok) {
    throw new Error(`Could not load questions: ${response.status}`);
  }

  const questions = await response.json();
  validateQuestions(questions);

  return questions;
}

function validateQuestions(questions) {
  if (!Array.isArray(questions)) {
    throw new Error("The questions file must be an array.");
  }

  const ids = new Set();

  questions.forEach((question, index) => {
    const path = `questions[${index}]`;

    if (!isFilledString(question.id) || ids.has(question.id)) {
      throw new Error(`${path}: id is missing or duplicated.`);
    }

    ids.add(question.id);

    if (!SUPPORTED_TYPES.has(question.type)) {
      throw new Error(`${path}: type must be true_false or multiple_choice.`);
    }

    if (question.type === "true_false" && typeof question.answer !== "boolean") {
      throw new Error(`${path}: answer must be boolean for true_false.`);
    }

    if (question.type === "multiple_choice") {
      validateMultipleChoiceQuestion(question, path);
    }

    if (
      !isFilledString(question.question) ||
      !isFilledString(question.explanation) ||
      !isFilledString(question.period)
    ) {
      throw new Error(`${path}: question text, explanation, or period is missing.`);
    }

    if (!SUPPORTED_DIFFICULTIES.has(question.difficulty)) {
      throw new Error(`${path}: difficulty must be easy, medium, or hard.`);
    }

    if (
      !Array.isArray(question.tags) ||
      question.tags.length === 0 ||
      !question.tags.every(isFilledString)
    ) {
      throw new Error(`${path}: tags must be a non-empty array of strings.`);
    }

    if (question.source && (!isFilledString(question.source.title) || !isFilledString(question.source.url))) {
      throw new Error(`${path}: source must include title and url.`);
    }
  });
}

function validateMultipleChoiceQuestion(question, path) {
  if (!isFilledString(question.answer)) {
    throw new Error(`${path}: answer must be the id of the correct option.`);
  }

  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`${path}: options must include at least two choices.`);
  }

  const optionIds = new Set();

  question.options.forEach((option, index) => {
    if (!isFilledString(option.id) || !isFilledString(option.label)) {
      throw new Error(`${path}.options[${index}]: id and label are required.`);
    }

    if (optionIds.has(option.id)) {
      throw new Error(`${path}.options[${index}]: option id is duplicated.`);
    }

    optionIds.add(option.id);
  });

  if (!optionIds.has(question.answer)) {
    throw new Error(`${path}: answer must match one of the option ids.`);
  }
}

function isFilledString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
