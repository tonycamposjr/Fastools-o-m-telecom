'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  overview: null,
  hgu: { connected: false, host: '', username: '', connectedAt: null },
  inventory: null,
  summary: null,
  scan: null,
  ping: null,
  ports: null,
  appInfo: null,
  busy: { connect: false, inventory: false, scan: false },
  history: [],
  historyIndex: 0,
  terminalBytes: 0,
};

const PORT_LIST = [22, 53, 80, 443, 7547];

/* ------------------------------- Utilidades ------------------------------ */

function fmtDate(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

function fmtValue(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function fmtDuration(ms) {
  if (!Number.isFinite(ms)) return '-';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(message, kind = '', timeout = 5200) {
  const stack = $('#toastStack');
  const item = document.createElement('div');
  item.className = `toast ${kind}`.trim();
  item.textContent = message;
  stack.appendChild(item);
  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(4px)';
    item.style.transition = 'opacity .2s, transform .2s';
    setTimeout(() => item.remove(), 240);
  }, timeout);
}

function setStatusLine(text, kind = '') {
  const line = $('#sshStatusLine');
  line.className = `status-line ${kind}`.trim();
  line.textContent = text;
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.textContent = label || 'Aguarde...';
  } else {
    button.disabled = false;
    if (button.dataset.label) {
      button.textContent = button.dataset.label;
      delete button.dataset.label;
    }
  }
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  area.remove();
}

/* -------------------------------- Navegação ------------------------------ */

