'use strict';

/* Testes unitarios e de integracao do Magic Local.
   Inclui um servidor SSH simulado (ssh2) para validar conexao,
   execucao de comandos, inventario e parsing sem HGU fisico. */

const assert = require('node:assert/strict');
const { Server, utils } = require('ssh2');

const {
  HguSession,
  PROFILES,
  DEFAULT_PROFILE,
  detectProfile,
  extractModelFromText,
  stripAnsi,
  cleanCommandOutput,
} = require('../lib/hgu');
const {
  parseInventory,
  parseOptical,
  parseDevices,
  textReport,
  normalizeMac,
} = require('../lib/parser');
const { networkBase, usableHosts } = require('../lib/network');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

/* ----------------------------- Respostas mock ----------------------------- */

const MOCK_RESPONSES = {
  'show device_model': [
    'device_model RTF3505VW-N1',
  ].join('\r\n'),
  'sys atsh': [
    'Product Model: RTF3505VW-N1',
    'FW: BR_SV_g000_R3505VWN1001_s42',
    'Serial Number: ABC123456789',
    'First MAC: AABBCCDDEEFF',
  ].join('\r\n'),
  version: [
    'RTF Model: 3505VW',
    'RTF Profile: N1',
    'Booted Partition: 0',
    'Partition 1 Version: BR_SV_g000_R3505VWN1001_s42',
    'Partition 2 Version: BR_SV_g000_R3505VWN1001_s41',
  ].join('\r\n'),
  'show serial': 'serial ABC123456789',
  'show ont optics': [
    'Rx Power : -19.50 dBm',
    'Tx Power : 2.40 dBm',
    'Temperature : 41.0 C',
    'Voltage : 3.30 V',
    'Bias Current : 7.20 mA',
  ].join('\r\n'),
  'show ont summary': [
    'ONT state: OPERATION',
    'PON mode: GPON',
    'Online duration: 12 days',
  ].join('\r\n'),
  'show primary_diagnosis': 'internet_service IPv4 CONNECTED',
  'wan show': [
    'WAN interface: ppp0',
    'Status: UP',
    'IP address: 100.64.10.25',
    'Default gateway: 100.64.0.1',
    'DNS servers: 8.8.8.8, 1.1.1.1',
  ].join('\r\n'),
  'route show': [
    'Destination Gateway Interface',
    '0.0.0.0 100.64.0.1 ppp0',
    '192.168.15.0 0.0.0.0 br0',
  ].join('\r\n'),
  'show map_info dhcp_table': [
    'IP Address MAC Address Interface Hostname',
    '192.168.15.10 aa:bb:cc:00:11:22 Ethernet desktop-sala',
    '192.168.15.11 aa:bb:cc:00:33:44 Wi-Fi celular',
    '192.168.15.12 aa:bb:cc:00:55:66 Wi-Fi notebook',
  ].join('\r\n'),
  'show wifi_plus all': [
    'Station MAC RSSI SSID',
    'aa:bb:cc:00:33:44 -52 VIVO-1234',
    'aa:bb:cc:00:55:66 -61 VIVO-1234',
  ].join('\r\n'),
};

const MOCK_OUTPUT_OTHER = {
  help: 'Comandos disponiveis: show, version, sys',
};

/* ------------------------------ Servidor SSH ------------------------------ */

