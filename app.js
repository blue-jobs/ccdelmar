const card = document.getElementById("card");

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

async function loadData() {
  const qRes = await fetch("questions.json");
  const qData = await qRes.json();

  const pRes = await fetch("profiles.json");
  const pData = await pRes.json();

  state.dimensions = qData.dimensions;
  state.questions = qData.questions;
  state.profiles = pData.profiles;
  state.scores = initScores(state.dimensions);

  renderQuestion();
}

function addScores(add) {
  Object.entries(add).forEach(([k, v]) => {
    state.scores[k] = (state.scores[k] || 0) + v;
  });
}

function renderQuestion() {
  const q = state.questions[state.qIndex];
  card.innerHTML = `
    <h2>${q.text}</h2>
    <div class="row" id="opts"></div>
    <p class="muted">Pregunta ${state.qIndex + 1} de ${state.questions.length}</p>
  `;
  const opts = document.getElementById("opts");
  q.options.forEach(o => {
    const b = document.createElement("button");
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
  Object.keys(state.scores).forEach(dim => {
    total += (state.scores[dim] || 0) * (p.dims[dim] || 0);
  });
  return total;
}

function renderResults() {
  const ranked = state.profiles
    .map(p => ({ ...p, score: scoreProfile(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  card.innerHTML = `
    <h2>Resultados</h2>
    ${ranked.map(r => `
      <div class="result">
        <strong>${r.name}</strong><br>
        ${r.tags.map(t => `<span class="tag">${t}</span>`).join("")}
        <div class="muted">Afinidad: ${r.score}</div>
      </div>
    `).join("")}
    <button onclick="location.reload()">Reiniciar</button>
  `;
}

loadData();