function activateView(name) {
  $$('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === name));
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${name}`));
  $('.content').scrollTop = 0;
}

$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => activateView(tab.dataset.view));
});

/* --------------------------------- Tema ---------------------------------- */

function applyTheme(theme) {
  const value = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = value;
  localStorage.setItem('magicTheme', value);
  $('#themeIcon').textContent = value === 'light' ? '☾' : '☀';
  $('#themeBtn').title = value === 'light' ? 'Usar tema escuro' : 'Usar tema claro';
}

$('#themeBtn').addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});

/* ------------------------------ Status geral ----------------------------- */

function setConnectionUi(connected, status = {}) {
  state.hgu = {
    connected: Boolean(connected),
    host: status.host || state.hgu.host || '',
    username: status.username || state.hgu.username || 'support',
    connectedAt: status.connectedAt || state.hgu.connectedAt || null,
  };

  const pill = $('#connPill');
  const pillText = $('#connPillText');
  const hguChip = $('#hguChip');
  const terminalChip = $('#terminalChip');

  if (connected) {
    pill.dataset.state = 'on';
    pillText.textContent = `HGU ${state.hgu.host || ''}`.trim();
    hguChip.textContent = 'conectado';
    hguChip.className = 'chip ok';
    terminalChip.textContent = 'conectado';
    terminalChip.className = 'chip ok';
    $('#statHgu').textContent = 'conectado';
    $('#statHguDetail').textContent = `SSH ${state.hgu.username}@${state.hgu.host}`;
    $('#disconnectBtn').disabled = false;
    $('#inventoryBtn').disabled = false;
    $('#terminalInput').disabled = false;
    $('#terminalSend').disabled = false;
    $('#terminalPrompt').textContent = `${state.hgu.username}@hgu>`;
  } else {
    pill.dataset.state = 'off';
    pillText.textContent = 'HGU desconectado';
    hguChip.textContent = 'offline';
    hguChip.className = 'chip';
    terminalChip.textContent = 'desconectado';
    terminalChip.className = 'chip';
    $('#statHgu').textContent = 'desconectado';
    $('#statHguDetail').textContent = 'SSH porta 22';
    $('#disconnectBtn').disabled = true;
    $('#inventoryBtn').disabled = true;
    $('#terminalInput').disabled = true;
    $('#terminalSend').disabled = true;
    $('#terminalPrompt').textContent = 'local>';
  }
  updateReportPreview();
}

/* ------------------------------ Rede local ------------------------------- */

function renderOverview(data) {
  state.overview = data;
  const primary = data && data.primary;

  $('#statIface').textContent = primary ? primary.name : 'sem interface';
  $('#statIfaceDetail').textContent = primary ? `${primary.address}/${primary.netmask}` : 'nenhuma IPv4 ativa';
  $('#statGateway').textContent = fmtValue(data.gateway);
  $('#statGatewayDetail').textContent = data.gateway ? 'rota padrão' : 'não detectado';

  $('#netHost').textContent = fmtValue(data.hostname);
  $('#netIp').textContent = primary ? fmtValue(primary.address) : '-';
  $('#netMask').textContent = primary ? fmtValue(primary.netmask) : '-';
  $('#netMac').textContent = primary ? fmtValue(primary.mac) : '-';
  $('#netGateway').textContent = fmtValue(data.gateway);
  $('#netDns').textContent = data.dns && data.dns.length ? data.dns.join(', ') : '-';
  $('#netOs').textContent = `${data.platform} ${data.release} (${data.arch})`;

  for (const input of ['#quickHost', '#pingHostInput', '#portsHostInput']) {
    const element = $(input);
    if (element && !element.value) element.value = data.gateway || (primary ? primary.address : '');
  }

  if (!$('#hguHost').value) {
    $('#hguHost').value = localStorage.getItem('magicLastHost') || data.gateway || '192.168.15.1';
  }
  if (!$('#hguUser').value) {
    $('#hguUser').value = localStorage.getItem('magicLastUser') || 'support';
  }
  if (!$('#scanRange').value && primary) {
    $('#scanRange').placeholder = `${primary.address.split('.').slice(0, 3).join('.')} (automático)`;
  }

  updateReportPreview();
}

async function refreshOverview(silent = false) {
  try {
    const response = await window.magic.net.overview();
    if (!response.ok) throw new Error(response.error || 'Falha ao ler a rede.');
    renderOverview(response.data);
    if (!silent) toast('Rede local atualizada.', 'ok', 2600);
    testInternet();
  } catch (error) {
    toast(`Não foi possível ler a rede: ${error.message}`, 'bad');
  }
}

async function testInternet() {
  try {
    const response = await window.magic.net.ping({ host: '1.1.1.1', count: 2, timeout: 900 });
    if (!response.ok) throw new Error(response.error);
    const result = response.data;
    $('#statInternet').textContent = result.reachable ? 'online' : 'sem resposta';
    $('#statInternetDetail').textContent = result.reachable
      ? `${result.avg ?? '-'} ms média`
      : 'ICMP bloqueado ou sem internet';
  } catch {
    $('#statInternet').textContent = 'não testado';
    $('#statInternetDetail').textContent = 'sem resposta';
  }
}

function renderPingResult(container, result) {
  container.innerHTML = '';
  const values = [
    ['Alcance', result.reachable ? 'RESPONDEU' : 'SEM RESPOSTA'],
    ['Media', result.avg !== null ? `${result.avg} ms` : '-'],
    ['Perda', result.loss !== null ? `${result.loss}%` : '-'],
    ['Tempo', fmtDuration(result.duration)],
  ];
  for (const [label, value] of values) {
    const cell = document.createElement('div');
    cell.className = 'result-cell';
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = value;
    if (label === 'Alcance') strong.style.color = result.reachable ? 'var(--green)' : 'var(--red)';
    cell.append(span, strong);
    container.appendChild(cell);
  }
}

async function quickPing() {
  const host = $('#quickHost').value.trim();
  const box = $('#quickResult');
  if (!host) {
    toast('Informe um host para pingar.', 'warn');
    return;
  }
  box.className = 'result-box';
  box.textContent = 'Pingando...';
  try {
    const response = await window.magic.net.ping({ host, count: 4, timeout: 1200 });
    if (!response.ok) throw new Error(response.error);
    const result = response.data;
    box.className = `result-box ${result.reachable ? 'ok' : 'bad'}`;
    box.textContent = result.reachable
      ? `${host} respondeu: ${result.avg} ms de media, perda ${result.loss}% (${result.received}/${result.sent} pacotes).`
      : `${host} não respondeu ao ping (perda ${result.loss ?? 100}%). Pode ser bloqueio de ICMP ou host offline.`;
  } catch (error) {
    box.className = 'result-box bad';
    box.textContent = error.message;
  }
}

async function quickPorts() {
  const host = $('#quickHost').value.trim();
  const box = $('#quickResult');
  if (!host) {
    toast('Informe um host para testar.', 'warn');
    return;
  }
  box.className = 'result-box';
  box.textContent = 'Verificando portas...';
  try {
    const response = await window.magic.net.ports({ host, ports: PORT_LIST });
    if (!response.ok) throw new Error(response.error);
    const open = response.data.filter((item) => item.open);
    box.className = `result-box ${open.length ? 'ok' : 'bad'}`;
    box.textContent = open.length
      ? `Portas abertas em ${host}: ${open.map((item) => item.port).join(', ')}.`
      : `Nenhuma das portas ${PORT_LIST.join(', ')} respondeu em ${host}.`;
  } catch (error) {
    box.className = 'result-box bad';
    box.textContent = error.message;
  }
}

$('#quickPingBtn').addEventListener('click', quickPing);
$('#quickPortsBtn').addEventListener('click', quickPorts);
$('#refreshNetBtn').addEventListener('click', () => refreshOverview(false));

/* ------------------------------- Ping / portas --------------------------- */

async function runPing() {
  const host = $('#pingHostInput').value.trim();
  const count = Number($('#pingCount').value) || 4;
  const button = $('#pingBtn');
  if (!host) {
    toast('Informe um host para o ping.', 'warn');
    return;
  }
  setButtonBusy(button, true, 'Pingando...');
  $('#pingResult').innerHTML = '<span class="muted">Executando...</span>';
  try {
    const response = await window.magic.net.ping({ host, count, timeout: 1200 });
    if (!response.ok) throw new Error(response.error);
    state.ping = response.data;
    renderPingResult($('#pingResult'), response.data);
    updateReportPreview();
  } catch (error) {
    $('#pingResult').innerHTML = '';
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = error.message;
    $('#pingResult').appendChild(span);
    toast(error.message, 'bad');
  } finally {
    setButtonBusy(button, false);
  }
}

function renderPorts(container, results) {
  container.innerHTML = '';
  container.className = 'port-grid';
  for (const item of results) {
    const cell = document.createElement('div');
    cell.className = `port-cell ${item.open ? 'open' : 'closed'}`;
    const port = document.createElement('b');
    port.textContent = item.port;
    const status = document.createElement('small');
    status.textContent = item.open ? 'aberta' : 'fechada';
    cell.append(port, status);
    container.appendChild(cell);
  }
}

async function runPorts() {
  const host = $('#portsHostInput').value.trim();
  const button = $('#portsBtn');
  if (!host) {
    toast('Informe um host para verificar as portas.', 'warn');
    return;
  }
  setButtonBusy(button, true, 'Verificando...');
  $('#portsResult').className = 'port-grid';
  $('#portsResult').innerHTML = '<span class="muted">Verificando...</span>';
  try {
    const response = await window.magic.net.ports({ host, ports: PORT_LIST });
    if (!response.ok) throw new Error(response.error);
    state.ports = response.data;
    renderPorts($('#portsResult'), response.data);
    updateReportPreview();
  } catch (error) {
    $('#portsResult').innerHTML = '';
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = error.message;
    $('#portsResult').appendChild(span);
    toast(error.message, 'bad');
  } finally {
    setButtonBusy(button, false);
  }
}

$('#pingBtn').addEventListener('click', runPing);
$('#portsBtn').addEventListener('click', runPorts);

/* ------------------------------ Varredura LAN ---------------------------- */

function renderScan(scan) {
  state.scan = scan;
  const tbody = $('#scanTableBody');
  tbody.innerHTML = '';
  if (!scan.hosts || !scan.hosts.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'muted';
    cell.textContent = 'Nenhum dispositivo encontrado.';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  for (const host of scan.hosts) {
    const row = document.createElement('tr');
    const ip = document.createElement('td');
    ip.className = 'mono';
    ip.textContent = host.ip;
    const mac = document.createElement('td');
    mac.className = 'mono';
    mac.textContent = host.mac || '-';
    const hostname = document.createElement('td');
    hostname.textContent = host.hostname || '-';
    const marker = document.createElement('td');
    marker.textContent = host.self ? 'este PC' : host.gateway ? 'gateway' : '';
    row.append(ip, mac, hostname, marker);
    tbody.appendChild(row);
  }
}

async function runScan() {
  const button = $('#scanBtn');
  const range = $('#scanRange').value.trim();
  const progress = $('#scanProgressWrap');
  if (state.busy.scan) return;
  state.busy.scan = true;
  setButtonBusy(button, true, 'Varrendo...');
  progress.hidden = false;
  $('#scanProgressBar').style.width = '0%';
  $('#scanProgressLabel').textContent = 'Preparando varredura...';
  $('#scanProgressCount').textContent = '';
  try {
    const response = await window.magic.net.scan(range ? { range } : {});
    if (!response.ok) throw new Error(response.error);
    renderScan(response.data);
    $('#scanProgressLabel').textContent = `Concluído: ${response.data.range}`;
    $('#scanProgressCount').textContent = `${response.data.found} encontrados`;
    $('#scanProgressBar').style.width = '100%';
    toast(`Varredura concluída: ${response.data.found} dispositivo(s).`, 'ok');
    updateReportPreview();
  } catch (error) {
    progress.hidden = true;
    toast(error.message, 'bad', 7000);
  } finally {
    state.busy.scan = false;
    setButtonBusy(button, false);
  }
}

$('#scanBtn').addEventListener('click', runScan);

/* --------------------------------- SSH ----------------------------------- */

async function connectHgu(event) {
  event?.preventDefault();
  if (state.busy.connect) return;

  const host = $('#hguHost').value.trim();
  const port = Number($('#hguPort').value) || 22;
  const username = $('#hguUser').value.trim() || 'support';
  const password = $('#hguPassword').value;

  if (!host || !password) {
    toast('Informe o IP e a senha do HGU.', 'warn');
    return;
  }

  state.busy.connect = true;
  const button = $('#connectBtn');
  const pill = $('#connPill');
  pill.dataset.state = 'busy';
  $('#connPillText').textContent = 'conectando...';
  setButtonBusy(button, true, 'Conectando...');
  setStatusLine('Abrindo sessão SSH...', '');
  $('#disconnectBtn').disabled = true;
  $('#inventoryBtn').disabled = true;

  try {
    const response = await window.magic.ssh.connect({ host, port, username, password });
    if (!response.ok) throw new Error(response.error);
    setConnectionUi(true, response.data);
    localStorage.setItem('magicLastHost', host);
    localStorage.setItem('magicLastUser', username);
    $('#hguPassword').value = '';
    setStatusLine(`Conectado a ${username}@${host}:${port}. Sessão SSH pronta.`, 'ok');
    appendTerminal(`--- conectado a ${username}@${host}:${port} ---`, 'term-ok');
    toast('HGU conectado. Coletando inventário...', 'ok', 3200);
    await collectInventory(true);
  } catch (error) {
    setConnectionUi(false);
    pill.dataset.state = 'error';
    $('#connPillText').textContent = 'falha na conexão';
    const message = String(error.message || error);
    let friendly = message;
    if (/authentication|senha|password|auth/i.test(message)) {
      friendly = 'Senha SSH recusada. Atenção: após 3 erros a HGU pode bloquear novas tentativas por 5 minutos.';
    } else if (/timeout|timed out/i.test(message)) {
      friendly = 'Timeout. Confira o IP, o cabo/Wi-Fi e se a porta 22 está aberta.';
    } else if (/ECONNREFUSED|refused/i.test(message)) {
      friendly = 'Conexão recusada na porta 22. Confira se o SSH está habilitado no HGU.';
    }
    setStatusLine(friendly, 'bad');
    appendTerminal(`--- falha ao conectar: ${friendly} ---`, 'term-err');
    toast(friendly, 'bad', 8000);
  } finally {
    state.busy.connect = false;
    setButtonBusy(button, false);
  }
}

$('#connectForm').addEventListener('submit', connectHgu);

async function disconnectHgu() {
  try {
    await window.magic.ssh.disconnect();
  } catch { /* ignore */ }
  setConnectionUi(false);
  setStatusLine('Sessão encerrada. O último inventário continua disponível no laudo.', '');
  appendTerminal('--- sessão encerrada ---', 'term-meta');
  toast('HGU desconectado.', '', 3000);
}

$('#disconnectBtn').addEventListener('click', disconnectHgu);

async function refreshSshStatus() {
  try {
    const response = await window.magic.ssh.status();
    if (response.ok && response.data.connected) {
      setConnectionUi(true, response.data);
      return true;
    }
  } catch { /* ignore */ }
  setConnectionUi(false);
  return false;
}

/* ------------------------------ Inventário ------------------------------- */

function addSummaryLine(container, label, value) {
  const line = document.createElement('div');
  line.className = 'line';
  const left = document.createElement('span');
  left.textContent = label;
  const right = document.createElement('strong');
  right.textContent = fmtValue(value);
  line.append(left, right);
  container.appendChild(line);
}

function renderDashboardSummary() {
  const box = $('#dashboardSummary');
  box.innerHTML = '';
  const summary = state.summary;
  if (!summary) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = state.hgu.connected
      ? 'Conectado. Clique em "Coletar agora" para ler o HGU.'
      : 'Nenhum inventário coletado nesta sessão.';
    box.appendChild(span);
    return;
  }
  addSummaryLine(box, 'Modelo', summary.model);
  addSummaryLine(box, 'Firmware', summary.firmware);
  addSummaryLine(box, 'WAN', summary.wan && (summary.wan.ip || summary.wan.status));
  addSummaryLine(box, 'Clientes', summary.counts ? summary.counts.total : '-');
  addSummaryLine(box, 'Óptica Rx', summary.optical && summary.optical.rx !== null ? `${summary.optical.rx} dBm` : '-');
}

function renderHguStats(summary) {
  const stats = [
    ['MODELO', summary.model, 'tile-blue'],
    ['FIRMWARE', summary.firmware, 'tile-green'],
    ['SERIAL', summary.serial, 'tile-purple'],
    ['WAN', summary.wan && (summary.wan.ip || summary.wan.status), 'tile-orange'],
    ['CLIENTES', summary.counts ? `${summary.counts.total} (${summary.counts.wifi} Wi-Fi)` : '-', 'tile-ciano'],
    ['ÓPTICA', summary.optical && summary.optical.rx !== null ? `Rx ${summary.optical.rx} dBm` : '-', 'tile-rubi'],
  ];

  const container = $('#hguStats');
  container.innerHTML = '';
  for (const [label, value, className] of stats) {
    const tile = document.createElement('article');
    tile.className = `stat-tile ${className}`;
    const span = document.createElement('span');
    span.className = 'stat-label';
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = fmtValue(value);
    const detail = document.createElement('small');
    detail.textContent = label === 'CLIENTES'
      ? `${summary.counts ? summary.counts.lan : 0} LAN`
      : label === 'ÓPTICA'
        ? 'GPON'
        : '';
    tile.append(span, strong, detail);
    container.appendChild(tile);
  }
}

function renderDevices(summary) {
  const tbody = $('#deviceTableBody');
  tbody.innerHTML = '';
  const devices = summary.devices || [];
  $('#deviceCount').textContent = String(devices.length);
  if (!devices.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'muted';
    cell.textContent = 'Nenhum dispositivo identificado nas saídas coletadas.';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  for (const device of devices) {
    const row = document.createElement('tr');
    for (const value of [device.ip || '-', device.mac || '-', device.media || '-', device.description || '']) {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (value.includes(':') && value.length <= 18) cell.className = 'mono';
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
}

function renderCommands(commands) {
  const container = $('#commandList');
  container.innerHTML = '';
  if (!commands || !commands.length) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = 'Nenhuma saída coletada.';
    container.appendChild(span);
    return;
  }

  for (const item of commands) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const label = document.createElement('span');
    label.textContent = item.label || item.command;
    const cmd = document.createElement('span');
    cmd.className = 'cmd';
    cmd.textContent = `${item.command}${item.timedOut ? ' - timeout' : ''}`;
    summary.append(label, cmd);
    const pre = document.createElement('pre');
    pre.textContent = item.output || '(sem saída)';
    details.append(summary, pre);
    container.appendChild(details);
  }
}

function renderInventory(data) {
  state.inventory = data;
  state.summary = data.summary || null;
  const summary = state.summary;
  if (!summary) return;

  $('#hguSummarySection').hidden = false;
  $('#inventoryTitle').textContent = summary.model || 'Resumo do HGU';
  $('#inventoryProfile').textContent = summary.profile || data.profile?.label || 'HGU';
  $('#inventoryProfile').className = 'chip on';

  renderHguStats(summary);
  $('#wanStatus').textContent = fmtValue(summary.wan && summary.wan.status);
  $('#wanIp').textContent = fmtValue(summary.wan && summary.wan.ip);
  $('#wanGateway').textContent = fmtValue(summary.wan && summary.wan.gateway);
  $('#wanDns').textContent = summary.wan && summary.wan.dns && summary.wan.dns.length ? summary.wan.dns.join(', ') : '-';
  $('#optRx').textContent = summary.optical && summary.optical.rx !== null ? `${summary.optical.rx} dBm` : '-';
  $('#optTx').textContent = summary.optical && summary.optical.tx !== null ? `${summary.optical.tx} dBm` : '-';
  $('#optTemp').textContent = summary.optical && summary.optical.temperature !== null ? `${summary.optical.temperature} °C` : '-';

  renderDevices(summary);
  renderCommands(data.commands || []);
  renderDashboardSummary();
  updateReportPreview();
}

function progressPercent(progress) {
  const total = Number(progress.total) || 0;
  const index = Number(progress.index) || 0;
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((index / total) * 100)));
}

async function collectInventory(silent = false) {
  if (!state.hgu.connected) {
    toast('Conecte ao HGU primeiro.', 'warn');
    activateView('hgu');
    return;
  }
  if (state.busy.inventory) return;

  state.busy.inventory = true;
  $('#inventoryProgressWrap').hidden = false;
  $('#inventoryProgressBar').style.width = '2%';
  $('#inventoryProgressLabel').textContent = 'Coletando inventário...';
  $('#inventoryProgressCount').textContent = '';
  $('#inventoryProgressCommand').textContent = '';
  setButtonBusy($('#inventoryBtn'), true, 'Coletando...');

  try {
    const response = await window.magic.ssh.inventory({ includeWifi: true });
    if (!response.ok) throw new Error(response.error);
    renderInventory(response.data);
    $('#inventoryProgressBar').style.width = '100%';
    $('#inventoryProgressLabel').textContent = 'Inventário concluído';
    $('#inventoryProgressCount').textContent = `${response.data.commands.length} comandos`;
    $('#inventoryProgressCommand').textContent = response.data.model || '';
    toast('Inventário coletado e resumido.', 'ok');
    if (!silent) activateView('hgu');
  } catch (error) {
    $('#inventoryProgressWrap').hidden = true;
    toast(`Falha na coleta: ${error.message}`, 'bad', 8000);
    setStatusLine(`Falha na coleta: ${error.message}`, 'bad');
  } finally {
    state.busy.inventory = false;
    setButtonBusy($('#inventoryBtn'), false);
    setTimeout(() => {
      if (!state.busy.inventory) $('#inventoryProgressWrap').hidden = true;
    }, 2200);
  }
}

$('#inventoryBtn').addEventListener('click', () => collectInventory(false));
$('#goInventoryBtn').addEventListener('click', () => {
  activateView('hgu');
  if (state.hgu.connected) collectInventory(false);
  else $('#hguHost').focus();
});
$('#goConnectBtn').addEventListener('click', () => {
  activateView('hgu');
  $('#hguHost').focus();
});
$('#copyInventoryBtn').addEventListener('click', () => {
  const commands = state.inventory && state.inventory.commands ? state.inventory.commands : [];
  const text = commands.map((item) => `### ${item.label} [${item.command}]\n${item.output || ''}`).join('\n\n');
  if (!text) {
    toast('Nenhuma saída para copiar.', 'warn');
    return;
  }
  copyText(text).then(() => toast('Saídas copiadas.', 'ok', 2600));
});

