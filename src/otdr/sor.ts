/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/* ============================================================================
   Módulo OTDR — lógica pura (tipos, constantes, parsing .SOR e formatação)
   ============================================================================ */

// OTDR Event interface
export interface OtdrEvent {
  eventNumber: number;
  distanceKm: number;
  slopeDbKm?: number;
  spliceLossDb?: number;
  reflectanceDb?: number | null;
  eventType: string;
  comment: string;
  isEnd?: boolean;
  synthetic?: boolean;
}

// OTDR Parsed Trace interface
export interface TraceData {
  summary: {
    testDate: Date;
    testDateStr?: string;
    wavelengthNm: number;
    pulseWidthNs: number;
    ior: number;
    fiberLengthKm: number;
    acquisitionRangeKm: number;
    fiberType: string;
    cableId: string;
    fiberId: string;
    dataPoints: number;
    spacingM: number;
    backscatterDb: number;
    traceType: string;
  };
  events: OtdrEvent[];
  footer: {
    totalLossDb: number;
    orlDb: number;
  } | null;
  curve: {
    points: { distanceKm: number; valueDb: number }[];
    numPointsTotal: number;
    numPointsReturned: number;
  };
  warning?: string | null;
}

// Helper colors and icons
export const EVENT_COLORS: Record<string, string> = {
  conector: '#1FAE71',
  perda: '#1FAE71',
  reflexao: '#F5A524',
  multiplo: '#F5A524',
  fim: '#E5484D',
  inicio: '#1FAE71',
  desconhecido: '#8B95B8'
};

export function classify(e: OtdrEvent): string {
  if (e.isEnd || e.eventType === 'fim') return 'fim';
  if (e.eventType === 'reflexao' || e.eventType === 'multiplo') return 'reflexao';
  return 'conector';
}

export function labelFor(kind: string): string {
  return kind === 'fim' ? 'Fim da Fibra' : (kind === 'reflexao' ? 'Reflexão' : 'Evento');
}

export function eventKindIconSvg(kind: string, stroke = '#fff'): string {
  if (kind === 'fim') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="2" y1="12" x2="14" y2="12"/><rect x="14" y="8" width="7" height="8" rx="1.5"/>
    </svg>`;
  }
  if (kind === 'reflexao') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12h4l2 7 4-14 2 7h8"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="2" y1="12" x2="8" y2="12"/><rect x="8" y="8" width="8" height="8" rx="1.5"/>
    <circle cx="12" cy="12" r="1.3" fill="${stroke}" stroke="none"/><line x1="16" y1="12" x2="22" y2="12"/>
  </svg>`;
}

// Escapes string for safety
export function escHtml(s: string | null | undefined): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[ch];
  });
}

/* ================================================================
   .sor (Bellcore/Telcordia SR-4731 v2.x) parser — exact same structure
   ================================================================ */
