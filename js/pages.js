import { ExpenseService, ProfileService, CATEGORIES } from './services.js';
import { formatCurrency, getDateRange, formatPeriodLabel } from './format.js';
import { compareByDate, compareByDateAsc, compareByAmountDesc, compareByAmountAsc } from './format.js';
import {
  renderSummaryCards, renderExpenseList, renderCategoryPieChart,
  createEmptyState, createFilterBar, createExpenseForm,
  createConfirmDialog, createTimePeriodSelector,
  renderBarChart, renderMonthlyTrend,
  openModal, closeModal, showToast,
  createSkeletonLoader, createFileInput
} from './components.js';
import { APP } from './config.js';

const ROUTES = {
  DASHBOARD: 'dashboard',
  TRANSACTIONS: 'transactions',
  REPORTS: 'reports',
  SETTINGS: 'settings'
};

let currentRoute = ROUTES.DASHBOARD;
let currentPeriod = 'month';
let customStart = '';
let customEnd = '';

/* ───────── Page transition ───────── */

function transitionOut(el) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
}

function transitionIn(el) {
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
}

/* ───────── Helpers ───────── */

function getFilteredExpenses(expenses, filters) {
  let result = [...expenses];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(e => e.name.toLowerCase().includes(q));
  }

  if (filters.category) {
    result = result.filter(e => e.category === filters.category);
  }

  const sortMap = {
    newest: compareByDate,
    oldest: compareByDateAsc,
    highest: compareByAmountDesc,
    lowest: compareByAmountAsc
  };

  result.sort(sortMap[filters.sort] || sortMap.newest);
  return result;
}

function filterByPeriod(expenses) {
  const range = getDateRange(currentPeriod, customStart, customEnd);
  return expenses.filter(e => e.date >= range.start && e.date <= range.end);
}

function computeStats(expenses) {
  const totalCount = expenses.length;
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const highest = expenses.reduce((best, e) => e.amount > (best?.amount || 0) ? e : best, null);

  const sorted = [...expenses].sort(compareByDate);

  const catTotals = {};
  expenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  let topCatName = null;
  let topCatAmount = 0;
  Object.entries(catTotals).forEach(([id, amt]) => {
    if (amt > topCatAmount) {
      topCatAmount = amt;
      const cat = CATEGORIES.find(c => c.id === id);
      topCatName = cat ? cat.name : id;
    }
  });

  return {
    totalCount,
    totalAmount,
    highestAmount: highest?.amount || 0,
    highestName: highest?.name || null,
    mostRecentName: sorted[0]?.name || null,
    avgAmount: totalCount > 0 ? totalAmount / totalCount : 0,
    topCategory: topCatName,
    topCategoryAmount: topCatAmount
  };
}

function renderCurrentPage() {
  renderPage(currentRoute);
}

/* ───────── Topbar ───────── */

function renderTopbar(title, extra = '') {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;
  topbar.innerHTML = `
    <h1 class="topbar-title">
      <a href="#/dashboard" aria-label="Pocket Pilot home">
        <svg class="logo-icon-sm topbar-logo-mark" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="logo-bg-sm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#006FDE"/>
              <stop offset="100%" stop-color="#00225C"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="url(#logo-bg-sm)"/>
          <path d="M14 30V10h6.5a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5H16"
                stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M26 13l4 6-6 4" stroke="#009E9E" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
      ${title}
    </h1>
    <div class="topbar-actions">
      <button id="hamburger-btn" class="hamburger-btn" aria-label="Open navigation menu" title="Open menu">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <label class="topbar-avatar-btn" tabindex="0" role="button" aria-label="Change profile picture">
        <span class="topbar-avatar" aria-hidden="true">${ProfileService.getActive()?.name?.charAt(0).toUpperCase() || 'P'}</span>
        <input type="file" accept="image/*" class="profile-avatar-input" aria-hidden="true">
      </label>
      ${extra}
      <button id="theme-toggle-mobile" class="theme-toggle-mobile" aria-label="Toggle theme">
        <svg class="theme-icon-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M12 1v2M12 21v2M1 12h2M21 12h2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg class="theme-icon-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `;
  const avatarBtn = topbar.querySelector('.topbar-avatar-btn');
  const avatarEl = topbar.querySelector('.topbar-avatar');
  const profile = ProfileService.getActive();
  const avatarKey = 'pocketpilot-avatar-' + (profile?.id || 'default');
  const savedAvatar = localStorage.getItem(avatarKey);
  if (savedAvatar) {
    avatarEl.style.backgroundImage = `url(${savedAvatar})`;
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.textContent = '';
  }
  const avatarInput = avatarBtn.querySelector('.profile-avatar-input');
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      localStorage.setItem(avatarKey, dataUrl);
      avatarEl.style.backgroundImage = `url(${dataUrl})`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.textContent = '';
    };
    reader.readAsDataURL(file);
  });
  const mobileBtn = document.getElementById('theme-toggle-mobile');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      const html = document.documentElement;
      const isDark = html.classList.toggle('dark-mode');
      localStorage.setItem('pocketpilot-theme', isDark ? 'dark' : 'light');
    });
  }

  const hamburgerBtn = document.getElementById('hamburger-btn');
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.toggle('mobile-open');
      if (overlay) overlay.classList.toggle('visible');
    });
  }
}

