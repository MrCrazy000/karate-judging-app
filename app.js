// Простое SPA для управления соревнованиями, категориями и дипломами
// Основные разделы: дэшборд судьи, просмотр соревнования, вью категории, дэшборд дипломщика

const navButtons = document.querySelectorAll('.nav-link');
const views = {
  judge: document.getElementById('judge-view'),
  competition: document.getElementById('competition-view'),
  category: document.getElementById('category-view'),
  diploma: document.getElementById('diploma-view'),
};

let competitions = [];
let currentCompetitionId = null;
let currentCategoryId = null;
let activeMatchId = null;
let lastMatchIndex = -1;

// Навигация между root-экранами (сайдбар)
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    navButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    showRootView(btn.dataset.target);
  });
});

const sidebar = document.getElementById('sidebar');
const hamburger = document.getElementById('hamburger');
hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

function showRootView(name) {
  Object.values(views).forEach((v) => v.classList.add('hidden'));
  if (name === 'judge') {
    views.judge.classList.remove('hidden');
    renderJudgeDashboard();
  }
  if (name === 'diploma') {
    views.diploma.classList.remove('hidden');
    renderDiplomaDashboard();
  }
  sidebar.classList.remove('open');
}

// Создание соревнования
const createCompetitionBtn = document.getElementById('create-competition');
createCompetitionBtn.addEventListener('click', () => {
  const name = document.getElementById('competition-name').value.trim();
  if (!name) {
    alert('Введите название соревнований');
    return;
  }
  competitions.push({
    id: crypto.randomUUID(),
    name,
    categories: [],
  });
  document.getElementById('competition-name').value = '';
  renderJudgeDashboard();
});

function renderJudgeDashboard() {
  const container = document.getElementById('competitions-list');
  container.innerHTML = '';
  if (competitions.length === 0) {
    container.innerHTML = '<p class="muted">Соревнований пока нет.</p>';
    return;
  }
  competitions.forEach((comp) => {
    const finishedCategories = comp.categories.filter((c) => areMatchesFinished(c.matches)).length;
    const card = document.createElement('div');
    card.className = 'card-item';
    card.innerHTML = `
      <h4>${comp.name}</h4>
      <p class="card-meta">Категорий: ${comp.categories.length}</p>
      ${comp.categories.length > 0 ? `<p class="card-meta">Завершено категорий: ${finishedCategories} / ${comp.categories.length}</p>` : ''}
      <div class="actions"><button class="btn primary">Открыть</button></div>
    `;
    card.querySelector('button').addEventListener('click', () => openCompetition(comp.id));
    container.appendChild(card);
  });
}

// Вью соревнования
const backToDashboardBtn = document.getElementById('back-to-dashboard');
backToDashboardBtn.addEventListener('click', () => showRootView('judge'));

document.getElementById('toggle-category-form').addEventListener('click', () => {
  document.getElementById('category-form-wrapper').classList.toggle('hidden');
});

document.getElementById('cancel-category').addEventListener('click', () => {
  document.getElementById('category-form-wrapper').classList.add('hidden');
  resetCategoryForm();
});

function resetCategoryForm() {
  document.getElementById('category-name').value = '';
  document.getElementById('category-type').value = 'round-robin';
  document.getElementById('category-participants').value = '';
}

function openCompetition(id) {
  currentCompetitionId = id;
  const comp = competitions.find((c) => c.id === id);
  if (!comp) return;
  Object.values(views).forEach((v) => v.classList.add('hidden'));
  views.competition.classList.remove('hidden');
  document.getElementById('competition-breadcrumb').textContent = `Соревнования / ${comp.name}`;
  renderCategories(comp);
}

