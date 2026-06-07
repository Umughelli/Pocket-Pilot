import { formatCurrency, formatDateShort, formatTime, formatDateFull, toDateStr, formatPeriodLabel, getPeriodPresets } from './format.js';
import { CATEGORIES } from './services.js';

/* ───────── helpers ───────── */

function categoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ───────── Toast ───────── */

export function showToast(message, type = 'success', action = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
    ${action ? `<button class="toast-action">${escapeHtml(action.label)}</button>` : ''}
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));

  if (action && action.callback) {
    toast.querySelector('.toast-action').addEventListener('click', () => {
      action.callback();
      dismiss(toast);
    });
  }

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  if (type !== 'error') {
    const timerId = setTimeout(() => dismiss(toast), action ? 5000 : 3500);
    toast.dataset.timerId = timerId;
  }

  function dismiss(el) {
    el.classList.remove('toast-visible');
    el.addEventListener('transitionend', () => {
      if (el.dataset.timerId) clearTimeout(Number(el.dataset.timerId));
      el.remove();
    }, { once: true });
  }
}

/* ───────── Modal ───────── */

let activeModal = null;
let previousFocus = null;

function getFocusable(el) {
  return el.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
}

function trapFocus(e, modal) {
  if (e.key !== 'Tab') return;
  const focusable = getFocusable(modal);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function cleanupModal(modal, overlay, onClose) {
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
  if (onClose) onClose();
  if (previousFocus) {
    previousFocus.focus();
    previousFocus = null;
  }
}

export function openModal({ title, content, onClose }) {
  closeModal();

  previousFocus = document.activeElement;

  const overlay = document.getElementById('modal-overlay');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', title);

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${escapeHtml(title)}</h2>
      <button class="modal-close" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body"></div>
  `;

  const body = modal.querySelector('.modal-body');
  if (typeof content === 'function') {
    body.appendChild(content());
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  } else if (typeof content === 'string') {
    body.innerHTML = content;
  }

  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.addEventListener('click', closeModal);

  overlay.appendChild(modal);
  overlay.classList.remove('hidden');
  overlay.classList.add('overlay-visible');

  requestAnimationFrame(() => {
    modal.classList.add('modal-visible');
    const first = getFocusable(modal)[0];
    if (first) first.focus();
  });

  const keyHandler = (e) => {
    if (e.key === 'Escape') closeModal();
    trapFocus(e, modal);
  };
  document.addEventListener('keydown', keyHandler);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  activeModal = { modal, overlay, onClose, keyHandler };
  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  if (!activeModal) return;
  const { modal, overlay, onClose, keyHandler } = activeModal;
  modal.classList.remove('modal-visible');
  overlay.classList.remove('overlay-visible');
  document.removeEventListener('keydown', keyHandler);
  document.body.style.overflow = '';
  activeModal = null;

  modal.addEventListener('transitionend', () => {
    cleanupModal(modal, overlay, onClose);
  }, { once: true });

  setTimeout(() => {
    if (overlay && !overlay.classList.contains('hidden')) {
      cleanupModal(modal, overlay, onClose);
    }
  }, 350);
}

/* ───────── Summary Cards ───────── */

export function renderSummaryCards(stats) {
  const cards = document.createElement('div');
  cards.className = 'summary-grid';

  const items = [
    { label: 'Total Transactions', value: String(stats.totalCount), color: 'var(--info)', icon: '📊' },
    { label: 'Total Amount Spent', value: formatCurrency(stats.totalAmount), color: 'var(--danger)', icon: '💰' },
    { label: 'Average Expense', value: stats.totalCount > 0 ? formatCurrency(stats.avgAmount) : '—', color: 'var(--warning)', icon: '📈' },
    { label: 'Top Category', value: stats.topCategory || '—', color: 'var(--success)', icon: '🏷' }
  ];

  items.forEach(({ label, value, color, icon }, i) => {
    const card = document.createElement('article');
    card.className = 'summary-card';
    card.style.setProperty('--accent', color);
    card.style.animationDelay = `${i * 80}ms`;
    card.innerHTML = `
      <div class="summary-card-icon" aria-hidden="true">${icon}</div>
      <div class="summary-card-body">
        <p class="summary-card-label">${escapeHtml(label)}</p>
        <p class="summary-card-value">${value}</p>
      </div>
    `;
    cards.appendChild(card);
  });

  return cards;
}

/* ───────── Search Highlight ───────── */

export function highlightText(text, query) {
  if (!query || !query.trim()) return escapeHtml(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${q})`, 'gi'));
  return parts.map(p => p.toLowerCase() === query.toLowerCase()
    ? `<mark class="search-highlight">${escapeHtml(p)}</mark>`
    : escapeHtml(p)
  ).join('');
}