/* -------------------------------- Terminal ------------------------------- */

function appendTerminal(text, className = '') {
  const output = $('#terminalOutput');
  const line = document.createElement('div');
  line.className = `term-line ${className}`.trim();
  line.textContent = text;
  output.appendChild(line);
  state.terminalBytes += text.length;

  // Evita crescimento infinito em sessões longas.
  while (state.terminalBytes > 280000 && output.children.length > 3) {
    const first = output.firstElementChild;
    state.terminalBytes -= (first.textContent || '').length;
    first.remove();
  }
  output.scrollTop = output.scrollHeight;
}

function sendTerminalCommand(command) {
  if (!state.hgu.connected) {
    toast('Conecte ao HGU primeiro.', 'warn');
    return;
  }
  const input = $('#terminalInput');
  input.value = command;
  $('#terminalForm').requestSubmit();
}

async function runTerminalCommand(event) {
  event.preventDefault();
  if (!state.hgu.connected) return;
  const input = $('#terminalInput');
  const command = input.value.trim();
  if (!command) return;

  state.history.push(command);
  state.historyIndex = state.history.length;
  input.value = '';
  appendTerminal(`${state.hgu.username}@hgu> ${command}`, 'term-cmd');

  const sendButton = $('#terminalSend');
  sendButton.disabled = true;
  input.disabled = true;

  try {
    const response = await window.magic.ssh.exec({ command, timeout: 20000 });
    if (!response.ok) throw new Error(response.error);
    const result = response.data;
    appendTerminal(result.output || '(sem saída)', result.timedOut ? 'term-err' : '');
    appendTerminal(
      result.timedOut
        ? `[timeout ${fmtDuration(result.duration)} - Ctrl+C enviado]`
        : `[ok ${fmtDuration(result.duration)}]`,
      result.timedOut ? 'term-err' : 'term-meta',
    );
    if (/^(exit|quit|logout)$/i.test(command)) {
      setTimeout(refreshSshStatus, 500);
    }
  } catch (error) {
    appendTerminal(`[erro] ${error.message}`, 'term-err');
    if (/not connected|conecte|sessão/i.test(error.message)) {
      setConnectionUi(false);
    }
  } finally {
    sendButton.disabled = !state.hgu.connected;
    input.disabled = !state.hgu.connected;
    input.focus();
  }
}