// Создание категории
const createCategoryBtn = document.getElementById('create-category');
createCategoryBtn.addEventListener('click', () => {
  const comp = competitions.find((c) => c.id === currentCompetitionId);
  if (!comp) return;
  const name = document.getElementById('category-name').value.trim();
  const type = document.getElementById('category-type').value;
  const participantsRaw = document.getElementById('category-participants').value
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  if (!name) {
    alert('Введите название категории');
    return;
  }

  if (type === 'round-robin' && participantsRaw.length < 3) {
    alert('Для кругового турнира нужно минимум 3 участника');
    return;
  }
  if (type === 'olympic' && participantsRaw.length !== 4) {
    alert('Для олимпийской системы нужно ровно 4 участника');
    return;
  }

  const category = {
    id: crypto.randomUUID(),
    name,
    type,
    participants: participantsRaw,
    matches: generateMatches(type, participantsRaw),
    diplomasIssued: false,
  };
  comp.categories.push(category);
  resetCategoryForm();
  document.getElementById('category-form-wrapper').classList.add('hidden');
  renderCategories(comp);
});

function renderCategories(comp) {
  const container = document.getElementById('categories-list');
  container.innerHTML = '';
  if (comp.categories.length === 0) {
    container.innerHTML = '<p class="muted">Категории ещё не добавлены.</p>';
    return;
  }

  comp.categories.forEach((cat) => {
    const finished = areMatchesFinished(cat.matches);
    const row = document.createElement('div');
    row.className = 'list-row';
    const fights = cat.matches.length;
    const participantsCount = cat.participants.length;
    row.innerHTML = `
      <div>
        <h4>${cat.name}</h4>
        <p class="muted">Тип: ${cat.type === 'olympic' ? 'Олимпийская система' : 'Круговой (каждый с каждым)'}</p>
      </div>
      <div class="muted">Участников: ${participantsCount}</div>
      <div class="muted">Боев: ${fights}</div>
      <div>
        <p class="card-meta">Статус боёв: ${finished ? 'завершены' : 'в процессе'}</p>
        <p class="card-meta">Дипломы: ${cat.diplomasIssued ? 'выписаны' : 'ещё не выписаны'}</p>
      </div>
      <div class="actions"><button class="btn primary">Открыть</button></div>
    `;
    row.querySelector('button').addEventListener('click', () => openCategory(comp.id, cat.id));
    container.appendChild(row);
  });
}

// Вью категории
function openCategory(compId, categoryId) {
  currentCompetitionId = compId;
  currentCategoryId = categoryId;
  activeMatchId = null;
  lastMatchIndex = -1;
  const comp = competitions.find((c) => c.id === compId);
  const cat = comp?.categories.find((c) => c.id === categoryId);
  if (!cat) return;

  Object.values(views).forEach((v) => v.classList.add('hidden'));
  views.category.classList.remove('hidden');

  document.getElementById('category-breadcrumb').textContent = `Соревнования / ${comp.name} / ${cat.name}`;
  document.getElementById('category-title').textContent = cat.name;
  document.getElementById('category-system').textContent =
    cat.type === 'olympic' ? 'Олимпийская система (4 участника)' : 'Круговой турнир (каждый с каждым)';
  document.getElementById('category-participants-list').textContent = cat.participants.join(', ');
  renderMatchesTable(cat);
  updateResultsButton(cat);
  document.getElementById('results-panel').classList.add('hidden');
  document.getElementById('current-match-panel').classList.add('hidden');
}