/* ───────── Update active nav ───────── */

function updateNavActive(route) {
  document.querySelectorAll('.nav-item, .tab-item').forEach(el => {
    const isActive = el.dataset.route === route;
    el.classList.toggle('active', isActive);
    if (el.tagName === 'A') {
      if (isActive) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    }
  });
}

/* ───────── Page renderer ───────── */

export function renderPage(route) {
  currentRoute = route;
  const content = document.getElementById('page-content');
  if (!content) return;

  const expenses = ExpenseService.getAll();

  transitionOut(content);

  setTimeout(() => {
    content.innerHTML = '';

    switch (route) {
      case ROUTES.DASHBOARD:
        renderDashboard(content, expenses);
        break;
      case ROUTES.TRANSACTIONS:
        renderTransactions(content, expenses);
        break;
      case ROUTES.REPORTS:
        renderReports(content, expenses);
        break;
      case ROUTES.SETTINGS:
        renderSettings(content, expenses);
        break;
      default:
        content.appendChild(
          createEmptyState('Page Not Found', 'The page you are looking for does not exist.', 'Go Home', () => navigate('#/dashboard'))
        );
    }

    requestAnimationFrame(() => transitionIn(content));
    updateNavActive(route);
  }, 150);
}

/* ───────── Modal helpers ───────── */

export function openExpenseFormModal(expense = null) {
  const isEdit = expense !== null;
  const form = createExpenseForm(expense);

  form.addEventListener('form-save', (e) => {
    const data = e.detail;
    try {
      if (isEdit) {
        ExpenseService.update(expense.id, data);
        showToast('Expense updated', 'success');
      } else {
        ExpenseService.add(data);
        showToast('Expense added', 'success');
      }
      closeModal();
      renderCurrentPage();
    } catch (err) {
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
    }
  });

  form.addEventListener('form-cancel', closeModal);

  if (isEdit) {
    form.addEventListener('form-delete', () => {
      closeModal();
      confirmDeleteExpense(expense.id, expense.name);
    });
  }

  openModal({
    title: isEdit ? 'Edit Expense' : 'Add Expense',
    content: form
  });
}

function confirmDeleteExpense(id, name) {
  const content = createConfirmDialog(
    `Are you sure you want to delete "${name}"?`,
    'Delete',
    () => {
      ExpenseService.delete(id);
      showToast('Expense deleted', 'info', {
        label: 'Undo',
        callback: () => {
          const restored = ExpenseService.undoDelete();
          if (restored) showToast('Expense restored', 'success');
          renderCurrentPage();
        }
      });
      renderCurrentPage();
    }
  );
  openModal({ title: 'Delete Expense', content });
}