$('#terminalForm').addEventListener('submit', runTerminalCommand);

$('#terminalInput').addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (!state.history.length) return;
    state.historyIndex = Math.max(0, state.historyIndex - 1);
    event.target.value = state.history[state.historyIndex] || '';
    setTimeout(() => event.target.setSelectionRange(event.target.value.length, event.target.value.length), 0);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
    event.target.value = state.history[state.historyIndex] || '';
  } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    $('#terminalOutput').innerHTML = '';
    state.terminalBytes = 0;
  }
});

$$('#quickCommands [data-cmd]').forEach((button) => {
  button.addEventListener('click', () => sendTerminalCommand(button.dataset.cmd));
});

$('#clearTerminalBtn').addEventListener('click', () => {
  $('#terminalOutput').innerHTML = '';
  state.terminalBytes = 0;
  appendTerminal('Tela limpa.', 'term-meta');
});

/* -------------------------------- Laudo ---------------------------------- */

function buildReport() {
  const now = new Date();
  const summary = state.summary;
  return {
    title: 'magic-local-laudo',
    generatedAt: now.toISOString(),
    generatedAtLabel: fmtDate(now),
    operator: $('#operatorName').value.trim(),
    workOrder: $('#workOrder').value.trim(),
    notes: $('#reportNotes').value.trim(),
    machine: state.overview ? state.overview.hostname : '',
    network: state.overview,
    hgu: {
      connected: state.hgu.connected,
      host: state.hgu.host,
      username: state.hgu.username,
      connectedAt: state.hgu.connectedAt,
      model: summary ? summary.model : '',
      profile: summary ? summary.profile : '',
    },
    summary,
    commands: state.inventory ? (state.inventory.commands || []) : [],
    scan: state.scan,
    ping: state.ping,
    ports: state.ports,
    app: state.appInfo,
  };
}