/* ───────── Expense List ───────── */

export function renderExpenseList(expenses, callbacks = {}) {
  const container = document.createElement('div');
  container.className = 'expense-list';
  const searchQuery = callbacks.searchQuery || '';

  if (expenses.length === 0) {
    container.appendChild(createEmptyState('No expenses found', 'Add an expense to start tracking your spending.'));
    return container;
  }

  const list = document.createElement('div');
  list.className = 'expense-items';
  list.setAttribute('role', 'list');

  expenses.forEach((expense, i) => {
    const cat = categoryById(expense.category);
    const item = document.createElement('div');
    item.className = 'expense-item';
    item.setAttribute('role', 'listitem');
    item.dataset.id = expense.id;
    item.style.animationDelay = `${i * 40}ms`;

    item.innerHTML = `
      <div class="expense-item-left">
        <span class="expense-cat-dot" style="--cat-color: ${cat.color}" aria-hidden="true"></span>
        <div class="expense-item-info">
          <p class="expense-item-name">${highlightText(expense.name, searchQuery)}</p>
          <p class="expense-item-meta">
            <span>${formatDateShort(expense.date)}</span>
            ${expense.time ? `<span>${formatTime(expense.time)}</span>` : ''}
            <span class="expense-item-cat">${escapeHtml(cat.name)}</span>
          </p>
        </div>
      </div>
      <div class="expense-item-right">
        <span class="expense-item-amount">${formatCurrency(expense.amount)}</span>
        <button class="btn-icon expense-delete" aria-label="Delete ${escapeHtml(expense.name)}" data-action="delete">&times;</button>
      </div>
    `;

    list.appendChild(item);
  });

  list.addEventListener('click', (e) => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.closest('.expense-delete')) {
      if (callbacks.onDelete) callbacks.onDelete(id);
    } else {
      if (callbacks.onEdit) callbacks.onEdit(id);
    }
  });

  container.appendChild(list);
  return container;
}

/* ───────── Expense Form ───────── */

