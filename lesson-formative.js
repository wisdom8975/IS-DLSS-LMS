// Lesson formative assessment renderer.
// Rules: maximum 20 questions per lesson, never repeat the same question.
// The database is the source of truth; duplicate records are filtered defensively here too.

(function () {
  const MAX_QUESTIONS = 20;

  function normalizeQuestion(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function uniqueQuestions(questions) {
    const seen = new Set();
    return (Array.isArray(questions) ? questions : []).filter((q) => {
      const key = normalizeQuestion(q && q.question);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_QUESTIONS);
  }

  // Expose the selection helper so the existing lesson UI can use it without
  // changing the rest of the application architecture.
  window.selectLessonFormativeQuestions = uniqueQuestions;
})();