function updateReportPreview() {
  const box = $('#reportPreview');
  const summary = state.summary;
  box.innerHTML = '';
  if (!state.overview && !summary) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = 'O resumo aparece aqui depois da primeira coleta.';
    box.appendChild(span);
  } else {
    const lines = [];
    if (state.overview) lines.push(`Rede: ${state.overview.primary ? state.overview.primary.address : '-'} | gateway ${state.overview.gateway || '-'}`);
    if (summary) {
      lines.push(`HGU: ${summary.model || '-'} | ${summary.profile || '-'}`);
      lines.push(`WAN: ${summary.wan && summary.wan.status ? summary.wan.status : '-'} | IP ${summary.wan && summary.wan.ip ? summary.wan.ip : '-'}`);
      lines.push(`Clientes: ${summary.counts ? summary.counts.total : 0} (${summary.counts ? summary.counts.wifi : 0} Wi-Fi)`);
    }
    if (state.scan) lines.push(`Varredura: ${state.scan.found} dispositivo(s) em ${state.scan.range}`);
    for (const line of lines) {
      const div = document.createElement('div');
      div.textContent = line;
      box.appendChild(div);
    }
  }

  const setCheck = (id, ok) => {
    const el = $(id);
    el.textContent = ok ? '✓' : '!';
    el.className = `check ${ok ? 'ok' : ''}`.trim();
  };
  setCheck('#checkNetwork', Boolean(state.overview));
  setCheck('#checkHgu', Boolean(summary));
  setCheck('#checkScan', Boolean(state.scan));
  setCheck('#checkCommands', Boolean(state.inventory && state.inventory.commands && state.inventory.commands.length));

  const summaryBox = $('#reportSummary');
  summaryBox.innerHTML = '';
  if (!summary) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = 'Nenhuma coleta realizada.';
    summaryBox.appendChild(span);
  } else {
    addSummaryLine(summaryBox, 'Modelo', summary.model);
    addSummaryLine(summaryBox, 'Perfil', summary.profile);
    addSummaryLine(summaryBox, 'Serial', summary.serial);
    addSummaryLine(summaryBox, 'Firmware', summary.firmware);
    addSummaryLine(summaryBox, 'WAN', summary.wan && `${summary.wan.status || '-'} · ${summary.wan.ip || '-'}`);
    addSummaryLine(summaryBox, 'Óptica', summary.optical && summary.optical.rx !== null ? `Rx ${summary.optical.rx} dBm / Tx ${summary.optical.tx ?? '-'} dBm` : '-');
    addSummaryLine(summaryBox, 'Clientes', summary.counts ? `${summary.counts.total} (${summary.counts.wifi} Wi-Fi / ${summary.counts.lan} LAN)` : '-');
  }
}