export function createExpenseForm(existingExpense = null) {
  const isEdit = existingExpense !== null;
  const form = document.createElement('form');
  form.className = 'expense-form';
  form.setAttribute('novalidate', '');

  form.innerHTML = `
    <div class="form-group">
      <label for="expense-name">Expense Name</label>
      <input type="text" id="expense-name" name="name" required placeholder="e.g., Grocery run"
        value="${isEdit ? escapeHtml(existingExpense.name) : ''}" autocomplete="off"
        aria-describedby="name-error">
      <p class="form-error" id="name-error" role="alert"></p>
    </div>

    <div class="form-group">
      <label for="expense-amount">Amount (₦)</label>
      <div class="input-wrapper">
        <span class="input-prefix" aria-hidden="true">₦</span>
        <input type="number" id="expense-amount" name="amount" required min="0.01" step="0.01"
          placeholder="0.00" value="${isEdit ? existingExpense.amount : ''}"
          aria-describedby="amount-error">
      </div>
      <p class="form-error" id="amount-error" role="alert"></p>
    </div>

    <div class="form-group">
      <label for="expense-category">Category</label>
      <select id="expense-category" name="category" required aria-describedby="category-error">
        <option value="">Select category</option>
        ${CATEGORIES.map(c => `
          <option value="${c.id}" ${isEdit && existingExpense.category === c.id ? 'selected' : ''}>${c.name}</option>
        `).join('')}
      </select>
      <p class="form-error" id="category-error" role="alert"></p>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="expense-date">Date</label>
        <input type="date" id="expense-date" name="date" required
          value="${isEdit ? existingExpense.date : todayStr()}" aria-describedby="date-error">
        <p class="form-error" id="date-error" role="alert"></p>
      </div>
      <div class="form-group">
        <label for="expense-time">Time (optional)</label>
        <input type="time" id="expense-time" name="time"
          value="${isEdit && existingExpense.time ? existingExpense.time : nowStr()}">
      </div>
    </div>

    <div class="form-actions">
      ${isEdit ? '<button type="button" class="btn btn-ghost btn-danger" id="form-delete-btn">Delete Expense</button>' : ''}
      <div class="form-actions-right">
        <button type="button" class="btn btn-secondary" id="form-cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Update Expense' : 'Add Expense'}</button>
      </div>
    </div>
  `;

  const errorEls = {
    name: form.querySelector('#name-error'),
    amount: form.querySelector('#amount-error'),
    category: form.querySelector('#category-error'),
    date: form.querySelector('#date-error')
  };

  const inputs = {
    name: form.querySelector('#expense-name'),
    amount: form.querySelector('#expense-amount'),
    category: form.querySelector('#expense-category'),
    date: form.querySelector('#expense-date'),
    time: form.querySelector('#expense-time')
  };

  function validate() {
    let valid = true;
    Object.keys(errorEls).forEach(k => { errorEls[k].textContent = ''; });

    if (!inputs.name.value.trim()) {
      errorEls.name.textContent = 'Please enter an expense name.';
      valid = false;
    }

    const amount = Number(inputs.amount.value);
    if (!inputs.amount.value || isNaN(amount) || amount <= 0) {
      errorEls.amount.textContent = 'Please enter a valid amount greater than 0.';
      valid = false;
    }

    if (!inputs.category.value) {
      errorEls.category.textContent = 'Please select a category.';
      valid = false;
    }

    if (!inputs.date.value) {
      errorEls.date.textContent = 'Please select a date.';
      valid = false;
    }

    return valid;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      name: inputs.name.value.trim(),
      amount: Number(inputs.amount.value),
      category: inputs.category.value,
      date: inputs.date.value,
      time: inputs.time.value
    };

    const submitEvent = new CustomEvent('form-save', { detail: data });
    form.dispatchEvent(submitEvent);
  });

  form.querySelector('#form-cancel-btn').addEventListener('click', () => {
    form.dispatchEvent(new CustomEvent('form-cancel'));
  });

  const deleteBtn = form.querySelector('#form-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      form.dispatchEvent(new CustomEvent('form-delete'));
    });
  }

  return form;
}

/* ───────── Confirm Dialog ───────── */

export function createConfirmDialog(message, confirmText, onConfirm) {
  const content = document.createElement('div');
  content.className = 'confirm-delete';
  content.innerHTML = `
    <p>${escapeHtml(message)}</p>
    <p class="confirm-delete-hint">This action cannot be undone.</p>
    <div class="form-actions" style="margin-top: 1.5rem;">
      <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
      <button class="btn btn-danger" id="confirm-delete-btn">${escapeHtml(confirmText)}</button>
    </div>
  `;
  content.querySelector('#confirm-cancel').addEventListener('click', closeModal);
  content.querySelector('#confirm-delete-btn').addEventListener('click', () => {
    onConfirm();
    closeModal();
  });
  return content;
}

/* ───────── Empty State ───────── */

