// Elder-friendly single-page Expense Tracker (Vanilla JS)
// Implements custom totals display, removes bottom history, adds action buttons.

import { API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from '../dist/env.js';

const $ = (sel, root = document) => root.querySelector(sel);

const state = {
  categories: [],
  currency: 'USD',
};

function formatMoney(amount, currency = 'USD') {
  const num = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
}

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  for (const c of children) node.append(c?.nodeType ? c : document.createTextNode(String(c)));
  return node;
}

function showToast(message, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 260);
  }, 2300);
}

async function api(path, { method = 'GET', body } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const t = await res.text();
      if (t) msg += ` - ${t}`;
    } catch {}
    throw new Error(msg);
  }

  return res.headers.get('content-type')?.includes('application/json') ? res.json() : res.text();
}

function parseDateOnly(value) {
  if (!value) return '';
  if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
  return String(value);
}

function computeTotals(transactions) {
  let incomeAdded = 0;
  let expensesAdded = 0;
  let currency = state.currency || 'USD';

  for (const t of transactions) {
    currency = t.currency || currency;
    if (t.type === 'income') incomeAdded += Number(t.amount || 0);
    else if (t.type === 'expense') expensesAdded += Number(t.amount || 0);
  }

  // Rule:
  // Displayed Total Income = incomes added - expenses added
  // Available Balance = displayed income (net remaining)
  const displayedIncome = incomeAdded - expensesAdded;
  const balance = displayedIncome;

  return {
    incomeAdded,
    expensesAdded,
    totalIncome: displayedIncome,
    totalExpenses: expensesAdded,
    balance,
    currency,
  };
}

async function loadCategories() {
  const cats = await api('/api/categories');
  state.categories = cats.items || [];
}

async function refreshTotals() {
  const txRes = await api('/api/transactions?limit=200&offset=0');
  const transactions = txRes.items || [];

  const { totalIncome, totalExpenses, balance, currency } = computeTotals(transactions);
  state.currency = currency;

  $('#wTotalIncome').textContent = formatMoney(totalIncome, currency);
  $('#wTotalExpenses').textContent = formatMoney(totalExpenses, currency);
  $('#wBalance').textContent = formatMoney(balance, currency);
}

async function resolveCategoryId({ name, type }) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const resolved = await api('/api/categories/resolve', {
    method: 'POST',
    body: { name: trimmed, type },
  });

  return resolved?.item?.id || null;
}

