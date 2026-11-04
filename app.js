const STORAGE_KEY = 'ledgerline-demo-v1';
const today = new Date().toISOString().slice(0, 10);
const seed = {
  customers: [
    { id: 'c-101', name: 'Olivia Bennett', email: 'olivia.bennett@email.com', phone: '(415) 555-0182', joined: '2026-10-28' },
    { id: 'c-102', name: 'Ethan Chen', email: 'ethan.chen@email.com', phone: '(415) 555-0127', joined: '2026-10-25' },
    { id: 'c-103', name: 'Sofia Ramirez', email: 'sofia.ramirez@email.com', phone: '(415) 555-0193', joined: '2026-10-21' },
    { id: 'c-104', name: 'Noah Williams', email: 'noah.williams@email.com', phone: '(415) 555-0144', joined: '2026-10-18' },
    { id: 'c-105', name: 'Amara Johnson', email: 'amara.johnson@email.com', phone: '(415) 555-0168', joined: '2026-10-14' }
  ],
  accounts: [
    { id: 'a-201', customerId: 'c-101', number: 'LL-38492051', type: 'Checking', balance: 12480.5, status: 'Active' },
    { id: 'a-202', customerId: 'c-102', number: 'LL-72915384', type: 'Savings', balance: 28750, status: 'Active' },
    { id: 'a-203', customerId: 'c-103', number: 'LL-50618273', type: 'Checking', balance: 8392.16, status: 'Active' },
    { id: 'a-204', customerId: 'c-104', number: 'LL-19472836', type: 'Business', balance: 45210.75, status: 'Pending' },
    { id: 'a-205', customerId: 'c-105', number: 'LL-86203491', type: 'Savings', balance: 16805.2, status: 'Active' }
  ],
  transactions: [
    { id: 't-301', accountId: 'a-201', type: 'Deposit', amount: 850, description: 'Monthly payroll', createdAt: `${today}T09:18:00.000Z` },
    { id: 't-302', accountId: 'a-202', type: 'Withdrawal', amount: 125, description: 'Card purchase', createdAt: `${today}T08:42:00.000Z` },
    { id: 't-303', accountId: 'a-203', type: 'Deposit', amount: 420, description: 'Mobile check deposit', createdAt: `${today}T08:06:00.000Z` }
  ]
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.customers) && Array.isArray(saved.accounts)) {
      return { ...saved, transactions: Array.isArray(saved.transactions) ? saved.transactions : structuredClone(seed.transactions) };
    }
  } catch (error) {
    console.warn('Ledgerline demo data could not be loaded.', error);
  }
  return structuredClone(seed);
}

let data = loadData();
let activeView = 'overview';
let editingId = null;
let editingEntity = null;
let toastTimer;

const byId = (id) => document.getElementById(id);
const dialog = byId('record-dialog');
const form = byId('record-form');
const transactionDialog = byId('transaction-dialog');
const transactionForm = byId('transaction-form');
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const transactionDateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function updateGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  byId('current-date').textContent = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }).format(now).toUpperCase();
  byId('greeting-copy').textContent = `${greeting}, Jordan`;
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    showToast('Could not save changes in this browser.');
    console.error('Ledgerline demo data could not be saved.', error);
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
}

function customerFor(account) {
  return data.customers.find((customer) => customer.id === account.customerId);
}

function customerCount(customerId) {
  return data.accounts.filter((account) => account.customerId === customerId).length;
}

function transactionDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : transactionDateFormat.format(parsed);
}

function formattedDate(value) {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormat.format(parsed);
}

function statusClass(status) {
  return status === 'Pending' ? 'status-pending' : status === 'Closed' ? 'status-closed' : '';
}

function accountRow(account) {
  const customer = customerFor(account);
  const name = customer?.name || 'Unknown customer';
  return `<tr>
    <td><div class="account-cell"><span class="account-symbol" aria-hidden="true">▤</span><span class="account-number">${escapeHtml(account.number)}</span></div></td>
    <td><div class="person-cell"><span class="person-initials">${escapeHtml(initials(name))}</span><span class="person-name">${escapeHtml(name)}</span></div></td>
    <td>${escapeHtml(account.type)}</td><td class="balance-cell">${money.format(Number(account.balance) || 0)}</td>
    <td><span class="status-badge ${statusClass(account.status)}">${escapeHtml(account.status)}</span></td>
    <td><div class="row-actions"><button class="row-action" data-transaction="${escapeHtml(account.id)}" aria-label="Record transaction for ${escapeHtml(account.number)}" title="Record transaction" ${account.status !== 'Active' ? 'disabled' : ''}>↕</button><button class="row-action" data-edit="account" data-id="${escapeHtml(account.id)}" aria-label="Edit account ${escapeHtml(account.number)}" title="Edit account">✎</button><button class="row-action delete" data-delete="account" data-id="${escapeHtml(account.id)}" aria-label="Delete account ${escapeHtml(account.number)}" title="Delete account">×</button></div></td>
  </tr>`;
}