$('#refreshReportBtn').addEventListener('click', () => {
  updateReportPreview();
  toast('Resumo atualizado.', 'ok', 2400);
});

async function saveReport(format) {
  const report = buildReport();
  const button = format === 'json' ? $('#saveJsonBtn') : $('#saveTxtBtn');
  setButtonBusy(button, true, 'Salvando...');
  try {
    const response = await window.magic.report.save({ report, format });
    if (!response.ok) throw new Error(response.error);
    if (response.canceled) {
      toast('Salvamento cancelado.', '', 2400);
    } else {
      toast(`Laudo salvo em ${response.filePath}`, 'ok', 7000);
    }
  } catch (error) {
    toast(`Falha ao salvar: ${error.message}`, 'bad');
  } finally {
    setButtonBusy(button, false);
  }
}

$('#saveJsonBtn').addEventListener('click', () => saveReport('json'));
$('#saveTxtBtn').addEventListener('click', () => saveReport('txt'));

function printableHtml(report) {
  const summary = report.summary || {};
  const net = report.network || {};
  const checks = summary.checks || {};
  const devices = summary.devices || [];
  const commands = report.commands || [];
  const scan = report.scan;

  const kv = (label, value) => `<tr><th>${esc(label)}</th><td>${esc(value || '-')}</td></tr>`;
  const checkRows = Object.entries(checks)
    .map(([name, value]) => `<span class="print-tag">${esc(name.toUpperCase())}: ${esc(String(value.status || '-').toUpperCase())}</span>`)
    .join(' ');

  const deviceRows = devices.map((device) => `
    <tr><td>${esc(device.ip)}</td><td>${esc(device.mac)}</td><td>${esc(device.media)}</td><td>${esc(device.description)}</td></tr>
  `).join('');

  const commandBlocks = commands.map((item) => `
    <div class="avoid">
      <p><strong>${esc(item.label || item.command)}</strong> <code>${esc(item.command)}</code>${item.timedOut ? ' (timeout)' : ''}</p>
      <pre>${esc(item.output || '(sem saída)')}</pre>
    </div>
  `).join('');

  const scanRows = scan && scan.hosts
    ? scan.hosts.map((host) => `<tr><td>${esc(host.ip)}</td><td>${esc(host.mac || '-')}</td><td>${esc(host.hostname || '-')}</td><td>${host.self ? 'este PC' : host.gateway ? 'gateway' : ''}</td></tr>`).join('')
    : '';

  return `
    <h1>Magic Local - Laudo de Campo</h1>
    <p class="print-meta">Gerado em ${esc(report.generatedAtLabel || fmtDate(report.generatedAt))} &middot; ${esc(report.machine || '-')} &middot; Magic Local ${esc(report.app ? report.app.version : '')}</p>
    <p><strong>Operador:</strong> ${esc(report.operator || '-')} &nbsp; <strong>OS/designador:</strong> ${esc(report.workOrder || '-')}</p>
    <p><strong>Observações:</strong> ${esc(report.notes || '-')}</p>

    <h2>Rede local</h2>
    <table>
      ${kv('Interface', net.primary ? net.primary.name : '-')}
      ${kv('IPv4', net.primary ? `${net.primary.address}/${net.primary.netmask}` : '-')}
      ${kv('MAC', net.primary ? net.primary.mac : '-')}
      ${kv('Gateway', net.gateway)}
      ${kv('DNS', (net.dns || []).join(', '))}
      ${kv('Sistema', net.platform ? `${net.platform} ${net.release} (${net.arch})` : '-')}
    </table>

    <h2>HGU</h2>
    <table>
      ${kv('Modelo', summary.model)}
      ${kv('Perfil', summary.profile)}
      ${kv('Serial', summary.serial)}
      ${kv('MAC', summary.mac)}
      ${kv('Firmware', summary.firmware)}
      ${kv('Uptime', summary.uptime)}
      ${kv('WAN', summary.wan ? `${summary.wan.status || '-'} | IP ${summary.wan.ip || '-'} | gateway ${summary.wan.gateway || '-'}` : '-')}
      ${kv('DNS WAN', summary.wan && summary.wan.dns ? summary.wan.dns.join(', ') : '-')}
      ${kv('Óptica', summary.optical ? `Rx ${summary.optical.rx ?? '-'} dBm | Tx ${summary.optical.tx ?? '-'} dBm | Temp ${summary.optical.temperature ?? '-'} C` : '-')}
      ${kv('Clientes', summary.counts ? `${summary.counts.total} total (${summary.counts.wifi} Wi-Fi / ${summary.counts.lan} LAN)` : '-')}
    </table>

    <h2>Verificações</h2>
    <p>${checkRows || 'Sem verificações.'}</p>

    <h2>Dispositivos vistos pelo HGU</h2>
    <table>
      <thead><tr><th>IP</th><th>MAC</th><th>Tipo</th><th>Descrição</th></tr></thead>
      <tbody>${deviceRows || '<tr><td colspan="4">Nenhum dispositivo.</td></tr>'}</tbody>
    </table>

    ${scan ? `
      <h2>Varredura da rede local</h2>
      <p>Faixa ${esc(scan.range)} &middot; ${esc(scan.found)} dispositivo(s) encontrados.</p>
      <table>
        <thead><tr><th>IP</th><th>MAC</th><th>Hostname</th><th>Marcador</th></tr></thead>
        <tbody>${scanRows || '<tr><td colspan="4">Nenhum host.</td></tr>'}</tbody>
      </table>
    ` : ''}

    <h2>Saídas dos comandos</h2>
    ${commandBlocks || '<p>Nenhum comando coletado.</p>'}
  `;
}

