'use strict';

const os = require('node:os');
const dns = require('node:dns');
const net = require('node:net');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const VIRTUAL_IFACE = /(vEthernet|VMware|VirtualBox|Hyper-V|Loopback|Docker|WSL|Tailscale|ZeroTier|Radmin|VPN)/i;
const PHYSICAL_HINT = /(Wi-?Fi|Wireless|Ethernet|LAN|WLAN|Local Area Connection)/i;

function isPrivateIPv4(address) {
  return /^10\./.test(address)
    || /^192\.168\./.test(address)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(address);
}

function ipv4ToInt(address) {
  return address.split('.').reduce((total, part) => ((total << 8) | Number(part)) >>> 0, 0);
}

function intToIpv4(value) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

function maskToPrefix(mask) {
  return mask.split('.').reduce((total, part) => total + (Number(part).toString(2).match(/1/g) || []).length, 0);
}

function networkBase(address, netmask) {
  const prefix = maskToPrefix(netmask || '255.255.255.0');
  if (prefix <= 0 || prefix >= 32) return address;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIpv4((ipv4ToInt(address) & mask) >>> 0);
}

function usableHosts(address, netmask) {
  const prefix = Math.max(24, maskToPrefix(netmask || '255.255.255.0'));
  const base = networkBase(address, netmask || '255.255.255.0');
  if (prefix >= 31) return [address];
  const baseInt = ipv4ToInt(base);
  const hosts = [];
  for (let i = 1; i <= 254; i += 1) hosts.push(intToIpv4(baseInt + i));
  return hosts;
}

function normalizeMac(mac) {
  return String(mac || '')
    .replace(/-/g, ':')
    .trim()
    .toUpperCase();
}

async function detectGateway() {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      const { stdout } = await execFileAsync('route', ['print', '-4', '0.0.0.0'], {
        timeout: 6000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      const lines = stdout.split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d{1,3}(?:\.\d{1,3}){3})\s+/);
        if (match && match[1] !== '0.0.0.0') return match[1];
      }
    } else if (platform === 'darwin') {
      const { stdout } = await execFileAsync('netstat', ['-rn', '-f', 'inet'], {
        timeout: 6000,
        maxBuffer: 1024 * 1024,
      });
      const match = stdout.match(/^default\s+(\d{1,3}(?:\.\d{1,3}){3})/m);
      if (match) return match[1];
    } else {
      const { stdout } = await execFileAsync('ip', ['route', 'show', 'default'], {
        timeout: 6000,
        maxBuffer: 1024 * 1024,
      });
      const match = stdout.match(/default\s+via\s+(\d{1,3}(?:\.\d{1,3}){3})/);
      if (match) return match[1];
    }
  } catch {
    /* sem rota padrão: usa heuristica */
  }
  return '';
}

function pickPrimary(candidates, gateway) {
  if (!candidates.length) return null;
  if (gateway) {
    const match = candidates.find(({ item }) => (
      item.private
      && !item.virtual
      && networkBase(item.address, item.netmask) === networkBase(gateway, item.netmask)
    ));
    if (match) return match.item;
  }
  return candidates[0].item;
}

