'use strict';

const { Client } = require('ssh2');

/* Perfis derivados dos modelos suportados pelo Magic Tool (params_unified).
   Os comandos são de LEITURA. Nada aqui altera a configuração do HGU. */
const PROFILES = [
  {
    id: 'askey_brcm',
    label: 'Askey Broadcom',
    vendor: 'Askey',
    family: 'Broadcom',
    models: ['RTF3505VW-N1', 'RTF3505VW-N2', 'RTF3507VW-N1', 'RTF3507VW-N2'],
    commands: [
      { label: 'Modelo', command: 'show device_model' },
      { label: 'Versão / firmware', command: 'version' },
      { label: 'Serial', command: 'show serial' },
      { label: 'Óptica GPON', command: 'show ont optics' },
      { label: 'Resumo ONT', command: 'show ont summary' },
      { label: 'Diagnóstico primário', command: 'show primary_diagnosis' },
      { label: 'WAN', command: 'wan show' },
      { label: 'Rotas', command: 'route show' },
      { label: 'DHCP / LAN', command: 'show map_info dhcp_table' },
      { label: 'Wi-Fi', command: 'show wifi_plus all' },
    ],
  },
  {
    id: 'mitra_brcm',
    label: 'Mitra Broadcom',
    vendor: 'Mitra',
    family: 'Broadcom',
    models: ['GPT-2541GNAC-N1', 'GPT-2541GNAC-N2'],
    commands: [
      { label: 'Modelo', command: 'show device_model' },
      { label: 'Versão / firmware', command: 'version' },
      { label: 'Serial', command: 'show serial' },
      { label: 'Óptica GPON', command: 'show ont optics' },
      { label: 'Resumo ONT', command: 'show ont summary' },
      { label: 'Diagnóstico primário', command: 'show primary_diagnosis' },
      { label: 'WAN', command: 'wan show' },
      { label: 'Rotas', command: 'route show' },
      { label: 'DHCP / LAN', command: 'show map_info dhcp_table' },
      { label: 'Wi-Fi', command: 'show wifi_plus all' },
    ],
  },
  {
    id: 'askey_ecnt',
    label: 'Askey ECNT',
    vendor: 'Askey',
    family: 'ECNT',
    models: ['RTF8117VW', 'RTF8115VW', 'RTF8115VW-SV'],
    commands: [
      { label: 'Versão / firmware', command: 'version' },
      { label: 'Serial', command: 'show serial' },
      { label: 'Óptica GPON', command: 'show ont optics' },
      { label: 'Resumo ONT', command: 'show ont summary' },
      { label: 'Diagnóstico primário', command: 'show primary_diagnosis' },
      { label: 'WAN', command: 'wan show' },
      { label: 'Rotas', command: 'route show' },
      { label: 'DHCP / LAN', command: 'show map_info dhcp_table' },
      { label: 'Wi-Fi', command: 'show wifi_plus all' },
    ],
  },
  {
    id: 'mitra_ecnt',
    label: 'Mitra ECNT',
    vendor: 'Mitra',
    family: 'ECNT',
    models: [
      'GPT-2741GNAC', 'GPT-2741GNAC-N1', 'GPT-2741GNAC-N2',
      'GPT-2731GN2A4P', 'GPT-2731GN2A4P-N2',
      'GPT-2741GNAC-N1-SV', 'GPT-2741GNAC-N2-SV',
    ],
    commands: [
      { label: 'Identificação (sys atsh)', command: 'sys atsh' },
      { label: 'Óptica GPON', command: 'show ont optics' },
      { label: 'Resumo ONT', command: 'show ont summary' },
      { label: 'Diagnóstico primário', command: 'show primary_diagnosis' },
      { label: 'WAN', command: 'wan show' },
      { label: 'Rotas', command: 'route show' },
      { label: 'DHCP / LAN', command: 'show map_info dhcp_table' },
      { label: 'Wi-Fi', command: 'show wifi_plus all' },
    ],
  },
  {
    id: 'mitra_wifi6',
    label: 'Mitra Wi-Fi 6',
    vendor: 'Mitra',
    family: 'Wi-Fi 6',
    models: ['GPT-2742GX4X5v6', 'GPT-2742GX4X5v6-SV'],
    commands: [
      { label: 'Identificação (sys atsh)', command: 'sys atsh' },
      { label: 'Óptica GPON', command: 'show ont optics' },
      { label: 'Resumo ONT', command: 'show ont summary' },
      { label: 'Diagnóstico primário', command: 'show primary_diagnosis' },
      { label: 'WAN', command: 'wan show' },
      { label: 'Rotas', command: 'route show' },
      { label: 'DHCP / LAN', command: 'show map_info dhcp_table' },
      { label: 'Wi-Fi', command: 'show wifi_plus all' },
    ],
  },
  {
    id: 'askey_wifi6',
    label: 'Askey Wi-Fi 6',
    vendor: 'Askey',
    family: 'Wi-Fi 6',
    models: ['RTF8225VW', 'RTF8225VW-SV'],
    commands: [
      { label: 'Modelo', command: 'show device_model' },
      { label: 'Versão / firmware', command: 'version' },
      { label: 'Serial', command: 'show serial' },
      { label: 'Óptica GPON', command: 'show ont optics' },
      { label: 'Resumo ONT', command: 'show ont summary' },
      { label: 'Diagnóstico primário', command: 'show primary_diagnosis' },
      { label: 'WAN', command: 'wan show' },
      { label: 'Rotas', command: 'route show' },
      { label: 'DHCP / LAN', command: 'show map_info dhcp_table' },
      { label: 'Wi-Fi', command: 'show wifi_plus all' },
    ],
  },
  {
    id: 'askey_wifi7',
    label: 'Askey Wi-Fi 7',
    vendor: 'Askey',
    family: 'Wi-Fi 7',
    models: ['RTF8316VW'],
    commands: [
      { label: 'Modelo', command: 'show device_model' },
      { label: 'Versão / firmware', command: 'version' },
      { label: 'Serial', command: 'show serial' },
      { label: 'Óptica GPON', command: 'show ont optics' },
      { label: 'Resumo ONT', command: 'show ont summary' },
      { label: 'Diagnóstico primário', command: 'show primary_diagnosis' },
      { label: 'WAN', command: 'wan show' },
      { label: 'Rotas', command: 'route show' },
      { label: 'DHCP / LAN', command: 'show map_info dhcp_table' },
      { label: 'Wi-Fi', command: 'show wifi_plus all' },
    ],
  },
];

