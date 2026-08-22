// Lesson formative assessment module.
// Duplicate prevention is applied by the lesson renderer before display.
// This small adapter is intentionally non-invasive: existing lesson-formative
// behavior remains in the page and can call this helper when question data is
// loaded.

(function () {
  const MAX_FORMATIVE_QUESTIONS = 20;
  const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

  window.filterFormativeQuestions = function filterFormativeQuestions(questions) {
    const seen = new Set();
    const result = [];
    for (const question of Array.isArray(questions) ? questions : []) {
      const key = normalize(question?.question);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(question);
      if (result.length >= MAX_FORMATIVE_QUESTIONS) break;
    }
    return result;
  };
})();