async function fetchTodaysTransactionsRaw() {
  const today = isoDate();
  const txRes = await api('/api/transactions?limit=500&offset=0');
  const transactions = txRes.items || [];

  return transactions
    .filter((t) => parseDateOnly(t.date) === today)
    .map((t) => ({
      id: t.id,
      date: parseDateOnly(t.date),
      type: t.type,
      category: t.category_name || t.category || t.category_name_resolved || '—',
      amount: Number(t.amount || 0),
      currency: t.currency || state.currency || 'USD',
      description: t.description || '',
    }));
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function deleteAllTransactionsForToday() {
  // Best-effort: delete by IDs returned for today.
  const todays = await fetchTodaysTransactionsRaw();
  await Promise.all(todays.map((t) => api(`/api/transactions/${t.id}`, { method: 'DELETE' })));
}

async function deleteAllTransactionsAllTime() {
  // Backend likely supports limit/offset; if not, this still tries.
  // We'll fetch repeatedly to get complete coverage.
  const pageSize = 250;
  let offset = 0;
  let keepGoing = true;

  while (keepGoing) {
    const txRes = await api(`/api/transactions?limit=${pageSize}&offset=${offset}`);
    const items = txRes.items || [];
    if (items.length === 0) break;

    await Promise.all(items.map((t) => api(`/api/transactions/${t.id}`, { method: 'DELETE' })));

    offset += pageSize;
    if (items.length < pageSize) keepGoing = false;
  }
}

function renderShell() {
  const app = $('#app');
  app.innerHTML = '';

  const shell = el('div', { class: 'shell' }, [
    el('div', { class: 'topbar' }, [
      el('div', { class: 'brand' }, [
        el('div', { class: 'brandMark' }, ['₹']),
        el('div', { class: 'brandText' }, [
          el('div', { class: 'brandName' }, ['Expense Tracker']),
          el('div', { class: 'brandSub' }, ['Elder-friendly dashboard']),
        ]),
      ]),
    ]),

    el('div', { class: 'content' }, [
      el('section', { class: 'hero' }, [
        el('h1', { class: 'heroTitle' }, ['Quick Overview']),
        el('p', { class: 'heroSub' }, ['Add transactions below. Totals update automatically.']),
      ]),

      el('section', { class: 'grid3' }, [
        // Income card
        el('div', { class: 'card incomeCard' }, [
          el('div', { class: 'statLabel' }, ['Total Income']),
          el('div', { class: 'statValue good', id: 'wTotalIncome' }, ['—']),

          el('div', { class: 'quickBox' }, [
            el('label', { for: 'quickIncomeAmount' }, ['Enter Income Amount']),
            el('input', {
              id: 'quickIncomeAmount',
              name: 'quickIncomeAmount',
              type: 'number',
              min: '0',
              step: '0.01',
            }),
            el('button', { type: 'button', class: 'btnPrimary quickBtn', id: 'btnAddIncome' }, ['Add Income']),
          ]),
        ]),

        // Expenses card + Clear Expenses
        el('div', { class: 'card' }, [
          el('div', { class: 'statLabel' }, ['Total Expenses']),
          el('div', { class: 'statValue bad', id: 'wTotalExpenses' }, ['—']),

          el('div', { class: 'cardActions' }, [
            el('button', { type: 'button', class: 'btnSecondary', id: 'btnClearExpenses' }, ['Clear Expenses']),
          ]),
        ]),

        // Balance card + Download & Reset Day
        el('div', { class: 'card' }, [
          el('div', { class: 'statLabel' }, ['Available Balance']),
          el('div', { class: 'statValue', id: 'wBalance' }, ['—']),

          el('div', { class: 'cardActions' }, [
            el('button', { type: 'button', class: 'btnSecondary', id: 'btnDownloadReset' }, ['Download & Reset Day']),
          ]),
        ]),
      ]),

      el('section', { class: 'card' }, [
        el('div', { class: 'statLabel' }, ['Quick Add Transaction']),
        el('div', { class: 'bigHelp' }, ['Fill the form using clear labels. We will resolve the category automatically.']),

        el('form', { id: 'txForm' }, [
          el('div', { class: 'formGrid' }, [
            // Type
            (function () {
              const group = el('div', { class: 'formRow' });
              group.append(el('label', { for: 'type' }, ['Type']));
              const sel = el('select', { id: 'type', name: 'type' });
              sel.append(el('option', { value: 'income' }, ['Income']));
              sel.append(el('option', { value: 'expense' }, ['Expense']));
              group.append(sel);
              return group;
            })(),

            // Date
            (function () {
              const group = el('div', { class: 'formRow' });
              group.append(el('label', { for: 'date' }, ['Date']));
              group.append(el('input', { id: 'date', name: 'date', type: 'date' }));
              return group;
            })(),

            // Category text
            (function () {
              const group = el('div', { class: 'formRow' });
              group.append(el('label', { for: 'categoryName' }, ['Category Name']));
              group.append(
                el('input', {
                  id: 'categoryName',
                  name: 'categoryName',
                  type: 'text',
                  placeholder: 'e.g. Groceries',
                })
              );
              return group;
            })(),

            // Amount
            (function () {
              const group = el('div', { class: 'formRow' });
              group.append(el('label', { for: 'amount' }, ['Amount']));
              group.append(el('input', { id: 'amount', name: 'amount', type: 'number', min: '0', step: '0.01' }));
              return group;
            })(),

            // Currency
            (function () {
              const group = el('div', { class: 'formRow' });
              group.append(el('label', { for: 'currency' }, ['Currency']));
              group.append(el('input', { id: 'currency', name: 'currency', type: 'text', value: 'USD' }));
              return group;
            })(),

            // Description
            (function () {
              const group = el('div', { class: 'formRow' });
              group.append(el('label', { for: 'description' }, ['Description (optional)']));
              group.append(
                el('input', { id: 'description', name: 'description', type: 'text', placeholder: 'What did you buy?' })
              );
              return group;
            })(),
          ]),

          el('div', { class: 'actions', style: 'margin-top:14px' }, [
            el('button', { class: 'btnPrimary', type: 'submit', id: 'btnAdd' }, ['Add Transaction']),
          ]),

          el('input', { type: 'hidden', id: 'resolvedCategoryId', name: 'resolvedCategoryId' }),

          el('div', { class: 'bigHelp', style: 'margin-top:10px' }, ['Tip: If the category does not exist, it will be resolved using your name.']),
        ]),
      ]),
    ]),
  ]);

  app.append(shell);
}

function wireEvents() {
  const form = $('#txForm');

  // Clear Expenses: remove only today's expense transactions
  $('#btnClearExpenses')?.addEventListener('click', async () => {
    try {
      $('#btnClearExpenses').disabled = true;
      const todays = await fetchTodaysTransactionsRaw();
      const expenseIds = todays.filter((t) => t.type === 'expense').map((t) => t.id);
      await Promise.all(expenseIds.map((id) => api(`/api/transactions/${id}`, { method: 'DELETE' })));
      await refreshTotals();
      showToast('Expenses cleared for today', 'success');
    } catch (e) {
      console.error(e);
      showToast(e?.message || 'Failed to clear expenses', 'error');
    } finally {
      $('#btnClearExpenses').disabled = false;
    }
  });

  // Download & Reset Day
  $('#btnDownloadReset')?.addEventListener('click', async () => {
    try {
      $('#btnDownloadReset').disabled = true;

      const todays = await fetchTodaysTransactionsRaw();

      const lines = [
        `Date: ${isoDate()}`,
        `Transactions: ${todays.length}`,
        '',
      ];

      for (const t of todays) {
        lines.push(
          `${t.date} | ${t.type.toUpperCase()} | ${t.category} | ${t.currency} ${t.amount.toFixed(2)} | ${t.description || ''}`.trim()
        );
      }

      const content = lines.join('\n');
      downloadTextFile('today_expenses.txt', content);

      // Immediately wipe backend data so app resets to 0.
      // Prefer deleting all-time so totals truly go to 0.
      await deleteAllTransactionsAllTime();

      await refreshTotals();
      showToast('Day downloaded and system reset to 0', 'success');
    } catch (e) {
      console.error(e);
      showToast(e?.message || 'Failed to download & reset', 'error');
    } finally {
      $('#btnDownloadReset').disabled = false;
    }
  });

  // Quick add income
  const quickIncomeInput = $('#quickIncomeAmount');
  const btnAddIncome = $('#btnAddIncome');

  btnAddIncome?.addEventListener('click', async () => {
    const amount = Number(quickIncomeInput?.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a valid income amount', 'error');
      return;
    }

    const type = 'income';
    const date = isoDate();
    const currency = ($('#currency')?.value || state.currency || 'USD').trim() || 'USD';

    try {
      const category_id = await resolveCategoryId({ name: 'Income', type });
      if (!category_id) {
        showToast('Please create or name an Income category', 'error');
        return;
      }

      await api('/api/transactions', {
        method: 'POST',
        body: {
          type,
          date,
          category_id,
          amount,
          currency,
          description: 'Quick income',
        },
      });

      quickIncomeInput.value = '';
      await refreshTotals();
      showToast('Income added', 'success');
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'Failed to add income', 'error');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = $('#type').value;
    const date = $('#date').value || isoDate();
    const amount = Number($('#amount').value);
    const currency = ($('#currency').value || 'USD').trim();
    const description = ($('#description').value || '').trim();
    const categoryName = ($('#categoryName').value || '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    if (!categoryName) {
      showToast('Enter a category name', 'error');
      return;
    }

    try {
      const category_id = await resolveCategoryId({ name: categoryName, type });
      if (!category_id) {
        showToast('Could not resolve category', 'error');
        return;
      }

      $('#resolvedCategoryId').value = category_id;

      await api('/api/transactions', {
        method: 'POST',
        body: { type, date, category_id, amount, currency, description },
      });

      form.reset();
      $('#date').value = isoDate();
      $('#currency').value = currency || 'USD';

      await refreshTotals();
      showToast('Transaction added', 'success');
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'Failed to add transaction', 'error');
    }
  });
}

async function initSupabaseRealtime() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  try {
    if (window.supabase) return;

    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });

    supabaseClient
      .channel('realtime-transactions-elder')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          refreshTotals().catch(() => {});
        }
      )
      .subscribe();
  } catch {
    // skip
  }
}

async function boot() {
  renderShell();
  wireEvents();

  $('#date')?.setAttribute('value', isoDate());
  if ($('#currency')) $('#currency').value = 'USD';
  if ($('#type')) $('#type').value = 'expense';

  await loadCategories().catch(() => {});
  await Promise.all([refreshTotals().catch(() => showToast('Failed to load totals', 'error'))]);

  await initSupabaseRealtime();
}

boot().catch((e) => {
  console.error(e);
  const app = $('#app');
  app.innerHTML = `<div class="card" style="padding:18px">Failed to load app.</div>`;
});

