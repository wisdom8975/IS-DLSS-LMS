// Lesson formative assessment module.
// Duplicate prevention is handled at the data/query layer; this file remains
// responsible for the lesson assessment UI and interactions.

(function () {
  const MAX_FORMATIVE_QUESTIONS = 20;
  const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

  // This helper can be called by the existing renderer immediately before it
  // renders questions. It preserves order and caps the result at 20.
  window.filterFormativeQuestions = function filterFormativeQuestions(questions) {
    const seen = new Set();
    return (Array.isArray(questions) ? questions : []).filter((question) => {
      const key = normalize(question?.question);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_FORMATIVE_QUESTIONS);
  };
})();