export function parseSor(arrayBuffer: ArrayBuffer): TraceData {
  const buf = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const len = arrayBuffer.byteLength;

  function ascii(start: number, end: number): string {
    let s = '';
    for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function cstring(offset: number, limit?: number) {
    let end = offset;
    const max = (typeof limit === 'number') ? Math.min(limit, len) : len;
    while (end < max && bytes[end] !== 0) end++;
    return { str: ascii(offset, end), next: end + 1 };
  }

  if (len < 12 || ascii(0, 4) !== 'Map\0') {
    throw new Error("Este arquivo não parece ser um .sor válido (bloco Map ausente).");
  }

  let p = 4;
  const mapSize = buf.getUint32(p + 2, true);
  p += 8;
  if (mapSize < 12 || mapSize > len) {
    throw new Error('Arquivo .sor corrompido ou em formato não suportado (bloco Map inválido).');
  }

  const dir: { name: string; bver: number; bsize: number }[] = [];
  while (p < mapSize) {
    const r = cstring(p, mapSize);
    const name = r.str;
    p = r.next;
    if (p + 6 > mapSize) break;
    const bver = buf.getUint16(p, true);
    const bsize = buf.getUint32(p + 2, true);
    p += 6;
    dir.push({ name: name, bver: bver, bsize: bsize });
  }

  let offset = mapSize;
  const blocks: Record<string, { offset: number; size: number; version: number }> = {};
  for (let i = 0; i < dir.length; i++) {
    blocks[dir[i].name] = { offset: offset, size: dir[i].bsize, version: dir[i].bver };
    offset += dir[i].bsize;
  }

  if (!blocks.FxdParams || !blocks.DataPts) {
    throw new Error('Arquivo .sor não suportado (blocos FxdParams/DataPts ausentes).');
  }

  const fx = blocks.FxdParams;
  const fxNameLen = 'FxdParams'.length + 1;
  const fb = fx.offset + fxNameLen;

  const dateUnix = buf.getUint32(fb + 0, true);
  const wavelengthNm = buf.getUint16(fb + 6, true) / 10;
  const pulseWidthNs = buf.getUint16(fb + 18, true);
  const spacingRaw = buf.getUint32(fb + 20, true);
  const numDataPoints = buf.getUint32(fb + 24, true);
  const iorRaw = buf.getUint32(fb + 28, true);
  const ior = iorRaw / 1e5;
  const backscatterDb = buf.getUint16(fb + 32, true) * -0.1;
  const rangeRaw = buf.getUint32(fb + 40, true);
  const traceType = ascii(fb + 64, fb + 66);

  const DIST_K = 2e-5 * 1.498962239;
  const SPACING_K = 2e-6 * 1.498962239;
  function toKm(raw: number) { return raw * DIST_K / ior; }

  const acquisitionRangeKm = toKm(rangeRaw);
  const spacingM = spacingRaw * SPACING_K / ior;

  let fiberType = '', cableId = '', fiberId = '';
  if (blocks.GenParams) {
    const gp = blocks.GenParams;
    let q = gp.offset + 'GenParams'.length + 1;
    const cableIdRes = cstring(q); cableId = cableIdRes.str; q = cableIdRes.next;
    const fiberIdRes = cstring(q); fiberId = fiberIdRes.str; q = fiberIdRes.next;
    if (q + 2 <= gp.offset + gp.size) {
      const ftCode = buf.getUint16(q, true);
      const FIBER_TYPES: Record<number, string> = { 651: 'G.651', 652: 'G.652', 653: 'G.653', 654: 'G.654', 655: 'G.655' };
      fiberType = FIBER_TYPES[ftCode] || '';
    }
  }

  const events: OtdrEvent[] = [];
  let footer: { totalLossDb: number; orlDb: number } | null = null;
  if (blocks.KeyEvents) {
    const ke = blocks.KeyEvents;
    let kq = ke.offset + 'KeyEvents'.length + 1;
    const numEvents = buf.getUint16(kq, true);
    kq += 2;
    const EVENT_TYPE_MAP: Record<string, string> = { '0': 'perda', '1': 'reflexao', '2': 'multiplo' };
    for (let ei = 0; ei < numEvents && kq + 42 <= ke.offset + ke.size; ei++) {
      const eventNumber = buf.getUint16(kq, true);
      const distRaw = buf.getUint32(kq + 2, true);
      const slopeDbKm = buf.getInt16(kq + 6, true) * 0.001;
      const spliceLossDb = buf.getInt16(kq + 8, true) * 0.001;
      const reflLossDb = buf.getInt32(kq + 10, true) * 0.001;
      const typeCode = ascii(kq + 14, kq + 22);
      kq += 42;
      const c = cstring(kq);
      kq = c.next;
      const distanceKm = toKm(distRaw);
      events.push({
        eventNumber: eventNumber,
        distanceKm: distanceKm,
        slopeDbKm: slopeDbKm,
        spliceLossDb: spliceLossDb,
        reflectanceDb: reflLossDb !== 0 ? reflLossDb : null,
        eventType: EVENT_TYPE_MAP[typeCode.charAt(0)] || 'desconhecido',
        comment: c.str.replace(/\s+$/, '')
      });
    }
    if (kq + 14 <= ke.offset + ke.size) {
      footer = { totalLossDb: buf.getUint32(kq + 0, true) * 0.001, orlDb: buf.getUint16(kq + 12, true) * 0.001 };
    }
  }

  if (events.length === 0) {
    events.push({ eventNumber: 1, distanceKm: 0, eventType: 'inicio', comment: '', synthetic: true });
    events.push({ eventNumber: 2, distanceKm: acquisitionRangeKm, eventType: 'fim', comment: '', synthetic: true });
  } else {
    events[events.length - 1].isEnd = true;
  }

  const fiberLengthKm = events[events.length - 1].distanceKm;

  const dp = blocks.DataPts;
  let dq = dp.offset + 'DataPts'.length + 1;
  const ptCount = buf.getUint32(dq, true);
  dq += 12;
  if (dq + ptCount * 2 > len) {
    throw new Error('Arquivo .sor corrompido ou truncado: o bloco DataPts declara ' + ptCount + ' pontos, mas o arquivo não tem bytes suficientes para lê-los.');
  }

  let sorWarning: string | null = null;
  if (numDataPoints && numDataPoints !== ptCount) {
    sorWarning = 'Atenção: FxdParams informa ' + numDataPoints + ' pontos, mas o bloco DataPts contém ' + ptCount + '. Usando o valor de DataPts — o arquivo pode estar truncado ou fora do padrão.';
  }

  const rawPoints = new Uint16Array(ptCount);
  let maxRaw = 0;
  for (let pi = 0; pi < ptCount; pi++) {
    const v = buf.getUint16(dq + pi * 2, true);
    rawPoints[pi] = v;
    if (v > maxRaw) maxRaw = v;
  }

  function getTraceCurve(maxPoints: number) {
    const n = rawPoints.length;
    let indices: number[];
    if (n <= maxPoints) {
      indices = []; for (let k = 0; k < n; k++) indices.push(k);
    } else {
      const idxSet: Record<number, boolean> = {};
      const arr: number[] = [];
      for (let m = 0; m < maxPoints; m++) {
        const idx = Math.round(m * (n - 1) / (maxPoints - 1));
        if (!idxSet[idx]) { idxSet[idx] = true; arr.push(idx); }
      }
      indices = arr.sort((a, b) => a - b);
    }
    const points = indices.map((idx) => {
      const distKm = (idx * spacingM) / 1000;
      return { distanceKm: distKm, valueDb: (maxRaw - rawPoints[idx]) * 0.001 };
    });
    return { points: points, numPointsTotal: n, numPointsReturned: points.length };
  }

  return {
    summary: {
      testDate: new Date(dateUnix * 1000),
      wavelengthNm: wavelengthNm,
      pulseWidthNs: pulseWidthNs,
      ior: ior,
      fiberLengthKm: fiberLengthKm,
      acquisitionRangeKm: acquisitionRangeKm,
      fiberType: fiberType,
      cableId: cableId,
      fiberId: fiberId,
      dataPoints: numDataPoints,
      spacingM: spacingM,
      backscatterDb: backscatterDb,
      traceType: traceType
    },
    events: events,
    footer: footer,
    curve: getTraceCurve(2000),
    warning: sorWarning
  };
}
