/* ═══════════════════════════════════════════
   Pocket Pilot — Application Configuration
   ═══════════════════════════════════════════ */

export const APP = {
  name: 'Pocket Pilot',
  version: '1.0.0',
  description: 'Take control of your finances with intelligent expense tracking',
  locale: 'en-NG',
  currency: 'NGN'
};

export const STORAGE = {
  prefix: 'pocketpilot-',
  keys: {
    expenses: 'expenses',
    profiles: 'profiles',
    activeProfile: 'active-profile',
    avatar: 'avatar'
  }
};

export const API = {
  baseUrl: import.meta.env?.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  retries: 2,
  useMock: true
};

export const PAGINATION = {
  pageSize: 50,
  maxRecentItems: 5
};

export const LIMITS = {
  maxNameLength: 120,
  maxAmount: 999999999.99,
  minAmount: 0.01,
  maxExpenses: 100000
};

export const UI = {
  toastDuration: 3500,
  undoTimeout: 5000,
  searchDebounce: 300,
  animationSpeed: {
    fast: 150,
    normal: 250,
    slow: 400
  }
};
