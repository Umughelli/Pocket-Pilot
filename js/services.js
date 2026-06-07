/* ═══════════════════════════════════════════
   Pocket Pilot — Data Services
   Storage, validation, CRUD, export/import,
   and undo-delete support.
   ═══════════════════════════════════════════ */

import { STORAGE, LIMITS, APP } from './config.js';

/* ───────── Storage ───────── */

export const StorageService = {
  get(key) {
    try {
      const raw = localStorage.getItem(STORAGE.prefix + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key, data) {
    try {
      localStorage.setItem(STORAGE.prefix + key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(STORAGE.prefix + key);
  }
};

/* ───────── ID generation ───────── */

function generateId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* ───────── Profile Service ───────── */

export const ProfileService = {
  _key() { return STORAGE.keys.profiles; },

  getAll() {
    return StorageService.get(this._key()) || [];
  },

  getActiveId() {
    return StorageService.get(STORAGE.keys.activeProfile) || null;
  },

  getActive() {
    const id = this.getActiveId();
    if (!id) return null;
    return this.getAll().find(p => p.id === id) || null;
  },

  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  setActive(id) {
    StorageService.set(STORAGE.keys.activeProfile, id);
    _cache = null;
  },

  clearActive() {
    StorageService.remove(STORAGE.keys.activeProfile);
    _cache = null;
  },

  create(name, pin) {
    name = name.trim();
    if (!name) throw new Error('Profile name is required.');
    if (name.length > 30) throw new Error('Profile name must be 30 characters or less.');
    if (!pin || !/^\d{4,6}$/.test(pin)) throw new Error('PIN must be 4–6 digits.');
    const profiles = this.getAll();
    if (profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A profile with this name already exists.');
    }
    const profile = {
      id: generateId(),
      name,
      pin: btoa(pin),
      createdAt: new Date().toISOString()
    };
    profiles.push(profile);
    StorageService.set(this._key(), profiles);
    return profile;
  },

  update(id, data) {
    const profiles = this.getAll();
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    profiles[idx] = { ...profiles[idx], ...data, updatedAt: new Date().toISOString() };
    StorageService.set(this._key(), profiles);
    return profiles[idx];
  },

  delete(id) {
    let profiles = this.getAll();
    profiles = profiles.filter(p => p.id !== id);
    StorageService.set(this._key(), profiles);
    StorageService.remove(STORAGE.keys.expenses + '-' + id);
    StorageService.remove(STORAGE.keys.avatar + '-' + id);
    this.clearSession();
    if (this.getActiveId() === id) this.clearActive();
  },

  verifyPin(id, pin) {
    const profile = this.getById(id);
    if (!profile) return false;
    if (!profile.pin) return false;
    return btoa(pin) === profile.pin;
  },

  hasPin(id) {
    const profile = this.getById(id);
    return !!profile?.pin;
  },

  updatePin(id, currentPin, newPin) {
    if (!this.verifyPin(id, currentPin)) throw new Error('Current PIN is incorrect.');
    if (!newPin || !/^\d{4,6}$/.test(newPin)) throw new Error('New PIN must be 4–6 digits.');
    const profile = this.getById(id);
    if (!profile) throw new Error('Profile not found.');
    return this.update(id, { pin: btoa(newPin) });
  },

  setPin(id, newPin) {
    if (!newPin || !/^\d{4,6}$/.test(newPin)) throw new Error('PIN must be 4–6 digits.');
    const profile = this.getById(id);
    if (!profile) throw new Error('Profile not found.');
    return this.update(id, { pin: btoa(newPin), updatedAt: new Date().toISOString() });
  },

  /* ─── Session ─── */

  _sessionKey() { return STORAGE.keys.activeProfile; },

  setSession(profileId) {
    sessionStorage.setItem(this._sessionKey(), profileId);
  },

  getSession() {
    return sessionStorage.getItem(this._sessionKey()) || null;
  },

  clearSession() {
    sessionStorage.removeItem(this._sessionKey());
  },

  /* ─── Migration ─── */

  _migrate() {
    const profiles = this.getAll();
    let changed = false;
    profiles.forEach(p => {
      if (!p.pin) {
        p.pin = '';
        changed = true;
      }
    });
    if (changed) StorageService.set(this._key(), profiles);
  },

  _expenseKey(profileId) {
    return STORAGE.keys.expenses + '-' + (profileId || this.getActiveId() || 'default');
  }
};

/* ───────── Validation ───────── */

function valid(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) errors.push('name');
  else if (data.name.trim().length > LIMITS.maxNameLength) errors.push('name_length');
  if (!data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) errors.push('amount');
  else if (Number(data.amount) > LIMITS.maxAmount) errors.push('amount_max');
  if (!data.category) errors.push('category');
  if (!data.date) errors.push('date');
  return errors;
}

/* ───────── Undo buffer ───────── */

let _undoBuffer = null;
let _undoTimer = null;

const UNDO_TIMEOUT = 5000;

/* ───────── Expense Service ───────── */

let _cache = null;

export const ExpenseService = {
  getAll() {
    if (!_cache) _cache = this.load();
    return _cache;
  },

  getById(id) {
    return this.getAll().find(e => e.id === id) || null;
  },

  _persist() {
    this.save(_cache);
  },

  _invalidateCache() {
    _cache = null;
  },

  add(data) {
    const errs = valid(data);
    if (errs.length) {
      const msg = errs.map(e => ({ name: 'Please enter an expense name.', name_length: 'Name is too long.', amount: 'Please enter a valid amount.', amount_max: 'Amount is too large.', category: 'Please select a category.', date: 'Please select a date.' }[e])).join(' ');
      throw new Error(msg);
    }
    const expenses = this.getAll();
    const expense = {
      id: generateId(),
      name: data.name.trim(),
      amount: Number(data.amount),
      category: data.category,
      date: data.date,
      time: data.time || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    expenses.push(expense);
    this._persist();
    return expense;
  },

  update(id, data) {
    const expenses = this.getAll();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx === -1) return null;
    expenses[idx] = {
      ...expenses[idx],
      name: data.name !== undefined ? data.name.trim() : expenses[idx].name,
      amount: data.amount !== undefined ? Number(data.amount) : expenses[idx].amount,
      category: data.category !== undefined ? data.category : expenses[idx].category,
      date: data.date !== undefined ? data.date : expenses[idx].date,
      time: data.time !== undefined ? data.time : expenses[idx].time,
      updatedAt: new Date().toISOString()
    };
    this._persist();
    return expenses[idx];
  },

  delete(id) {
    const expenses = this.getAll().filter(e => e.id !== id);
    _cache = expenses;
    this.save(expenses);
    return expenses;
  },

  deleteWithUndo(id, onUndo) {
    const expenses = this.getAll();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx === -1) return null;

    const removed = expenses.splice(idx, 1)[0];
    _cache = expenses;
    this.save(expenses);

    if (_undoTimer) clearTimeout(_undoTimer);
    _undoBuffer = removed;

    _undoTimer = setTimeout(() => {
      _undoBuffer = null;
      _undoTimer = null;
    }, UNDO_TIMEOUT);

    return removed;
  },

  undoDelete() {
    if (!_undoBuffer) return null;
    if (_undoTimer) clearTimeout(_undoTimer);
    _undoTimer = null;

    const expenses = this.getAll();
    expenses.push(_undoBuffer);
    _cache = expenses;
    this.save(expenses);
    const restored = _undoBuffer;
    _undoBuffer = null;
    return restored;
  },

  clearAll() {
    _cache = [];
    this.save([]);
    return [];
  },

  load() {
    return StorageService.get(ProfileService._expenseKey()) || [];
  },

  save(expenses) {
    StorageService.set(ProfileService._expenseKey(), expenses);
  },

  /* ─── Export ─── */

  exportCSV() {
    const expenses = this.getAll();
    if (expenses.length === 0) return null;

    const headers = ['Name', 'Amount (NGN)', 'Category', 'Date', 'Time', 'Created At'];
    const rows = expenses.map(e => {
      const cat = CATEGORIES.find(c => c.id === e.category);
      return [
        `"${e.name.replace(/"/g, '""')}"`,
        e.amount.toFixed(2),
        cat ? cat.name : e.category,
        e.date,
        e.time || '',
        e.createdAt
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  },

  exportJSON() {
    const expenses = this.getAll();
    if (expenses.length === 0) return null;
    return JSON.stringify(expenses, null, 2);
  },

  importJSON(jsonStr) {
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      throw new Error('Invalid JSON format.');
    }

    if (!Array.isArray(data)) throw new Error('Expected an array of expenses.');

    const expenses = this.getAll();
    let added = 0;
    let skipped = 0;

    data.forEach(item => {
      if (!item.name || !item.amount || !item.date) { skipped++; return; }

      const errs = valid(item);
      if (errs.length) { skipped++; return; }

      const expense = {
        id: item.id || generateId(),
        name: item.name.trim(),
        amount: Number(item.amount),
        category: item.category || 'others',
        date: item.date,
        time: item.time || '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (item.id && expenses.some(e => e.id === item.id)) {
        const existingIdx = expenses.findIndex(e => e.id === item.id);
        expenses[existingIdx] = { ...expenses[existingIdx], ...expense, updatedAt: new Date().toISOString() };
        added++;
      } else {
        expenses.push(expense);
        added++;
      }
    });

    _cache = expenses;
    this.save(expenses);

    return { added, skipped, total: expenses.length };
  },

  importCSV(csvStr) {
    const lines = csvStr.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const nameIdx = headers.findIndex(h => h.includes('name'));
    const amountIdx = headers.findIndex(h => h.includes('amount'));
    const categoryIdx = headers.findIndex(h => h.includes('category'));
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const timeIdx = headers.findIndex(h => h.includes('time'));

    if (nameIdx === -1 || amountIdx === -1 || dateIdx === -1) {
      throw new Error('CSV must have Name, Amount, and Date columns.');
    }

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 2) continue;

      items.push({
        name: cols[nameIdx]?.replace(/^"|"$/g, '').trim() || '',
        amount: parseFloat(cols[amountIdx]?.replace(/[^0-9.-]/g, '') || '0'),
        category: categoryIdx >= 0 ? cols[categoryIdx]?.trim().toLowerCase() : 'others',
        date: cols[dateIdx]?.trim() || '',
        time: timeIdx >= 0 ? cols[timeIdx]?.trim() || '' : ''
      });
    }

    return this.importJSON(JSON.stringify(items));
  }
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/* ───────── Categories ───────── */

export const CATEGORIES = [
  { id: 'food', name: 'Food', color: '#10B981' },
  { id: 'transport', name: 'Transport', color: '#3B82F6' },
  { id: 'utilities', name: 'Utility Bills', color: '#8B5CF6' },
  { id: 'shopping', name: 'Shopping', color: '#F59E0B' },
  { id: 'entertainment', name: 'Entertainment', color: '#EC4899' },
  { id: 'healthcare', name: 'Healthcare', color: '#EF4444' },
  { id: 'gym', name: 'Gym Registration', color: '#14B8A6' },
  { id: 'others', name: 'Others', color: '#6B7280' }
];