async function getOverview() {  const interfaces = [];
  const candidates = [];

  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const info of addresses || []) {
      if (info.family !== 'IPv4') continue;
      const item = {
        name,
        address: info.address,
        netmask: info.netmask,
        mac: normalizeMac(info.mac),
        internal: Boolean(info.internal),
        virtual: VIRTUAL_IFACE.test(name),
        private: isPrivateIPv4(info.address),
      };
      interfaces.push(item);
      if (info.internal) continue;

      let score = 0;
      if (PHYSICAL_HINT.test(name)) score += 20;
      if (item.private) score += 10;
      if (item.virtual) score -= 30;
      if (/^169\.254\./.test(info.address)) score -= 45;
      candidates.push({ item, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  let gateway = await detectGateway();
  const primary = pickPrimary(candidates, gateway);

  if (!gateway && primary) {
    const base = networkBase(primary.address, primary.netmask);
    gateway = `${base.split('.').slice(0, 3).join('.')}.1`;
  }

  return {
    hostname: os.hostname(),
    platform: process.platform,
    release: os.release(),
    arch: process.arch,
    primary,
    gateway,
    dns: dns.getServers(),
    interfaces,
    scannedAt: new Date().toISOString(),
  };
}

async function pingHost(host, count = 4, timeout = 1200) {
  const target = String(host || '').trim();
  if (!target) throw new Error('Host vazio.');

  const args = process.platform === 'win32'
    ? ['-n', String(count), '-w', String(timeout), target]
    : ['-c', String(count), '-W', String(Math.max(1, Math.ceil(timeout / 1000))), target];

  const started = Date.now();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    const result = await execFileAsync('ping', args, {
      timeout: Math.max(5000, count * (timeout + 500) + 3000),
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    });
    stdout = result.stdout || '';
    stderr = result.stderr || '';
  } catch (error) {
    stdout = error.stdout || '';
    stderr = error.stderr || '';
    exitCode = typeof error.code === 'number' ? error.code : 1;
    if (!stdout && !stderr) {
      throw new Error(String(error.message || error));
    }
  }

  const output = `${stdout}\n${stderr}`;
  const times = [];
  const timePattern = /(?:time|tempo|tiempo|temps)\s*[=<]\s*([\d.,]+)\s*ms/gi;
  let match;
  while ((match = timePattern.exec(output)) !== null) {
    times.push(Number(String(match[1]).replace(',', '.')));
  }

  let loss = null;
  const lossMatch = output.match(/(\d{1,3})\s*%/);
  if (lossMatch) loss = Number(lossMatch[1]);

  let sent = count;
  let received = times.length;
  const unixStats = output.match(/(\d+)\s+packets transmitted,\s*(\d+)\s+(?:packets\s+)?received/i);
  if (unixStats) {
    sent = Number(unixStats[1]);
    received = Number(unixStats[2]);
  }
  const winStats = output.match(/(?:Received|Recebidos|Re[çc]us|Recibidos)\s*=\s*(\d+)/i);
  if (winStats) received = Number(winStats[1]);
  if (loss === null && sent > 0) loss = Math.max(0, Math.round(((sent - received) / sent) * 100));

  const average = times.length
    ? Math.round((times.reduce((sum, value) => sum + value, 0) / times.length) * 10) / 10
    : null;

  return {
    host: target,
    reachable: received > 0 || (times.length > 0),
    sent,
    received: Math.max(received, times.length),
    loss,
    min: times.length ? Math.min(...times) : null,
    max: times.length ? Math.max(...times) : null,
    avg: average,
    duration: Date.now() - started,
    exitCode,
    raw: output.slice(0, 12000).trim(),
  };
}

function connectPort(host, port, timeout = 1600) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (open, error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({
        port,
        open,
        ms: Date.now() - started,
        error: error ? String(error.code || error.message || error) : '',
      });
    };

    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true, null));
    socket.once('timeout', () => finish(false, new Error('timeout')));
    socket.once('error', (error) => finish(false, error));
    socket.connect(port, host);
  });
}

async function checkPorts(host, ports) {
  const unique = [...new Set((ports || []).map((port) => Number(port)).filter((port) => port >= 1 && port <= 65535))];
  return Promise.all(unique.map((port) => connectPort(host, port)));
}

async function arpTable() {
  const entries = new Map();
  try {
    const { stdout } = await execFileAsync('arp', ['-a'], {
      timeout: 8000,
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    });
    for (const line of stdout.split(/\r?\n/)) {
      const win = line.match(/^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F]{2}(?:[-:][0-9a-fA-F]{2}){5})\s+/);
      if (win) {
        entries.set(win[1], normalizeMac(win[2]));
        continue;
      }
      const unix = line.match(/\((\d{1,3}(?:\.\d{1,3}){3})\)\s+at\s+([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})/);
      if (unix) entries.set(unix[1], normalizeMac(unix[2]));
    }
  } catch {
    /* arp pode não existir */
  }
  return entries;
}