const DEFAULT_PROFILE = {
  id: 'generic',
  label: 'HGU genérico',
  vendor: '',
  family: '',
  models: [],
  commands: [
    { label: 'Modelo', command: 'show device_model' },
    { label: 'Identificação (sys atsh)', command: 'sys atsh' },
    { label: 'Versão / firmware', command: 'version' },
    { label: 'Óptica GPON', command: 'show ont optics' },
    { label: 'Diagnóstico primário', command: 'show primary_diagnosis' },
    { label: 'WAN', command: 'wan show' },
    { label: 'Rotas', command: 'route show' },
    { label: 'DHCP / LAN', command: 'show map_info dhcp_table' },
    { label: 'Wi-Fi', command: 'show wifi_plus all' },
  ],
};

function normalizeModel(value) {
  return String(value || '').toUpperCase().replace(/\s+/g, '');
}

function detectProfile(model) {
  const normalized = normalizeModel(model);
  if (!normalized) return DEFAULT_PROFILE;

  const exact = PROFILES.find((profile) => profile.models.some((item) => normalizeModel(item) === normalized));
  if (exact) return exact;

  if (/^RTF350[57]/.test(normalized)) return PROFILES.find((p) => p.id === 'askey_brcm');
  if (/^RTF811[57]/.test(normalized)) return PROFILES.find((p) => p.id === 'askey_ecnt');
  if (/^RTF8225/.test(normalized)) return PROFILES.find((p) => p.id === 'askey_wifi6');
  if (/^RTF8316/.test(normalized)) return PROFILES.find((p) => p.id === 'askey_wifi7');
  if (/^GPT-2541/.test(normalized)) return PROFILES.find((p) => p.id === 'mitra_brcm');
  if (/^GPT-27(31|41)/.test(normalized)) return PROFILES.find((p) => p.id === 'mitra_ecnt');
  if (/^GPT-2742/.test(normalized)) return PROFILES.find((p) => p.id === 'mitra_wifi6');
  return DEFAULT_PROFILE;
}

