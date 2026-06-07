import { initRouter, openExpenseFormModal, navigate } from './pages.js';
import { ExpenseService, ProfileService } from './services.js';
import { APP } from './config.js';

/* ───────── Error Boundary ───────── */

function setupErrorBoundary() {
  window.addEventListener('error', (e) => {
    console.error(`[${APP.name}] Uncaught error:`, e.error || e.message);
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error(`[${APP.name}] Unhandled rejection:`, e.reason);
  });
}

/* ───────── Keyboard Shortcuts ───────── */

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName || '';
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    const modalOpen = document.getElementById('modal-overlay')?.classList.contains('hidden') === false;

    if (e.key === 'Escape' && !isInput) {
      const modal = document.getElementById('modal-overlay');
      if (modal && !modal.classList.contains('hidden')) {
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn?.click();
        return;
      }
    }

    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !isInput && !modalOpen) {
      e.preventDefault();
      openExpenseFormModal();
      return;
    }

    if (e.key === '/' && !isInput && !modalOpen) {
      e.preventDefault();
      const searchInput = document.querySelector('.search-input');
      searchInput?.focus();
      return;
    }

    if (e.key >= '1' && e.key <= '4' && !e.ctrlKey && !e.metaKey && !isInput && !modalOpen) {
      e.preventDefault();
      const routes = ['#/dashboard', '#/transactions', '#/reports', '#/settings'];
      navigate(routes[parseInt(e.key) - 1]);
    }
  });
}

/* ───────── Theme Toggle ───────── */