export function createEmptyState(title, message, actionText = null, actionFn = null) {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML = `
    <div class="empty-state-icon" aria-hidden="true">📭</div>
    <h3 class="empty-state-title">${escapeHtml(title)}</h3>
    <p class="empty-state-desc">${escapeHtml(message)}</p>
    ${actionText ? `<button class="btn btn-primary empty-state-action">${escapeHtml(actionText)}</button>` : ''}
  `;

  if (actionText && actionFn) {
    el.querySelector('.empty-state-action').addEventListener('click', actionFn);
  }

  return el;
}

/* ───────── Charts ───────── */

export function renderCategoryPieChart(expenses) {
  const container = document.createElement('div');
  container.className = 'chart-container';

  if (expenses.length === 0) {
    const empty = createEmptyState('No data yet', 'Add expenses to see your spending breakdown.');
    empty.classList.add('chart-empty');
    container.appendChild(empty);
    return container;
  }

  const grouped = {};
  let total = 0;
  expenses.forEach(e => {
    const cat = e.category || 'others';
    grouped[cat] = (grouped[cat] || 0) + e.amount;
    total += e.amount;
  });

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  const chartWrapper = document.createElement('div');
  chartWrapper.className = 'chart-wrapper';

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const innerR = 55;

  let svgPaths = '';
  let startAngle = -90;

  if (entries.length === 1) {
    const [catId] = entries[0];
    const cat = categoryById(catId);
    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outer.setAttribute('cx', cx);
    outer.setAttribute('cy', cy);
    outer.setAttribute('r', r);
    outer.setAttribute('fill', cat.color);
    outer.setAttribute('stroke', 'var(--card-bg)');
    outer.setAttribute('stroke-width', '2');
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${cat.name}: ${formatCurrency(total)} (100.0%)`;
    outer.appendChild(title);
    svgPaths += outer.outerHTML;

    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('cx', cx);
    inner.setAttribute('cy', cy);
    inner.setAttribute('r', innerR);
    inner.setAttribute('fill', 'var(--card-bg)');
    svgPaths += inner.outerHTML;
  } else {
    entries.forEach(([catId, amount]) => {
      const cat = categoryById(catId);
      const sliceAngle = (amount / total) * 360;
      const endAngle = startAngle + sliceAngle;

      const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
      const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
      const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
      const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
      const largeArc = sliceAngle > 180 ? 1 : 0;

      const xi1 = cx + innerR * Math.cos((endAngle * Math.PI) / 180);
      const yi1 = cy + innerR * Math.sin((endAngle * Math.PI) / 180);
      const xi2 = cx + innerR * Math.cos((startAngle * Math.PI) / 180);
      const yi2 = cy + innerR * Math.sin((startAngle * Math.PI) / 180);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${xi1} ${yi1}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi2} ${yi2}`,
        'Z'
      ].join(' ');

      path.setAttribute('d', d);
      path.setAttribute('fill', cat.color);
      path.setAttribute('stroke', 'var(--card-bg)');
      path.setAttribute('stroke-width', '2');

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${cat.name}: ${formatCurrency(amount)} (${((amount / total) * 100).toFixed(1)}%)`;
      path.appendChild(title);

      svgPaths += path.outerHTML;
      startAngle = endAngle;
    });
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-label', 'Expense breakdown by category');
  svg.innerHTML = svgPaths;

  const centerTextGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const totalText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  totalText.setAttribute('x', cx);
  totalText.setAttribute('y', cy - 8);
  totalText.setAttribute('text-anchor', 'middle');
  totalText.setAttribute('fill', 'var(--text-primary)');
  totalText.setAttribute('font-size', '18');
  totalText.setAttribute('font-weight', '700');
  totalText.setAttribute('font-family', "'JetBrains Mono', monospace");
  totalText.textContent = formatCurrency(total);
  centerTextGroup.appendChild(totalText);

  const totalLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  totalLabel.setAttribute('x', cx);
  totalLabel.setAttribute('y', cy + 16);
  totalLabel.setAttribute('text-anchor', 'middle');
  totalLabel.setAttribute('fill', 'var(--text-secondary)');
  totalLabel.setAttribute('font-size', '11');
  totalLabel.textContent = 'Total';
  centerTextGroup.appendChild(totalLabel);

  svg.appendChild(centerTextGroup);
  chartWrapper.appendChild(svg);

  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  entries.forEach(([catId, amount]) => {
    const cat = categoryById(catId);
    const pct = ((amount / total) * 100).toFixed(1);
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-dot" style="--cat-color: ${cat.color}" aria-hidden="true"></span>
      <span class="legend-label">${cat.name}</span>
      <span class="legend-value">${formatCurrency(amount)}</span>
      <span class="legend-pct">${pct}%</span>
    `;
    legend.appendChild(item);
  });

  chartWrapper.appendChild(legend);
  container.appendChild(chartWrapper);
  return container;
}

