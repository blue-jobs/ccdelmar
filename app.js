const card = document.getElementById("card");

let state = {
  started: false,
  qIndex: 0,
  scores: {},
  dimensions: [],
  questions: [],
  profiles: [],
  answers: [] // guardamos { qIndex, add } para poder "Atrás" y revertir score
};

function initScores(dims) {
  const s = {};
  dims.forEach(d => s[d] = 0);
  return s;
}

async function loadData() {
  const qRes = await fetch("questions.json");
  const qData = await qRes.json();

  const pRes = await fetch("profiles.json");
  const pData = await pRes.json();

  state.dimensions = qData.dimensions;
  state.questions = qData.questions;
  state.profiles = pData.profiles;
  state.scores = initScores(state.dimensions);

  renderIntro();
}

function addScores(add) {
  Object.entries(add || {}).forEach(([k, v]) => {
    state.scores[k] = (state.scores[k] || 0) + v;
  });
}

function subtractScores(add) {
  Object.entries(add || {}).forEach(([k, v]) => {
    state.scores[k] = (state.scores[k] || 0) - v;
  });
}

function progressPercent() {
  const total = state.questions.length || 1;
  // Progreso "hasta la pregunta actual" (0% en la 1ª)
  return Math.round((state.qIndex / total) * 100);
}

function renderProgress() {
  const pct = progressPercent();
  const current = Math.min(state.qIndex + 1, state.questions.length);
  const total = state.questions.length;

  return `
    <div class="progress">
      <div class="progress__top">
        <span class="progress__label">Progreso</span>
        <span class="progress__label">${current}/${total}</span>
      </div>
      <div class="progress__bar" aria-label="Barra de progreso">
        <div class="progress__fill" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

/* ---------- Screens ---------- */

function renderIntro() {
  state.started = false;

  card.innerHTML = `
    <h1 class="h1">Descubre tu Perfil Profesional en Ciencias del Mar</h1>
    <p class="lead">
      Responde unas preguntas y explora los perfiles profesionales que mejor encajan contigo.
      Te mostraremos tus <strong>Top perfiles</strong> y por qué.
    </p>

    <div class="row">
      <button class="btn btn--primary" id="startBtn">Empezar</button>
    </div>

    <p class="muted" style="margin-top:12px;">
      ⏱️ Duración estimada: 3–6 min (según número de preguntas).
    </p>
  `;

  document.getElementById("startBtn").onclick = () => {
    state.started = true;
    state.qIndex = 0;
    state.answers = [];
    state.scores = initScores(state.dimensions);
    renderQuestion();
  };
}

function renderQuestion() {
  const q = state.questions[state.qIndex];

  if (!q) {
    renderResults();
    return;
  }

  const canGoBack = state.qIndex > 0;

  card.innerHTML = `
    ${renderProgress()}

    <h2 class="h2">${q.text}</h2>

    <div class="options" id="opts"></div>

    <div class="row" style="margin-top:16px;">
      <button class="btn btn--ghost" id="backBtn" ${canGoBack ? "" : "disabled"}>Atrás</button>
    </div>
  `;

  const opts = document.getElementById("opts");

  q.options.forEach(o => {
    const b = document.createElement("button");
    b.className = "btn option";
    b.type = "button";
    b.textContent = o.label;

    b.onclick = () => {
      // Guardamos la respuesta para poder volver atrás
      state.answers[state.qIndex] = { add: o.add || {} };

      // Sumamos puntuación y avanzamos
      addScores(o.add || {});
      state.qIndex++;

      if (state.qIndex < state.questions.length) renderQuestion();
      else renderResults();
    };

    opts.appendChild(b);
  });

  document.getElementById("backBtn").onclick = () => {
    if (state.qIndex <= 0) return;

    // Volvemos una pregunta
    state.qIndex--;

    // Revertimos el score de la respuesta que se había dado a esa pregunta
    const prev = state.answers[state.qIndex];
    if (prev && prev.add) subtractScores(prev.add);

    // “Borramos” esa respuesta para evitar inconsistencias si cambian
    state.answers[state.qIndex] = null;

    renderQuestion();
  };
}

function scoreProfile(p) {
  let total = 0;
  const dims = (p && p.dims) ? p.dims : {};
  Object.keys(state.scores).forEach(dim => {
    total += (state.scores[dim] || 0) * (dims[dim] || 0);
  });
  return total;
}

function renderResults() {
  const ranked = state.profiles
    .map(p => ({ ...p, score: scoreProfile(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  card.innerHTML = `
    <div class="progress">
      <div class="progress__top">
        <span class="progress__label">Completado</span>
        <span class="progress__label">100%</span>
      </div>
      <div class="progress__bar">
        <div class="progress__fill" style="width:100%"></div>
      </div>
    </div>

    <h2 class="h2">Tus resultados</h2>
    <p class="muted">Aquí tienes los perfiles que mejor encajan contigo según tus respuestas.</p>

    ${ranked.map(r => `
      <div class="result">
        <strong>${r.name}</strong>
        <div class="tags">
          ${(r.tags || []).slice(0, 10).map(t => `<span class="tag">${t}</span>`).join("")}
        </div>
        <div class="muted" style="margin-top:8px;">Afinidad: ${r.score}</div>
      </div>
    `).join("")}

    <div class="row" style="margin-top:16px;">
      <button class="btn" id="restartBtn">Reiniciar</button>
    </div>
  `;

  document.getElementById("restartBtn").onclick = () => {
    renderIntro();
  };
}

loadData().catch(err => {
  console.error(err);
  card.innerHTML = `<p class="muted">Error cargando preguntas/perfiles. Revisa que questions.json y profiles.json estén en la raíz.</p>`;
});
