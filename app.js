const card = document.getElementById("card");

let state = {
  qIndex: 0,
  questions: [],
  profiles: [],
  answersHard: {},  // { requires_diving: true/false, ... }
  history: []       // snapshots para "Back" real
};

async function loadData() {
  const qRes = await fetch("questions.json");
  const qData = await qRes.json();

  const pRes = await fetch("profiles.json");
  const pData = await pRes.json();

  state.questions = qData.questions || [];
  state.profiles = pData.profiles || [];

  renderIntro();
}

function renderIntro() {
  state.qIndex = 0;
  state.answersHard = {};
  state.history = [];

  card.innerHTML = `
    <h1 class="h1">Hard Filters Test (Prototype)</h1>
    <p class="lead">
      This version only tests the <strong>hard questions</strong>. At the end, you’ll see which profiles match your answers.
    </p>
    <div class="row">
      <button class="btn btn--primary" id="startBtn">Start</button>
    </div>
    <p class="muted" style="margin-top:12px;">
      Loaded: ${state.questions.length} questions · ${state.profiles.length} profiles
    </p>
  `;

  document.getElementById("startBtn").onclick = () => renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.qIndex];
  const total = state.questions.length;

  if (!q) {
    renderResults();
    return;
  }

  card.innerHTML = `
    <h2 class="h2">${q.text}</h2>

    <div class="options" id="opts"></div>

    <div class="progress">
      <div class="progress__top">
        <span class="progress__label">Progress</span>
        <span class="progress__label">${state.qIndex + 1} / ${total}</span>
      </div>
      <div class="progress__bar">
        <div class="progress__fill" style="width:${Math.round((state.qIndex / total) * 100)}%"></div>
      </div>
    </div>

    <div class="row">
      <button class="btn btn--ghost" id="backBtn" ${state.history.length === 0 ? "disabled" : ""}>Back</button>
      <button class="btn btn--ghost" id="restartBtn">Restart</button>
    </div>

    <p class="muted" style="margin-top:10px;">Hard answers captured: ${Object.keys(state.answersHard).length}</p>
  `;

  const opts = document.getElementById("opts");

  q.options.forEach(o => {
    const b = document.createElement("button");
    b.className = "btn option";
    b.textContent = o.label;

    b.onclick = () => {
      // 1) snapshot para back real (antes de aplicar cambios)
      state.history.push({
        qIndex: state.qIndex,
        answersHard: JSON.parse(JSON.stringify(state.answersHard))
      });

      // 2) aplicar hard mapping de esta opción
      if (o.hard) {
        Object.entries(o.hard).forEach(([k, v]) => {
          state.answersHard[k] = v;
        });
      }

      // 3) avanzar
      state.qIndex++;
      renderQuestion();
    };

    opts.appendChild(b);
  });

  document.getElementById("backBtn").onclick = () => {
    if (state.history.length === 0) return;
    const prev = state.history.pop();
    state.qIndex = prev.qIndex;
    state.answersHard = prev.answersHard;
    renderQuestion();
  };

  document.getElementById("restartBtn").onclick = () => renderIntro();
}

/**
 * Lógica hard:
 * - Si el perfil tiene hard[key] === true y el usuario respondió false → NO pasa
 * - Si el perfil tiene hard[key] === false y el usuario respondió true → NO pasa
 * - Si el perfil no define ese hard[key], NO filtramos (lo tratamos como "unknown/neutral")
 */
function passesHardFilters(profile) {
  const hard = profile.hard || {};

  for (const [key, userVal] of Object.entries(state.answersHard)) {
    if (!(key in hard)) continue; // si el perfil no lo tiene definido, no filtramos por ese criterio

    const profileVal = hard[key];

    if (profileVal === true && userVal === false) return false;
    if (profileVal === false && userVal === true) return false;
  }

  return true;
}

function renderResults() {
  const filtered = state.profiles.filter(p => passesHardFilters(p));

  // Orden simple: por nombre
  const ordered = filtered.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  card.innerHTML = `
    <h2 class="h2">Results (Hard Filters)</h2>

    <p class="lead">
      Matching profiles: <strong>${filtered.length}</strong> / ${state.profiles.length}
    </p>

    <div class="result">
      <strong>Your hard answers</strong>
      <div class="tags">
        ${Object.entries(state.answersHard).map(([k,v]) => `<span class="tag">${k}: ${v ? "Yes" : "No"}</span>`).join("")}
      </div>
    </div>

    <div class="result">
      <strong>Profiles that match</strong>
      <div class="muted" style="margin-top:6px;">
        Showing first ${Math.min(20, ordered.length)} (alphabetical)
      </div>
      ${ordered.slice(0, 20).map(p => `
        <div style="margin-top:10px;">
          <strong>${p.name}</strong><br>
          <span class="muted">${p.id}</span>
        </div>
      `).join("")}
    </div>

    <div class="row" style="margin-top:16px;">
      <button class="btn btn--primary" id="restartBtn2">Restart</button>
      <button class="btn btn--ghost" id="backToLastBtn" ${state.history.length === 0 ? "disabled" : ""}>Back to last question</button>
    </div>
  `;

  document.getElementById("restartBtn2").onclick = () => renderIntro();

  const backBtn = document.getElementById("backToLastBtn");
  if (backBtn) {
    backBtn.onclick = () => {
      if (state.history.length === 0) return;
      const prev = state.history.pop();
      state.qIndex = prev.qIndex;
      state.answersHard = prev.answersHard;
      renderQuestion();
    };
  }
}

loadData().catch(err => {
  console.error(err);
  card.innerHTML = `
    <h2 class="h2">Error</h2>
    <p class="lead">Could not load <code>questions.json</code> or <code>profiles.json</code>.</p>
    <p class="muted">Open DevTools → Console to see details.</p>
  `;
});