function startMockServer() {
  return new Promise((resolve, reject) => {
    const hostKey = utils.generateKeyPairSync('ed25519').private;
    const server = new Server({ hostKeys: [hostKey] }, (client) => {
      client.on('authentication', (context) => {
        if (context.method === 'password' && context.username === 'support' && context.password === 'test123') {
          context.accept();
          return;
        }
        if (context.method === 'none') {
          context.reject(['password', 'keyboard-interactive']);
          return;
        }
        context.reject();
      });

      client.on('ready', () => {
        client.on('session', (accept) => {
          const session = accept();
          session.on('pty', (acceptPty) => {
            acceptPty();
          });
          session.on('window-change', (acceptChange) => {
            if (acceptChange) acceptChange();
          });
          session.on('shell', (acceptShell) => {
            const stream = acceptShell();
            stream.write('Mock HGU ready\r\nsupport@HGU> ');
            let pending = '';

            stream.on('data', (chunk) => {
              pending += chunk.toString('utf8');
              let newline = pending.indexOf('\n');
              while (newline >= 0) {
                const line = pending.slice(0, newline).replace(/\r/g, '').trim();
                pending = pending.slice(newline + 1);
                newline = pending.indexOf('\n');
                if (!line) continue;
                const output = MOCK_RESPONSES[line] || MOCK_OUTPUT_OTHER[line] || 'syntax error';
                stream.write(`${line}\r\n${output}\r\nsupport@HGU> `);
              }
            });
          });
        });
      });
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

/* --------------------------------- Testes -------------------------------- */

test('perfis suportados cobrem os modelos do APK', () => {
  assert.ok(PROFILES.length >= 7);
  for (const profile of PROFILES) {
    assert.ok(profile.commands.length > 0, `${profile.id} sem comandos`);
    for (const item of profile.commands) assert.ok(item.command && item.label);
  }
});

test('detectProfile identifica Askey, Mitra, ECNT e Wi-Fi 6/7', () => {
  assert.equal(detectProfile('RTF3505VW-N1').id, 'askey_brcm');
  assert.equal(detectProfile('RTF3507VW-N2').id, 'askey_brcm');
  assert.equal(detectProfile('RTF8115VW').id, 'askey_ecnt');
  assert.equal(detectProfile('RTF8117VW').id, 'askey_ecnt');
  assert.equal(detectProfile('GPT-2541GNAC-N1').id, 'mitra_brcm');
  assert.equal(detectProfile('GPT-2741GNAC-N2').id, 'mitra_ecnt');
  assert.equal(detectProfile('GPT-2742GX4X5v6').id, 'mitra_wifi6');
  assert.equal(detectProfile('RTF8225VW').id, 'askey_wifi6');
  assert.equal(detectProfile('RTF8316VW').id, 'askey_wifi7');
  assert.equal(detectProfile('modelo-desconhecido'), DEFAULT_PROFILE);
  assert.equal(detectProfile(''), DEFAULT_PROFILE);
});

test('extractModelFromText cobre BRCM e ECNT', () => {
  assert.equal(extractModelFromText('device_model RTF3505VW-N1'), 'RTF3505VW-N1');
  assert.equal(extractModelFromText('Product Model: GPT-2741GNAC-N2'), 'GPT-2741GNAC-N2');
  assert.equal(extractModelFromText('vendor=Askey\nmodel=RTF8115VW'), 'RTF8115VW');
  assert.equal(extractModelFromText('sem modelo'), '');
});

test('stripAnsi e cleanCommandOutput limpam eco e prompt', () => {
  const raw = '\u001b[32mshow version\u001b[0m\r\nRTF Model: 3505VW\r\nsupport@HGU> ';
  assert.equal(stripAnsi(raw).includes('\u001b'), false);
  const cleaned = cleanCommandOutput(raw, 'show version');
  assert.equal(cleaned, 'RTF Model: 3505VW');
});

test('parseOptical extrai Rx, Tx, temperatura, tensao e bias', () => {
  const optical = parseOptical(MOCK_RESPONSES['show ont optics']);
  assert.equal(optical.rx, -19.5);
  assert.equal(optical.tx, 2.4);
  assert.equal(optical.temperature, 41);
  assert.equal(optical.voltage, 3.3);
  assert.equal(optical.bias, 7.2);
});

test('parseDevices deduplica por MAC e identifica midia', () => {
  const devices = parseDevices([
    { command: 'show map_info dhcp_table', label: 'DHCP', output: MOCK_RESPONSES['show map_info dhcp_table'] },
    { command: 'show wifi_plus all', label: 'Wi-Fi', output: MOCK_RESPONSES['show wifi_plus all'] },
  ]);
  assert.equal(devices.length, 3);
  const wifi = devices.filter((device) => device.media === 'Wi-Fi');
  assert.equal(wifi.length, 2);
  assert.equal(devices[0].ip, '192.168.15.10');
  assert.equal(normalizeMac('aa-bb-cc-00-11-22'), 'AA:BB:CC:00:11:22');
});

test('parseInventory consolida modelo, serial, WAN, optica e checks', () => {
  const inventory = {
    model: 'RTF3505VW-N1',
    profile: { label: 'Askey Broadcom', vendor: 'Askey', family: 'Broadcom' },
    commands: Object.entries({
      'show device_model': 'Modelo',
      'sys atsh': 'Identificacao',
      version: 'Versao',
      'show serial': 'Serial',
      'show ont optics': 'Optica',
      'show primary_diagnosis': 'Diagnostico',
      'wan show': 'WAN',
      'route show': 'Rotas',
      'show map_info dhcp_table': 'DHCP',
      'show wifi_plus all': 'Wi-Fi',
    }).map(([command, label]) => ({ command, label, output: MOCK_RESPONSES[command] || '' })),
  };

  const summary = parseInventory(inventory);
  assert.equal(summary.model, 'RTF3505VW-N1');
  assert.equal(summary.serial, 'ABC123456789');
  assert.equal(summary.firmware, 'BR_SV_g000_R3505VWN1001_s42');
  assert.equal(summary.wan.ip, '100.64.10.25');
  assert.equal(summary.wan.gateway, '100.64.0.1');
  assert.deepEqual(summary.wan.dns, ['8.8.8.8', '1.1.1.1']);
  assert.equal(summary.optical.rx, -19.5);
  assert.equal(summary.counts.total, 3);
  assert.equal(summary.counts.wifi, 2);
  assert.equal(summary.checks.internet.status, 'ok');
  assert.equal(summary.checks.gpon.status, 'ok');
  assert.equal(summary.checks.dns.status, 'ok');
});

test('textReport gera laudo com secoes obrigatorias', () => {
  const report = {
    generatedAt: '2026-11-08T00:00:00.000Z',
    operator: 'Tecnico Teste',
    machine: 'PC-CAMPO',
    network: { primary: { name: 'Wi-Fi', address: '192.168.15.20' }, gateway: '192.168.15.1', dns: ['8.8.8.8'] },
    summary: {
      model: 'RTF3505VW-N1',
      profile: 'Askey Broadcom',
      serial: 'ABC123456789',
      mac: 'AA:BB:CC:DD:EE:FF',
      firmware: 'S42',
      wan: { status: 'UP', ip: '100.64.10.25', gateway: '100.64.0.1' },
      optical: { rx: -19.5, tx: 2.4 },
      counts: { total: 3, wifi: 2, lan: 1 },
      checks: { internet: { status: 'ok', detail: 'IP WAN' } },
      devices: [{ ip: '192.168.15.10', mac: 'AA:BB:CC:00:11:22', media: 'Wi-Fi', description: 'celular' }],
    },
    commands: [{ label: 'Optica', command: 'show ont optics', output: 'Rx Power : -19.50 dBm' }],
  };

  const text = textReport(report);
  assert.ok(text.includes('MAGIC LOCAL - LAUDO DE CAMPO'));
  assert.ok(text.includes('REDE LOCAL'));
  assert.ok(text.includes('HGU'));
  assert.ok(text.includes('VERIFICAÇÕES'));
  assert.ok(text.includes('DISPOSITIVOS'));
  assert.ok(text.includes('show ont optics'));
  assert.ok(text.includes('Tecnico Teste'));
});

test('helpers de rede calculam base e hosts /24', () => {
  assert.equal(networkBase('192.168.15.77', '255.255.255.0'), '192.168.15.0');
  assert.equal(networkBase('10.20.30.40', '255.255.0.0'), '10.20.0.0');
  const hosts = usableHosts('192.168.15.1', '255.255.255.0');
  assert.equal(hosts.length, 254);
  assert.equal(hosts[0], '192.168.15.1');
  assert.equal(hosts[253], '192.168.15.254');
});

test('HguSession conecta, executa comando e limpa saida', async () => {
  const { server, port } = await startMockServer();
  const session = new HguSession();
  try {
    const status = await session.connect({ host: '127.0.0.1', port, username: 'support', password: 'test123' });
    assert.equal(status.connected, true);
    assert.equal(status.username, 'support');

    const result = await session.exec('show ont optics', { timeout: 5000 });
    assert.equal(result.ok, true);
    assert.ok(result.output.includes('Rx Power : -19.50 dBm'));
    assert.equal(result.output.includes('show ont optics'), false);
    assert.equal(result.output.includes('support@HGU>'), false);
  } finally {
    await session.disconnect();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('HguSession rejeita senha incorreta', async () => {
  const { server, port } = await startMockServer();
  const session = new HguSession();
  try {
    await assert.rejects(
      () => session.connect({ host: '127.0.0.1', port, username: 'support', password: 'errada' }),
      /authentication|algorithms|handshake/i,
    );
  } finally {
    await session.disconnect();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('HguSession inventaria o HGU mock e identifica perfil', async () => {
  const { server, port } = await startMockServer();
  const session = new HguSession();
  const progress = [];
  try {
    await session.connect({ host: '127.0.0.1', port, username: 'support', password: 'test123' });
    const inventory = await session.inventory((item) => progress.push(item), { includeWifi: true });

    assert.equal(inventory.model, 'RTF3505VW-N1');
    assert.equal(inventory.profile.id, 'askey_brcm');
    assert.ok(inventory.commands.length >= 8);
    assert.ok(progress.length >= 8);
    assert.ok(inventory.commands.some((item) => item.command === 'show ont optics'));
    assert.ok(inventory.commands.some((item) => item.command === 'show wifi_plus all'));

    const summary = parseInventory(inventory);
    assert.equal(summary.serial, 'ABC123456789');
    assert.equal(summary.counts.total, 3);
    assert.equal(summary.optical.rx, -19.5);
  } finally {
    await session.disconnect();
    await new Promise((resolve) => server.close(resolve));
  }
});

/* -------------------------------- Runner --------------------------------- */

(async () => {
  let passed = 0;
  const failures = [];

  for (const { name, fn } of tests) {
    const started = Date.now();
    try {
      await fn();
      passed += 1;
      console.log(`  ok  ${name} (${Date.now() - started} ms)`);
    } catch (error) {
      failures.push({ name, error });
      console.error(`  FAIL ${name}`);
      console.error(String(error && error.stack ? error.stack : error));
    }
  }

  console.log('');
  console.log(`${passed}/${tests.length} testes passaram.`);
  if (failures.length) {
    console.error(`${failures.length} falha(s).`);
    process.exit(1);
  }
})();