/* ───────── Filter Bar ───────── */

export function createFilterBar(filters, callbacks = {}) {
  const bar = document.createElement('div');
  bar.className = 'filter-bar';

  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'search-wrapper';
  searchWrapper.innerHTML = `
    <span class="search-icon" aria-hidden="true">🔍</span>
    <input type="search" id="search-input" class="search-input" placeholder="Search expenses..."
      value="${escapeHtml(filters.search)}" autocomplete="off">
  `;

  const searchInput = searchWrapper.querySelector('#search-input');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (callbacks.onSearch) callbacks.onSearch(searchInput.value);
    }, 300);
  });

  const catWrapper = document.createElement('div');
  catWrapper.className = 'select-wrapper';
  catWrapper.innerHTML = `
    <select id="category-filter" class="filter-select" aria-label="Filter by category">
      <option value="">All Categories</option>
      ${CATEGORIES.map(c => `<option value="${c.id}" ${filters.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
    </select>
  `;

  catWrapper.querySelector('#category-filter').addEventListener('change', (e) => {
    if (callbacks.onCategoryFilter) callbacks.onCategoryFilter(e.target.value);
  });

  const sortWrapper = document.createElement('div');
  sortWrapper.className = 'select-wrapper';
  sortWrapper.innerHTML = `
    <select id="sort-select" class="filter-select" aria-label="Sort by">
      <option value="newest" ${filters.sort === 'newest' ? 'selected' : ''}>Newest First</option>
      <option value="oldest" ${filters.sort === 'oldest' ? 'selected' : ''}>Oldest First</option>
      <option value="highest" ${filters.sort === 'highest' ? 'selected' : ''}>Highest Amount</option>
      <option value="lowest" ${filters.sort === 'lowest' ? 'selected' : ''}>Lowest Amount</option>
    </select>
  `;

  sortWrapper.querySelector('#sort-select').addEventListener('change', (e) => {
    if (callbacks.onSort) callbacks.onSort(e.target.value);
  });

  bar.appendChild(searchWrapper);
  bar.appendChild(catWrapper);
  bar.appendChild(sortWrapper);

  return bar;
}

/* ───────── Time Period Selector ───────── */

export function createTimePeriodSelector(period, customStart, customEnd, callbacks = {}) {
  const container = document.createElement('div');
  container.className = 'period-selector-wrapper';

  const btnGroup = document.createElement('div');
  btnGroup.className = 'period-selector';
  btnGroup.setAttribute('role', 'group');
  btnGroup.setAttribute('aria-label', 'Select time period');

  const presets = getPeriodPresets();
  presets.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'period-btn';
    btn.dataset.period = p.value;
    btn.textContent = p.label;
    if (p.value === period) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (callbacks.onPeriodChange) callbacks.onPeriodChange(p.value);
    });
    btnGroup.appendChild(btn);
  });

  container.appendChild(btnGroup);

  const dateRange = document.createElement('div');
  dateRange.className = 'date-range-picker';
  dateRange.style.display = period === 'custom' ? 'flex' : 'none';

  const startGroup = document.createElement('div');
  startGroup.className = 'form-group';
  startGroup.style.marginBottom = '0';
  startGroup.innerHTML = `<label for="custom-start">From</label>`;
  const startInput = document.createElement('input');
  startInput.type = 'date';
  startInput.id = 'custom-start';
  startInput.className = 'filter-select';
  startInput.value = customStart || '';
  startGroup.appendChild(startInput);

  const endGroup = document.createElement('div');
  endGroup.className = 'form-group';
  endGroup.style.marginBottom = '0';
  endGroup.innerHTML = `<label for="custom-end">To</label>`;
  const endInput = document.createElement('input');
  endInput.type = 'date';
  endInput.id = 'custom-end';
  endInput.className = 'filter-select';
  endInput.value = customEnd || toDateStr(new Date());
  endGroup.appendChild(endInput);

  dateRange.appendChild(startGroup);
  dateRange.appendChild(endGroup);

  const applyBtn = document.createElement('button');
  applyBtn.className = 'btn btn-primary btn-sm';
  applyBtn.textContent = 'Apply';
  applyBtn.addEventListener('click', () => {
    if (callbacks.onCustomRange) callbacks.onCustomRange(startInput.value, endInput.value);
  });
  dateRange.appendChild(applyBtn);

  container.appendChild(dateRange);

  return container;
}

/* ───────── Bar Chart (Spending Over Time) ───────── */

export function renderBarChart(expenses, { label = '', mode = 'auto' } = {}) {
  const container = document.createElement('div');
  container.className = 'chart-container';

  if (expenses.length === 0) {
    const empty = createEmptyState('No data yet', 'Add expenses to see your spending trend.');
    empty.classList.add('chart-empty');
    container.appendChild(empty);
    return container;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'chart-wrapper';

  const chartEl = document.createElement('div');
  chartEl.className = 'bar-chart';

  let groups;
  if (mode === 'day') {
    groups = groupByDay(expenses);
  } else if (mode === 'week') {
    groups = groupByWeek(expenses);
  } else if (mode === 'month') {
    groups = groupByMonth(expenses);
  } else {
    const dates = expenses.map(e => e.date).sort();
    const first = new Date(dates[0] + 'T00:00:00');
    const last = new Date(dates[dates.length - 1] + 'T00:00:00');
    const spanDays = Math.ceil((last - first) / 86400000);
    if (spanDays <= 14) {
      groups = groupByDay(expenses);
    } else if (spanDays <= 60) {
      groups = groupByWeek(expenses);
    } else {
      groups = groupByMonth(expenses);
    }
  }

  if (groups.length === 0) {
    const empty = createEmptyState('No data yet', 'Add expenses to see your spending trend.');
    empty.classList.add('chart-empty');
    container.appendChild(empty);
    return container;
  }

  const maxVal = Math.max(...groups.map(g => g.amount), 1);
  const barCount = groups.length;

  groups.forEach((g, i) => {
    const pct = (g.amount / maxVal) * 100;
    const bar = document.createElement('div');
    bar.className = 'bar-chart-bar';
    bar.style.height = `${Math.max(pct, 2)}%`;
    bar.style.animationDelay = `${i * 30}ms`;
    bar.setAttribute('title', `${g.label}: ${formatCurrency(g.amount)}`);
    bar.innerHTML = `<span class="bar-chart-tooltip">${formatCurrency(g.amount)}</span>`;
    chartEl.appendChild(bar);
  });

  wrapper.appendChild(chartEl);

  const labels = document.createElement('div');
  labels.className = 'bar-chart-labels';

  const step = Math.max(1, Math.floor(barCount / 7));
  groups.forEach((g, i) => {
    if (i % step === 0 || i === barCount - 1) {
      const lbl = document.createElement('span');
      lbl.className = 'bar-chart-label';
      lbl.textContent = g.shortLabel || g.label;
      labels.appendChild(lbl);
    }
  });

  wrapper.appendChild(labels);
  container.appendChild(wrapper);
  return container;
}

function groupByDay(expenses) {
  const map = {};
  expenses.forEach(e => {
    map[e.date] = (map[e.date] || 0) + e.amount;
  });
  const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([date, amount]) => {
    const d = new Date(date + 'T00:00:00');
    return {
      label: formatDateFull(date),
      shortLabel: d.toLocaleDateString('en-NG', { weekday: 'short' }),
      amount
    };
  });
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const jan1 = new Date(y, 0, 1);
  const days = Math.floor((d - jan1) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${y}-W${String(week).padStart(2, '0')}`;
}