function transactionRow(transaction, compact = false) {
  const account = data.accounts.find((item) => item.id === transaction.accountId);
  const customer = account && customerFor(account);
  const isDeposit = transaction.type === 'Deposit';
  const sign = isDeposit ? '+' : '−';
  const kind = isDeposit ? 'deposit' : 'withdrawal';
  return `<tr>
    <td class="secondary-cell">${transactionDate(transaction.createdAt)}</td>
    <td><div class="account-cell"><span class="account-symbol" aria-hidden="true">▤</span><span class="account-number">${escapeHtml(account?.number || 'Account removed')}</span></div></td>
    ${compact ? '' : `<td class="secondary-cell">${escapeHtml(customer?.name || '—')}</td>`}
    <td class="secondary-cell">${escapeHtml(transaction.description || 'No description')}</td>
    <td><span class="transaction-kind ${kind}"><span class="transaction-sign">${sign}</span>${escapeHtml(transaction.type)}</span></td>
    <td class="transaction-amount ${kind}">${sign} ${money.format(Number(transaction.amount) || 0)}</td>
  </tr>`;
}

function customerRow(customer) {
  return `<tr>
    <td><div class="person-cell"><span class="person-initials">${escapeHtml(initials(customer.name))}</span><span class="person-name">${escapeHtml(customer.name)}</span></div></td>
    <td class="secondary-cell">${escapeHtml(customer.email)}</td><td class="secondary-cell">${escapeHtml(customer.phone)}</td>
    <td>${customerCount(customer.id)}</td><td class="secondary-cell">${formattedDate(customer.joined)}</td>
    <td><div class="row-actions"><button class="row-action" data-edit="customer" data-id="${escapeHtml(customer.id)}" aria-label="Edit customer ${escapeHtml(customer.name)}" title="Edit customer">✎</button><button class="row-action delete" data-delete="customer" data-id="${escapeHtml(customer.id)}" aria-label="Delete customer ${escapeHtml(customer.name)}" title="Delete customer">×</button></div></td>
  </tr>`;
}

function setTableState(bodyId, emptyId, hasRows) {
  byId(bodyId).hidden = !hasRows;
  byId(emptyId).hidden = hasRows;
}

function render() {
  const query = byId('global-search').value.trim().toLowerCase();
  const customerQuery = byId('customer-search').value.trim().toLowerCase() || (activeView === 'customers' ? query : '');
  const accountQuery = byId('account-search').value.trim().toLowerCase() || (activeView === 'accounts' ? query : '');
  const transactionQuery = byId('transaction-search').value.trim().toLowerCase() || (activeView === 'activity' ? query : '');
  const filteredCustomers = data.customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(customerQuery));
  const filteredAccounts = data.accounts.filter((account) => {
    const customer = customerFor(account);
    return `${account.number} ${account.type} ${account.status} ${customer?.name || ''}`.toLowerCase().includes(accountQuery);
  });
  const sortedTransactions = [...data.transactions].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
  const filteredTransactions = sortedTransactions.filter((transaction) => {
    const account = data.accounts.find((item) => item.id === transaction.accountId);
    const customer = account && customerFor(account);
    return `${account?.number || ''} ${customer?.name || ''} ${transaction.type} ${transaction.description || ''} ${transaction.amount}`.toLowerCase().includes(transactionQuery);
  });
  const openAccounts = data.accounts.filter((account) => account.status !== 'Closed');

  byId('total-deposits').textContent = money.format(openAccounts.reduce((total, account) => total + (Number(account.balance) || 0), 0));
  byId('total-customers').textContent = String(data.customers.length);
  byId('total-accounts').textContent = String(openAccounts.length);
  byId('customer-nav-count').textContent = String(data.customers.length);
  byId('account-nav-count').textContent = String(data.accounts.length);
  byId('customer-list-count').textContent = `${filteredCustomers.length} ${filteredCustomers.length === 1 ? 'customer' : 'customers'}`;
  byId('account-list-count').textContent = `${filteredAccounts.length} ${filteredAccounts.length === 1 ? 'account' : 'accounts'}`;
  byId('transaction-list-count').textContent = `${filteredTransactions.length} ${filteredTransactions.length === 1 ? 'transaction' : 'transactions'}`;

  byId('recent-accounts-body').innerHTML = data.accounts.slice(0, 5).map(accountRow).join('');
  byId('customers-body').innerHTML = filteredCustomers.map(customerRow).join('');
  byId('accounts-body').innerHTML = filteredAccounts.map(accountRow).join('');
  byId('recent-transactions-body').innerHTML = sortedTransactions.slice(0, 5).map((transaction) => transactionRow(transaction, true)).join('');
  byId('transactions-body').innerHTML = filteredTransactions.map((transaction) => transactionRow(transaction)).join('');
  setTableState('recent-accounts-body', 'recent-empty', data.accounts.length > 0);
  setTableState('customers-body', 'customers-empty', filteredCustomers.length > 0);
  setTableState('accounts-body', 'accounts-empty', filteredAccounts.length > 0);
  setTableState('recent-transactions-body', 'recent-transactions-empty', sortedTransactions.length > 0);
  setTableState('transactions-body', 'transactions-empty', filteredTransactions.length > 0);
  byId('recent-customers').innerHTML = data.customers.slice(0, 4).map((customer) => `<div class="customer-mini"><span class="person-initials">${escapeHtml(initials(customer.name))}</span><div class="customer-mini-copy"><strong>${escapeHtml(customer.name)}</strong><span>${customerCount(customer.id)} ${customerCount(customer.id) === 1 ? 'account' : 'accounts'}</span></div></div>`).join('') || '<span class="secondary-cell">No customers added yet.</span>';
}

