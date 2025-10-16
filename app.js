const STORAGE_KEY = 'gf_data_v1';

function nowISODate(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const init = { transactions: [], categories: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
    return init;
  }
  try { return JSON.parse(raw); }
  catch { return { transactions: [], categories: [] }; }
}
function saveData(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function addCategory(name){
  if(!name) return;
  const d = loadData();
  if (!d.categories.includes(name)) {
    d.categories.push(name);
    saveData(d);
  }
}
function addTransaction(tx){
  const d = loadData();
  tx.id = Date.now();
  d.transactions.push(tx);
  if (tx.category) addCategory(tx.category);
  saveData(d);
  return tx.id;
}
function updateTransaction(id, newTx){
  const d = loadData();
  const i = d.transactions.findIndex(t => t.id === id);
  if (i === -1) return false;
  newTx.id = id;
  d.transactions[i] = newTx;
  if (newTx.category) addCategory(newTx.category);
  saveData(d);
  return true;
}
function deleteTransaction(id){
  const d = loadData();
  const before = d.transactions.length;
  d.transactions = d.transactions.filter(t => t.id !== id);
  saveData(d);
  return d.transactions.length < before;
}
function clearAll(){
  localStorage.removeItem(STORAGE_KEY);
  init(); // reinit
}

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function formatMoney(n){
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function render(){
  const data = loadData();
  const tbody = $('#txTable tbody');
  tbody.innerHTML = '';

  const monthFilter = $('#monthFilter').value.trim();
  let receitas = 0, despesas = 0;

  const txs = data.transactions.slice().sort((a,b)=> b.date.localeCompare(a.date) || b.id - a.id);

  txs.forEach(t => {
    if (monthFilter){
      if (!t.date.startsWith(monthFilter)) return;
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(t.description || '')}</td>
      <td>R$ ${formatMoney(t.value || 0)}</td>
      <td>${t.type}</td>
      <td>${t.date}</td>
      <td>${escapeHtml(t.category || '')}</td>
      <td>
        <button class="btn edit" data-id="${t.id}">✏️</button>
        <button class="btn del" data-id="${t.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);

    if (t.type === 'Receita') receitas += Number(t.value || 0);
    else despesas += Number(t.value || 0);
  });

  $('#saldo').textContent = `R$ ${formatMoney(receitas - despesas)}`;
  $('#receitas').textContent = `R$ ${formatMoney(receitas)}`;
  $('#despesas').textContent = `R$ ${formatMoney(despesas)}`;

  const dl = $('#catsList');
  dl.innerHTML = '';
  data.categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    dl.appendChild(opt);
  });

  $$('#txTable .edit').forEach(b => b.onclick = e => startEdit(Number(e.currentTarget.dataset.id)));
  $$('#txTable .del').forEach(b => b.onclick = e => {
    const id = Number(e.currentTarget.dataset.id);
    if (confirm('Excluir transação?')) {
      deleteTransaction(id);
      render();
    }
  });
}

function resetForm(){
  $('#txForm').reset();
  $('#txId').value = '';
  $('#data').value = nowISODate();
}
function startEdit(id){
  const d = loadData();
  const t = d.transactions.find(x => x.id === id);
  if (!t) return;
  $('#txId').value = t.id;
  $('#descricao').value = t.description || '';
  $('#valor').value = t.value;
  $('#tipo').value = t.type;
  $('#data').value = t.date;
  $('#categoria').value = t.category || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function submitForm(e){
  e.preventDefault();
  const id = $('#txId').value ? Number($('#txId').value) : null;
  const tx = {
    description: $('#descricao').value.trim(),
    value: Number($('#valor').value) || 0,
    type: $('#tipo').value,
    date: $('#data').value,
    category: $('#categoria').value.trim()
  };
  if (!tx.description) { alert('Descrição é obrigatória'); return; }
  if (tx.value <= 0) { alert('Valor deve ser maior que zero'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) { alert('Data inválida'); return; }

  if (id) updateTransaction(id, tx);
  else addTransaction(tx);

  resetForm();
  render();
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function exportCSV(){
  const data = loadData().transactions;
  if (!data.length) { alert('Nenhuma transação para exportar'); return; }
  const rows = [['id','description','value','type','date','category']];
  data.forEach(t => rows.push([t.id, t.description, t.value, t.type, t.date, t.category]));
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transacoes_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function init(){
  if (!localStorage.getItem(STORAGE_KEY)) {
    const sample = {
      transactions: [
        { id: Date.now()-200000, description: 'Salário', value: 2000.00, type: 'Receita', date: nowISODate(), category: 'Salário' },
        { id: Date.now()-100000, description: 'Almoço', value: 25.50, type: 'Despesa', date: nowISODate(), category: 'Alimentação' }
      ],
      categories: ['Salário','Alimentação','Transporte','Lazer']
    };
    saveData(sample);
  }
  $('#data').value = nowISODate();
  document.getElementById('txForm').addEventListener('submit', submitForm);
  document.getElementById('cancelEdit').addEventListener('click', resetForm);
  document.getElementById('applyFilter').addEventListener('click', render);
  document.getElementById('clearFilter').addEventListener('click', () => { $('#monthFilter').value=''; render(); });
  document.getElementById('exportCsv').addEventListener('click', exportCSV);
  document.getElementById('clearAll').addEventListener('click', () => {
    if (confirm('Apagar todos os dados do app (localStorage)?')) { clearAll(); }
  });
  render();
}
init();
