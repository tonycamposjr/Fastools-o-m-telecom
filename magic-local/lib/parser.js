'use strict';

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return (match[1] || '').trim();
  }
  return '';
}

function normalizeValue(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeMac(value) {
  const raw = String(value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (raw.length !== 12) return '';
  return raw.match(/.{2}/g).join(':');
}

function numberValue(value) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function allText(commands) {
  return (commands || []).map((item) => item.output || '').join('\n\n');
}

function commandText(commands, matcher) {
  return (commands || [])
    .filter((item) => matcher.test(`${item.command || ''} ${item.label || ''}`))
    .map((item) => item.output || '')
    .join('\n\n');
}

function parseOptical(text) {
  const optical = {
    rx: null,
    tx: null,
    temperature: null,
    voltage: null,
    bias: null,
    raw: {},
  };

  const keys = {
    rx: /(?:rx|receive)\s*power/i,
    tx: /(?:tx|transmit)\s*power/i,
    temperature: /temperature|temperatura/i,
    voltage: /voltage|tens[aã]o/i,
    bias: /bias(?:\s*current)?|corrente/i,
  };

  for (const line of text.split(/\r?\n/)) {
    for (const [key, pattern] of Object.entries(keys)) {
      if (!pattern.test(line)) continue;
      const match = line.match(/([-+]?\d+(?:[.,]\d+)?)\s*(dBm|mA|mV|V|C|°C)?/i);
      if (!match) continue;
      const value = numberValue(match[1]);
      if (value === null) continue;
      if (optical[key] === null) optical[key] = value;
      optical.raw[key] = line.trim();
    }
  }

  return optical;
}

function parseDevices(commands) {
  const devices = new Map();
  const sources = (commands || []).filter((item) => /dhcp|wifi|lan|map_info/i.test(`${item.command || ''} ${item.label || ''}`));

  for (const source of sources) {
    for (const line of String(source.output || '').split(/\r?\n/)) {
      const ipMatch = line.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
      const macMatch = line.match(/\b([0-9a-fA-F]{2}(?:[-:][0-9a-fA-F]{2}){5})\b/);
      if (!ipMatch || !macMatch) continue;

      const ip = ipMatch[1];
      const mac = normalizeMac(macMatch[1]);
      if (!mac || mac === 'FF:FF:FF:FF:FF:FF' || ip === '0.0.0.0' || ip.endsWith('.255')) continue;

      const lower = line.toLowerCase();
      const media = /wifi|wi-fi|wireless|5g|2\.4g/.test(lower)
        ? 'Wi-Fi'
        : /ethernet|eth\b|lan\b|cabo/.test(lower)
          ? 'Ethernet'
          : 'LAN';

      const existing = devices.get(mac);
      if (existing) {
        if (!existing.ip) existing.ip = ip;
        if (existing.media === 'LAN' && media !== 'LAN') existing.media = media;
        continue;
      }

      // Guarda o restante da linha como descrição/hostname, sem numeros de IP/MAC.
      const description = line
        .replace(macMatch[0], ' ')
        .replace(ipMatch[0], ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 90);

      devices.set(mac, {
        ip,
        mac,
        media,
        description,
      });
    }
  }

  return [...devices.values()].sort((a, b) => {
    const lastA = Number(a.ip.split('.').pop());
    const lastB = Number(b.ip.split('.').pop());
    return lastA - lastB;
  });
}

function parseInventory(inventory) {
  const commands = (inventory && inventory.commands) || [];
  const text = allText(commands);
  const lower = text.toLowerCase();

  const model = firstMatch(text, [
    /(?:device_model|device model|product model|model(?: name)?)\s*[:=]?\s*(RTF[0-9A-Z-]+|GPT-[0-9A-Z-]+)/i,
    /(RTF[0-9A-Z-]{4,}|GPT-[0-9A-Z-]{4,})/i,
  ]) || (inventory && inventory.model) || '';

  let serial = firstMatch(text, [
    /serial(?:\s*number|\s*no)?\s*[:=]\s*([A-Z0-9]{6,})/i,
    /(?:^|\n)\s*serial\s+([A-Z0-9]{6,})\s*(?:\r?\n|$)/i,
  ]);

  const firstMac = firstMatch(text, [/first\s+mac\s*[:=]\s*([0-9A-F]{12})/i]);
  if (!serial && firstMac) serial = firstMac.toUpperCase();

  const macValue = firstMatch(text, [
    /(?:hgu|device|base|wan|lan)?\s*mac(?:\s*address)?\s*[:=]\s*([0-9A-F:.-]{12,17})/i,
    /first\s+mac\s*[:=]\s*([0-9A-F]{12})/i,
    /\b([0-9A-F]{2}(?:[-:][0-9A-F]{2}){5})\b/i,
  ]);
  const mac = normalizeMac(macValue) || normalizeMac(firstMac);

  const firmware = normalizeValue(firstMatch(text, [
    /auxfs\s+version\s*[:=]\s*(.+)/i,
    /(?:^|\n)\s*fw\s*[:=]\s*(.+)/i,
    /(?:firmware|software)(?:\s+version)?\s*[:=]\s*(.+)/i,
    /tef_img_version_[01]\s*=\s*(.+)/i,
    /(?:partition\s+[12]\s+version)\s*[:=]\s*(.+)/i,
  ]));

  const uptime = normalizeValue(firstMatch(text, [
    /(?:system\s+)?uptime\s*[:=]\s*(.+)/i,
  ]));

  const wanText = commandText(commands, /wan|route|ifconfig|diagnos/i);
  const opticalText = commandText(commands, /optic|ont|gpon|transceiver|diagnos/i);
  const optical = parseOptical(opticalText || text);

  const wanIp = firstMatch(wanText || text, [
    /inet\s+addr\s*:\s*(\d{1,3}(?:\.\d{1,3}){3})/i,
    /(?:ipv4|ip)\s+address\s*[:=]?\s*(\d{1,3}(?:\.\d{1,3}){3})/i,
    /local\s+address\s*[:=]?\s*(\d{1,3}(?:\.\d{1,3}){3})/i,
  ]);

  const dnsServers = [];
  const dnsMatches = (text.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || []);
  const dnsLine = firstMatch(text, [
    /dns(?:\s+servers?)?\s*[:=]\s*([0-9.,\s]+)/i,
    /(?:name\s+server|nameserver)\s*[:=]?\s*([0-9.,\s]+)/i,
  ]);
  const dnsSource = dnsLine || (wanText.match(/dns[^\n]*/i) || [''])[0];
  for (const address of (dnsSource.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || [])) {
    if (!dnsServers.includes(address)) dnsServers.push(address);
  }
  if (!dnsServers.length && /dns/i.test(text)) {
    for (const address of dnsMatches.slice(0, 4)) dnsServers.push(address);
  }

  const gateway = firstMatch(wanText || text, [
    /default\s+(?:via\s+)?(\d{1,3}(?:\.\d{1,3}){3})/i,
    /0\.0\.0\.0\s+(\d{1,3}(?:\.\d{1,3}){3})/i,
  ]);

  const diagStatus = firstMatch(text, [
    /internet_service\s+\S+\s+(\S+)/i,
    /(?:internet|wan)(?:\s+service)?\s+(?:status)?\s*[:=]\s*(up|down|connected|disconnected|ok|nok)/i,
  ]);

  const wanStatus = normalizeValue(
    diagStatus
    || firstMatch(wanText, [/(?:status|state)\s*[:=]\s*(up|down|connected|disconnected|ok|nok)/i])
    || (wanIp ? 'UP' : '')
  );

  const devices = parseDevices(commands);
  const wifiDevices = devices.filter((device) => device.media === 'Wi-Fi');
  const lanDevices = devices.filter((device) => device.media !== 'Wi-Fi');

  const checks = {
    internet: {
      status: wanIp || /up|connected|ok/i.test(wanStatus) ? 'ok' : wanStatus ? 'warn' : 'unknown',
      detail: wanIp ? `IP WAN ${wanIp}` : wanStatus || 'sem leitura',
    },
    gpon: {
      status: optical.rx === null ? 'unknown' : optical.rx >= -27 ? 'ok' : 'warn',
      detail: optical.rx === null ? 'sem leitura óptica' : `Rx ${optical.rx} dBm`,
    },
    dns: {
      status: dnsServers.length ? 'ok' : 'unknown',
      detail: dnsServers.length ? dnsServers.join(', ') : 'sem leitura',
    },
    lan: {
      status: lanDevices.length ? 'ok' : 'unknown',
      detail: `${lanDevices.length} dispositivo(s) Ethernet/LAN`,
    },
    wifi: {
      status: wifiDevices.length ? 'ok' : 'unknown',
      detail: `${wifiDevices.length} cliente(s) Wi-Fi`,
    },
  };

  return {
    model,
    vendor: (inventory && inventory.profile && inventory.profile.vendor) || '',
    family: (inventory && inventory.profile && inventory.profile.family) || '',
    profile: (inventory && inventory.profile && inventory.profile.label) || '',
    serial,
    mac,
    firmware,
    uptime,
    wan: {
      status: wanStatus,
      ip: wanIp,
      gateway,
      dns: dnsServers,
    },
    optical,
    devices,
    counts: {
      total: devices.length,
      wifi: wifiDevices.length,
      lan: lanDevices.length,
    },
    checks,
    keywords: {
      hasInternet: /internet_service|wan|pppoe|dhcp/i.test(lower),
      hasWifi: /wifi|wi-fi|ssid|station/i.test(lower),
      hasVoip: /voip|voice|sip/i.test(lower),
      hasIptv: /iptv|stb|mediaroom/i.test(lower),
    },
  };
}

function textReport(report) {
  const summary = report.summary || {};
  const lines = [];
  const push = (label, value) => lines.push(`${label.padEnd(24, ' ')}${value || '-'}`);

  lines.push('MAGIC LOCAL - LAUDO DE CAMPO');
  lines.push('='.repeat(62));
  push('Gerado em', report.generatedAt);
  push('Operador', report.operator || '-');
  push('Host', report.machine || '-');
  lines.push('');
  lines.push('REDE LOCAL');
  lines.push('-'.repeat(62));
  const net = report.network || {};
  push('Interface', net.primary ? net.primary.name : '-');
  push('IPv4', net.primary ? net.primary.address : '-');
  push('Gateway', net.gateway);
  push('DNS', (net.dns || []).join(', '));
  lines.push('');
  lines.push('HGU');
  lines.push('-'.repeat(62));
  push('Modelo', summary.model);
  push('Perfil', summary.profile);
  push('Serial', summary.serial);
  push('MAC', summary.mac);
  push('Firmware', summary.firmware);
  push('Uptime', summary.uptime);
  push('WAN', summary.wan ? `${summary.wan.status || '-'} | IP ${summary.wan.ip || '-'} | gw ${summary.wan.gateway || '-'}` : '-');
  push('Óptica Rx/Tx', summary.optical ? `${summary.optical.rx ?? '-'} / ${summary.optical.tx ?? '-'} dBm` : '-');
  push('Clientes', summary.counts ? `${summary.counts.total} total (${summary.counts.wifi} Wi-Fi / ${summary.counts.lan} LAN)` : '-');
  lines.push('');
  lines.push('VERIFICAÇÕES');
  lines.push('-'.repeat(62));
  for (const [key, value] of Object.entries(summary.checks || {})) {
    lines.push(`${key.toUpperCase().padEnd(10, ' ')} ${String(value.status || '-').toUpperCase().padEnd(8, ' ')} ${value.detail || ''}`);
  }

  if (summary.devices && summary.devices.length) {
    lines.push('');
    lines.push('DISPOSITIVOS');
    lines.push('-'.repeat(62));
    for (const device of summary.devices) {
      lines.push(`${(device.ip || '-').padEnd(15, ' ')} ${(device.mac || '-').padEnd(18, ' ')} ${(device.media || '-').padEnd(9, ' ')} ${device.description || ''}`);
    }
  }

  lines.push('');
  lines.push('SAÍDAS DOS COMANDOS');
  lines.push('-'.repeat(62));
  for (const item of (report.commands || [])) {
    lines.push('');
    lines.push(`### ${item.label || item.command}  [${item.command}]${item.timedOut ? ' (timeout)' : ''}`);
    lines.push(item.output || '(sem saída)');
  }

  if (report.scan && report.scan.hosts) {
    lines.push('');
    lines.push('VARREDURA DA REDE LOCAL');
    lines.push('-'.repeat(62));
    lines.push(`Faixa: ${report.scan.range} | encontrados: ${report.scan.found}`);
    for (const host of report.scan.hosts) {
      lines.push(`${(host.ip || '-').padEnd(15, ' ')} ${(host.mac || '-').padEnd(18, ' ')} ${host.self ? 'este PC' : host.gateway ? 'gateway' : ''} ${host.hostname || ''}`);
    }
  }

  return lines.join('\r\n');
}

module.exports = {
  parseInventory,
  textReport,
  parseOptical,
  parseDevices,
  normalizeMac,
};