function initTheme() {
  const saved = localStorage.getItem('pocketpilot-theme');
  const html = document.documentElement;

  if (saved === 'dark') {
    html.classList.add('dark-mode');
  } else if (saved === 'light') {
    html.classList.remove('dark-mode');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    html.classList.toggle('dark-mode', prefersDark.matches);
    prefersDark.addEventListener('change', (e) => {
      if (!localStorage.getItem('pocketpilot-theme')) {
        html.classList.toggle('dark-mode', e.matches);
      }
    });
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark-mode');
  localStorage.setItem('pocketpilot-theme', isDark ? 'dark' : 'light');
}

/* ───────── Login Screen ───────── */

function renderLoginScreen() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const profiles = ProfileService.getAll();

  const login = document.createElement('div');
  login.className = 'login-screen';
  login.innerHTML = `
    <div class="login-bg B1" aria-hidden="true">
      <svg class="login-bg-wave login-bg-wave-1" viewBox="0 0 1440 800" preserveAspectRatio="none">
        <path d="M0,300 C240,150 480,400 720,250 C960,100 1200,350 1440,200 L1440,800 L0,800 Z" fill="url(#wave-grad-1)"/>
      </svg>
      <svg class="login-bg-wave login-bg-wave-2" viewBox="0 0 1440 800" preserveAspectRatio="none">
        <path d="M0,200 C200,350 400,100 600,280 C800,460 1000,200 1200,320 C1320,380 1400,300 1440,280 L1440,800 L0,800 Z" fill="url(#wave-grad-2)"/>
      </svg>
      <svg class="login-bg-wave login-bg-wave-3" viewBox="0 0 1440 600" preserveAspectRatio="none">
        <path d="M0,400 C180,300 360,500 540,380 C720,260 900,420 1080,350 C1260,280 1380,380 1440,400 L1440,600 L0,600 Z" fill="url(#wave-grad-3)"/>
      </svg>
      <svg class="login-bg-wave login-bg-wave-4" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path d="M0,500 C160,380 320,600 540,480 C760,360 960,520 1200,420 C1360,360 1400,460 1440,480 L1440,900 L0,900 Z" fill="url(#wave-grad-4)"/>
      </svg>
      <svg aria-hidden="true" class="login-bg-glass">
        <defs>
          <linearGradient id="wave-grad-1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#006FDE" stop-opacity="0.04"/>
            <stop offset="100%" stop-color="#4DA3FF" stop-opacity="0.07"/>
          </linearGradient>
          <linearGradient id="wave-grad-2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#006FDE" stop-opacity="0.03"/>
            <stop offset="100%" stop-color="#4DA3FF" stop-opacity="0.05"/>
          </linearGradient>
          <linearGradient id="wave-grad-3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#006FDE" stop-opacity="0.02"/>
            <stop offset="100%" stop-color="#4DA3FF" stop-opacity="0.04"/>
          </linearGradient>
          <linearGradient id="wave-grad-4" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#006FDE" stop-opacity="0.025"/>
            <stop offset="50%" stop-color="#4DA3FF" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="#006FDE" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
      </svg>
      <div class="login-bg-ring login-bg-ring-1"></div>
      <div class="login-bg-ring login-bg-ring-2"></div>
      <div class="login-bg-ring login-bg-ring-3"></div>
      <div class="login-bg-glass-layer login-bg-glass-1"></div>
      <div class="login-bg-glass-layer login-bg-glass-2"></div>
      <div class="login-bg-glass-layer login-bg-glass-3"></div>
      <div class="login-bg-mesh"></div>
      <div class="login-bg-dot"></div>
      <div class="login-bg-shape login-bg-shape-1"></div>
      <div class="login-bg-shape login-bg-shape-2"></div>
      <div class="login-b3-spotlight"></div>
      <div class="login-b3-grid"></div>
      <div class="login-b3-orb login-b3-orb-1"></div>
      <div class="login-b3-orb login-b3-orb-2"></div>
      <div class="login-b3-ring login-b3-ring-1"></div>
      <div class="login-b3-ring login-b3-ring-2"></div>
    </div>
    <div class="login-card">
      <div class="login-header">
        <svg class="login-logo" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="login-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#006FDE"/>
              <stop offset="100%" stop-color="#00225C"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="url(#login-bg)"/>
          <path d="M14 30V10h6.5a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5H16"
                stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M26 13l4 6-6 4" stroke="#009E9E" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1 class="login-title" id="login-title"></h1>
        <p class="login-subtitle">Track Your Expenses, Don't Let Expenses Track You!</p>
      </div>
      <div class="login-body">
        <h2 class="login-heading">${profiles.length ? 'Choose your profile' : 'Create your profile'}</h2>
        <div class="profile-list" id="profile-list">
          ${profiles.map(p => {
            const pKey = 'pocketpilot-avatar-' + p.id;
            const pAvatar = localStorage.getItem(pKey);
            return `
            <button class="profile-card" data-id="${escapeHtml(p.id)}">
              <span class="profile-card-avatar" data-avatar-key="${escapeHtml(pKey)}">${pAvatar ? '' : escapeHtml(p.name.charAt(0).toUpperCase())}</span>
              <span class="profile-card-name">${escapeHtml(p.name)}</span>
              <span class="profile-card-delete" data-id="${escapeHtml(p.id)}" title="Delete profile">×</span>
            </button>
          `}).join('')}
          <button class="profile-card profile-card-add" id="btn-create-profile">
            <span class="profile-card-avatar profile-card-add-icon">+</span>
            <span class="profile-card-name">New Profile</span>
          </button>
        </div>
        <div class="login-create" id="login-create" style="display:none">
          <input type="text" id="profile-name-input" class="login-input" placeholder="Enter your full name" maxlength="30" autocomplete="off">
          <div class="pin-input-wrap">
            <input type="password" id="profile-pin-input" class="login-input pin-input" placeholder="Set a 4–6 digit PIN" maxlength="6" inputmode="numeric" pattern="\\d*" autocomplete="off">
            <button type="button" class="pin-toggle" id="pin-toggle-create" aria-label="Toggle PIN visibility" tabindex="-1">
              <svg class="pin-eye" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
            </button>
          </div>
          <div class="login-create-actions">
            <button class="btn btn-primary" id="btn-confirm-profile">Create Profile</button>
            <button class="btn btn-secondary" id="btn-cancel-profile">Cancel</button>
          </div>
        </div>
        <div class="login-error" id="login-error" style="display:none"></div>
      </div>
    </div>
  `;

  app.appendChild(login);

  const titleEl = document.getElementById('login-title');
  if (titleEl) {
    const text = 'Pocket Pilot';
    const CHAR_DELAY = 120;
    const TYPE_DURATION = 350;
    titleEl.innerHTML = '';
    text.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'title-char';
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.dataset.idx = i;
      titleEl.appendChild(span);
    });

    let typingTimer;

    function runTypingCycle() {
      titleEl.classList.remove('glow-active');
      const chars = titleEl.querySelectorAll('.title-char');

      chars.forEach(el => {
        el.classList.remove('type-active');
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
      });

      clearTimeout(typingTimer);

      setTimeout(() => {
        chars.forEach((el, i) => {
          el.style.transition = 'none';
          el.style.animationDelay = i * CHAR_DELAY + 'ms';
          el.classList.add('type-active');
        });

        const totalMs = (chars.length - 1) * CHAR_DELAY + TYPE_DURATION;
        typingTimer = setTimeout(() => {
          titleEl.classList.add('glow-active');
        }, totalMs + 50);
      }, 400);
    }

    runTypingCycle();
    setInterval(runTypingCycle, 12000);
  }

  document.querySelectorAll('.profile-card-avatar[data-avatar-key]').forEach(el => {
    const key = el.dataset.avatarKey;
    const saved = localStorage.getItem(key);
    if (saved) {
      el.style.backgroundImage = `url(${saved})`;
      el.style.backgroundSize = 'cover';
      el.textContent = '';
    }
  });

  bindLoginEvents();
}

