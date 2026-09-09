(() => {
  'use strict';

  const STORAGE_KEY = 'daily.todoHabitApp.v1';
  const THEME_KEY = 'daily.theme';

  /** @typedef {{id:string, title:string, done:boolean, createdAt:number}} Todo */
  /** @typedef {{id:string, title:string, target:number, progressByDate:Object<string,number>, createdAt:number}} Habit */

  /** @type {{todos:Todo[], habits:Habit[]}} */
  let state = { todos: [], habits: [] };
  let activeTab = 'todos';
  let pendingType = 'todo'; // 'todo' | 'habit'
  let habitTarget = 1;

  // ---------- persistence ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.todos = Array.isArray(parsed.todos) ? parsed.todos : [];
        state.habits = Array.isArray(parsed.habits) ? parsed.habits : [];
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

  function todayKey(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ---------- DOM refs ----------
  const $ = (sel) => document.querySelector(sel);
  const todoList = $('#todo-list');
  const habitList = $('#habit-list');
  const todoEmpty = $('#todo-empty');
  const habitEmpty = $('#habit-empty');
  const todoCount = $('#todo-count');
  const habitCount = $('#habit-count');
  const ringFill = $('#ring-fill');
  const progressPercent = $('#progress-percent');
  const progressText = $('#progress-text');
  const streakText = $('#streak-text');
  const greeting = $('#greeting');
  const todayDateEl = $('#today-date');
  const themeToggle = $('#theme-toggle');
  const addBtn = $('#add-btn');
  const sheetBackdrop = $('#sheet-backdrop');
  const sheetTitle = $('#sheet-title');
  const itemInput = $('#item-input');
  const habitTargetRow = $('#habit-target-row');
  const targetValue = $('#target-value');
  const sheetCancel = $('#sheet-cancel');
  const sheetSave = $('#sheet-save');
  const tabBtns = document.querySelectorAll('.tab-btn');

  const RING_CIRCUMFERENCE = 2 * Math.PI * 42;

  // ---------- rendering ----------
  function render() {
    renderTodos();
    renderHabits();
    renderProgress();
    save();
  }

  function renderTodos() {
    todoList.innerHTML = '';
    todoCount.textContent = String(state.todos.filter(t => !t.done).length);
    todoEmpty.classList.toggle('visible', state.todos.length === 0);

    state.todos
      .slice()
      .sort((a, b) => (a.done === b.done ? b.createdAt - a.createdAt : a.done ? 1 : -1))
      .forEach(todo => {
        const li = document.createElement('li');
        li.className = 'item-card' + (todo.done ? ' done' : '');

        const check = document.createElement('button');
        check.className = 'check-circle' + (todo.done ? ' done' : '');
        check.setAttribute('aria-label', 'Toggle complete');
        check.textContent = todo.done ? '✓' : '';
        check.addEventListener('click', () => {
          todo.done = !todo.done;
          render();
        });

        const body = document.createElement('div');
        body.className = 'item-body';
        const title = document.createElement('div');
        title.className = 'item-title';
        title.textContent = todo.title;
        body.appendChild(title);

        const actions = document.createElement('div');
        actions.className = 'item-actions';
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', 'Delete');
        del.textContent = '✕';
        del.addEventListener('click', () => {
          state.todos = state.todos.filter(t => t.id !== todo.id);
          render();
        });
        actions.appendChild(del);

        li.appendChild(check);
        li.appendChild(body);
        li.appendChild(actions);
        todoList.appendChild(li);
      });
  }

  function renderHabits() {
    habitList.innerHTML = '';
    habitCount.textContent = String(state.habits.length);
    habitEmpty.classList.toggle('visible', state.habits.length === 0);
    const today = todayKey();

    state.habits
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach(habit => {
        const progress = habit.progressByDate[today] || 0;
        const isDone = progress >= habit.target;

        const li = document.createElement('li');
        li.className = 'item-card' + (isDone ? ' done' : '');

        const check = document.createElement('button');
        check.className = 'check-circle' + (isDone ? ' done' : '');
        check.setAttribute('aria-label', 'Log habit');
        check.textContent = isDone ? '✓' : '';
        check.addEventListener('click', () => {
          const current = habit.progressByDate[today] || 0;
          habit.progressByDate[today] = current >= habit.target ? 0 : current + 1;
          render();
        });

        const body = document.createElement('div');
        body.className = 'item-body';
        const title = document.createElement('div');
        title.className = 'item-title';
        title.textContent = habit.title;
        body.appendChild(title);

        const progWrap = document.createElement('div');
        progWrap.className = 'habit-progress';
        const dots = document.createElement('div');
        dots.className = 'habit-dots';
        for (let i = 0; i < habit.target; i++) {
          const dot = document.createElement('span');
          dot.className = 'habit-dot' + (i < progress ? ' filled' : '');
          dots.appendChild(dot);
        }
        const label = document.createElement('span');
        label.className = 'habit-count-label';
        label.textContent = `${Math.min(progress, habit.target)}/${habit.target}`;
        progWrap.appendChild(dots);
        progWrap.appendChild(label);
        body.appendChild(progWrap);

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const minus = document.createElement('button');
        minus.className = 'habit-step-btn';
        minus.textContent = '−';
        minus.setAttribute('aria-label', 'Decrease');
        minus.addEventListener('click', () => {
          const current = habit.progressByDate[today] || 0;
          habit.progressByDate[today] = Math.max(0, current - 1);
          render();
        });

        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', 'Delete');
        del.textContent = '✕';
        del.addEventListener('click', () => {
          state.habits = state.habits.filter(h => h.id !== habit.id);
          render();
        });

        actions.appendChild(minus);
        actions.appendChild(del);

        li.appendChild(check);
        li.appendChild(body);
        li.appendChild(actions);
        habitList.appendChild(li);
      });
  }

  function dayStats(dateKey, includeTodos) {
    let total = 0, done = 0;
    state.habits.forEach(h => {
      total += 1;
      const p = h.progressByDate[dateKey] || 0;
      if (p >= h.target) done += 1;
    });
    if (includeTodos) {
      total += state.todos.length;
      done += state.todos.filter(t => t.done).length;
    }
    return { total, done };
  }

  function computeStreak() {
    let streak = 0;
    let cursor = -1; // start from yesterday, walk backwards
    while (true) {
      const key = todayKey(cursor);
      const { total, done } = dayStats(key, false);
      if (total > 0 && done === total) {
        streak += 1;
        cursor -= 1;
      } else {
        break;
      }
    }
    const todayStats = dayStats(todayKey(), true);
    if (todayStats.total > 0 && todayStats.done === todayStats.total) {
      streak += 1;
    }
    return streak;
  }

  function renderProgress() {
    const { total, done } = dayStats(todayKey(), true);
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct / 100));
    progressPercent.textContent = `${pct}%`;
    progressText.textContent = total === 0
      ? 'No tasks yet today'
      : done === total
        ? 'All done — nice work! 🎉'
        : `${done} of ${total} complete`;

    const streak = computeStreak();
    streakText.textContent = `🔥 ${streak} day streak`;
  }

  function renderGreeting() {
    const hour = new Date().getHours();
    const msg = hour < 5 ? 'Still up? 🌙'
      : hour < 12 ? 'Good morning ☀️'
      : hour < 18 ? 'Good afternoon 👋'
      : 'Good evening 🌆';
    greeting.textContent = msg;
    todayDateEl.textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  }

  // ---------- tabs ----------
  function setTab(tab) {
    activeTab = tab;
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    $('#panel-todos').hidden = tab !== 'todos';
    $('#panel-habits').hidden = tab !== 'habits';
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });

  // ---------- add sheet ----------
  function openSheet() {
    pendingType = activeTab === 'habits' ? 'habit' : 'todo';
    sheetTitle.textContent = pendingType === 'habit' ? 'New Habit' : 'New To-Do';
    itemInput.placeholder = pendingType === 'habit' ? 'e.g. Drink water' : 'e.g. Reply to emails';
    habitTargetRow.hidden = pendingType !== 'habit';
    habitTarget = 1;
    targetValue.textContent = String(habitTarget);
    itemInput.value = '';
    sheetBackdrop.classList.add('open');
    setTimeout(() => itemInput.focus(), 250);
  }

  function closeSheet() {
    sheetBackdrop.classList.remove('open');
    itemInput.blur();
  }

  function commitSheet() {
    const title = itemInput.value.trim();
    if (!title) {
      itemInput.focus();
      return;
    }
    if (pendingType === 'habit') {
      state.habits.push({
        id: uid(),
        title,
        target: habitTarget,
        progressByDate: {},
        createdAt: Date.now()
      });
    } else {
      state.todos.push({
        id: uid(),
        title,
        done: false,
        createdAt: Date.now()
      });
    }
    closeSheet();
    render();
  }

  addBtn.addEventListener('click', openSheet);
  sheetCancel.addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', (e) => {
    if (e.target === sheetBackdrop) closeSheet();
  });
  sheetSave.addEventListener('click', commitSheet);
  itemInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commitSheet();
  });

  $('#target-minus').addEventListener('click', () => {
    habitTarget = Math.max(1, habitTarget - 1);
    targetValue.textContent = String(habitTarget);
  });
  $('#target-plus').addEventListener('click', () => {
    habitTarget = Math.min(10, habitTarget + 1);
    targetValue.textContent = String(habitTarget);
  });

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
    renderGreeting();
    setTab('todos');
    render();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
