(() => {
  'use strict';

  const STORAGE_KEY = 'ace.tennisTracker.v1';
  const THEME_KEY = 'ace.theme';
  const RATING_FILTER_KEY = 'ace.ratingFilter';

  /**
   * @typedef {{id:string, date:string, opponent:string, matchType:string, result:string, score:string, surface:string, club:string, notes:string, createdAt:number}} Match
   * @typedef {{id:string, date:string, ratingType:string, value:number, notes:string, createdAt:number}} RatingEntry
   * @typedef {{id:string, name:string, joinedDate:string, notes:string, createdAt:number}} Club
   * @typedef {{id:string, title:string, club:string, date:string, instructor:string, focus:string, notes:string, createdAt:number}} Clinic
   * @typedef {{id:string, date:string, category:string, rating:number|null, note:string, createdAt:number}} ProgressEntry
   */

  /** @type {{matches:Match[], ratings:RatingEntry[], clubs:Club[], clinics:Clinic[], progress:ProgressEntry[]}} */
  let state = { matches: [], ratings: [], clubs: [], clinics: [], progress: [] };

  let activeTab = 'overview';
  let ratingFilter = localStorage.getItem(RATING_FILTER_KEY) || 'NTRP';
  let pendingType = 'match';
  let fieldValues = {};

  const SKILL_CATEGORIES = ['Serve', 'Forehand', 'Backhand', 'Volleys', 'Footwork', 'Mental Game', 'Strategy', 'Fitness', 'Other'];

  const FORM_SCHEMAS = {
    match: {
      title: 'Log Match',
      collection: 'matches',
      fields: [
        { key: 'date', label: 'Date', type: 'date', default: () => todayISO() },
        { key: 'opponent', label: 'Opponent', type: 'text', placeholder: 'e.g. Alex Kim', required: true },
        { key: 'matchType', label: 'Type', type: 'segmented', options: ['Singles', 'Doubles'], default: 'Singles' },
        { key: 'result', label: 'Result', type: 'segmented', options: ['Win', 'Loss'], default: 'Win' },
        { key: 'score', label: 'Score', type: 'text', placeholder: 'e.g. 6-3, 4-6, 10-7' },
        { key: 'surface', label: 'Surface', type: 'select', options: ['Hard', 'Clay', 'Grass', 'Indoor'], default: 'Hard' },
        { key: 'club', label: 'Club / Location', type: 'text', placeholder: 'optional' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'optional' }
      ]
    },
    rating: {
      title: 'Log Rating',
      collection: 'ratings',
      fields: [
        { key: 'date', label: 'Date', type: 'date', default: () => todayISO() },
        { key: 'ratingType', label: 'System', type: 'segmented', options: ['NTRP', 'UTR', 'Custom'], default: () => ratingFilter },
        { key: 'value', label: 'Rating value', type: 'number', step: '0.1', placeholder: 'e.g. 3.5', required: true },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'optional' }
      ]
    },
    club: {
      title: 'Add Club',
      collection: 'clubs',
      fields: [
        { key: 'name', label: 'Club name', type: 'text', placeholder: 'e.g. Riverside Tennis Club', required: true },
        { key: 'joinedDate', label: 'Member since', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'optional' }
      ]
    },
    clinic: {
      title: 'Add Clinic / Lesson',
      collection: 'clinics',
      fields: [
        { key: 'title', label: 'Clinic / lesson name', type: 'text', placeholder: 'e.g. Saturday Cardio Clinic', required: true },
        { key: 'club', label: 'Club', type: 'text', placeholder: 'optional' },
        { key: 'date', label: 'Date', type: 'date', default: () => todayISO() },
        { key: 'instructor', label: 'Instructor', type: 'text', placeholder: 'optional' },
        { key: 'focus', label: 'Focus area', type: 'text', placeholder: 'e.g. Serve & Volley' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'optional' }
      ]
    },
    progress: {
      title: 'Add Journal Entry',
      collection: 'progress',
      fields: [
        { key: 'date', label: 'Date', type: 'date', default: () => todayISO() },
        { key: 'category', label: 'Category', type: 'select', options: SKILL_CATEGORIES, default: 'Serve' },
        { key: 'rating', label: 'Self-rating (optional)', type: 'stars', max: 5 },
        { key: 'note', label: 'What did you work on?', type: 'textarea', required: true, placeholder: 'e.g. Focused on racquet drop on serve toss' }
      ]
    }
  };

  // ---------- persistence ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.matches = Array.isArray(parsed.matches) ? parsed.matches : [];
        state.ratings = Array.isArray(parsed.ratings) ? parsed.ratings : [];
        state.clubs = Array.isArray(parsed.clubs) ? parsed.clubs : [];
        state.clinics = Array.isArray(parsed.clinics) ? parsed.clinics : [];
        state.progress = Array.isArray(parsed.progress) ? parsed.progress : [];
      }
    } catch (e) {
      console.warn('Failed to load saved data', e);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save data', e);
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ---------- DOM refs ----------
  const $ = (sel) => document.querySelector(sel);
  const todayDateEl = $('#today-date');
  const themeToggle = $('#theme-toggle');
  const tabBtns = document.querySelectorAll('.tab-btn');

  const RING_CIRCUMFERENCE = 2 * Math.PI * 42;

  // ---------- render dispatch ----------
  function render() {
    renderOverview();
    renderMatches();
    renderRating();
    renderTraining();
    renderProgress();
    save();
  }

  // ---------- Overview ----------
  function renderOverview() {
    const ratingEntries = state.ratings
      .filter(r => r.ratingType === ratingFilter)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    const latest = ratingEntries[ratingEntries.length - 1];
    const prev = ratingEntries[ratingEntries.length - 2];

    $('#rating-type-label').textContent = `${ratingFilter} Rating`;
    $('#hero-rating-value').textContent = latest ? latest.value.toFixed(1) : '—';

    const trendEl = $('#hero-rating-trend');
    if (!latest) {
      trendEl.textContent = 'No ratings logged yet';
    } else if (!prev) {
      trendEl.textContent = `Logged ${formatDate(latest.date)}`;
    } else {
      const diff = latest.value - prev.value;
      const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';
      trendEl.textContent = `${arrow} ${Math.abs(diff).toFixed(1)} since last entry`;
    }

    const wins = state.matches.filter(m => m.result === 'Win').length;
    const losses = state.matches.filter(m => m.result === 'Loss').length;
    const total = wins + losses;
    const winRate = total === 0 ? 0 : Math.round((wins / total) * 100);
    $('#ring-fill').style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - winRate / 100));
    $('#winrate-percent').textContent = `${winRate}%`;
    $('#record-text').textContent = `${wins}–${losses} record`;
    $('#matches-played-text').textContent = `${total} match${total === 1 ? '' : 'es'} played`;

    const activity = [];
    state.matches.forEach(m => activity.push({ date: m.date, icon: m.result === 'Win' ? '✓' : '✕', badgeClass: m.result === 'Win' ? 'win' : 'loss', title: `${m.result} vs ${m.opponent || 'Unknown'}`, sub: `${m.matchType}${m.score ? ' · ' + m.score : ''}`, createdAt: m.createdAt }));
    state.ratings.forEach(r => activity.push({ date: r.date, icon: '📈', badgeClass: 'icon', title: `${r.ratingType} rating logged: ${r.value}`, sub: r.notes || '', createdAt: r.createdAt }));
    state.clinics.forEach(c => activity.push({ date: c.date, icon: '🏟️', badgeClass: 'icon', title: c.title, sub: c.club || '', createdAt: c.createdAt }));
    state.progress.forEach(p => activity.push({ date: p.date, icon: '📝', badgeClass: 'icon', title: `${p.category} — journal entry`, sub: p.note, createdAt: p.createdAt }));

    activity.sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));
    const recent = activity.slice(0, 6);

    const list = $('#activity-list');
    list.innerHTML = '';
    $('#activity-empty').classList.toggle('visible', recent.length === 0);
    recent.forEach(item => {
      const li = document.createElement('li');
      li.className = 'item-card';
      li.innerHTML = `
        <div class="item-badge ${item.badgeClass}">${item.icon}</div>
        <div class="item-body">
          <div class="item-title">${escapeHtml(item.title)}</div>
          <div class="item-sub">${formatDate(item.date)}${item.sub ? ' · ' + escapeHtml(item.sub) : ''}</div>
        </div>
      `;
      list.appendChild(li);
    });
  }

  // ---------- Matches ----------
  function renderMatches() {
    const list = $('#match-list');
    list.innerHTML = '';
    $('#match-count').textContent = String(state.matches.length);
    $('#match-empty').classList.toggle('visible', state.matches.length === 0);

    const wins = state.matches.filter(m => m.result === 'Win').length;
    const losses = state.matches.filter(m => m.result === 'Loss').length;
    $('#match-record-sub').textContent = `${wins} win${wins === 1 ? '' : 's'} · ${losses} loss${losses === 1 ? '' : 'es'}`;

    state.matches
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      .forEach(match => {
        const li = document.createElement('li');
        li.className = 'item-card';
        const isWin = match.result === 'Win';
        li.innerHTML = `
          <div class="item-badge ${isWin ? 'win' : 'loss'}">${isWin ? 'W' : 'L'}</div>
          <div class="item-body">
            <div class="item-title">vs ${escapeHtml(match.opponent || 'Unknown')}</div>
            <div class="item-sub">${formatDate(match.date)} · ${escapeHtml(match.matchType)} · ${escapeHtml(match.surface)}${match.club ? ' · ' + escapeHtml(match.club) : ''}</div>
            ${match.score ? `<div class="item-sub">Score: ${escapeHtml(match.score)}</div>` : ''}
            ${match.notes ? `<div class="item-note">${escapeHtml(match.notes)}</div>` : ''}
          </div>
        `;
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', 'Delete match');
        del.textContent = '✕';
        del.addEventListener('click', () => {
          state.matches = state.matches.filter(m => m.id !== match.id);
          render();
        });
        li.appendChild(del);
        list.appendChild(li);
      });
  }

  // ---------- Rating ----------
  function renderRating() {
    document.querySelectorAll('#rating-type-filter .segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === ratingFilter);
    });

    const entries = state.ratings
      .filter(r => r.ratingType === ratingFilter)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    renderSparkline(entries);

    const list = $('#rating-list');
    list.innerHTML = '';
    $('#rating-empty').classList.toggle('visible', entries.length === 0);

    entries
      .slice()
      .reverse()
      .forEach(entry => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
          <div class="item-badge icon">📈</div>
          <div class="item-body">
            <div class="item-title">${entry.value.toFixed(1)} ${escapeHtml(entry.ratingType)}</div>
            <div class="item-sub">${formatDate(entry.date)}</div>
            ${entry.notes ? `<div class="item-note">${escapeHtml(entry.notes)}</div>` : ''}
          </div>
        `;
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', 'Delete rating entry');
        del.textContent = '✕';
        del.addEventListener('click', () => {
          state.ratings = state.ratings.filter(r => r.id !== entry.id);
          render();
        });
        li.appendChild(del);
        list.appendChild(li);
      });
  }

  function renderSparkline(entries) {
    const svg = $('#rating-sparkline');
    const emptyMsg = $('#rating-chart-empty');
    if (entries.length < 2) {
      svg.innerHTML = '';
      svg.style.display = 'none';
      emptyMsg.classList.add('visible');
      return;
    }
    svg.style.display = 'block';
    emptyMsg.classList.remove('visible');

    const width = 300, height = 100, padX = 10, padY = 14;
    const values = entries.map(e => e.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = entries.map((e, i) => {
      const x = padX + (i / (entries.length - 1)) * (width - padX * 2);
      const y = height - padY - ((e.value - min) / range) * (height - padY * 2);
      return [x, y];
    });

    const linePath = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
    const areaPath = `${linePath} L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`;

    const dots = points.map(p => `<circle class="dot" cx="${p[0]}" cy="${p[1]}" r="3"></circle>`).join('');

    svg.innerHTML = `
      <path class="area" d="${areaPath}"></path>
      <path class="line" d="${linePath}"></path>
      ${dots}
    `;
  }

  // ---------- Training (clubs + clinics) ----------
  function renderTraining() {
    const clubList = $('#club-list');
    clubList.innerHTML = '';
    $('#club-count').textContent = String(state.clubs.length);
    $('#club-empty').classList.toggle('visible', state.clubs.length === 0);

    state.clubs
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach(club => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
          <div class="item-badge icon">🏟️</div>
          <div class="item-body">
            <div class="item-title">${escapeHtml(club.name)}</div>
            ${club.joinedDate ? `<div class="item-sub">Member since ${formatDate(club.joinedDate)}</div>` : ''}
            ${club.notes ? `<div class="item-note">${escapeHtml(club.notes)}</div>` : ''}
          </div>
        `;
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', 'Delete club');
        del.textContent = '✕';
        del.addEventListener('click', () => {
          state.clubs = state.clubs.filter(c => c.id !== club.id);
          render();
        });
        li.appendChild(del);
        clubList.appendChild(li);
      });

    const clinicList = $('#clinic-list');
    clinicList.innerHTML = '';
    $('#clinic-count').textContent = String(state.clinics.length);
    $('#clinic-empty').classList.toggle('visible', state.clinics.length === 0);

    state.clinics
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      .forEach(clinic => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
          <div class="item-badge icon">🧑‍🏫</div>
          <div class="item-body">
            <div class="item-title">${escapeHtml(clinic.title)}</div>
            <div class="item-sub">${formatDate(clinic.date)}${clinic.club ? ' · ' + escapeHtml(clinic.club) : ''}${clinic.instructor ? ' · ' + escapeHtml(clinic.instructor) : ''}</div>
            ${clinic.focus ? `<div class="item-sub">Focus: ${escapeHtml(clinic.focus)}</div>` : ''}
            ${clinic.notes ? `<div class="item-note">${escapeHtml(clinic.notes)}</div>` : ''}
          </div>
        `;
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', 'Delete clinic');
        del.textContent = '✕';
        del.addEventListener('click', () => {
          state.clinics = state.clinics.filter(c => c.id !== clinic.id);
          render();
        });
        li.appendChild(del);
        clinicList.appendChild(li);
      });
  }

  // ---------- Progress ----------
  function renderProgress() {
    const latestByCategory = {};
    state.progress
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
      .forEach(p => {
        if (p.rating) latestByCategory[p.category] = p.rating;
      });

    const barsEl = $('#skills-bars');
    barsEl.innerHTML = '';
    const categories = Object.keys(latestByCategory);
    $('#skills-empty').classList.toggle('visible', categories.length === 0);
    categories.forEach(cat => {
      const rating = latestByCategory[cat];
      const row = document.createElement('div');
      row.className = 'skill-row';
      row.innerHTML = `
        <div class="skill-row-top"><span>${escapeHtml(cat)}</span><span>${rating}/5</span></div>
        <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${(rating / 5) * 100}%"></div></div>
      `;
      barsEl.appendChild(row);
    });

    const list = $('#progress-list');
    list.innerHTML = '';
    $('#progress-count').textContent = String(state.progress.length);
    $('#progress-empty').classList.toggle('visible', state.progress.length === 0);

    state.progress
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      .forEach(entry => {
        const li = document.createElement('li');
        li.className = 'item-card';
        const stars = entry.rating ? '★'.repeat(entry.rating) + '☆'.repeat(5 - entry.rating) : '';
        li.innerHTML = `
          <div class="item-badge icon">📝</div>
          <div class="item-body">
            <div class="item-title">${escapeHtml(entry.category)}</div>
            <div class="item-sub">${formatDate(entry.date)}</div>
            ${stars ? `<div class="item-stars">${stars}</div>` : ''}
            ${entry.note ? `<div class="item-note">${escapeHtml(entry.note)}</div>` : ''}
          </div>
        `;
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', 'Delete journal entry');
        del.textContent = '✕';
        del.addEventListener('click', () => {
          state.progress = state.progress.filter(p => p.id !== entry.id);
          render();
        });
        li.appendChild(del);
        list.appendChild(li);
      });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  }

  // ---------- tabs ----------
  function setTab(tab) {
    activeTab = tab;
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    ['overview', 'matches', 'rating', 'training', 'progress'].forEach(t => {
      $(`#panel-${t}`).hidden = t !== tab;
    });
  }

  tabBtns.forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));

  document.querySelectorAll('#rating-type-filter .segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ratingFilter = btn.dataset.value;
      localStorage.setItem(RATING_FILTER_KEY, ratingFilter);
      renderRating();
      renderOverview();
    });
  });

  // ---------- add sheet ----------
  const sheetBackdrop = $('#sheet-backdrop');
  const sheetTitle = $('#sheet-title');
  const sheetFields = $('#sheet-fields');
  const sheetCancel = $('#sheet-cancel');
  const sheetSave = $('#sheet-save');

  function openSheet(type) {
    pendingType = type;
    const schema = FORM_SCHEMAS[type];
    sheetTitle.textContent = schema.title;
    fieldValues = {};
    sheetFields.innerHTML = '';

    schema.fields.forEach(field => {
      const defaultVal = typeof field.default === 'function' ? field.default() : field.default;
      fieldValues[field.key] = defaultVal !== undefined ? defaultVal : (field.type === 'stars' ? 0 : '');
      sheetFields.appendChild(renderField(field));
    });

    sheetBackdrop.classList.add('open');
  }

  function closeSheet() {
    sheetBackdrop.classList.remove('open');
  }

  function renderField(field) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.textContent = field.label;
    wrap.appendChild(label);

    if (field.type === 'text' || field.type === 'number' || field.type === 'date') {
      const input = document.createElement('input');
      input.type = field.type;
      input.className = 'text-input';
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.step) input.step = field.step;
      input.value = fieldValues[field.key] || '';
      input.addEventListener('input', () => {
        fieldValues[field.key] = field.type === 'number' ? parseFloat(input.value) : input.value;
      });
      wrap.appendChild(input);
    } else if (field.type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.className = 'text-input';
      if (field.placeholder) textarea.placeholder = field.placeholder;
      textarea.value = fieldValues[field.key] || '';
      textarea.addEventListener('input', () => { fieldValues[field.key] = textarea.value; });
      wrap.appendChild(textarea);
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      select.className = 'select-input';
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (fieldValues[field.key] === opt) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener('change', () => { fieldValues[field.key] = select.value; });
      wrap.appendChild(select);
    } else if (field.type === 'segmented') {
      const row = document.createElement('div');
      row.className = 'field-segmented';
      field.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = opt;
        if (fieldValues[field.key] === opt) btn.classList.add('active');
        btn.addEventListener('click', () => {
          fieldValues[field.key] = opt;
          row.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    } else if (field.type === 'stars') {
      const row = document.createElement('div');
      row.className = 'star-picker';
      for (let i = 1; i <= field.max; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '★';
        if (i <= (fieldValues[field.key] || 0)) btn.classList.add('filled');
        btn.addEventListener('click', () => {
          fieldValues[field.key] = fieldValues[field.key] === i ? 0 : i;
          row.querySelectorAll('button').forEach((b, idx) => {
            b.classList.toggle('filled', idx < fieldValues[field.key]);
          });
        });
        row.appendChild(btn);
      }
      wrap.appendChild(row);
    }

    return wrap;
  }

  function commitSheet() {
    const schema = FORM_SCHEMAS[pendingType];
    for (const field of schema.fields) {
      if (field.required) {
        const val = fieldValues[field.key];
        if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
          return;
        }
      }
    }

    const entry = { id: uid(), createdAt: Date.now() };
    schema.fields.forEach(field => {
      let val = fieldValues[field.key];
      if (field.type === 'number' && (val === '' || val === undefined)) val = null;
      if (field.type === 'stars' && !val) val = null;
      entry[field.key] = val !== undefined ? val : '';
    });

    state[schema.collection].push(entry);
    closeSheet();
    render();
  }

  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => openSheet(btn.dataset.add));
  });
  $('#quick-log-rating').addEventListener('click', () => openSheet('rating'));

  sheetCancel.addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', (e) => { if (e.target === sheetBackdrop) closeSheet(); });
  sheetSave.addEventListener('click', commitSheet);

  // ---------- theme ----------
  function applyTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    themeToggle.textContent = currentIsDark() ? '☀️' : '🌙';
  }

  function currentIsDark() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  themeToggle.addEventListener('click', () => {
    const next = currentIsDark() ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  // ---------- init ----------
  function init() {
    load();
    applyTheme(localStorage.getItem(THEME_KEY));
    todayDateEl.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    setTab('overview');
    render();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