function extractModelFromText(text) {
  const source = String(text || '');
  const patterns = [
    /(?:device_model|device model|product model|model(?: name)?)\s*[:=]?\s*(RTF[0-9A-Z-]+|GPT-[0-9A-Z-]+)/i,
    /(?:^|\n)\s*(RTF[0-9A-Z-]{4,}|GPT-[0-9A-Z-]{4,})\s*(?:\r?\n|$)/i,
    /(RTF[0-9]{4}[A-Z0-9-]*|GPT-[0-9]{4}[A-Z0-9-]*)/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return '';
}

const ANSI_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

function stripAnsi(value) {
  return String(value || '')
    .replace(ANSI_PATTERN, '')
    .replace(/\u0000/g, '')
    .replace(/\r/g, '');
}

const PROMPT_AT_END = /(?:^|\n)[^\n]{0,140}(?:[>#]|~ #)\s*$/;

function cleanCommandOutput(raw, command) {
  let text = stripAnsi(raw);
  const lines = text.split('\n');

  // Remove o eco do comando enviado, quando presente na primeira linha.
  const firstNonEmpty = lines.findIndex((line) => line.trim() !== '');
  if (firstNonEmpty >= 0 && firstNonEmpty < 3) {
    const line = lines[firstNonEmpty].trim();
    if (line === command.trim() || line.endsWith(command.trim())) {
      lines.splice(firstNonEmpty, 1);
    }
  }

  // Remove um prompt final isolado.
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i -= 1) {
    const line = lines[i].trim();
    if (!line) {
      lines.splice(i, 1);
      continue;
    }
    if (line.length <= 140 && /^(?:[\w./@():~-]+\s*)?[>#]$/.test(line)) {
      lines.splice(i, 1);
      continue;
    }
    break;
  }

  text = lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim();
  return text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class HguSession {
  constructor() {
    this.client = null;
    this.stream = null;
    this.buffer = '';
    this.connected = false;
    this.host = '';
    this.port = 22;
    this.username = '';
    this.connectedAt = null;
    this.banner = '';
    this.lastDataAt = Date.now();
    this._queue = Promise.resolve();
    this._closing = false;
  }

  status() {
    return {
      connected: this.connected,
      host: this.host,
      port: this.port,
      username: this.username,
      connectedAt: this.connectedAt,
    };
  }

  async connect({ host, port = 22, username = 'support', password }) {
    await this.disconnect();

    const attempts = [
      { label: 'moderna', algorithms: null },
      {
        label: 'legada',
        algorithms: {
          kex: [
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group-exchange-sha1',
            'diffie-hellman-group1-sha1',
            'ecdh-sha2-nistp256',
            'curve25519-sha256',
          ],
          serverHostKey: ['ssh-ed25519', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa', 'ssh-dss'],
          cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-cbc', 'aes256-cbc', '3des-cbc'],
          hmac: ['hmac-sha1', 'hmac-sha2-256', 'hmac-sha2-512'],
        },
      },
    ];

    let lastError = null;
    for (const attempt of attempts) {
      try {
        await this._connectOnce({ host, port, username, password, algorithms: attempt.algorithms });
        this.connected = true;
        this.host = host;
        this.port = port;
        this.username = username;
        this.connectedAt = new Date().toISOString();
        return {
          ...this.status(),
          banner: this.banner,
          algorithmProfile: attempt.label,
        };
      } catch (error) {
        lastError = error;
        await this.disconnect().catch(() => {});
        const message = String(error && error.message ? error.message : error);
        if (!/handshake|no matching|kex|algorithm|host key/i.test(message)) break;
      }
    }

    throw lastError || new Error('Falha ao conectar por SSH.');
  }

  _connectOnce({ host, port, username, password, algorithms }) {
    return new Promise((resolve, reject) => {
      const client = new Client();
      let settled = false;
      let timer = null;

      const fail = (error) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        try { client.end(); } catch { /* ignore */ }
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const succeed = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve();
      };

      client.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
        finish((prompts || []).map(() => password));
      });

      client.on('error', (error) => fail(error));
      client.on('close', () => {
        if (!settled) fail(new Error('Conexão encerrada pelo HGU.'));
      });

      timer = setTimeout(() => fail(new Error('Timeout ao conectar no HGU (15 s). Verifique IP, cabo/Wi-Fi e porta 22.')), 15000);

      const config = {
        host,
        port,
        username,
        password,
        readyTimeout: 14000,
        keepaliveInterval: 15000,
        keepaliveCountMax: 3,
        tryKeyboard: true,
      };
      if (algorithms) config.algorithms = algorithms;

      client.once('ready', () => {
        client.shell({ term: 'xterm', cols: 200, rows: 50 }, (error, stream) => {
          if (error) {
            fail(error);
            return;
          }

          this.client = client;
          this.stream = stream;
          this.buffer = '';
          this.lastDataAt = Date.now();

          stream.setEncoding('utf8');
          stream.on('data', (data) => this._onData(data));
          stream.stderr.on('data', (data) => this._onData(data));
          stream.on('close', () => {
            this.connected = false;
            this.stream = null;
          });

          // Consome banner/prompt inicial sem devolver ao usuário.
          setTimeout(() => {
            this.banner = cleanCommandOutput(this.buffer, '');
            this.buffer = '';
            succeed();
          }, 900);
        });
      });

      client.connect(config);
    });
  }

  _onData(data) {
    this.lastDataAt = Date.now();
    this.buffer += String(data);
    if (this.buffer.length > 4 * 1024 * 1024) {
      this.buffer = this.buffer.slice(-2 * 1024 * 1024);
    }
  }

  _write(command) {
    if (!this.stream || !this.connected) throw new Error('Sessão SSH não está conectada.');
    this.stream.write(`${command}\n`);
  }

  async _collect({ timeout = 15000, quiet = 850, minimum = 300 } = {}) {
    const started = Date.now();
    let lastLength = -1;
    let changedAt = Date.now();

    while (Date.now() - started < timeout) {
      await sleep(80);
      if (this.buffer.length !== lastLength) {
        lastLength = this.buffer.length;
        changedAt = Date.now();
      }

      const elapsed = Date.now() - started;
      const idle = Date.now() - changedAt;
      const hasOutput = this.buffer.length > 0;

      if (elapsed >= minimum && hasOutput && idle >= quiet) break;
      if (elapsed >= minimum && hasOutput && idle >= 280 && PROMPT_AT_END.test(stripAnsi(this.buffer))) break;
      if (!this.stream) break;
    }

    const raw = this.buffer;
    this.buffer = '';
    const timedOut = Date.now() - started >= timeout && !PROMPT_AT_END.test(stripAnsi(raw));
    return { raw, timedOut, duration: Date.now() - started };
  }

  exec(command, { timeout = 15000 } = {}) {
    const run = async () => {
      if (!this.connected) throw new Error('Conecte ao HGU primeiro.');
      const cleanedCommand = String(command || '').replace(/[\r\n]+/g, ' ').trim();
      if (!cleanedCommand) throw new Error('Comando vazio.');

      this.buffer = '';
      this.lastDataAt = Date.now();
      const started = Date.now();
      this._write(cleanedCommand);
      const collected = await this._collect({ timeout });

      if (collected.timedOut) {
        // Ctrl+C para recuperar o prompt e limpar a saída pendente.
        try { this.stream.write('\u0003'); } catch { /* ignore */ }
        await sleep(350);
        this.buffer = '';
      }

      return {
        ok: !collected.timedOut,
        command: cleanedCommand,
        output: cleanCommandOutput(collected.raw, cleanedCommand),
        duration: Date.now() - started,
        timedOut: collected.timedOut,
      };
    };

    const result = this._queue.then(run, run);
    this._queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async inventory(onProgress, options = {}) {
    if (!this.connected) throw new Error('Conecte ao HGU primeiro.');

    const started = Date.now();
    const includeWifi = options.includeWifi !== false;
    const results = [];

    const runStep = async (label, command, timeout = 12000) => {
      if (onProgress) {
        onProgress({
          phase: 'command',
          label,
          command,
          index: results.length + 1,
          total: results.length + 1,
        });
      }
      const result = await this.exec(command, { timeout });
      results.push({ label, ...result });
      return result;
    };

    // Identificação: cobre BRCM (show device_model) e ECNT (sys atsh).
    const modelStep = await runStep('Modelo', 'show device_model', 9000);
    let model = extractModelFromText(modelStep.output);

    if (!model) {
      const atshStep = await runStep('Identificação', 'sys atsh', 9000);
      model = extractModelFromText(atshStep.output);
    } else {
      // Em alguns modelos o "sys atsh" traz serial/MAC que o show device_model não traz.
      const atshStep = await runStep('Identificação', 'sys atsh', 9000);
      model = model || extractModelFromText(atshStep.output);
    }

    const profile = detectProfile(model);
    const alreadyRun = new Set(results.map((item) => item.command));
    const commands = profile.commands.filter((item) => {
      if (alreadyRun.has(item.command)) return false;
      if (!includeWifi && /wi-?fi/i.test(item.label)) return false;
      return true;
    });

    for (let index = 0; index < commands.length; index += 1) {
      const item = commands[index];
      if (onProgress) {
        onProgress({
          phase: 'command',
          label: item.label,
          command: item.command,
          index: results.length + 1,
          total: results.length + commands.length - index,
        });
      }
      const result = await this.exec(item.command, {
        timeout: /wifi|dhcp|primary_diagnosis/i.test(item.command) ? 16000 : 12000,
      });
      results.push({ label: item.label, ...result });
    }

    return {
      model: model || 'Não identificado',
      profile: {
        id: profile.id,
        label: profile.label,
        vendor: profile.vendor,
        family: profile.family,
      },
      commands: results,
      startedAt: new Date(started).toISOString(),
      elapsed: Date.now() - started,
      includeWifi,
    };
  }

  async disconnect() {
    this.connected = false;
    this._closing = true;
    try {
      if (this.stream) this.stream.end();
    } catch { /* ignore */ }
    try {
      if (this.client) this.client.end();
    } catch { /* ignore */ }
    this.stream = null;
    this.client = null;
    this.buffer = '';
    this.banner = '';
    this.host = '';
    this.username = '';
    this.connectedAt = null;
    this._closing = false;
  }
}

module.exports = {
  HguSession,
  PROFILES,
  DEFAULT_PROFILE,
  detectProfile,
  extractModelFromText,
  stripAnsi,
  cleanCommandOutput,
};
