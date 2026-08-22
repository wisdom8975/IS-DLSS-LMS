/*
 * IS-DLSS Module Assessment Engine
 * Production-safe isolated assessment UI.
 * Contract: exactly 20 objective questions, four A-D choices, one question at a time,
 * server-authoritative scoring, local draft recovery, and post-submission feedback.
 */
(function () {
  'use strict';

  const VERSION = '20260822-module-assessment-v1';
  const TOTAL_QUESTIONS = 20;
  const OPTION_COUNT = 4;

  const state = {
    moduleId: null,
    courseId: null,
    questions: [],
    answers: {},
    index: 0,
    submitted: false,
    submissionId: null,
    container: null
  };

  function getClient() {
    return window.sb || null;
  }

  function getUser() {
    return window.currentUser || null;
  }

  function key(moduleId) {
    const user = getUser();
    return 'isdlss_module_assessment_v1:' + (user?.id || 'anonymous') + ':' + moduleId;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  function makeSubmissionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'web-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function readDraft() {
    try {
      return JSON.parse(localStorage.getItem(key(state.moduleId)) || 'null');
    } catch (_) {
      return null;
    }
  }

  function saveDraft() {
    try {
      localStorage.setItem(key(state.moduleId), JSON.stringify({
        moduleId: state.moduleId,
        answers: state.answers,
        index: state.index,
        savedAt: new Date().toISOString()
      }));
    } catch (_) {}
  }

  function clearDraft() {
    try { localStorage.removeItem(key(state.moduleId)); } catch (_) {}
  }

  function normalizeQuestions(rows) {
    if (!Array.isArray(rows)) return [];

    return rows.slice(0, TOTAL_QUESTIONS).map(function (q, position) {
      let options = q.options;
      if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch (_) { options = []; }
      }
      options = Array.isArray(options) ? options.map(String) : [];

      return {
        id: q.id,
        question: String(q.question || '').trim(),
        options: options.slice(0, OPTION_COUNT),
        points: Number(q.points || 1),
        position: Number(q.position || position + 1)
      };
    });
  }

  function validateQuestions(rows) {
    if (rows.length !== TOTAL_QUESTIONS) {
      throw new Error('This module must have exactly 20 published assessment questions. It currently has ' + rows.length + '.');
    }
    rows.forEach(function (q, i) {
      if (!q.id || !q.question) throw new Error('Assessment question ' + (i + 1) + ' is incomplete.');
      if (q.options.length !== OPTION_COUNT) throw new Error('Assessment question ' + (i + 1) + ' must have exactly four choices (A-D).');
      if (new Set(q.options.map(x => x.trim())).size !== OPTION_COUNT) throw new Error('Assessment question ' + (i + 1) + ' contains duplicate choices.');
    });
  }

  function shuffleOptions(options) {
    const copy = options.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function renderLoading(message) {
    if (state.container) state.container.innerHTML = '<div class="notice">' + escapeHtml(message) + '</div>';
  }

  function renderError(message) {
    if (state.container) state.container.innerHTML = '<div class="dangerbox"><b>Assessment unavailable.</b><br>' + escapeHtml(message) + '</div>';
  }

  function render() {
    const root = state.container;
    if (!root) return;

    if (state.submitted) return;

    const q = state.questions[state.index];
    if (!q) return;

    const answered = Object.prototype.hasOwnProperty.call(state.answers, q.id);
    const totalAnswered = Object.keys(state.answers).length;
    const percent = Math.round(((state.index + 1) / TOTAL_QUESTIONS) * 100);
    const letters = ['A', 'B', 'C', 'D'];

    root.innerHTML = `
      <section class="card" data-module-assessment="${escapeAttr(VERSION)}">
        <div class="kpi">
          <div>
            <span class="badge">MODULE FORMATIVE ASSESSMENT</span>
            <h3 style="margin:7px 0 3px">Question ${state.index + 1} of ${TOTAL_QUESTIONS}</h3>
            <div class="small muted">${totalAnswered} of ${TOTAL_QUESTIONS} answered</div>
          </div>
          <strong>${percent}%</strong>
        </div>
        <div class="progress" style="margin:12px 0 18px"><i style="width:${percent}%"></i></div>
        <p style="font-size:16px"><b>${escapeHtml(q.question)}</b></p>
        <div class="choices" role="radiogroup" aria-label="Answer choices">
          ${q.options.map(function (option, i) {
            const selected = answered && String(state.answers[q.id]) === String(option);
            return `<button type="button" class="choice ${selected ? 'selected' : ''}" data-option="${escapeAttr(option)}" aria-pressed="${selected ? 'true' : 'false'}">
              <b>${letters[i]}.</b> ${escapeHtml(option)}
            </button>`;
          }).join('')}
        </div>
        <div id="moduleAssessmentMessage" class="small muted" aria-live="polite"></div>
        <div class="actions" style="justify-content:space-between;margin-top:14px">
          <button type="button" class="btn alt" data-action="prev" ${state.index === 0 ? 'disabled' : ''}>← Previous</button>
          ${state.index < TOTAL_QUESTIONS - 1
            ? '<button type="button" class="btn" data-action="next">Next →</button>'
            : '<button type="button" class="btn" data-action="submit">Submit Assessment</button>'}
        </div>
        <div class="small muted" style="margin-top:10px">Your answers are saved on this device while you move between questions. Nothing is submitted until Question 20 is submitted.</div>
      </section>`;

    root.querySelectorAll('[data-option]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.answers[q.id] = button.dataset.option;
        saveDraft();
        render();
      });
    });

    const previous = root.querySelector('[data-action="prev"]');
    if (previous) previous.addEventListener('click', function () {
      state.index = Math.max(0, state.index - 1);
      saveDraft();
      render();
    });

    const next = root.querySelector('[data-action="next"]');
    if (next) next.addEventListener('click', function () {
      if (!answered) {
        const msg = root.querySelector('#moduleAssessmentMessage');
        if (msg) msg.innerHTML = '<span style="color:#9b1c1c">Please select A, B, C or D before continuing.</span>';
        return;
      }
      state.index = Math.min(TOTAL_QUESTIONS - 1, state.index + 1);
      saveDraft();
      render();
    });

    const submit = root.querySelector('[data-action="submit"]');
    if (submit) submit.addEventListener('click', submitAssessment);
  }

  async function fetchQuestions(moduleId) {
    const client = getClient();
    const user = getUser();
    if (!client || !user) throw new Error('Your secure learner session is not available. Please sign in again.');

    // Students receive questions through the protected RPC so correct answers are never sent to the browser.
    const { data, error } = await client.rpc('student_quiz_questions', { p_module_id: moduleId });
    if (error) throw error;
    const questions = normalizeQuestions(data);
    validateQuestions(questions);
    return questions.map(function (q) {
      return { ...q, options: shuffleOptions(q.options) };
    });
  }

  async function submitAssessment() {
    const root = state.container;
    const user = getUser();
    const client = getClient();
    if (!root || !user || !client) return;

    const unanswered = state.questions.filter(q => !Object.prototype.hasOwnProperty.call(state.answers, q.id));
    if (unanswered.length) {
      state.index = state.questions.indexOf(unanswered[0]);
      saveDraft();
      render();
      const msg = root.querySelector('#moduleAssessmentMessage');
      if (msg) msg.innerHTML = '<span style="color:#9b1c1c">Please answer all 20 questions. The first unanswered question is shown above.</span>';
      return;
    }

    const button = root.querySelector('[data-action="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Submitting…'; }

    const submissionId = makeSubmissionId();
    state.submissionId = submissionId;

    try {
      if (!navigator.onLine) {
        throw new Error('You are offline. Reconnect to the internet before submitting the assessment. Your 20 answers remain safely saved on this device.');
      }

      const payload = {
        module_id: state.moduleId,
        student_id: user.id,
        answers: state.answers,
        client_submission_id: submissionId
      };

      const { data, error } = await client
        .from('quiz_attempts')
        .insert(payload)
        .select('id,module_id,student_id,score,max_score,submitted_at,client_submission_id')
        .single();

      if (error) {
        const duplicate = error.code === '23505' || /duplicate|unique/i.test(error.message || '');
        if (duplicate) {
          const existing = await client.from('quiz_attempts')
            .select('id,module_id,student_id,score,max_score,submitted_at,client_submission_id')
            .eq('client_submission_id', submissionId)
            .maybeSingle();
          if (existing.error) throw existing.error;
          if (existing.data) {
            await showResult(existing.data, true);
            return;
          }
        }
        throw error;
      }

      clearDraft();
      state.submitted = true;
      await showResult(data, false);
    } catch (error) {
      if (button) { button.disabled = false; button.textContent = 'Submit Assessment'; }
      const message = error?.message || 'Unable to submit the assessment.';
      root.querySelector('#moduleAssessmentMessage').innerHTML = '<div class="dangerbox">' + escapeHtml(message) + '</div>';
    }
  }

  async function showResult(attempt, duplicate) {
    const client = getClient();
    const root = state.container;
    const percent = Number(attempt?.max_score) ? Math.round(100 * Number(attempt.score || 0) / Number(attempt.max_score)) : 0;
    let feedback = null;

    if (attempt?.id && client) {
      const response = await client.from('assessment_feedback')
        .select('feedback,strengths,improvement_area,action_plan,updated_at')
        .eq('attempt_id', attempt.id)
        .maybeSingle();
      feedback = response.data || null;
    }

    root.innerHTML = `
      <section class="card" data-module-assessment-result="${escapeAttr(VERSION)}">
        <span class="badge">ASSESSMENT SUBMITTED</span>
        <h3 style="margin-bottom:6px">${duplicate ? 'Your submission is already recorded.' : 'Assessment complete'}</h3>
        <div class="feedback ${percent >= 50 ? 'good' : 'bad'}">
          <b>Score: ${Number(attempt.score || 0)}/${Number(attempt.max_score || TOTAL_QUESTIONS)} (${percent}%)</b><br>
          ${percent >= 50 ? 'Good work. Your server-verified result has been recorded.' : 'Review the module content and use the feedback below to guide your next attempt.'}
        </div>
        ${feedback ? `
          <div class="card" style="margin-top:12px">
            <h4>Teacher feedback</h4>
            <p>${escapeHtml(feedback.feedback || '')}</p>
            ${feedback.strengths ? `<p><b>Strengths:</b> ${escapeHtml(feedback.strengths)}</p>` : ''}
            ${feedback.improvement_area ? `<p><b>Improvement area:</b> ${escapeHtml(feedback.improvement_area)}</p>` : ''}
            ${feedback.action_plan ? `<div class="notice"><b>Action plan:</b> ${escapeHtml(feedback.action_plan)}</div>` : ''}
          </div>` : '<div class="notice">Teacher feedback will appear here after your teacher reviews this assessment.</div>'}
        <div class="small muted" style="margin-top:12px">Submitted ${attempt?.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'now'}</div>
      </section>`;
  }

  async function mount(config) {
    const moduleId = config?.moduleId;
    const courseId = config?.courseId || null;
    const container = typeof config?.container === 'string' ? document.querySelector(config.container) : config?.container;

    if (!moduleId || !container) return false;

    state.moduleId = moduleId;
    state.courseId = courseId;
    state.container = container;
    state.questions = [];
    state.answers = {};
    state.index = 0;
    state.submitted = false;
    state.submissionId = null;

    renderLoading('Loading your 20-question assessment…');

    try {
      const draft = readDraft();
      state.questions = await fetchQuestions(moduleId);

      if (draft?.answers && typeof draft.answers === 'object') {
        state.answers = draft.answers;
        const draftIndex = Number(draft.index);
        state.index = Number.isInteger(draftIndex) ? Math.max(0, Math.min(TOTAL_QUESTIONS - 1, draftIndex)) : 0;
      }

      render();
      return true;
    } catch (error) {
      renderError(error?.message || 'Unable to load the module assessment.');
      return false;
    }
  }

  window.ModuleAssessment = { mount, version: VERSION, totalQuestions: TOTAL_QUESTIONS };

  // The current LMS calls openModule() directly. This observer lets the isolated engine
  // attach to a module assessment container without requiring a risky rewrite of index.html.
  function autoAttach() {
    const target = document.querySelector('[data-module-assessment-host]');
    if (!target || !window.__activeModuleId || !window.ModuleAssessment) return;
    if (target.dataset.assessmentMounted === VERSION) return;
    target.dataset.assessmentMounted = VERSION;
    mount({ moduleId: window.__activeModuleId, courseId: window.__activeCourseId, container: target });
  }

  const observer = new MutationObserver(autoAttach);
  function boot() {
    autoAttach();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