/* ───────── Data management helpers ───────── */

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function handleExportCSV() {
  const csv = ExpenseService.exportCSV();
  if (!csv) { showToast('No expenses to export.', 'info'); return; }
  downloadFile(csv, `pocketpilot-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  showToast('CSV exported successfully', 'success');
}

function handleExportJSON() {
  const json = ExpenseService.exportJSON();
  if (!json) { showToast('No expenses to export.', 'info'); return; }
  downloadFile(json, `pocketpilot-export-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  showToast('JSON exported successfully', 'success');
}

function handleImport() {
  const input = createFileInput('.csv,.json', (content, fileName) => {
    try {
      const isCSV = fileName.toLowerCase().endsWith('.csv');
      const result = isCSV ? ExpenseService.importCSV(content) : ExpenseService.importJSON(content);
      showToast(`Imported ${result.added} expense(s) (${result.skipped} skipped)`, 'success');
      renderCurrentPage();
    } catch (err) {
      showToast(err.message || 'Import failed. Check your file format.', 'error');
    }
  });
  input.click();
}

/* ───────── Dashboard ───────── */

function renderDashboard(container, expenses) {
  renderTopbar('Dashboard');

  const wrapper = document.createElement('div');
  wrapper.className = 'dashboard-content';

  const profile = ProfileService.getActive();
  const firstName = profile ? profile.name.split(' ')[0] : 'User';
  const welcome = document.createElement('div');
  welcome.className = 'dashboard-welcome';
  welcome.innerHTML = `
    <h2 class="dashboard-welcome-title"></h2>
    <p class="dashboard-welcome-desc">Review your spending and financial activity</p>
  `;
  const titleEl = welcome.querySelector('.dashboard-welcome-title');
  titleEl.textContent = 'Welcome back, ' + firstName;
  wrapper.appendChild(welcome);

  const periodEl = createTimePeriodSelector(currentPeriod, customStart, customEnd, {
    onPeriodChange: (p) => {
      if (p === 'custom') { customStart = ''; customEnd = ''; }
      currentPeriod = p;
      renderCurrentPage();
    },
    onCustomRange: (start, end) => {
      customStart = start;
      customEnd = end;
      currentPeriod = 'custom';
      renderCurrentPage();
    }
  });
  wrapper.appendChild(periodEl);

  const periodExpenses = filterByPeriod(expenses);

  const range = getDateRange(currentPeriod, customStart, customEnd);
  const periodLabel = currentPeriod === 'custom'
    ? `${range.start} to ${range.end}`
    : formatPeriodLabel(currentPeriod);

  const periodInfo = document.createElement('p');
  periodInfo.className = 'period-info';
  periodInfo.textContent = periodLabel;
  wrapper.appendChild(periodInfo);

  wrapper.appendChild(renderSummaryCards(computeStats(periodExpenses)));

  if (periodExpenses.length > 0) {
    const chartSection = document.createElement('section');
    chartSection.className = 'dashboard-section';
    chartSection.innerHTML = '<h2 class="section-title">Spending Breakdown</h2>';
    chartSection.appendChild(renderCategoryPieChart(periodExpenses));
    wrapper.appendChild(chartSection);

    const trendSection = document.createElement('section');
    trendSection.className = 'dashboard-section';
    trendSection.innerHTML = '<h2 class="section-title">Spending Over Time</h2>';
    trendSection.appendChild(renderBarChart(periodExpenses));
    wrapper.appendChild(trendSection);
  }

  const recentSection = document.createElement('section');
  recentSection.className = 'dashboard-section';
  recentSection.innerHTML = '<h2 class="section-title">Recent Transactions</h2>';

  const recent = [...expenses].sort(compareByDate).slice(0, 5);

  recentSection.appendChild(renderExpenseList(recent, {
    onEdit: (id) => { const exp = ExpenseService.getById(id); if (exp) openExpenseFormModal(exp); },
    onDelete: (id) => { const exp = ExpenseService.getById(id); if (exp) confirmDeleteExpense(id, exp.name); }
  }));

  wrapper.appendChild(recentSection);
  container.appendChild(wrapper);
}

/* ───────── Transactions ───────── */

function renderTransactions(container, expenses) {
  renderTopbar('Transactions');

  const filters = { search: '', category: '', sort: 'newest' };
  const wrapper = document.createElement('div');
  wrapper.className = 'transactions-content';

  const filterBar = createFilterBar(filters, {
    onSearch: (q) => { filters.search = q; renderTransactionList(wrapper, expenses, filters); },
    onCategoryFilter: (cat) => { filters.category = cat; renderTransactionList(wrapper, expenses, filters); },
    onSort: (sort) => { filters.sort = sort; renderTransactionList(wrapper, expenses, filters); }
  });

  wrapper.appendChild(filterBar);

  const listWrapper = document.createElement('div');
  listWrapper.id = 'transaction-list-wrapper';
  wrapper.appendChild(listWrapper);

  container.appendChild(wrapper);

  renderTransactionList(wrapper, expenses, filters);
}

function renderTransactionList(wrapper, expenses, filters) {
  const listWrapper = wrapper.querySelector('#transaction-list-wrapper');
  if (!listWrapper) return;

  const filtered = getFilteredExpenses(expenses, filters);
  const list = renderExpenseList(filtered, {
    searchQuery: filters.search,
    onEdit: (id) => { const exp = ExpenseService.getById(id); if (exp) openExpenseFormModal(exp); },
    onDelete: (id) => { const exp = ExpenseService.getById(id); if (exp) confirmDeleteExpense(id, exp.name); }
  });

  listWrapper.innerHTML = '';
  listWrapper.appendChild(list);
}

/* ───────── Reports ───────── */

function renderReports(container, expenses) {
  renderTopbar('Reports');

  if (expenses.length === 0) {
    container.appendChild(
      createEmptyState('No data to report', 'Add some expenses first to see your spending patterns.', 'Add Expense', () => openExpenseFormModal())
    );
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'reports-content';

  const periodEl = createTimePeriodSelector(currentPeriod, customStart, customEnd, {
    onPeriodChange: (p) => {
      if (p === 'custom') { customStart = ''; customEnd = ''; }
      currentPeriod = p;
      renderCurrentPage();
    },
    onCustomRange: (start, end) => {
      customStart = start;
      customEnd = end;
      currentPeriod = 'custom';
      renderCurrentPage();
    }
  });
  wrapper.appendChild(periodEl);

  const periodExpenses = filterByPeriod(expenses);

  const range = getDateRange(currentPeriod, customStart, customEnd);
  const total = periodExpenses.reduce((s, e) => s + e.amount, 0);

  const summary = document.createElement('div');
  summary.className = 'reports-summary';
  const periodTitle = currentPeriod === 'custom'
    ? `${range.start} to ${range.end}`
    : formatPeriodLabel(currentPeriod);
  summary.innerHTML = `
    <p class="reports-period">${periodTitle}</p>
    <p class="reports-total">Total: ${formatCurrency(total)}</p>
    <p class="reports-count">${periodExpenses.length} transaction${periodExpenses.length !== 1 ? 's' : ''}</p>
  `;
  wrapper.appendChild(summary);

  if (periodExpenses.length > 0) {
    const pieSection = document.createElement('section');
    pieSection.className = 'dashboard-section';
    pieSection.innerHTML = '<h2 class="section-title">Spending by Category</h2>';
    pieSection.appendChild(renderCategoryPieChart(periodExpenses));
    wrapper.appendChild(pieSection);

    const trendSection = document.createElement('section');
    trendSection.className = 'dashboard-section';
    trendSection.innerHTML = '<h2 class="section-title">Spending Over Time</h2>';
    trendSection.appendChild(renderBarChart(periodExpenses));
    wrapper.appendChild(trendSection);

    const monthlySection = document.createElement('section');
    monthlySection.className = 'dashboard-section';
    monthlySection.innerHTML = '<h2 class="section-title">Monthly Spending Trend</h2>';
    monthlySection.appendChild(renderMonthlyTrend(periodExpenses));
    wrapper.appendChild(monthlySection);
  }

  container.appendChild(wrapper);
}

/* ───────── Settings ───────── */

function renderSettings(container, expenses) {
  renderTopbar('Settings');

  const wrapper = document.createElement('div');
  wrapper.className = 'settings-content';

  wrapper.innerHTML = `
    <section class="settings-section">
      <h2 class="section-title">About ${APP.name}</h2>
      <div class="settings-card">
        <p>${APP.name} v${APP.version} helps you track your expenses intelligently. Built with vanilla HTML, CSS, and JavaScript.</p>
        <p class="settings-stats">Tracking <strong>${expenses.length}</strong> expense${expenses.length !== 1 ? 's' : ''} across <strong>${CATEGORIES.length}</strong> categories.</p>
      </div>
    </section>
    <section class="settings-section">
      <h2 class="section-title">Data Export</h2>
      <div class="settings-card">
        <p>Export your expense data for backup or analysis.</p>
        <div class="settings-actions">
          <button class="btn btn-secondary" id="export-csv-btn">Export CSV</button>
          <button class="btn btn-secondary" id="export-json-btn">Export JSON</button>
        </div>
      </div>
    </section>
    <section class="settings-section">
      <h2 class="section-title">Data Import</h2>
      <div class="settings-card">
        <p>Import expenses from a CSV or JSON file. Existing records with matching IDs will be updated.</p>
        <button class="btn btn-secondary" id="import-btn">Import Data</button>
      </div>
    </section>
    <section class="settings-section">
      <h2 class="section-title">Data Management</h2>
      <div class="settings-card">
        <p>Your data is stored locally in your browser. Clearing your browser data will remove all expenses.</p>
        <p>Historical data is never automatically deleted. All expenses remain available unless you explicitly delete them.</p>
        <button class="btn btn-danger" id="clear-all-btn">Clear All Expenses</button>
      </div>
    </section>
    <section class="settings-section">
      <h2 class="section-title">Security</h2>
      <div class="settings-card">
        <p>Manage your profile PIN to keep your data secure.</p>
        <button class="btn btn-secondary" id="change-pin-btn">Change PIN</button>
      </div>
    </section>
    <section class="settings-section">
      <h2 class="section-title">Keyboard Shortcuts</h2>
      <div class="settings-card">
        <div class="shortcuts-list">
          <div class="shortcut-row"><kbd>N</kbd><span>Add new expense</span></div>
          <div class="shortcut-row"><kbd>/</kbd><span>Search expenses</span></div>
          <div class="shortcut-row"><kbd>Escape</kbd><span>Close modal / cancel</span></div>
          <div class="shortcut-row"><kbd>1</kbd>–<kbd>4</kbd><span>Navigate pages</span></div>
        </div>
      </div>
    </section>
  `;

  wrapper.querySelector('#export-csv-btn').addEventListener('click', handleExportCSV);
  wrapper.querySelector('#export-json-btn').addEventListener('click', handleExportJSON);
  wrapper.querySelector('#import-btn').addEventListener('click', handleImport);
  wrapper.querySelector('#clear-all-btn').addEventListener('click', () => {
    const content = createConfirmDialog(
      'Are you sure you want to delete all expenses? This cannot be undone.',
      'Clear All',
      () => {
        ExpenseService.clearAll();
        showToast('All expenses cleared', 'info');
        renderCurrentPage();
      }
    );
    openModal({ title: 'Clear All Data', content });
  });

  wrapper.querySelector('#change-pin-btn')?.addEventListener('click', () => {
    const profile = ProfileService.getActive();
    if (!profile) return;
    const wrap = document.createElement('div');
    wrap.className = 'pin-change-form';
    wrap.innerHTML = `
      <div class="pin-input-wrap" style="margin-bottom:12px">
        <input type="password" id="pin-current-input" class="login-input pin-input" placeholder="Current PIN" maxlength="6" inputmode="numeric" pattern="\\d*" autocomplete="off">
        <button type="button" class="pin-toggle" data-for="pin-current-input" aria-label="Toggle PIN visibility" tabindex="-1">
          <svg class="pin-eye" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
      </div>
      <div class="pin-input-wrap" style="margin-bottom:12px">
        <input type="password" id="pin-new-input" class="login-input pin-input" placeholder="New PIN (4–6 digits)" maxlength="6" inputmode="numeric" pattern="\\d*" autocomplete="off">
        <button type="button" class="pin-toggle" data-for="pin-new-input" aria-label="Toggle PIN visibility" tabindex="-1">
          <svg class="pin-eye" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
      </div>
      <p class="pin-change-error" id="pin-change-error" style="color:var(--error-500);font-size:0.813rem;min-height:1.2em"></p>
    `;
    const modal = openModal({ title: 'Change PIN', content: wrap });
    const currentInput = wrap.querySelector('#pin-current-input');
    const newInput = wrap.querySelector('#pin-new-input');
    const errorEl = wrap.querySelector('#pin-change-error');

    wrap.querySelectorAll('.pin-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.for);
        if (!target) return;
        const isPassword = target.type === 'password';
        target.type = isPassword ? 'text' : 'password';
        btn.classList.toggle('pin-visible', !isPassword);
      });
    });

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:8px;margin-top:16px';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Update PIN';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    footer.appendChild(saveBtn);
    footer.appendChild(cancelBtn);
    wrap.appendChild(footer);

    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', () => {
      const current = currentInput.value.trim();
      const newPin = newInput.value.trim();
      errorEl.textContent = '';
      if (!current) { currentInput.focus(); return; }
      if (!newPin || !/^\d{4,6}$/.test(newPin)) {
        errorEl.textContent = 'New PIN must be 4–6 digits.';
        newInput.focus();
        return;
      }
      try {
        ProfileService.updatePin(profile.id, current, newPin);
        closeModal();
        showToast('PIN changed successfully', 'success');
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });

    currentInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') newInput.focus(); if (e.key === 'Escape') closeModal(); });
    newInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); if (e.key === 'Escape') closeModal(); });
    setTimeout(() => currentInput.focus(), 100);
  });

  container.appendChild(wrapper);
}

/* ───────── Navigation ───────── */

export function navigate(hash) {
  window.location.hash = hash || '#/dashboard';
}

export function initRouter() {
  const handleRoute = () => {
    const hash = window.location.hash || '#/dashboard';
    const route = hash.replace('#/', '') || ROUTES.DASHBOARD;
    renderPage(route);
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
