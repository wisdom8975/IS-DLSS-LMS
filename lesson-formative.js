// Lesson formative assessment renderer.
// The renderer keeps the existing lesson assessment behavior and defensively
// removes duplicate question records before displaying them.

(function () {
  const MAX_QUESTIONS = 20;

  function normalizeQuestion(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function dedupeQuestions(questions) {
    const seen = new Set();
    return (Array.isArray(questions) ? questions : []).filter((q) => {
      const key = normalizeQuestion(q && q.question);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_QUESTIONS);
  }

  window.dedupeLessonFormativeQuestions = dedupeQuestions;
})();