$('#printBtn').addEventListener('click', () => {
  const report = buildReport();
  $('#printArea').innerHTML = printableHtml(report);
  setTimeout(() => window.print(), 120);
});

/* -------------------------------- Boot ----------------------------------- */

async function boot() {
  applyTheme(localStorage.getItem('magicTheme') || 'dark');

  $('#terminalOutput').innerHTML = '';
  state.terminalBytes = 0;

  const savedOperator = localStorage.getItem('magicOperator');
  if (savedOperator) $('#operatorName').value = savedOperator;

  try {
    const info = await window.magic.info();
    if (info.ok) {
      state.appInfo = info.data;
      $('#appInfo').textContent = `Magic Local ${info.data.version} · Electron ${info.data.electron} · ${info.data.platform}/${info.data.arch}`;
    }
  } catch { /* opcional */ }

  await refreshOverview(true);
  await refreshSshStatus();
  updateReportPreview();

  const connected = await refreshSshStatus();
  if (connected && state.hgu.connected) {
    setStatusLine(`Sessão SSH ainda ativa em ${state.hgu.host}.`, 'ok');
    appendTerminal(`--- sessão ativa em ${state.hgu.host} ---`, 'term-ok');
  }

  if (!state.hgu.connected) {
    appendTerminal('Terminal pronto. Conecte ao HGU na aba HGU.', 'term-meta');
  }
}