async function reverseLookup(address) {
  try {
    const names = await Promise.race([
      dns.promises.reverse(address),
      new Promise((resolve) => setTimeout(() => resolve([]), 600)),
    ]);
    return Array.isArray(names) && names.length ? names[0] : '';
  } catch {
    return '';
  }
}

async function quickPing(host, timeout = 450) {
  const args = process.platform === 'win32'
    ? ['-n', '1', '-w', String(timeout), host]
    : ['-c', '1', '-W', '1', host];
  try {
    await execFileAsync('ping', args, {
      timeout: 2500,
      windowsHide: true,
      maxBuffer: 256 * 1024,
    });
    return true;
  } catch {
    return false;
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(workers);
  return results;
}

function parseRequestedRange(requested, overview) {
  const primary = overview.primary;
  if (!primary) throw new Error('Nenhuma interface IPv4 ativa encontrada.');

  let base = networkBase(primary.address, primary.netmask);
  let prefix = Math.max(24, maskToPrefix(primary.netmask || '255.255.255.0'));

  const raw = String(requested || '').trim();
  if (raw) {
    const normalized = raw.replace(/\/\d+$/, '');
    if (net.isIP(normalized) === 4) {
      base = normalized.split('.').slice(0, 3).join('.') + '.0';
      prefix = 24;
    } else if (/^\d{1,3}(?:\.\d{1,3}){2}$/.test(normalized)) {
      base = `${normalized}.0`;
      prefix = 24;
    } else {
      throw new Error('Faixa inválida. Use algo como 192.168.15 ou 192.168.15.0/24.');
    }
  }

  if (prefix < 24) {
    // Limita a varredura a uma /24 em torno do IP local para não disparar 65 mil pings.
    base = networkBase(primary.address, '255.255.255.0');
    prefix = 24;
  }

  return { base, prefix, label: `${base}/24` };
}

async function scanLan(onProgress, requestedRange) {
  const overview = await getOverview();
  if (!overview.primary) throw new Error('Nenhuma interface IPv4 ativa encontrada.');

  const { label, base } = parseRequestedRange(requestedRange, overview);
  const hosts = usableHosts(`${base.split('.').slice(0, 3).join('.')}.1`, '255.255.255.0');
  const started = Date.now();
  let done = 0;
  let found = 0;

  const alive = await mapLimit(hosts, 32, async (host) => {
    const up = await quickPing(host);
    done += 1;
    if (up) found += 1;
    if (onProgress && (done % 8 === 0 || done === hosts.length)) {
      onProgress({ done, total: hosts.length, found, percent: Math.round((done / hosts.length) * 100) });
    }
    return up ? host : null;
  });

  const reachable = new Set(alive.filter(Boolean));
  reachable.add(overview.primary.address);
  if (overview.gateway) reachable.add(overview.gateway);

  const arp = await arpTable();
  const inRange = [...arp.keys()].filter((address) => {
    if (!address.startsWith(`${base.split('.').slice(0, 3).join('.')}.`)) return false;
    const last = Number(address.split('.').pop());
    return last > 0 && last < 255;
  });
  for (const address of inRange) reachable.add(address);

  const list = [...reachable].sort((a, b) => ipv4ToInt(a) - ipv4ToInt(b));
  const hostnames = await mapLimit(list, 12, (address) => reverseLookup(address));

  const result = list.map((address, index) => ({
    ip: address,
    mac: arp.get(address) || (address === overview.primary.address ? overview.primary.mac : ''),
    hostname: hostnames[index] || '',
    self: address === overview.primary.address,
    gateway: address === overview.gateway,
  }));

  if (onProgress) {
    onProgress({ done: hosts.length, total: hosts.length, found: result.length, percent: 100 });
  }

  return {
    range: label,
    total: hosts.length,
    found: result.length,
    elapsed: Date.now() - started,
    hosts: result,
  };
}

module.exports = {
  getOverview,
  pingHost,
  checkPorts,
  scanLan,
  // exportados para testes
  networkBase,
  usableHosts,
  normalizeMac,
  pickPrimary,
};