function bindLoginEvents() {
  const list = document.querySelector('.profile-list');
  if (list) {
    list.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.profile-card-delete');
      if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.dataset.id;
        const profile = ProfileService.getById(id);
        if (profile && confirm(`Delete "${profile.name}" and all their expense data?`)) {
          ProfileService.delete(id);
          renderLoginScreen();
        }
        return;
      }
      const card = e.target.closest('.profile-card[data-id]');
      if (card) {
        const id = card.dataset.id;
        showPinEntry(id);
      }
    });
  }

  const createBtn = document.getElementById('btn-create-profile');
  const createSection = document.getElementById('login-create');
  const nameInput = document.getElementById('profile-name-input');
  const pinInput = document.getElementById('profile-pin-input');
  const confirmBtn = document.getElementById('btn-confirm-profile');
  const cancelBtn = document.getElementById('btn-cancel-profile');
  const errorEl = document.getElementById('login-error');
  const pinToggle = document.getElementById('pin-toggle-create');

  if (pinToggle && pinInput) {
    pinToggle.addEventListener('click', () => {
      const isPassword = pinInput.type === 'password';
      pinInput.type = isPassword ? 'text' : 'password';
      pinToggle.classList.toggle('pin-visible', !isPassword);
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      createBtn.style.display = 'none';
      createSection.style.display = 'block';
      if (errorEl) errorEl.style.display = 'none';
      nameInput.focus();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const pin = pinInput.value.trim();
      if (errorEl) errorEl.style.display = 'none';
      if (!name) { nameInput.focus(); return; }
      if (!pin) { pinInput.focus(); return; }
      try {
        const profile = ProfileService.create(name, pin);
        ProfileService.setSession(profile.id);
        ProfileService.setActive(profile.id);
        ExpenseService._invalidateCache();
        bootstrapApp();
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        }
        nameInput.setCustomValidity(err.message);
        nameInput.reportValidity();
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      createSection.style.display = 'none';
      createBtn.style.display = 'flex';
      nameInput.value = '';
      pinInput.value = '';
      if (errorEl) errorEl.style.display = 'none';
    });
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); pinInput?.focus(); }
      if (e.key === 'Escape') cancelBtn?.click();
    });
  }

  if (pinInput) {
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmBtn?.click();
      if (e.key === 'Escape') cancelBtn?.click();
    });
  }
}

/* ───────── PIN Entry Overlay ───────── */

