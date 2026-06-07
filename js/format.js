const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

export function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export function formatMonthYear(date) {
  return date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
}

export function formatDateFull(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateRange(period, customStart, customEnd) {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      return { start: toDateStr(start), end: toDateStr(start) };
    case 'week': {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start: toDateStr(start), end: toDateStr(end) };
    }
    case 'month':
      return getMonthDateRange(today.getFullYear(), today.getMonth());
    case 'year': {
      const end = new Date(today.getFullYear(), 11, 31);
      return { start: `${today.getFullYear()}-01-01`, end: toDateStr(end) };
    }
    case 'all':
      return { start: '2000-01-01', end: toDateStr(today) };
    case 'custom':
      return { start: customStart || '2000-01-01', end: customEnd || toDateStr(today) };
    default:
      return { start: '2000-01-01', end: toDateStr(today) };
  }
}

export function formatPeriodLabel(period) {
  const labels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time'
  };
  return labels[period] || period;
}

export function getPeriodPresets() {
  return [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ];
}

export function getMonthDateRange(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0);
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

export function compareByDate(a, b) {
  const d = new Date(b.date) - new Date(a.date);
  if (d !== 0) return d;
  return (b.time || '').localeCompare(a.time || '');
}

export function compareByDateAsc(a, b) {
  const d = new Date(a.date) - new Date(b.date);
  if (d !== 0) return d;
  return (a.time || '').localeCompare(b.time || '');
}

export function compareByAmountDesc(a, b) {
  return b.amount - a.amount;
}

export function compareByAmountAsc(a, b) {
  return a.amount - b.amount;
}
