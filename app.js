const card = document.getElementById("card");

// Progreso UI
const progressText = document.getElementById("progressText");
const progressPct = document.getElementById("progressPct");
const progressFill = document.getElementById("progressFill");

let state = {
  qIndex: 0,
  scores: {},
  dimensions: [],
  questions: [],
  profiles: []
};

function initScores(dims) {
  const s = {};
  dims.forEach(d => s[d] = 0);
  return s;
}

function updateProgress() {
  const total = state.questions.length || 0;

  // Si aún no hay preguntas cargadas
  if (!total) {
    progressText.textContent = "Cargando preguntas…";
    progressPct.textContent = "";
    progressFill.style.width = "0%";
    return;
  }

  const current = Math.min(state.qIndex + 1, total);
  const pct = Math.round(((state.qIndex) / total) * 100); // 0% antes de contestar la primera
  const pctClamped = Math.max(0, Math.min(100, pct));

  progressText.textContent = `Progreso: ${current} / ${total}`;
  progressPct.textContent = `${pctClamped}%`;
  progressFill.style.width = `${pctClamped}%`;
}

async function loadData() {
  try {
    const qRes = await fetch("questions.json", { cache: "no-store" });
    if (!qRes.ok) throw new Error(`No se pudo cargar questions.json (HTTP ${qRes.status})`);
    const qData = await qRes.json();

    const pRes = await fetch("profiles.json", { cache: "no-store" });
    if (!pRes.ok) throw new Error(`No se pudo cargar profiles.json (HTTP ${pRes.status})`);
    const pData = await pRes.json();

    state.dimensions = qData.dimensions || [];
    state.questions = qData.questions || [];
    state.profiles = pData.profiles || [];
    state.scores = initScores(state.dimensions);
    state.qIndex = 0;

    // Si no hay preguntas, avisar
    if (!state.questions.length) {
      card.innerHTML = `
        <h2>No hay preguntas cargadas</h2>
        <p class="muted">Revisa que <strong>questions.json</strong> tenga el campo <code>questions</code> con al menos una pregunta.</p>
      `;
      updateProgress();
      return;
    }

    updateProgress();
    renderQuestion();
  } catch (err) {
    console.error(err);
    card.innerHTML = `
      <h2>Ups… no se han podido cargar los datos</h2>
      <p class="muted">
        Revisa que <strong>questions.json</strong> y <strong>profiles.json</strong> estén en la misma carpeta que <strong>index.html</strong>.
      </p>
      <p class="muted">Detalle técnico: ${String(err.message || err)}</p>
      <div class="row">
        <button class="btn btn--primary" onclick="location.reload()">Reintentar</button>
      </div>
    `;
    updateProgress();
  }
}

function addScores(add) {
  if (!add) return;
  Object.entries(add).forEach(([k, v]) => {
    state.scores[k] = (state.scores[k] || 0) + v;
  });
}

function renderQuestion() {
  const q = state.questions[state.qIndex];

  // Actualiza progreso (antes de render)
  updateProgress();

  card.innerHTML = `
    <h2>${q.text}</h2>
    <div class="row" id="opts"></div>
    <p class="muted">Elige la opción que mejor te represente ahora mismo.</p>
  `;

  const opts = document.getElementById("opts");

  q.options.forEach(o => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = o.label;
    b.onclick = () => {
      addScores(o.add);
      state.qIndex++;
      if (state.qIndex < state.questions.length) renderQuestion();
      else renderResults();
    };
    opts.appendChild(b);
  });
}

function scoreProfile(p) {
  let total = 0;
  const pd = p.dims || {};
  Object.keys(state.scores).forEach(dim => {
    total += (state.scores[dim] || 0) * (pd[dim] || 0);
  });
  return total;
}

function renderResults() {
  // progreso al 100%
  progressText.textContent = `¡Completado!`;
  progressPct.textContent = `100%`;
  progressFill.style.width = `100%`;

  const ranked = state.profiles
    .map(p => ({ ...p, score: scoreProfile(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  card.innerHTML = `
    <h2>Tus perfiles recomendados</h2>
    <p class="muted">Aquí tienes tus mejores coincidencias. Puedes usarlas como punto de partida para explorar roles y caminos profesionales.</p>

    ${ranked.map(r => `
      <div class="result">
        <strong>${r.name}</strong><br>
        ${(r.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}
        <div class="muted">Afinidad: ${r.score}</div>
      </div>
    `).join("")}

    <div class="row" style="margin-top:16px">
      <button class="btn btn--primary" onclick="location.reload()">Reiniciar</button>
    </div>
  `;
}

loadData();