function navigate(view) {
  if (!['overview', 'customers', 'accounts', 'activity'].includes(view)) return;
  activeView = view;
  document.querySelectorAll('.view-section').forEach((section) => { section.hidden = section.id !== `${view}-view`; });
  document.querySelectorAll('.nav-link').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  byId('breadcrumb-current').textContent = view[0].toUpperCase() + view.slice(1);
  byId('global-search').value = '';
  render();
}

function showToast(message) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function openForm(entity, id = null) {
  if (entity === 'account' && data.customers.length === 0) {
    showToast('Add a customer before opening an account.');
    navigate('customers');
    return;
  }
  editingEntity = entity;
  editingId = id;
  form.reset();
  const isCustomer = entity === 'customer';
  byId('customer-fields').hidden = !isCustomer;
  byId('account-fields').hidden = isCustomer;
  byId('customer-fields').querySelectorAll('input, select').forEach((field) => { field.disabled = !isCustomer; });
  byId('account-fields').querySelectorAll('input, select').forEach((field) => { field.disabled = isCustomer; });
  byId('dialog-eyebrow').textContent = id ? 'EDIT RECORD' : 'NEW RECORD';
  byId('dialog-title').textContent = `${id ? 'Edit' : 'Add'} ${entity}`;
  byId('submit-record').textContent = `Save ${entity}`;
  byId('form-error').hidden = true;

  if (isCustomer) {
    const customer = data.customers.find((item) => item.id === id);
    form.elements.name.value = customer?.name || '';
    form.elements.email.value = customer?.email || '';
    form.elements.phone.value = customer?.phone || '';
    form.elements.joined.value = customer?.joined || today;
  } else {
    const select = form.elements.customerId;
    select.innerHTML = data.customers.map((customer) => `<option value="${escapeHtml(customer.id)}">${escapeHtml(customer.name)}</option>`).join('');
    const account = data.accounts.find((item) => item.id === id);
    form.elements.customerId.value = account?.customerId || data.customers[0].id;
    form.elements.number.value = account?.number || `LL-${Math.floor(10000000 + Math.random() * 90000000)}`;
    form.elements.type.value = account?.type || 'Checking';
    form.elements.balance.value = account?.balance ?? '';
    form.elements.status.value = account?.status || 'Active';
  }
  dialog.showModal();
  form.querySelector(isCustomer ? '[name="name"]' : '[name="customerId"]').focus();
}

function openTransactionForm(accountId = '') {
  const availableAccounts = data.accounts.filter((account) => account.status === 'Active');
  if (availableAccounts.length === 0) {
    showToast('No active accounts are available for transactions.');
    return;
  }
  transactionForm.reset();
  transactionForm.elements.accountId.innerHTML = availableAccounts.map((account) => {
    const customer = customerFor(account);
    return `<option value="${escapeHtml(account.id)}">${escapeHtml(account.number)} · ${escapeHtml(customer?.name || 'Unknown customer')}</option>`;
  }).join('');
  transactionForm.elements.accountId.value = availableAccounts.some((account) => account.id === accountId) ? accountId : availableAccounts[0].id;
  byId('transaction-error').hidden = true;
  transactionDialog.showModal();
  transactionForm.elements.accountId.focus();
}