function showPinEntry(profileId) {
  const profile = ProfileService.getById(profileId);
  if (!profile) return;

  const existing = document.querySelector('.pin-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'pin-overlay';
  overlay.innerHTML = `
    <div class="pin-overlay-card">
      <div class="pin-overlay-header">
        <div class="pin-overlay-avatar">${escapeHtml(profile.name.charAt(0).toUpperCase())}</div>
        <h3 class="pin-overlay-name">${escapeHtml(profile.name)}</h3>
        <p class="pin-overlay-desc">Enter your PIN to continue</p>
      </div>
      <div class="pin-overlay-body">
        <div class="pin-input-wrap pin-overlay-input-wrap">
          <input type="password" id="pin-entry-input" class="login-input pin-input pin-entry-input" placeholder="Enter PIN" maxlength="6" inputmode="numeric" pattern="\\d*" autocomplete="off">
          <button type="button" class="pin-toggle" id="pin-entry-toggle" aria-label="Toggle PIN visibility" tabindex="-1">
            <svg class="pin-eye" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
        </div>
        <p class="pin-overlay-error" id="pin-entry-error"></p>
      </div>
      <div class="pin-overlay-actions">
        <button class="btn btn-primary" id="pin-entry-confirm">Unlock</button>
        <button class="btn btn-secondary" id="pin-entry-cancel">Cancel</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);

  const input = document.getElementById('pin-entry-input');
  const confirmBtn = document.getElementById('pin-entry-confirm');
  const cancelBtn = document.getElementById('pin-entry-cancel');
  const errorEl = document.getElementById('pin-entry-error');
  const toggleBtn = document.getElementById('pin-entry-toggle');

  if (toggleBtn && input) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.classList.toggle('pin-visible', !isPassword);
    });
  }

  function attemptUnlock() {
    const pin = input.value.trim();
    if (!pin) { input.focus(); return; }
    if (ProfileService.verifyPin(profileId, pin)) {
      overlay.remove();
      ProfileService.setSession(profileId);
      ProfileService.setActive(profileId);
      ExpenseService._invalidateCache();
      bootstrapApp();
    } else {
      errorEl.textContent = 'Incorrect PIN. Please try again.';
      input.value = '';
      input.focus();
    }
  }

  confirmBtn.addEventListener('click', attemptUnlock);
  cancelBtn.addEventListener('click', () => overlay.remove());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptUnlock();
    if (e.key === 'Escape') overlay.remove();
  });

  setTimeout(() => input.focus(), 100);
}

/* ───────── PIN Setup Overlay (first-time) ───────── */

function showPinSetup(profileId) {
  const profile = ProfileService.getById(profileId);
  if (!profile) return;

  const existing = document.querySelector('.pin-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'pin-overlay';
  overlay.innerHTML = `
    <div class="pin-overlay-card">
      <div class="pin-overlay-header">
        <div class="pin-overlay-avatar">${escapeHtml(profile.name.charAt(0).toUpperCase())}</div>
        <h3 class="pin-overlay-name">Set Your PIN</h3>
        <p class="pin-overlay-desc">Create a 4–6 digit PIN to secure your profile</p>
      </div>
      <div class="pin-overlay-body">
        <div class="pin-input-wrap pin-overlay-input-wrap">
          <input type="password" id="pin-setup-input" class="login-input pin-input pin-entry-input" placeholder="Enter 4–6 digit PIN" maxlength="6" inputmode="numeric" pattern="\\d*" autocomplete="off">
          <button type="button" class="pin-toggle" id="pin-setup-toggle" aria-label="Toggle PIN visibility" tabindex="-1">
            <svg class="pin-eye" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
        </div>
        <p class="pin-overlay-error" id="pin-setup-error"></p>
      </div>
      <div class="pin-overlay-actions">
        <button class="btn btn-primary" id="pin-setup-confirm">Set PIN</button>
        <button class="btn btn-secondary" id="pin-setup-cancel">Cancel</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);

  const input = document.getElementById('pin-setup-input');
  const confirmBtn = document.getElementById('pin-setup-confirm');
  const cancelBtn = document.getElementById('pin-setup-cancel');
  const errorEl = document.getElementById('pin-setup-error');
  const toggleBtn = document.getElementById('pin-setup-toggle');

  if (toggleBtn && input) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.classList.toggle('pin-visible', !isPassword);
    });
  }

  confirmBtn.addEventListener('click', () => {
    const pin = input.value.trim();
    if (!/^\d{4,6}$/.test(pin)) {
      errorEl.textContent = 'PIN must be 4–6 digits.';
      input.focus();
      return;
    }
    try {
      ProfileService.setPin(profileId, pin);
      overlay.remove();
      ProfileService.setSession(profileId);
      ProfileService.setActive(profileId);
      ExpenseService._invalidateCache();
      bootstrapApp();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  cancelBtn.addEventListener('click', () => overlay.remove());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
    if (e.key === 'Escape') overlay.remove();
  });

  setTimeout(() => input.focus(), 100);
}

/* ───────── App Shell ───────── */