function groupByWeek(expenses) {
  const map = {};
  expenses.forEach(e => {
    const key = getWeekKey(e.date);
    map[key] = (map[key] || 0) + e.amount;
  });
  const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([key, amount]) => {
    const [y, w] = key.split('-W');
    const label = `W${w} ${y}`;
    return { label, shortLabel: `W${w}`, amount };
  });
}

function groupByMonth(expenses) {
  const map = {};
  expenses.forEach(e => {
    const key = e.date.slice(0, 7);
    map[key] = (map[key] || 0) + e.amount;
  });
  const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([key, amount]) => {
    const [y, m] = key.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1);
    return {
      label: d.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }),
      shortLabel: d.toLocaleDateString('en-NG', { month: 'short' }),
      amount
    };
  });
}

/* ───────── Monthly Trend ───────── */

export function renderMonthlyTrend(expenses) {
  const container = document.createElement('div');
  container.className = 'chart-container';

  if (expenses.length === 0) {
    const empty = createEmptyState('No data yet', 'Add expenses to see your monthly trend.');
    empty.classList.add('chart-empty');
    container.appendChild(empty);
    return container;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'chart-wrapper';

  const months = groupByMonth(expenses);

  if (months.length === 0) {
    const empty = createEmptyState('No data yet', 'Add expenses to see your monthly trend.');
    empty.classList.add('chart-empty');
    container.appendChild(empty);
    return container;
  }

  const chartEl = document.createElement('div');
  chartEl.className = 'bar-chart';

  const maxVal = Math.max(...months.map(m => m.amount), 1);

  months.forEach((m, i) => {
    const pct = (m.amount / maxVal) * 100;
    const bar = document.createElement('div');
    bar.className = 'bar-chart-bar';
    bar.style.height = `${Math.max(pct, 2)}%`;
    bar.style.animationDelay = `${i * 40}ms`;
    bar.setAttribute('title', `${m.label}: ${formatCurrency(m.amount)}`);
    bar.innerHTML = `<span class="bar-chart-tooltip">${formatCurrency(m.amount)}</span>`;
    chartEl.appendChild(bar);
  });

  wrapper.appendChild(chartEl);

  const labels = document.createElement('div');
  labels.className = 'bar-chart-labels';

  const step = Math.max(1, Math.floor(months.length / 6));
  months.forEach((m, i) => {
    if (i % step === 0 || i === months.length - 1) {
      const lbl = document.createElement('span');
      lbl.className = 'bar-chart-label';
      lbl.textContent = m.shortLabel;
      labels.appendChild(lbl);
    }
  });

  wrapper.appendChild(labels);
  container.appendChild(wrapper);
  return container;
}

/* ───────── Animated Counter ───────── */

export function animateCount(el, target, options = {}) {
  const { duration = 600, suffix = '', prefix = '' } = options;
  const start = performance.now();
  const from = 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (target - from) * eased;
    el.textContent = prefix + Math.round(current).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/* ───────── Skeleton Loader ───────── */

export function createSkeletonLoader(type = 'card', count = 1) {
  const container = document.createElement('div');
  container.className = `skeleton-${type}s`;
  container.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = `skeleton skeleton-${type}`;
    item.style.animationDelay = `${i * 60}ms`;
    container.appendChild(item);
  }

  return container;
}

/* ───────── File Input (import) ───────── */

export function createFileInput(accept = '.csv,.json', onFile) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (onFile) onFile(e.target.result, file.name);
      input.value = '';
    };
    reader.readAsText(file);
  });
  document.body.appendChild(input);
  return input;
}
