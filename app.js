const card = document.getElementById("card");

let state = {
  qIndex: 0,
  scores: {},
  dimensions: [],
  questions: [],
  profiles: [],
  started: false
};

function initScores(dims) {
  const s = {};
  dims.forEach(d => s[d] = 0);
  return s;
}

async function loadData() {
  try {
    const qRes = await fetch("questions.json");
    if (!qRes.ok) throw new Error("No se pudo cargar questions.json (revisa nombre/ruta).");
    const qData = await qRes.json();

    const pRes = await fetch("profiles.json");
    if (!pRes.ok) throw new Error("No se pudo cargar profiles.json (revisa nombre/ruta).");
    const pData = await pRes.json();

    state.dimensions = qData.dimensions || [];
    state.questions = qData.questions || [];
    state.profiles = pData.profiles || [];
    state.scores = initScores(state.dimensions);

    renderIntro();
  } catch (err) {
    console.error(err);
    card.innerHTML = `
      <h2>No se han podido cargar los datos del test</h2>
      <p class="muted">
        Revisa que <strong>questions.json</strong> y <strong>profiles.json</strong> estén en la misma carpeta que <strong>index.html</strong>,
        y que sus nombres coincidan exactamente.
      </p>
      <p class="muted">Detalle: ${err.message}</p>
    `;
  }
}

function addScores(add) {
  if (!add) return;
  Object.entries(add).forEach(([k, v]) => {
    state.scores[k] = (state.scores[k] || 0) + v;
  });
}

function renderProgress() {
  const total = state.questions.length;
  const current = Math.min(state.qIndex + 1, total);
  const pct = total > 0 ? Math.round((state.qIndex / total) * 100) : 0;

  return `
    <div class="progress-wrap">
      <div class="progress-label">Progreso: ${current} / ${total}</div>
      <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function renderIntro() {
  state.started = false;
  card.innerHTML = `
    <div class="intro-kicker">Blue-jobs · Orientación profesional</div>
    <h2>¿Lista/o para explorar tu camino en el sector marino?</h2>
    <p class="muted">
      Este test te ayuda a identificar perfiles profesionales alineados con tus preferencias y motivaciones.
    </p>
    <ul class="intro-list">
      <li>Duración aproximada: 3–6 minutos (según número de preguntas).</li>
      <li>Resultados: te mostraremos varios perfiles con mayor afinidad.</li>
      <li>Privacidad: no guardamos datos personales.</li>
    </ul>

    <div class="intro-actions">
      <button class="btn btn-primary" id="startBtn">Empezar</button>
      <button class="btn" id="seeHowBtn">¿Cómo funciona?</button>
    </div>
  `;

  document.getElementById("startBtn").onclick = () => {
    state.started = true;
    state.qIndex = 0;
    renderQuestion();
  };

  document.getElementById("seeHowBtn").onclick = () => {
    card.innerHTML = `
      <h2>¿Cómo funciona este test?</h2>
      <p class="muted">
        Cada respuesta suma puntos a diferentes áreas (datos, campo, laboratorio, gestión, etc.).
        Al final calculamos afinidad con distintos perfiles y te mostramos los que mejor encajan.
      </p>
      <div class="intro-actions">
        <button class="btn btn-primary" id="backStart">Volver</button>
      </div>
    `;
    document.getElementById("backStart").onclick = renderIntro;
  };
}

function renderQuestion() {
  const q = state.questions[state.qIndex];
  if (!q) {
    renderResults();
    return;
  }

  card.innerHTML = `
    ${renderProgress()}
    <h2>${q.text}</h2>
    <div class="row" id="opts"></div>
    <div class="row">
      ${state.qIndex > 0 ? `<button class="btn" id="backBtn">Atrás</button>` : ``}
    </div>
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

  // Botón atrás (simple: reinicia y re-calcula hasta índice anterior)
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.onclick = () => {
      // Para mantenerlo simple sin guardar historial de respuestas:
      // reiniciamos scores y recalculamos desde 0 hasta qIndex-1
      const targetIndex = state.qIndex - 1;
      const prevAnswers = collectAnswersUpTo(targetIndex);
      state.scores = initScores(state.dimensions);
      state.qIndex = 0;

      // Re-aplica respuestas previas y vuelve a la pregunta targetIndex
      prevAnswers.forEach(add => addScores(add));
      state.qIndex = targetIndex;
      renderQuestion();
    };
  }
}

/**
 * Guarda de forma mínima las respuestas "add" ya seleccionadas
 * (sin datos personales): lo almacenamos en sessionStorage para permitir "Atrás"
 */
function saveAnswer(addObj) {
  const arr = JSON.parse(sessionStorage.getItem("bj_answers") || "[]");
  arr.push(addObj || {});
  sessionStorage.setItem("bj_answers", JSON.stringify(arr));
}
function collectAnswersUpTo(idxInclusive) {
  const arr = JSON.parse(sessionStorage.getItem("bj_answers") || "[]");
  return arr.slice(0, idxInclusive + 1);
}

// Hook: guardamos respuesta al hacer click, sin tocar mucho tu estructura
const _addScoresOriginal = addScores;
addScores = function(add){
  saveAnswer(add);
  _addScoresOriginal(add);
};

function scoreProfile(p) {
  let total = 0;
  const dims = p.dims || {};
  Object.keys(state.scores).forEach(dim => {
    total += (state.scores[dim] || 0) * (dims[dim] || 0);
  });
  return total;
}

function renderResults() {
  // limpia respuestas guardadas
  sessionStorage.removeItem("bj_answers");

  const ranked = state.profiles
    .map(p => ({ ...p, score: scoreProfile(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  card.innerHTML = `
    <div class="progress-wrap">
      <div class="progress-label">Completado</div>
      <div class="progress-bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill" style="width:100%"></div>
      </div>
    </div>

    <h2>Tus resultados</h2>
    <p class="muted">Estos son los perfiles con mayor afinidad según tus respuestas.</p>

    ${ranked.map(r => `
      <div class="result">
        <strong>${r.name}</strong>
        ${(r.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}
        <div class="muted">Afinidad: ${r.score}</div>
      </div>
    `).join("")}

    <div class="row" style="margin-top:16px;">
      <button class="btn btn-primary" id="restart">Reiniciar</button>
      <button class="btn" id="backHome">Volver al inicio</button>
    </div>
  `;

  document.getElementById("restart").onclick = () => {
    // reinicia estado completo
    state.qIndex = 0;
    state.scores = initScores(state.dimensions);
    renderIntro();
  };
  document.getElementById("backHome").onclick = () => {
    state.qIndex = 0;
    state.scores = initScores(state.dimensions);
    renderIntro();
  };
}

loadData();