function createAppShell() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const profile = ProfileService.getActive();

  const shell = document.createElement('div');
  shell.className = 'app-shell';

  shell.innerHTML = `
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <aside id="sidebar" class="sidebar" role="navigation" aria-label="Main navigation">
      <div class="sidebar-header">
        <a href="#/dashboard" class="logo" aria-label="Pocket Pilot home">
          <svg class="logo-icon" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#006FDE"/>
                <stop offset="100%" stop-color="#00225C"/>
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="10" fill="url(#logo-bg)"/>
            <path d="M14 30V10h6.5a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5H16"
                  stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M26 13l4 6-6 4" stroke="#009E9E" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="logo-text"><span class="title-char">P</span><span class="title-char">o</span><span class="title-char">c</span><span class="title-char">k</span><span class="title-char">e</span><span class="title-char">t</span><span class="title-char">&nbsp;</span><span class="title-char">P</span><span class="title-char">i</span><span class="title-char">l</span><span class="title-char">o</span><span class="title-char">t</span></span>
        </a>
        <p class="logo-tagline">Track Your Expenses, Don't Let Expenses Track You!</p>
      </div>
      <nav class="sidebar-nav">
        <a href="#/dashboard" class="nav-item active" data-route="dashboard" data-label="Dashboard" aria-current="page">
          <span class="nav-icon" aria-hidden="true">◉</span>
          <span class="nav-label">Dashboard</span>
        </a>
        <a href="#/transactions" class="nav-item" data-route="transactions" data-label="Transactions">
          <span class="nav-icon" aria-hidden="true">☰</span>
          <span class="nav-label">Transactions</span>
        </a>
        <a href="#/reports" class="nav-item" data-route="reports" data-label="Reports">
          <span class="nav-icon" aria-hidden="true">◐</span>
          <span class="nav-label">Reports</span>
        </a>
        <a href="#/settings" class="nav-item" data-route="settings" data-label="Settings">
          <span class="nav-icon" aria-hidden="true">⚙</span>
          <span class="nav-label">Settings</span>
        </a>
      </nav>
      <div class="sidebar-footer">
        <button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle sidebar" title="Toggle sidebar">
          <span class="sidebar-toggle-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
        <div class="sidebar-profile">
          <label class="sidebar-avatar-btn" tabindex="0" role="button" aria-label="Change profile picture">
            <span class="sidebar-profile-avatar">${profile ? escapeHtml(profile.name.charAt(0).toUpperCase()) : '?'}</span>
            <input type="file" accept="image/*" class="profile-avatar-input sidebar-avatar-input" aria-hidden="true">
          </label>
          <span class="sidebar-profile-name">${profile ? escapeHtml(profile.name) : 'Guest'}</span>
          <button id="btn-logout" class="btn-logout" aria-label="Switch profile" title="Switch profile">↪</button>
        </div>
        <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme" title="Toggle dark/light mode">
          <svg class="theme-icon-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M12 1v2M12 21v2M1 12h2M21 12h2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg class="theme-icon-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="theme-label">Theme</span>
        </button>
      </div>
    </aside>

    <main id="main-content" class="main-content" tabindex="-1">
      <header id="topbar" class="topbar"></header>
      <div id="page-content" class="page-content"></div>
    </main>

    <button id="fab" class="fab" aria-label="Add expense" title="Add expense">+</button>

    <div id="sidebar-overlay" class="sidebar-overlay"></div>
    <div id="modal-overlay" class="modal-overlay hidden"></div>
    <div id="toast-container" class="toast-container" aria-live="polite"></div>

    <nav id="bottom-tab" class="bottom-tab" role="navigation" aria-label="Mobile navigation">
      <a href="#/dashboard" class="tab-item active" data-route="dashboard" aria-current="page">
        <span class="tab-icon" aria-hidden="true">◉</span>
        <span class="tab-label">Home</span>
      </a>
      <a href="#/transactions" class="tab-item" data-route="transactions">
        <span class="tab-icon" aria-hidden="true">☰</span>
        <span class="tab-label">List</span>
      </a>
      <a href="#/reports" class="tab-item" data-route="reports">
        <span class="tab-icon" aria-hidden="true">◐</span>
        <span class="tab-label">Reports</span>
      </a>
      <a href="#/settings" class="tab-item" data-route="settings">
        <span class="tab-icon" aria-hidden="true">⚙</span>
        <span class="tab-label">Settings</span>
      </a>
    </nav>
  `;

  app.appendChild(shell);

  const fab = document.getElementById('fab');
  fab.classList.add('fab-pulse');
  fab.addEventListener('click', () => {
    fab.classList.remove('fab-pulse');
    openExpenseFormModal();
  });

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      ProfileService.clearSession();
      ProfileService.clearActive();
      ExpenseService._invalidateCache();
      renderLoginScreen();
      initTheme();
    });
  }

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  /* ─── Sidebar State ─── */

  const savedSidebar = localStorage.getItem('pocketpilot-sidebar');
  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

  if (!isMobile) {
    let shouldCollapse;
    if (savedSidebar !== null) {
      shouldCollapse = savedSidebar === 'collapsed';
    } else {
      shouldCollapse = isTablet;
    }

    if (shouldCollapse) {
      shell.classList.add('sidebar-collapsed');
    }
  }

  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.toggle('mobile-open');
        if (overlay) overlay.classList.toggle('visible');
        return;
      }
      shell.classList.toggle('sidebar-collapsed');
      const collapsed = shell.classList.contains('sidebar-collapsed');
      localStorage.setItem('pocketpilot-sidebar', collapsed ? 'collapsed' : 'expanded');
    });
  }

  const sidebarOverlay = document.getElementById('sidebar-overlay');
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('mobile-open');
      sidebarOverlay.classList.remove('visible');
    });
  }

  const sidebarNav = document.querySelector('.sidebar-nav');
  if (sidebarNav) {
    sidebarNav.addEventListener('click', (e) => {
      const navItem = e.target.closest('[data-route]');
      if (navItem && window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('visible');
      }
    });
  }

  const sidebarAvatarLabel = document.querySelector('.sidebar-avatar-btn');
  const sidebarAvatarSpan = document.querySelector('.sidebar-profile-avatar');
  const sidebarInput = document.querySelector('.sidebar-avatar-input');
  const avatarKey = 'pocketpilot-avatar-' + (profile?.id || 'default');
  const savedAvatar = localStorage.getItem(avatarKey);
  if (savedAvatar && sidebarAvatarSpan) {
    sidebarAvatarSpan.style.backgroundImage = `url(${savedAvatar})`;
    sidebarAvatarSpan.style.backgroundSize = 'cover';
    sidebarAvatarSpan.textContent = '';
  }
  if (sidebarInput) {
    sidebarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        localStorage.setItem(avatarKey, dataUrl);
        if (sidebarAvatarSpan) {
          sidebarAvatarSpan.style.backgroundImage = `url(${dataUrl})`;
          sidebarAvatarSpan.style.backgroundSize = 'cover';
          sidebarAvatarSpan.textContent = '';
        }
        const topbarAvatar = document.querySelector('.topbar-avatar');
        if (topbarAvatar) {
          topbarAvatar.style.backgroundImage = `url(${dataUrl})`;
          topbarAvatar.style.backgroundSize = 'cover';
          topbarAvatar.textContent = '';
        }
      };
      reader.readAsDataURL(file);
    });
  }

  const logoText = document.querySelector('.logo-text');
  if (logoText) {
    const titleChars = logoText.querySelectorAll('.title-char');
    let logoTimer;
    const LOGO_CHAR_DELAY = 120;
    const LOGO_TYPE_DURATION = 350;

    function runLogoCycle() {
      logoText.classList.remove('glow-active');
      titleChars.forEach(el => {
        el.classList.remove('type-active');
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
      });
      clearTimeout(logoTimer);
      setTimeout(() => {
        titleChars.forEach((el, i) => {
          el.style.transition = 'none';
          el.style.animationDelay = i * LOGO_CHAR_DELAY + 'ms';
          el.classList.add('type-active');
        });
        const totalMs = (titleChars.length - 1) * LOGO_CHAR_DELAY + LOGO_TYPE_DURATION;
        logoTimer = setTimeout(() => {
          logoText.classList.add('glow-active');
        }, totalMs + 50);
      }, 400);
    }

    runLogoCycle();
    setInterval(runLogoCycle, 12000);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ───────── Bootstrap ───────── */

function bootstrapApp() {
  ProfileService._migrate();
  const sessionId = ProfileService.getSession();
  const activeProfile = ProfileService.getActive();

  if (sessionId && !activeProfile) {
    const sessionProfile = ProfileService.getById(sessionId);
    if (sessionProfile) {
      ProfileService.setActive(sessionId);
      createAppShell();
      initTheme();
      initRouter();
      setupKeyboardShortcuts();
      return;
    }
  }

  if (!activeProfile) {
    renderLoginScreen();
    initTheme();
    return;
  }

  createAppShell();
  initTheme();
  initRouter();
  setupKeyboardShortcuts();
}

document.addEventListener('DOMContentLoaded', () => {
  setupErrorBoundary();
  bootstrapApp();
});