function renderMatchesTable(cat) {
  const tbody = document.querySelector('#matches-table tbody');
  tbody.innerHTML = '';
  cat.matches.forEach((m, idx) => {
    const tr = document.createElement('tr');
    const score = m.winner ? `${m.score1 ?? 0} : ${m.score2 ?? 0}` : '—';
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${m.stage}</td>
      <td>${m.fighter1}</td>
      <td>${m.fighter2}</td>
      <td>${score}</td>
      <td>${m.winner ?? ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Генерация матчей (round robin или олимпийская система)
function generateMatches(type, participants) {
  if (type === 'round-robin') {
    const matches = [];
    for (let i = 0; i < participants.length; i += 1) {
      for (let j = i + 1; j < participants.length; j += 1) {
        matches.push({
          stage: 'Круговой этап',
          fighter1: participants[i],
          fighter2: participants[j],
          score1: null,
          score2: null,
          winner: null,
        });
      }
    }
    return shuffleMatchesAvoidingRepeats(matches).map((m, idx) => ({ ...m, id: idx + 1 }));
  }

  // Олимпийская схема для 4 участников
  const [p1, p2, p3, p4] = participants;
  const matches = [
    {
      id: 1,
      stage: '1/2 финала',
      fighter1: p1,
      fighter2: p2,
      score1: null,
      score2: null,
      winner: null,
    },
    {
      id: 2,
      stage: '1/2 финала',
      fighter1: p3,
      fighter2: p4,
      score1: null,
      score2: null,
      winner: null,
    },
    {
      id: 3,
      stage: 'Финал',
      fighter1: 'Победитель боя 1',
      fighter2: 'Победитель боя 2',
      score1: null,
      score2: null,
      winner: null,
    },
    {
      id: 4,
      stage: 'Бой за 3 место',
      fighter1: 'Проигравший боя 1',
      fighter2: 'Проигравший боя 2',
      score1: null,
      score2: null,
      winner: null,
    },
  ];
  return matches;
}

// Перемешивание с попыткой избежать подряд боёв с одним бойцом
function shuffleMatchesAvoidingRepeats(matches) {
  let best = matches;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const arr = [...matches];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (noBackToBack(arr)) {
      return arr;
    }
    best = arr;
  }
  return best;
}

function noBackToBack(arr) {
  for (let i = 0; i < arr.length - 1; i += 1) {
    const fightersA = [arr[i].fighter1, arr[i].fighter2];
    const fightersB = [arr[i + 1].fighter1, arr[i + 1].fighter2];
    if (fightersA.some((f) => fightersB.includes(f))) {
      return false;
    }
  }
  return true;
}

// Выбор следующего боя
const nextMatchBtn = document.getElementById('next-match');
nextMatchBtn.addEventListener('click', () => {
  const cat = getCurrentCategory();
  if (!cat) return;
  const start = lastMatchIndex + 1;
  let idx = cat.matches.findIndex((m, index) => index >= start && !m.winner);
  if (idx === -1) {
    idx = cat.matches.findIndex((m) => !m.winner);
  }
  if (idx === -1) {
    alert('Все бои уже проведены.');
    return;
  }
  openCurrentMatch(cat, idx);
});

function openCurrentMatch(cat, matchIndex) {
  const match = cat.matches[matchIndex];
  activeMatchId = match.id;
  lastMatchIndex = matchIndex;
  const panel = document.getElementById('current-match-panel');
  panel.classList.remove('hidden');
  document.getElementById('current-match-title').textContent = `Бой №${matchIndex + 1}`;
  document.getElementById('current-match-stage').textContent = match.stage;
  document.getElementById('current-match-fighters').textContent = `${match.fighter1} VS ${match.fighter2}`;
  document.getElementById('score1-label').textContent = `Очки: ${match.fighter1}`;
  document.getElementById('score2-label').textContent = `Очки: ${match.fighter2}`;
  document.getElementById('score1-input').value = '';
  document.getElementById('score2-input').value = '';

  const winnerSelect = document.getElementById('winner-select');
  winnerSelect.innerHTML = '';
  const option1 = document.createElement('option');
  option1.value = 'fighter1';
  option1.textContent = `Участник 1 — ${match.fighter1}`;
  const option2 = document.createElement('option');
  option2.value = 'fighter2';
  option2.textContent = `Участник 2 — ${match.fighter2}`;
  winnerSelect.appendChild(option1);
  winnerSelect.appendChild(option2);
}

const saveMatchBtn = document.getElementById('save-match');
saveMatchBtn.addEventListener('click', () => {
  const cat = getCurrentCategory();
  if (!cat) return;
  const matchIndex = cat.matches.findIndex((m) => m.id === activeMatchId);
  if (matchIndex === -1) return;

  const score1 = Number(document.getElementById('score1-input').value);
  const score2 = Number(document.getElementById('score2-input').value);
  const winnerChoice = document.getElementById('winner-select').value;

  if (Number.isNaN(score1) || Number.isNaN(score2)) {
    alert('Введите очки для обоих участников');
    return;
  }

  const match = cat.matches[matchIndex];
  const winnerName = winnerChoice === 'fighter1' ? match.fighter1 : match.fighter2;
  const loserName = winnerChoice === 'fighter1' ? match.fighter2 : match.fighter1;

  match.score1 = score1;
  match.score2 = score2;
  match.winner = winnerName;

  if (cat.type === 'olympic') {
    updateBracket(cat, matchIndex, winnerName, loserName);
  }

  renderMatchesTable(cat);
  document.getElementById('current-match-panel').classList.add('hidden');
  updateResultsButton(cat);
  renderDiplomaDashboard();
  renderCategories(competitions.find((c) => c.id === currentCompetitionId));
});

function updateBracket(cat, matchIndex, winnerName, loserName) {
  if (matchIndex === 0) {
    // Победитель боя 1 идёт в финал, проигравший — в бой за 3 место
    cat.matches[2].fighter1 = winnerName;
    cat.matches[3].fighter1 = loserName;
  }
  if (matchIndex === 1) {
    cat.matches[2].fighter2 = winnerName;
    cat.matches[3].fighter2 = loserName;
  }
}

function updateResultsButton(cat) {
  const finished = areMatchesFinished(cat.matches);
  document.getElementById('show-results').disabled = !finished;
}

function areMatchesFinished(matches) {
  return matches.length > 0 && matches.every((m) => Boolean(m.winner));
}

// Вычисление результатов
const resultsBtn = document.getElementById('show-results');
resultsBtn.addEventListener('click', () => {
  const cat = getCurrentCategory();
  if (!cat) return;
  if (!areMatchesFinished(cat.matches)) return;
  const stats = {};
  cat.participants.forEach((p) => {
    stats[p] = { wins: 0, fights: 0 };
  });

  cat.matches.forEach((m) => {
    const realFighters = [m.fighter1, m.fighter2];
    realFighters.forEach((f) => {
      if (stats[f]) stats[f].fights += 1;
    });
    if (stats[m.winner]) {
      stats[m.winner].wins += 1;
    }
  });

  const sorted = Object.entries(stats)
    .sort((a, b) => {
      if (b[1].wins === a[1].wins) return a[0].localeCompare(b[0]);
      return b[1].wins - a[1].wins;
    })
    .map(([name, data]) => ({ name, ...data }));

  const list = document.getElementById('results-list');
  list.innerHTML = '';
  sorted.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.name} — побед: ${item.wins}, боёв: ${item.fights}`;
    list.appendChild(li);
  });
  document.getElementById('results-panel').classList.remove('hidden');
});

// Дашборд дипломщика
function renderDiplomaDashboard() {
  const container = document.getElementById('diploma-cards');
  container.innerHTML = '';
  const completed = [];
  competitions.forEach((comp) => {
    comp.categories.forEach((cat) => {
      if (areMatchesFinished(cat.matches)) {
        completed.push({ compName: comp.name, cat });
      }
    });
  });

  if (completed.length === 0) {
    container.innerHTML = '<p class="muted">Завершённых категорий пока нет.</p>';
    return;
  }

  completed.forEach(({ compName, cat }) => {
    const card = document.createElement('div');
    card.className = 'card-item';
    const badgeClass = cat.diplomasIssued ? 'green' : 'red';
    const badgeText = cat.diplomasIssued ? 'Дипломы выписаны' : 'Дипломы ещё не выписаны';
    card.innerHTML = `
      <h4>${cat.name}</h4>
      <p class="card-meta">Соревнование: ${compName}</p>
      <p class="card-meta">Система: ${cat.type === 'olympic' ? 'Олимпийская' : 'Круговой'}</p>
      <p class="card-meta">Участников: ${cat.participants.length}</p>
      <span class="badge ${badgeClass}">${badgeText}</span>
      <div class="actions">
        <button class="btn ${cat.diplomasIssued ? 'ghost' : 'success'}" ${cat.diplomasIssued ? 'disabled' : ''}>
          ${cat.diplomasIssued ? 'Готово' : 'Дипломы выписаны'}
        </button>
      </div>
    `;
    card.querySelector('button').addEventListener('click', () => {
      cat.diplomasIssued = true;
      renderDiplomaDashboard();
      const comp = competitions.find((c) => c.id === currentCompetitionId);
      if (comp) renderCategories(comp);
    });
    container.appendChild(card);
  });
}

function getCurrentCategory() {
  const comp = competitions.find((c) => c.id === currentCompetitionId);
  return comp?.categories.find((c) => c.id === currentCategoryId);
}

// Инициализация
renderJudgeDashboard();