window.magic.net.onScanProgress((progress) => {
  $('#scanProgressWrap').hidden = false;
  $('#scanProgressBar').style.width = `${progress.percent || 0}%`;
  $('#scanProgressLabel').textContent = `Varrendo ${progress.done}/${progress.total}...`;
  $('#scanProgressCount').textContent = `${progress.found} encontrados`;
});

window.magic.ssh.onInventoryProgress((progress) => {
  if (!state.busy.inventory) return;
  $('#inventoryProgressWrap').hidden = false;
  $('#inventoryProgressLabel').textContent = `Coletando: ${progress.label || progress.phase || ''}`;
  $('#inventoryProgressCount').textContent = `${progress.index || 0}/${progress.total || '?'}`;
  $('#inventoryProgressCommand').textContent = progress.command || '';
  $('#inventoryProgressBar').style.width = `${progressPercent(progress) || 3}%`;
});

$('#operatorName').addEventListener('change', () => {
  localStorage.setItem('magicOperator', $('#operatorName').value.trim());
});

$('#workOrder').addEventListener('change', () => {
  localStorage.setItem('magicWorkOrder', $('#workOrder').value.trim());
});

$('#reportNotes').addEventListener('change', () => {
  localStorage.setItem('magicNotes', $('#reportNotes').value);
});

const savedWorkOrder = localStorage.getItem('magicWorkOrder');
if (savedWorkOrder) $('#workOrder').value = savedWorkOrder;
const savedNotes = localStorage.getItem('magicNotes');
if (savedNotes) $('#reportNotes').value = savedNotes;

boot();