function deleteRecord(entity, id) {
  if (entity === 'customer' && customerCount(id) > 0) {
    showToast('Move or remove this customer’s accounts before deleting.');
    return;
  }
  const record = data[entity === 'customer' ? 'customers' : 'accounts'].find((item) => item.id === id);
  if (!record) return;
  const label = entity === 'customer' ? record.name : record.number;
  if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
  const key = entity === 'customer' ? 'customers' : 'accounts';
  data[key] = data[key].filter((item) => item.id !== id);
  saveData();
  render();
  showToast(`${entity === 'customer' ? 'Customer' : 'Account'} deleted.`);
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.view) navigate(target.dataset.view);
  if (target.dataset.navigate) navigate(target.dataset.navigate);
  if (target.dataset.add === 'transaction') openTransactionForm();
  else if (target.dataset.add) openForm(target.dataset.add);
  if (target.dataset.transaction) openTransactionForm(target.dataset.transaction);
  if (target.dataset.edit) openForm(target.dataset.edit, target.dataset.id);
  if (target.dataset.delete) deleteRecord(target.dataset.delete, target.dataset.id);
  if (target.classList.contains('dialog-close') || target.classList.contains('dialog-cancel')) dialog.close();
  if (target.classList.contains('transaction-close') || target.classList.contains('transaction-cancel')) transactionDialog.close();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const isCustomer = editingEntity === 'customer';
  const key = isCustomer ? 'customers' : 'accounts';
  const record = isCustomer
    ? { name: String(formData.get('name')).trim(), email: String(formData.get('email')).trim(), phone: String(formData.get('phone')).trim(), joined: String(formData.get('joined')) }
    : { customerId: String(formData.get('customerId')), number: String(formData.get('number')).trim().toUpperCase(), type: String(formData.get('type')), balance: Number(formData.get('balance')), status: String(formData.get('status')) };
  const error = byId('form-error');
  const duplicates = !isCustomer && data.accounts.some((account) => account.number.toLowerCase() === record.number.toLowerCase() && account.id !== editingId);

  if (!form.reportValidity()) return;
  if (!isCustomer && (!Number.isFinite(record.balance) || record.balance < 0)) {
    error.textContent = 'Enter a valid balance of zero or more.';
    error.hidden = false;
    return;
  }
  if (duplicates) {
    error.textContent = 'That account number is already in use.';
    error.hidden = false;
    return;
  }

  if (editingId) {
    const index = data[key].findIndex((item) => item.id === editingId);
    if (index !== -1) data[key][index] = { ...data[key][index], ...record };
  } else {
    data[key].unshift({ id: `${isCustomer ? 'c' : 'a'}-${crypto.randomUUID()}`, ...record });
  }
  saveData();
  dialog.close();
  render();
  showToast(`${isCustomer ? 'Customer' : 'Account'} ${editingId ? 'updated' : 'created'}.`);
});

transactionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!transactionForm.reportValidity()) return;
  const formData = new FormData(transactionForm);
  const account = data.accounts.find((item) => item.id === formData.get('accountId'));
  const type = String(formData.get('type'));
  const amount = Math.round(Number(formData.get('amount')) * 100) / 100;
  const error = byId('transaction-error');

  if (!account || account.status !== 'Active') {
    error.textContent = 'Choose an active account.';
    error.hidden = false;
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    error.textContent = 'Enter an amount greater than zero.';
    error.hidden = false;
    return;
  }
  if (type === 'Withdrawal' && amount > Number(account.balance)) {
    error.textContent = 'The withdrawal exceeds the available balance.';
    error.hidden = false;
    return;
  }

  const change = type === 'Deposit' ? amount : -amount;
  account.balance = Math.round((Number(account.balance) + change) * 100) / 100;
  data.transactions.unshift({
    id: `t-${crypto.randomUUID()}`,
    accountId: account.id,
    type,
    amount,
    description: String(formData.get('description')).trim(),
    createdAt: new Date().toISOString()
  });
  saveData();
  transactionDialog.close();
  render();
  showToast(`${type} of ${money.format(amount)} posted.`);
});

byId('global-search').addEventListener('input', () => {
  const query = byId('global-search').value.trim().toLowerCase();
  const customerMatch = data.customers.some((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query));
  const accountMatch = data.accounts.some((account) => `${account.number} ${account.type} ${account.status} ${customerFor(account)?.name || ''}`.toLowerCase().includes(query));
  const transactionMatch = data.transactions.some((transaction) => `${transaction.type} ${transaction.description || ''} ${transaction.amount}`.toLowerCase().includes(query));
  if (query && customerMatch) activeView = 'customers';
  else if (query && accountMatch) activeView = 'accounts';
  else if (query && transactionMatch) activeView = 'activity';
  document.querySelectorAll('.view-section').forEach((section) => { section.hidden = section.id !== `${activeView}-view`; });
  document.querySelectorAll('.nav-link').forEach((button) => {
    const active = button.dataset.view === activeView;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  byId('breadcrumb-current').textContent = activeView[0].toUpperCase() + activeView.slice(1);
  render();
});
byId('customer-search').addEventListener('input', render);
byId('account-search').addEventListener('input', render);
byId('transaction-search').addEventListener('input', render);
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    byId('global-search').focus();
  }
});

updateGreeting();
render();