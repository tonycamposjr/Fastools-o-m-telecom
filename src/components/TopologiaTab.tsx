import React, { useEffect, useMemo, useRef, useState } from 'react';
// Logo oficial da Vivo embutido no bundle (data URI em tempo de build → 100% offline,
// incluído por padrão em todo projeto novo e em todas as exportações PNG/SVG/PDF).
import defaultLogoDataUri from '../assets/logo-vivo.svg?inline';
// Persistência na nuvem — mesmo padrão das abas TA/Clientes: banco Firestore (dbRede)
// com espelho em localStorage e fallback local quando a nuvem está indisponível.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { dbRede, handleFirestoreError, OperationType } from '../lib/firebase';

/**
 * ==========================================================================
 * MAPA DE TOPOLOGIA DE REDE — gerador automático de diagrama (SVG vetorial)
 * ==========================================================================
 * Cadeias de equipamentos de transmissão (lilás) conectam roteadores/switches
 * (verde) nas extremidades; caixas de informação ficam no espaço central,
 * como no diagrama de referência (estilo Vivo/BORACEIA).
 *
 * LAYOUT — visão geral do algoritmo (detalhes em computeLayout):
 *   1. Mede textos com Canvas 2D (measureText) e dimensiona os nós em grade
 *      uniforme (maior largura/altura de texto do projeto).
 *   2. Cada rota vira uma "banda": a cadeia é quebrada em fileiras quando
 *      excede a LARGURA-ALVO (1500px), sempre lidas da esquerda para a
 *      direita; o "retorno" para a fileira seguinte usa um cotovelo
 *      ortogonal no canal (gutter) à direita do conteúdo — nunca cruza nós.
 *   3. A caixa de informação fica na lacuna entre a 1ª e a 2ª fileira (ou
 *      logo abaixo da única); a lacuna é ESTICADA para caber a caixa, então
 *      nada se sobrepõe, qualquer que seja a quantidade de equipamentos.
 *   4. Roteadores ficam em COLUNAS nas laterais (esquerda = origem, direita =
 *      destino), empilhados por proximidade vertical; ligados aos nós de
 *      ponta da cadeia por linha reta (seta opcional no último link).
 *   5. O canvas cresce dinamicamente (largura/altura) com margem ~60px:
 *      nada é cortado, de 1 a N equipamentos.
 * ==========================================================================
 */

/* ========================= TIPOS ========================= */

interface TranspEquip {
  site: string;
  fabricante: string;
  obs: string;
}

interface InfoBox {
  enabled: boolean;
  titulo: string;
  desc: string;
  detalhes: string;
}

interface Rota {
  id: string;
  nome: string;
  origem: string;
  destino: string;
  equipamentos: TranspEquip[];
  setaUltimoLink: boolean;
  caixa: InfoBox;
}

interface RouterItem {
  id: string;
  nome: string;
}

interface Projeto {
  titulo: string;
  routers: RouterItem[];
  rotas: Rota[];
}

interface Props {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/* ========================= CONSTANTES DE LAYOUT ========================= */

const MARGIN = 60;            // margem interna padrão do mapa
const NODE_WRAP_CHARS = 14;   // quebra de nome do site por palavras
const NODE_MIN_W = 108;       // largura mínima do nó
const NODE_MAX_W = 190;       // largura máxima do nó
const COL_GAP = 26;           // espaço horizontal entre nós
const ROW_GAP_BASE = 115;     // espaço vertical entre fileiras (cresce p/ caixa)
const BAND_GAP = 110;         // espaço entre rotas (bandas)
const TITLE_H = 120;          // área do logo + título
const TARGET_ROW_W = 1500;    // largura-alvo da fileira antes de quebrar
const BOX_TEXT_MAX = 500;     // largura de wrap do texto das caixas (medição E pintura)
const ROUTER_COL_PAD = 30;    // folga da coluna de roteadores

// Fontes do Canvas 2D — ordem do shorthand: style weight size family
const NODE_FONT = '700 13px Arial';
const NODE_FONT2 = '400 12px Arial';
const NODE_FONT3 = 'italic 600 11px Arial';
const ROUTER_FONT = '700 16px Arial';
const BOX_FONT_TITLE = 'italic 700 13.5px Arial';
const BOX_FONT_DESC = 'italic 600 12.5px Arial';
const BOX_FONT_DET = '700 12px Arial';

const LINK_COLOR = '#223047';
const LILAC_FILL = 'url(#topoLilac)';
const LILAC_EDGE = '#3a2c55';
const GREEN_FILL = 'url(#topoGreen)';
const GREEN_EDGE = '#27401d';

/* ========================= ESTADO INICIAL / EXEMPLO ========================= */

const uid = () => Math.random().toString(36).slice(2, 9);

const emptyCaixa = (): InfoBox => ({ enabled: true, titulo: '', desc: '', detalhes: '' });

const equipamentoVazio = (): TranspEquip => ({ site: '', fabricante: '', obs: '' });

const novaRota = (): Rota => ({
  id: uid(),
  nome: '',
  origem: '',
  destino: '',
  equipamentos: [equipamentoVazio()],
  setaUltimoLink: false,
  caixa: emptyCaixa(),
});

const projetoVazio = (): Projeto => ({
  titulo: '',
  routers: [{ id: uid(), nome: '' }],
  rotas: [],
});

/** Exemplo conforme a imagem de referência — diagnostico BORACEIA. */
export const exemploBORACEIA = (): Projeto => ({
  titulo: 'I-BR-SP-SST-S2B-HL4-01  BORACEIA',
  routers: [
    { id: uid(), nome: 'I-BR-SP-SST-S2B-HL4-01' },
    { id: uid(), nome: 'I-BR-SP-SJC-HUM-HL3-01' },
    { id: uid(), nome: 'I-BR-SP-SJC-HUM-HL3-02' },
  ],
  rotas: [
    {
      id: uid(),
      nome: 'MRES.BC - SJC.RH GBE100 - 0001',
      origem: 'I-BR-SP-SST-S2B-HL4-01',
      destino: 'I-BR-SP-SJC-HUM-HL3-01',
      setaUltimoLink: true,
      equipamentos: [
        { site: 'MRES.BC', fabricante: 'padtec', obs: '' },
        { site: 'MRES.BU', fabricante: 'padtec', obs: '' },
        { site: 'MRES.PJ', fabricante: 'padtec', obs: '' },
        { site: 'MRES.PB', fabricante: 'padtec', obs: '' },
        { site: 'MRES.BO', fabricante: 'padtec', obs: '' },
        { site: 'MRES.MR', fabricante: 'padtec', obs: '' },
        { site: 'SST.TQ', fabricante: 'padtec', obs: '' },
        { site: 'SST.GU', fabricante: 'padtec', obs: '' },
        { site: 'SST.BA', fabricante: 'padtec', obs: '' },
        { site: 'SST.AC', fabricante: 'padtec', obs: '' },
        { site: 'JRAG.JR', fabricante: 'padtec', obs: '' },
        { site: 'CGT.AA', fabricante: '0003', obs: '' },
        { site: 'CGT.AA', fabricante: '1000', obs: '' },
        { site: 'SJC.RH', fabricante: '1000', obs: '' },
        { site: 'SJC.RH', fabricante: '1002', obs: '' },
      ],
      caixa: {
        enabled: true,
        titulo: 'MRES.BC - SJC.RH GBE100 - 0001',
        desc: 'I-BR-SP-SJC-HUM-HL3-01 - 1/1/c31/1----I-BR-SP-SST-S2B-HL4-01  100GE0/7/0',
        detalhes:
          'MRES.BC :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX//2630/ [003-003] /01\n' +
          '- V5T404 HUA(V5T404) //0001 - p.1 T - ATIVO\n' +
          'SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]\n' +
          '/00 - T404 HUA(T404) //0017 - p.1 T - ATIVO',
      },
    },
    {
      id: uid(),
      nome: 'MRES.BC - SJC.RH GBE100 - 0002',
      origem: 'I-BR-SP-SST-S2B-HL4-01',
      destino: 'I-BR-SP-SJC-HUM-HL3-02',
      setaUltimoLink: true,
      equipamentos: [
        { site: 'MRES.BC', fabricante: '1001', obs: '' },
        { site: 'MRES.BC', fabricante: 'padtec', obs: '' },
        { site: 'BERT.PB', fabricante: 'padtec', obs: '' },
        { site: 'BERT.PG', fabricante: 'padtec', obs: '' },
        { site: 'BERT.BT', fabricante: 'huawei', obs: 'padtecAlien' },
        { site: 'MCZ.JP', fabricante: 'huawei', obs: '' },
        { site: 'SPO.BC', fabricante: 'huawei', obs: '' },
        { site: 'SPO.PE', fabricante: 'huawei', obs: '' },
        { site: 'AUJ.AJ', fabricante: 'huawei', obs: '' },
        { site: 'SJC.RH', fabricante: '1000', obs: '' },
        { site: 'SJC.RH', fabricante: '1002', obs: '' },
      ],
      caixa: {
        enabled: true,
        titulo: 'MRES.BC - SJC.RH GBE100 - 0002',
        desc: 'I-BR-SP-SJC-HUM-HL3-02 - 1/1/c31/1 <---> I-BR-SP-SST-S2B-HL4-01  100GE0/8/0',
        detalhes:
          'MRES.BC :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX//2630/ [003-003] /01\n' +
          '- V5T404 HUA(V5T404) //0012 - p.1 T - ATIVO\n' +
          'SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]\n' +
          '/00 - T404 HUA(T404) //0017 - p.1 T - ATIVO',
      },
    },
  ],
});

/* ========================= MEDIÇÃO DE TEXTO (Canvas 2D) ========================= */

let _measureCtx: CanvasRenderingContext2D | null = null;
function mCtx(): CanvasRenderingContext2D {
  if (!_measureCtx) {
    _measureCtx = document.createElement('canvas').getContext('2d');
  }
  return _measureCtx!;
}
const mw = (t: string, font: string) => {
  if (!t) return 0;
  const c = mCtx();
  c.font = font;
  return c.measureText(t).width;
};

/** Quebra por palavras até `max` caracteres por linha (nomes curtos dos nós). */
function wrapText(t: string, max: number, maxLines = 3): string[] {
  const words = String(t || '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cand;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines.slice(0, maxLines) : [''];
}

/** Quebra um bloco multilinha preservando Enter; linhas longas paginam por pixels. */
function wrapBlock(t: string, font: string, maxPx: number): string[] {
  const out: string[] = [];
  for (const raw of String(t || '').split('\n')) {
    let cur = '';
    for (const w of raw.split(' ')) {
      const cand = cur ? `${cur} ${w}` : w;
      if (cur && mw(cand, font) > maxPx) {
        out.push(cur);
        cur = w;
      } else {
        cur = cand;
      }
    }
    out.push(cur);
  }
  return out;
}

/* ========================= GEOMETRIAS ========================= */

interface NodeGeo {
  lines1: string[];   // site (1-3 linhas)
  line2?: string;     // fabricante/tipo/ID
  line3?: string;     // observação opcional (3ª linha)
  w: number;
  h: number;
}

interface RouterGeo {
  lines1: string[];
  w: number;
  h: number;
}

interface NodePos extends NodeGeo {
  x: number;
  y: number;
  rowIdx: number;
}

interface BoxPaint {
  x: number;
  y: number;
  w: number;
  h: number;
  info: InfoBox;
  titleL: string[];
  descL: string[];
  detL: string[];
  descY0: number;  // offset do 1º baseline da descrição (relativo ao topo da caixa)
  sepY: number;    // offset da linha tracejada
  detY0: number;   // offset do 1º baseline dos detalhes
}

interface RouterPos {
  nome: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lines1: string[];
  side: 'left' | 'right';
}

/** geometria de um nó lilás (linhas medidas; largura individual clamped) */
function nodeGeometry(eq: TranspEquip): NodeGeo {
  const lines1 = wrapText(eq.site, NODE_WRAP_CHARS, 3);
  const line2 = (eq.fabricante || '').trim().slice(0, 22) || undefined;
  const line3 = (eq.obs || '').trim().slice(0, 30) || undefined;
  let w = 0;
  for (const l of lines1) w = Math.max(w, mw(l, NODE_FONT));
  if (line2) w = Math.max(w, mw(line2, NODE_FONT2));
  if (line3) w = Math.max(w, mw(line3, NODE_FONT3));
  return { lines1, line2, line3, w: Math.min(Math.max(w + 34, NODE_MIN_W), NODE_MAX_W), h: 0 };
}

/** geometria de um roteador verde */
function routerGeometry(nome: string): RouterGeo {
  const lines1 = wrapText(nome, 17, 3);
  let w = 0;
  for (const l of lines1) w = Math.max(w, mw(l, ROUTER_FONT));
  return { lines1, w: Math.min(Math.max(w + 46, 205), 330), h: 26 + lines1.length * 20 };
}

/**
 * Medição completa da caixa de informação — a MESMA fórmula é usada no layout
 * (para reservar a lacuna) e na pintura (SVG), garantindo alturas idênticas.
 */
function measureInfoBox(c: InfoBox): Omit<BoxPaint, 'x' | 'y'> {
  const titleL = wrapText(c.titulo || ' ', 70, 2);
  const descL = wrapBlock(c.desc, BOX_FONT_DESC, BOX_TEXT_MAX);
  const detL = wrapBlock(c.detalhes, BOX_FONT_DET, BOX_TEXT_MAX);
  let w = 0;
  for (const l of titleL) w = Math.max(w, mw(l, BOX_FONT_TITLE));
  for (const l of descL) w = Math.max(w, mw(l, BOX_FONT_DESC));
  for (const l of detL) w = Math.max(w, mw(l, BOX_FONT_DET));
  const titleY0 = 28;
  const descY0 = titleY0 + titleL.length * 18 + 4;
  const sepY = descY0 + descL.length * 16 + 8;
  const detY0 = sepY + 12;
  const h = detY0 + detL.length * 15.5 + 18;
  return { w: Math.max(w + 84, 440), h, info: c, titleL, descL, detL, descY0, sepY, detY0 };
}

/* ========================= LAYOUT ========================= */

interface Band {
  seq: NodePos[];        // cadeia completa em ordem (coords absolutas)
  box: BoxPaint | null;  // caixa de informação (coords absolutas)
  top: number;
  bottom: number;
}

interface Layout {
  W: number;
  H: number;
  title: string;
  bands: Band[];
  nodeLinks: Array<{ pts: Array<[number, number]> }>;   // polilinhas nó→nó
  routerLinks: Array<{ x1: number; y1: number; x2: number; y2: number; arrow: boolean }>;
  routers: RouterPos[];
  empty: boolean;
}

/**
 * ALGORITMO DE LAYOUT (função pura → memoizável):
 *  A) geometria global dos nós lilás (grade uniforme = maior largura/altura)
 *  B) por rota: quebra da cadeia em fileiras de até TARGET_ROW_W;
 *     a caixa reserva a lacuna após a fileira 0 (estica ROW_GAP se precisar)
 *  C) colunas laterais de roteadores + largura total do canvas
 *  D) coordenadas absolutas: pilha vertical das bandas (BAND_GAP)
 *  E) roteadores empilhados nas colunas, sem colisão, ligados aos nós de ponta
 *  F) linhas nó→nó: reta na mesma fileira; cotovelo ortogonal na quebra de linha
 */
function computeLayout(p: Projeto): Layout {
  /* ---- A) geometria global dos nós (grade uniforme) ---- */
  let uniformW = NODE_MIN_W;
  let maxTextLines = 2;
  for (const r of p.rotas) {
    for (const eq of r.equipamentos) {
      if (!eq.site.trim() && !eq.fabricante.trim()) continue;
      const g = nodeGeometry(eq);
      uniformW = Math.max(uniformW, g.w);
      const total = g.lines1.length + (g.line2 ? 1 : 0) + (g.line3 ? 1 : 0);
      maxTextLines = Math.max(maxTextLines, Math.min(total, 6));
    }
  }
  const nodeH = 24 + maxTextLines * 17;

  /* ---- B) fileiras e caixas por rota (coordenadas RELATIVAS, por enquanto) ---- */
  interface BandRel {
    geos: NodeGeo[];
    rowIdx: number[];
    relX: number[];
    rowYs: number[];
    rowCount: number;
    relW: number;
    relH: number;
    box: Omit<BoxPaint, 'x' | 'y'> | null;
  }
  const bandsRel: BandRel[] = [];

  for (const rota of p.rotas) {
    const eqs = rota.equipamentos.filter((e) => e.site.trim() || e.fabricante.trim());
    if (!eqs.length) continue;

    // quebra em fileiras gulando enquanto couber em TARGET_ROW_W
    const geos: NodeGeo[] = [];
    const rowIdx: number[] = [];
    const relX: number[] = [];
    const rowWidths: number[] = [];
    let rowCount = 0;
    let x = 0;
    for (const eq of eqs) {
      if (rowCount === 0 || x + uniformW > TARGET_ROW_W) {
        rowCount += 1;
        x = 0;
        rowWidths.push(0);
      }
      geos.push({ ...nodeGeometry(eq), w: uniformW, h: nodeH });
      rowIdx.push(rowCount - 1);
      relX.push(x);
      rowWidths[rowCount - 1] = x + uniformW;
      x += uniformW + COL_GAP;
    }

    // caixa de informação (se ligada) — medida com a MESMA fórmula da pintura
    const boxRel = rota.caixa.enabled ? measureInfoBox(rota.caixa) : null;

    // y relativo das fileiras; a lacuna 0 é esticada para caber a caixa
    const rowGap0 = boxRel ? Math.max(ROW_GAP_BASE, boxRel.h + 75) : ROW_GAP_BASE;
    const rowYs: number[] = [];
    for (let i = 0; i < rowCount; i++) {
      rowYs.push(i === 0 ? 0 : rowYs[i - 1] + nodeH + (i === 1 ? rowGap0 : ROW_GAP_BASE));
    }

    let relH = rowYs[rowCount - 1] + nodeH + 8;
    const relW = Math.max(...rowWidths, boxRel ? boxRel.w : 0);

    if (rowCount === 1 && boxRel) {
      // cadeia em 1 fileira só → a caixa fica logo abaixo, dentro da banda
      relH = nodeH + 45 + boxRel.h;
    }

    bandsRel.push({ geos, rowIdx, relX, rowYs, rowCount, relW, relH, box: boxRel });
  }

  /* ---- C) colunas laterais de roteadores e largura total ---- */
  const routerNamesLeft: string[] = [];
  const routerNamesRight: string[] = [];
  p.rotas.forEach((r) => {
    if (r.origem.trim() && !routerNamesLeft.includes(r.origem.trim())) routerNamesLeft.push(r.origem.trim());
    if (r.destino.trim() && !routerNamesRight.includes(r.destino.trim())) routerNamesRight.push(r.destino.trim());
  });
  const geoLeft = routerNamesLeft.map((n) => routerGeometry(n));
  const geoRight = routerNamesRight.map((n) => routerGeometry(n));
  const colWLeft = geoLeft.length ? Math.max(...geoLeft.map((g) => g.w)) + ROUTER_COL_PAD : 0;
  const colWRight = geoRight.length ? Math.max(...geoRight.map((g) => g.w)) + ROUTER_COL_PAD : 0;

  const contentX0 = MARGIN + colWLeft;
  const contentW = Math.max(...bandsRel.map((b) => b.relW), 600);
  const W = Math.round(MARGIN + colWLeft + contentW + 14 + colWRight + MARGIN);

  /* ---- D) coordenadas absolutas (pilha vertical das bandas) ---- */
  const bands: Band[] = [];
  const nodeLinks: Layout['nodeLinks'] = [];
  const gutterX = contentX0 + contentW + 14;
  let cursorY = TITLE_H + 20;

  bandsRel.forEach((br) => {
    const seq: NodePos[] = br.geos.map((g, i) => ({
      ...g,
      x: contentX0 + br.relX[i],
      y: cursorY + br.rowYs[br.rowIdx[i]],
      rowIdx: br.rowIdx[i],
    }));

    // caixa: centralizada na largura do conteúdo, na lacuna após a fileira 0
    let boxAbs: BoxPaint | null = null;
    if (br.box) {
      boxAbs = {
        ...br.box,
        x: contentX0 + Math.max(0, (contentW - br.box.w) / 2),
        y: cursorY + br.rowYs[0] + nodeH + 36,
      };
    }

    bands.push({ seq, box: boxAbs, top: cursorY, bottom: cursorY + br.relH });

    /* ---- F) linhas nó→nó: reta na mesma fileira; cotovelo ortogonal na quebra.
               O cotovelo desce no gutter (área reservada à direita do conteúdo),
               mantendo as fileiras sempre em ordem de leitura esquerda→direita. */
    for (let k = 0; k < seq.length - 1; k++) {
      const a = seq[k];
      const b = seq[k + 1];
      const cyA = a.y + a.h / 2;
      const cyB = b.y + b.h / 2;
      if (Math.abs(cyA - cyB) < 1) {
        nodeLinks.push({ pts: [[a.x + a.w, cyA], [b.x, cyA]] });
      } else {
        nodeLinks.push({ pts: [[a.x + a.w, cyA], [gutterX, cyA], [gutterX, cyB], [b.x, cyB]] });
      }
    }

    cursorY += br.relH + BAND_GAP;
  });

  const H = Math.round(Math.max(cursorY - BAND_GAP + MARGIN, TITLE_H + 140, 420));

  /* ---- E) roteadores stackados nas colunas laterais ---- */
  const routers: RouterPos[] = [];
  const stackSide = (
    names: string[],
    geos: RouterGeo[],
    side: 'left' | 'right'
  ) => {
    if (!names.length) return;
    // y ideal = média dos y das âncoras (1º nó para origem; último nó p/ destino)
    const items = names.map((nome, i) => {
      const ys: number[] = [];
      p.rotas.forEach((r) => {
        const bi = p.rotas.indexOf(r);
        const band = bands[bi];
        if (!r.origem && !r.destino) return;
        if ((side === 'left' ? r.origem : r.destino).trim() !== nome) return;
        if (!band || !band.seq.length) return;
        const anchor = side === 'left' ? band.seq[0] : band.seq[band.seq.length - 1];
        ys.push(anchor.y + anchor.h / 2);
      });
      const centerY = ys.length ? ys.reduce((s, v) => s + v, 0) / ys.length : TITLE_H + 80;
      return { nome, geo: geos[i], centerY };
    });
    // empilha ordenando pelo y natural (maior y = mais baixo) sem colisão
    items.sort((a, b) => a.centerY - b.centerY);
    let lastBottom = TITLE_H;
    for (const it of items) {
      const y = Math.max(it.centerY - it.geo.h / 2, lastBottom + 26, TITLE_H + 10);
      lastBottom = y + it.geo.h;
      routers.push({
        nome: it.nome,
        x: side === 'left' ? MARGIN : W - MARGIN - it.geo.w,
        y,
        w: it.geo.w,
        h: it.geo.h,
        lines1: it.geo.lines1,
        side,
      });
    }
  };
  stackSide(routerNamesLeft, geoLeft, 'left');
  stackSide(routerNamesRight, geoRight, 'right');

  /* ---- F) links roteador ↔ nó (seta no último link = entrada do roteador) ---- */
  const routerLinks: Layout['routerLinks'] = [];
  p.rotas.forEach((r) => {
    const band = bands[p.rotas.indexOf(r)];
    if (!band || !band.seq.length) return;
    const first = band.seq[0];
    const last = band.seq[band.seq.length - 1];

    const rbL = routers.find((x) => x.side === 'left' && x.nome === r.origem.trim());
    if (rbL) {
      routerLinks.push({
        x1: rbL.x + rbL.w,
        y1: rbL.y + rbL.h / 2,
        x2: first.x,
        y2: first.y + first.h / 2,
        arrow: false,
      });
    }
    const rbR = routers.find((x) => x.side === 'right' && x.nome === r.destino.trim());
    if (rbR) {
      // desenhada do nó PARA o roteador, para a seta apontar ao roteador
      routerLinks.push({
        x1: last.x + last.w,
        y1: last.y + last.h / 2,
        x2: rbR.x,
        y2: rbR.y + rbR.h / 2,
        arrow: !!r.setaUltimoLink,
      });
    }
  });

  return {
    W,
    H,
    title: p.titulo,
    bands,
    nodeLinks,
    routerLinks,
    routers,
    empty: bands.length === 0,
  };
}

/* ========================= PERSISTÊNCIA / DOWNLOAD ========================= */

const LOGO_KEY = 'topoCustomLogo';  // logotipo personalizado ("Novo projeto"/"Limpar" nunca apagam)
const PROJ_KEY = 'topoProject';     // autosave local (espelho do banco)
const TOPO_COL = 'topologia_projetos'; // coleção no Firestore dbRede
const CURRENT_DOC_ID = 'atual';        // documento do projeto em edição

const slug = (s: string) =>
  (s || 'topologia').trim().toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'topologia';

function download(url: string, filename: string, revoke = false) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function dataUriToBlob(dataUri: string): Blob {
  const [meta, b64] = dataUri.split(',');
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: meta.split(':')[1]?.split(';')[0] || 'image/png' });
}

/** Remove `undefined` recursivamente (Firestore não aceita) e preserva strings/arrays/objetos. */
function sanitizeForFirestore(value: unknown): any {
  if (Array.isArray(value)) return value.filter((v) => v !== undefined).map((v) => sanitizeForFirestore(v));
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) clean[k] = sanitizeForFirestore(v);
    }
    return clean;
  }
  return value ?? '';
}

/** Indica se o projeto tem conteúdo (não vazio) — usado para seedar/arquivar. */
function projetoTemDados(p: Projeto): boolean {
  return Boolean(
    (p.titulo && p.titulo.trim()) ||
    p.rotas.length > 0 ||
    p.routers.some((r) => r.nome.trim())
  );
}

/* ========================= CSV (exportar/importar — ida e volta exata) =========================
   Formato de uma linha por registro (Tudo em uma planilha, separador ";" para Excel pt-BR):
     PROJETO  → título do diagrama
     ROTEADOR → 1 linha por roteador/switch (ordem define a posição na coluna lateral)
     ROTA     → 1 linha por rota (nome, origem, destino, seta, e os campos da caixa)
     EQUIP    → 1 linha por equipamento de transmissão (ordem dentro da rota)
   Quebras de linha nos campos de texto viram o marcador literal "\n" (e "\" vir "\\"),
   então o arquivo é sempre uma linha por registro — parsing determinístico.
   Redesenho: o layout é função pura dos dados ⇒ importar o CSV recria o mapa idêntico.
   ============================================================================================== */

const CSV_SEP = ';';
const CSV_HEADER = [
  'TIPO',
  'TITULO_PROJETO',
  'ORDEM_ROTEADOR',
  'ORDEM_ROTA',
  'NOME_ROTA',
  'ORIGEM',
  'DESTINO',
  'SETA',
  'ORDEM_EQ',
  'SITE',
  'FABRICANTE',
  'OBS',
  'CAIXA_ON',
  'TITULO_CAIXA',
  'DESC_CAIXA',
  'DETALHES_CAIXA',
];

/** Escapo barra invertida e converto quebras de linha reais no marcador "\n" (texto). */
const encCell = (s: string) =>
  String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n?/g, '\n')
    .replace(/\n/g, '\\n');

/** Volta: marcador "\n" → quebra real; "\\" → "\". */
const decCell = (s: string) => {
  const tmp = '\u0001';
  return String(s ?? '')
    .replace(/\\\\/g, tmp)
    .replace(/\\n/g, '\n')
    .replace(tmp, '\\');
};

/** Célula CSV: entre aspas se contém separador/àspas (RFC 4180). */
const csvCell = (v: string) =>
  v.includes(CSV_SEP) || v.includes('"')
    ? '"' + v.replace(/"/g, '""') + '"'
    : v;

/** Lê uma linha CSV respeitando aspas. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === CSV_SEP) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const boolCell = (s: string) => /^(1|true|sim|ok|x)$/i.test(String(s ?? '').trim());

/** Gera o CSV completo do projeto (uma linha por registro). Exportado p/ teste de round-trip. */
export function buildCsv(p: Projeto): string {
  const rows: string[][] = [];
  const newRow = () => {
    const r = new Array<string>(CSV_HEADER.length).fill('');
    rows.push(r);
    return r;
  };
  // escreve por NOME de coluna — impossível desalinhar com o header
  const put = (r: string[], name: string, v: string | number | boolean) => {
    r[CSV_HEADER.indexOf(name)] = typeof v === 'boolean' ? v ? '1' : '0' : encCell(String(v ?? ''));
  };

  const projRow = newRow();
  put(projRow, 'TIPO', 'PROJETO');
  put(projRow, 'TITULO_PROJETO', p.titulo);

  p.routers.forEach((r, i) => {
    if (!r.nome.trim()) return;
    const row = newRow();
    put(row, 'TIPO', 'ROTEADOR');
    put(row, 'ORDEM_ROTEADOR', i + 1);
    put(row, 'NOME_ROTA', r.nome);
  });

  p.rotas.forEach((rota, i) => {
    const temCadeia = rota.equipamentos.some((e) => e.site.trim() || e.fabricante.trim());
    if (!temCadeia && !rota.nome.trim()) return;
    const ordem = i + 1;

    const rRow = newRow();
    put(rRow, 'TIPO', 'ROTA');
    put(rRow, 'ORDEM_ROTA', ordem);
    put(rRow, 'NOME_ROTA', rota.nome);
    put(rRow, 'ORIGEM', rota.origem);
    put(rRow, 'DESTINO', rota.destino);
    put(rRow, 'SETA', rota.setaUltimoLink);
    put(rRow, 'CAIXA_ON', rota.caixa.enabled);
    put(rRow, 'TITULO_CAIXA', rota.caixa.titulo);
    put(rRow, 'DESC_CAIXA', rota.caixa.desc);
    put(rRow, 'DETALHES_CAIXA', rota.caixa.detalhes);

    rota.equipamentos
      .filter((e) => e.site.trim() || e.fabricante.trim())
      .forEach((e, k) => {
        const eRow = newRow();
        put(eRow, 'TIPO', 'EQUIP');
        put(eRow, 'ORDEM_ROTA', ordem);
        put(eRow, 'ORDEM_EQ', k + 1);
        put(eRow, 'SITE', e.site);
        put(eRow, 'FABRICANTE', e.fabricante);
        put(eRow, 'OBS', e.obs);
      });
  });

  return rows.map((r) => r.map(csvCell).join(CSV_SEP)).join('\r\n');
}

interface ParseCsvResult {
  ok: boolean;
  error?: string;
  projeto?: Projeto;
}

/** Reconstrói o projeto a partir do CSV gerado por buildCsv (ida e volta exata). Exportado p/ teste. */
export function parseCsv(text: string): ParseCsvResult {
  const clean = String(text ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = clean.split('\n').filter((l) => l.trim().length > 0);
  if (!lines.length) return { ok: false, error: 'Arquivo CSV vazio.' };

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toUpperCase());
  const hasHeader = header[0] === 'TIPO';
  const dataLines = hasHeader ? lines.slice(1) : lines;
  // índices das colunas: usa o header quando presente; senão assume o formato canônico
  const idx: Record<string, number> = hasHeader
    ? Object.fromEntries(CSV_HEADER.map((h, i) => [h, header.indexOf(h)]))
    : Object.fromEntries(CSV_HEADER.map((h, i) => [h, i]));
  if (idx.TIPO < 0) return { ok: false, error: 'CSV sem a coluna TIPO — use o arquivo exportado por esta ferramenta.' };

  const projeto: Projeto = { titulo: '', routers: [], rotas: [] };
  const rotasMap = new Map<number, Rota>();

  for (let li = 0; li < dataLines.length; li++) {
    const cells = parseCsvLine(dataLines[li]);
    const at = (name: string) => decCell(cells[idx[name]] ?? '');
    const tipo = at('TIPO').trim().toUpperCase();

    if (tipo === 'PROJETO') {
      projeto.titulo = at('TITULO_PROJETO');
    } else if (tipo === 'ROTEADOR') {
      const ordem = parseInt(at('ORDEM_ROTEADOR').trim(), 10);
      const item: RouterItem = { id: uid(), nome: at('NOME_ROTA') };
      if (Number.isFinite(ordem)) (item as RouterItem & { ordem?: number }).ordem = ordem;
      projeto.routers.push(item);
    } else if (tipo === 'ROTA') {
      const ordem = parseInt(at('ORDEM_ROTA').trim(), 10);
      if (!Number.isFinite(ordem)) continue;
      const rota: Rota = {
        id: uid(),
        nome: at('NOME_ROTA'),
        origem: at('ORIGEM'),
        destino: at('DESTINO'),
        equipamentos: [],
        setaUltimoLink: boolCell(at('SETA')),
        caixa: {
          enabled: boolCell(at('CAIXA_ON')),
          titulo: at('TITULO_CAIXA'),
          desc: at('DESC_CAIXA'),
          detalhes: at('DETALHES_CAIXA'),
        },
      };
      rotasMap.set(ordem, rota);
    } else if (tipo === 'EQUIP') {
      const ordem = parseInt(at('ORDEM_ROTA').trim(), 10);
      const ordemEq = parseInt(at('ORDEM_EQ').trim(), 10);
      const rota = rotasMap.get(ordem);
      if (!rota) continue; // linha de equip antes da rota → resolvida depois
      const eq: TranspEquip = { site: at('SITE'), fabricante: at('FABRICANTE'), obs: at('OBS') };
      (rota as Rota & { _pend?: Array<{ ordemEq: number; eq: TranspEquip }> })._pend =
        (rota as Rota & { _pend?: Array<{ ordemEq: number; eq: TranspEquip }> })._pend ?? [];
      (rota as Rota & { _pend?: Array<{ ordemEq: number; eq: TranspEquip }> })._pend!.push({ ordemEq, eq });
    } else {
      continue; // linha desconhecida — ignora sem quebrar o resto
    }
  }

  if (!rotasMap.size) return { ok: false, error: 'CSV sem registros de ROTA — use o arquivo exportado por esta ferramenta.' };

  // ordena rotas por ORDEM_ROTA e equipamentos por ORDEM_EQ
  const rotas = [...rotasMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, r]) => {
      const pend = (r as Rota & { _pend?: Array<{ ordemEq: number; eq: TranspEquip }> })._pend ?? [];
      pend.sort((a, b) => a.ordemEq - b.ordemEq);
      return { id: r.id, nome: r.nome, origem: r.origem, destino: r.destino, equipamentos: pend.map((x) => x.eq), setaUltimoLink: r.setaUltimoLink, caixa: r.caixa };
    });

  // ordena roteadores por ORDEM_ROTEADOR quando disponível
  const routersSorted = projeto.routers
    .map((r) => ({ r, o: (r as RouterItem & { ordem?: number }).ordem ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.o - b.o)
    .map(({ r }) => ({ id: r.id, nome: r.nome }));

  return { ok: true, projeto: { titulo: projeto.titulo, routers: routersSorted.length ? routersSorted : projeto.routers, rotas } };
}

/** Carimbo de data (ISO) para comparações nuvem ↔ local. */
const nowIso = () => new Date().toISOString();

/* ========================= COMPONENTE ========================= */

const TopologiaTab: React.FC<Props> = ({ showToast }) => {
  /* projeto + autosave local imediato (o espelho na nuvem é debounced, abaixo) */
  const [proj, setProj] = useState<Projeto>(() => {
    try {
      const raw = localStorage.getItem(PROJ_KEY);
      if (raw) return { ...projetoVazio(), ...(JSON.parse(raw) as Projeto) };
    } catch { /* ignora quota/corrupção */ }
    return projetoVazio();
  });

  useEffect(() => {
    try { localStorage.setItem(PROJ_KEY, JSON.stringify(proj)); } catch { /* quota */ }
  }, [proj]);

  /* ---------- persistência na nuvem (Firestore dbRede — coleção topologia_projetos) ----------
     • Carrega: decide entre nuvem e local pelo carimbo updatedAt (o mais recente vence,
       exatamente como nas abas TA/Registros: nuvem indisponível → usa local sem perder nada);
     • Autosave (900 ms após a última edição): grava o documento 'atual' na nuvem;
     • Supressão inicial (skipCloudSave) evita sobrescrever a nuvem antes da decisão.         */
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'cloud' | 'local' | 'saving'>('checking');
  const skipCloudSave = useRef(true);

  const pushCloud = (p: Projeto, ts: string) => {
    setCloudStatus('saving');
    setDoc(
      doc(dbRede, TOPO_COL, CURRENT_DOC_ID),
      { ...sanitizeForFirestore(p), updatedAt: ts }
    )
      .then(() => setCloudStatus('cloud'))
      .catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `${TOPO_COL}/${CURRENT_DOC_ID}`);
        setCloudStatus('local');
      });
  };

  /* Arquiva o projeto atual em um documento próprio (histórico no banco) antes de
     substituí-lo — "Novo projeto" e "Carregar exemplo" nunca perdem o que existia. */
  const archiveProj = (p: Projeto, motivo: string) => {
    if (!projetoTemDados(p)) return;
    const id = `arq_${Date.now().toString(36)}_${uid()}`;
    const snapshot = { ...sanitizeForFirestore(p), motivo, arquivadoEm: nowIso() };
    setDoc(doc(dbRede, TOPO_COL, id), snapshot).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `${TOPO_COL}/${id}`);
    });
  };

  // decisão inicial: nuvem vs local (roda uma vez)
  useEffect(() => {
    let cancelled = false;
    const decide = async () => {
      const localTs = (() => {
        try {
          const raw = localStorage.getItem(PROJ_KEY);
          return raw ? String((JSON.parse(raw) as { updatedAt?: string }).updatedAt ?? '') : '';
        } catch { return ''; }
      })();
      try {
        const snap = await getDoc(doc(dbRede, TOPO_COL, CURRENT_DOC_ID));
        if (cancelled) return;
        if (snap.exists()) {
          const cloud = snap.data() as Projeto & { updatedAt?: string };
          const cloudTs = String(cloud.updatedAt ?? '');
          const localRich = projetoTemDados(proj);
          const cloudRich = projetoTemDados(cloud);
          if (cloudRich && (!localRich || cloudTs >= localTs)) {
            // nuvem mais recente (ou local vazio) → restaura da nuvem
            setProj({ ...projetoVazio(), ...cloud });
          } else if (localRich) {
            // local mais recente (edições offline) → devolve ao banco
            pushCloud(proj, nowIso());
          } else {
            setCloudStatus('cloud');
          }
        } else if (projetoTemDados(proj)) {
          // banco vazio e local tem dados → semeia a nuvem (como faz a aba TA)
          pushCloud(proj, nowIso());
        } else {
          setCloudStatus('cloud');
        }
        skipCloudSave.current = false;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `${TOPO_COL}/${CURRENT_DOC_ID}`);
        if (cancelled) return;
        setCloudStatus('local');
        showToast('Sem acesso à nuvem — as rotas continuam salvas neste dispositivo.', 'warning');
        skipCloudSave.current = false;
      }
    };
    decide();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autosave na nuvem: 900 ms após a última edição (debounce de digitação)
  useEffect(() => {
    if (cloudStatus === 'checking') return;
    const t = setTimeout(() => {
      if (skipCloudSave.current) return;
      pushCloud(proj, nowIso());
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj, cloudStatus === 'checking']);

  /* logotipo: padrão Vivo (embutido no bundle) + personalizado salvo em localStorage */
  const [customLogo, setCustomLogo] = useState<string>(() => localStorage.getItem(LOGO_KEY) || '');
  const logoDataUri = customLogo || defaultLogoDataUri;

  const onLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 512 * 1024) { showToast('Logotipo muito grande (máx. 512 KB).', 'warning'); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const uri = String(rd.result);
      setCustomLogo(uri);
      try { localStorage.setItem(LOGO_KEY, uri); } catch { /* quota */ }
      showToast('Logotipo atualizado e salvo neste dispositivo.', 'success');
    };
    rd.readAsDataURL(f);
    e.target.value = '';
  };

  const restaurarLogo = () => {
    setCustomLogo('');
    localStorage.removeItem(LOGO_KEY);
    showToast('Logotipo padrão da Vivo restaurado.', 'info');
  };

  /* edição — projeto */
  const setP = (patch: Partial<Projeto>) => setProj((p) => ({ ...p, ...patch }));
  const setRota = (id: string, patch: Partial<Rota>) =>
    setProj((p) => ({ ...p, rotas: p.rotas.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const setRouter = (id: string, nome: string) =>
    setProj((p) => ({ ...p, routers: p.routers.map((r) => (r.id === id ? { ...r, nome } : r)) }));

  const addRota = () => setProj((p) => ({ ...p, rotas: [...p.rotas, novaRota()] }));
  const delRota = (id: string) => setProj((p) => ({ ...p, rotas: p.rotas.filter((r) => r.id !== id) }));
  const moveRota = (id: string, d: -1 | 1) =>
    setProj((p) => {
      const i = p.rotas.findIndex((x) => x.id === id);
      const j = i + d;
      if (i < 0 || j < 0 || j >= p.rotas.length) return p;
      const rotas = [...p.rotas];
      [rotas[i], rotas[j]] = [rotas[j], rotas[i]];
      return { ...p, rotas };
    });

  const setEquip = (rotaId: string, idx: number, patch: Partial<TranspEquip>) =>
    setProj((p) => ({
      ...p,
      rotas: p.rotas.map((r) =>
        r.id === rotaId
          ? { ...r, equipamentos: r.equipamentos.map((e, k) => (k === idx ? { ...e, ...patch } : e)) }
          : r
      ),
    }));
  const addEquip = (rotaId: string) =>
    setProj((p) => ({
      ...p,
      rotas: p.rotas.map((r) =>
        r.id === rotaId ? { ...r, equipamentos: [...r.equipamentos, equipamentoVazio()] } : r
      ),
    }));
  const delEquip = (rotaId: string, idx: number) =>
    setProj((p) => ({
      ...p,
      rotas: p.rotas.map((r) =>
        r.id === rotaId ? { ...r, equipamentos: r.equipamentos.filter((_, k) => k !== idx) } : r
      ),
    }));
  const moveEquip = (rotaId: string, idx: number, d: -1 | 1) =>
    setProj((p) => ({
      ...p,
      rotas: p.rotas.map((r) => {
        if (r.id !== rotaId) return r;
        const j = idx + d;
        if (j < 0 || j >= r.equipamentos.length) return r;
        const eq = [...r.equipamentos];
        [eq[idx], eq[j]] = [eq[j], eq[idx]];
        return { ...r, equipamentos: eq };
      }),
    }));

  const addRouter = () => setProj((p) => ({ ...p, routers: [...p.routers, { id: uid(), nome: '' }] }));
  const delRouter = (id: string) => setProj((p) => ({ ...p, routers: p.routers.filter((r) => r.id !== id) }));
  const moveRouter = (id: string, d: -1 | 1) =>
    setProj((p) => {
      const i = p.routers.findIndex((x) => x.id === id);
      const j = i + d;
      if (i < 0 || j < 0 || j >= p.routers.length) return p;
      const rs = [...p.routers];
      [rs[i], rs[j]] = [rs[j], rs[i]];
      return { ...p, routers: rs };
    });

  /* import/export JSON */
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(proj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    download(url, `topologia_${slug(proj.titulo)}.json`, true);
    showToast('Projeto exportado (.json).', 'success');
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const p = JSON.parse(String(rd.result)) as Projeto;
        if (!p || !Array.isArray(p.rotas) || !Array.isArray(p.routers)) throw new Error('formato');
        setProj({ ...projetoVazio(), ...p });
        showToast('Projeto importado com sucesso.', 'success');
      } catch {
        showToast('Arquivo inválido: selecione um .json exportado por esta ferramenta.', 'error');
      }
    };
    rd.readAsText(f);
    e.target.value = '';
  };

  /* export/import CSV — planilha com roteadores, rotas, equipamentos e caixas;
     ao importar, o CSV reconstrói o projeto e o layout redesenha 1:1 (função pura dos dados) */
  const exportCsv = () => {
    const csv = '\uFEFF' + buildCsv(proj); // BOM p/ Excel abrir como UTF-8
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    download(url, `topologia_${slug(proj.titulo)}.csv`, true);
    showToast('CSV exportado (roteadores, rotas, equipamentos e caixas).', 'success');
  };

  const importCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const res = parseCsv(String(rd.result));
      if (!res.ok || !res.projeto) {
        showToast(res.error || 'Falha ao ler o CSV.', 'error');
      } else {
        archiveProj(proj, 'importar-csv'); // o projeto atual vira histórico no banco
        setProj(res.projeto);
        showToast(`CSV importado: ${res.projeto.rotas.length} rota(s) restaurada(s) — mapa redesenhado 1:1.`, 'success');
      }
    };
    rd.readAsText(f);
    e.target.value = '';
  };

  const novoProjeto = () => {
    archiveProj(proj, 'novo-projeto'); // histórico no banco antes de zerar
    setProj(projetoVazio());
    showToast('Novo projeto criado — o anterior foi arquivado no banco. O logotipo é preservado.', 'info');
  };

  const carregarExemplo = () => {
    archiveProj(proj, 'carregar-exemplo'); // histórico no banco antes de substituir
    setProj(exemploBORACEIA());
    showToast('Exemplo BORACEIA carregado (projeto anterior arquivado no banco).', 'success');
  };

  /* layout memoizado (função pura → só recalcula quando o projeto muda) */
  const layout = useMemo(() => computeLayout(proj), [proj]);

  /* zoom / prévia */
  const [zoom, setZoom] = useState(1);
  const viewRef = useRef<HTMLDivElement>(null);
  const fitToScreen = () => {
    const el = viewRef.current;
    if (!el) return;
    const scale = Math.max(0.05, Math.min(3, (el.clientWidth - 24) / layout.W));
    setZoom(Number(scale.toFixed(2)));
  };
  const didFit = useRef(false);
  useEffect(() => {
    if (!didFit.current && layout.W > 0) {
      didFit.current = true;
      fitToScreen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.W]);

  /* exportação PNG / SVG / PDF */
  const svgRef = useRef<SVGSVGElement>(null);

  /** Serializa o SVG da prévia (clone com namespaces explícitos p/ standalone). */
  const serializeSvg = (): string | null => {
    if (!svgRef.current) return null;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    return new XMLSerializer().serializeToString(clone);
  };

  /** Desenha o SVG num canvas 2x com fundo branco → dataURL PNG. */
  const renderPngDataUrl = (scale = 2): Promise<string> => {
    const s = serializeSvg();
    if (!s) return Promise.reject(new Error('svg'));
    const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml;charset=utf-8' }));
    return new Promise<string>((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = Math.round(layout.W * scale);
          cv.height = Math.round(layout.H * scale);
          const ctx = cv.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(im, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('render')); };
      im.src = url;
    });
  };

  const guardEmpty = (): boolean => {
    if (layout.empty) {
      showToast('Adicione pelo menos uma rota com equipamentos para exportar.', 'warning');
      return true;
    }
    return false;
  };

  const baixarPng = async () => {
    if (guardEmpty()) return;
    try {
      const data = await renderPngDataUrl(2);
      const url = URL.createObjectURL(dataUriToBlob(data));
      download(url, `topologia_${slug(proj.titulo)}.png`, true);
      showToast('PNG em alta resolução (2x) baixado.', 'success');
    } catch {
      showToast('Falha ao gerar PNG.', 'error');
    }
  };

  const baixarSvg = () => {
    if (guardEmpty()) return;
    const s = serializeSvg();
    if (!s) return;
    const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml;charset=utf-8' }));
    download(url, `topologia_${slug(proj.titulo)}.svg`, true);
    showToast('SVG vetorial baixado.', 'success');
  };

  const baixarPdf = async () => {
    if (guardEmpty()) return;
    try {
      const data = await renderPngDataUrl(2);
      const { jsPDF } = await import('jspdf'); // dependência já presente no package.json (chunk sob demanda)
      const landscape = layout.W >= layout.H;
      const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'px', format: [layout.W, layout.H] });
      pdf.addImage(data, 'PNG', 0, 0, layout.W, layout.H);
      pdf.save(`topologia_${slug(proj.titulo)}.pdf`);
      showToast('PDF baixado (tamanho exato do mapa).', 'success');
    } catch {
      showToast('Falha ao gerar PDF.', 'error');
    }
  };

  /* =========================================================== */
  /* RENDER                                                       */
  /* =========================================================== */
  return (
    <div className="topo-root">
      <div className="topo-layout">
        {/* ---------------- FORMULÁRIO ---------------- */}
        <div className="topo-form">
          <section className="topo-card">
            <h3><i className="fas fa-heading" /> Projeto</h3>
            <div className="form-group">
              <label>Nome do projeto/rota (título do diagrama)</label>
              <input
                type="text"
                value={proj.titulo}
                onChange={(e) => setP({ titulo: e.target.value })}
                placeholder="Ex.: I-BR-SP-SST-S2B-HL4-01  BORACEIA"
              />
            </div>
            <div className="form-group">
              <label>Logotipo — o padrão Vivo aparece sempre, sem reenvio</label>
              <div className="topo-logo-row">
                {logoDataUri ? (
                  <img src={logoDataUri} alt="Logotipo atual" className="topo-logo-preview" />
                ) : (
                  <span className="topo-logo-preview topo-logo-empty">—</span>
                )}
                <label className="btn btn-sm topo-inline-btn">
                  <i className="fas fa-upload" /> Enviar outro
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogoUpload} />
                </label>
                <button className="btn btn-sm" onClick={restaurarLogo} title="Volta a usar o arquivo public/logo-vivo.svg">
                  <i className="fas fa-rotate-left" /> Restaurar padrão Vivo
                </button>
              </div>
              <p className="topo-hint">
                O logo oficial da Vivo já vem <b>embutido no código</b> (<code>src/assets/logo-vivo.svg</code>) — funciona
                offline e é incluído em todas as exportações. Você pode enviar outro se precisar (salvo neste dispositivo).
              </p>
            </div>
          </section>

          <section className="topo-card">
            <h3><i className="fas fa-server" /> Roteadores / Switches</h3>
            {proj.routers.map((r, i) => (
              <div key={r.id} className="topo-mini-row">
                <input
                  type="text"
                  value={r.nome}
                  onChange={(e) => setRouter(r.id, e.target.value)}
                  placeholder="Nome (ex.: I-BR-SP-SST-S2B-HL4-01)"
                />
                <button className="topo-mini-btn" title="Mover para cima" disabled={i === 0} onClick={() => moveRouter(r.id, -1)}>
                  <i className="fas fa-arrow-up" />
                </button>
                <button className="topo-mini-btn" title="Mover para baixo" disabled={i === proj.routers.length - 1} onClick={() => moveRouter(r.id, 1)}>
                  <i className="fas fa-arrow-down" />
                </button>
                <button className="topo-mini-btn danger" title="Remover" onClick={() => delRouter(r.id)}>
                  <i className="fas fa-trash" />
                </button>
              </div>
            ))}
            <button className="btn btn-sm" onClick={addRouter}>
              <i className="fas fa-plus" /> Adicionar roteador/switch
            </button>
          </section>

          <section className="topo-card">
            <h3><i className="fas fa-route" /> Rotas</h3>
            {proj.rotas.length === 0 && (
              <p className="topo-empty">Nenhuma rota — use &ldquo;+ Adicionar rota&rdquo; ou &ldquo;Carregar exemplo&rdquo;.</p>
            )}
            {proj.rotas.map((rota, ri) => (
              <div key={rota.id} className="topo-rota">
                <div className="topo-rota-head">
                  <b>Rota {ri + 1}{rota.nome ? ` · ${rota.nome}` : ''}</b>
                  <span className="topo-mini-actions">
                    <button className="topo-mini-btn" title="Mover para cima" disabled={ri === 0} onClick={() => moveRota(rota.id, -1)}>
                      <i className="fas fa-arrow-up" />
                    </button>
                    <button className="topo-mini-btn" title="Mover para baixo" disabled={ri === proj.rotas.length - 1} onClick={() => moveRota(rota.id, 1)}>
                      <i className="fas fa-arrow-down" />
                    </button>
                    <button className="topo-mini-btn danger" title="Remover rota" onClick={() => delRota(rota.id)}>
                      <i className="fas fa-trash" />
                    </button>
                  </span>
                </div>

                <div className="form-group">
                  <label>Nome da rota</label>
                  <input
                    type="text"
                    value={rota.nome}
                    onChange={(e) => setRota(rota.id, { nome: e.target.value })}
                    placeholder="Ex.: MRES.BC - SJC.RH GBE100 - 0001"
                  />
                </div>
                <div className="topo-2col">
                  <div className="form-group">
                    <label>Origem (roteador)</label>
                    <select value={rota.origem} onChange={(e) => setRota(rota.id, { origem: e.target.value })}>
                      <option value="">— selecione —</option>
                      {proj.routers.map((r) => (
                        <option key={r.id} value={r.nome}>{r.nome || '(sem nome)'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Destino (roteador)</label>
                    <select value={rota.destino} onChange={(e) => setRota(rota.id, { destino: e.target.value })}>
                      <option value="">— selecione —</option>
                      {proj.routers.map((r) => (
                        <option key={r.id} value={r.nome}>{r.nome || '(sem nome)'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="topo-check">
                  <input
                    type="checkbox"
                    checked={rota.setaUltimoLink}
                    onChange={(e) => setRota(rota.id, { setaUltimoLink: e.target.checked })}
                  />
                  Seta no último link (apontando ao roteador)
                </label>

                <p className="topo-hint"><b>Equipamentos de transmissão — ordem: origem → destino</b></p>
                {rota.equipamentos.map((eq, idx) => (
                  <div key={idx} className="topo-eq-row">
                    <input type="text" value={eq.site} placeholder="Site/Nome"
                           onChange={(e) => setEquip(rota.id, idx, { site: e.target.value })} />
                    <input type="text" value={eq.fabricante} placeholder="Fabricante/ID"
                           onChange={(e) => setEquip(rota.id, idx, { fabricante: e.target.value })} />
                    <input type="text" value={eq.obs} placeholder="Observação (3ª linha, opcional)"
                           onChange={(e) => setEquip(rota.id, idx, { obs: e.target.value })} />
                    <span className="topo-mini-actions">
                      <button className="topo-mini-btn" title="Mover para cima" disabled={idx === 0}
                              onClick={() => moveEquip(rota.id, idx, -1)}><i className="fas fa-arrow-up" /></button>
                      <button className="topo-mini-btn" title="Mover para baixo" disabled={idx === rota.equipamentos.length - 1}
                              onClick={() => moveEquip(rota.id, idx, 1)}><i className="fas fa-arrow-down" /></button>
                      <button className="topo-mini-btn danger" title="Remover"
                              onClick={() => delEquip(rota.id, idx)}><i className="fas fa-trash" /></button>
                    </span>
                  </div>
                ))}
                <button className="btn btn-sm" onClick={() => addEquip(rota.id)}>
                  <i className="fas fa-plus" /> Adicionar equipamento de transmissão
                </button>

                <div className="topo-caixa">
                  <label className="topo-check">
                    <input
                      type="checkbox"
                      checked={rota.caixa.enabled}
                      onChange={(e) => setRota(rota.id, { caixa: { ...rota.caixa, enabled: e.target.checked } })}
                    />
                    Mostrar caixa de informação da rota
                  </label>
                  {rota.caixa.enabled && (
                    <>
                      <div className="form-group">
                        <label>Título (vermelho/itálico/negrito)</label>
                        <input
                          type="text"
                          value={rota.caixa.titulo}
                          placeholder="Ex.: MRES.BC - SJC.RH GBE100 - 0001"
                          onChange={(e) => setRota(rota.id, { caixa: { ...rota.caixa, titulo: e.target.value } })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Descrição (Enter = nova linha)</label>
                        <textarea
                          rows={2}
                          value={rota.caixa.desc}
                          onChange={(e) => setRota(rota.id, { caixa: { ...rota.caixa, desc: e.target.value } })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Detalhes (Enter = nova linha)</label>
                        <textarea
                          rows={4}
                          value={rota.caixa.detalhes}
                          onChange={(e) => setRota(rota.id, { caixa: { ...rota.caixa, detalhes: e.target.value } })}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            <button className="btn btn-primary btn-sm" onClick={addRota}>
              <i className="fas fa-plus" /> Adicionar rota
            </button>
          </section>

          <section className="topo-card">
            <h3><i className="fas fa-gear" /> Ações</h3>
            <div className="topo-cloud-row">
              <span className={`topo-cloud ${cloudStatus}`}>
                <i className={
                  cloudStatus === 'cloud' ? 'fas fa-cloud'
                  : cloudStatus === 'saving' ? 'fas fa-cloud-upload-alt'
                  : cloudStatus === 'local' ? 'fas fa-laptop'
                  : 'fas fa-satellite-dish'
                } />
                {cloudStatus === 'cloud' && 'Salvo no banco (nuvem)'}
                {cloudStatus === 'saving' && 'Salvando no banco…'}
                {cloudStatus === 'local' && 'Sem nuvem — salvo neste dispositivo'}
                {cloudStatus === 'checking' && 'Conectando ao banco…'}
              </span>
            </div>
            <div className="topo-actions">
              <button className="btn btn-sm" onClick={carregarExemplo}><i className="fas fa-flask" /> Carregar exemplo</button>
              <button className="btn btn-sm" onClick={novoProjeto}><i className="fas fa-file" /> Novo projeto</button>
            </div>
            <div className="topo-actions">
              <button className="btn btn-sm" onClick={exportJson}><i className="fas fa-file-export" /> Exportar projeto</button>
              <label className="btn btn-sm topo-inline-btn">
                <i className="fas fa-file-import" /> Importar projeto
                <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={importJson} />
              </label>
            </div>
            <div className="topo-actions">
              <button className="btn btn-sm" onClick={exportCsv} title="Planilha com todos os roteadores, rotas, equipamentos e caixas — pode ser editada no Excel e reimportada">
                <i className="fas fa-file-csv" /> Exportar CSV
              </button>
              <label className="btn btn-sm topo-inline-btn" title="Reconstrói o mapa a partir de um CSV exportado por esta ferramenta (redesenho 1:1)">
                <i className="fas fa-file-arrow-up" /> Importar CSV
                <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={importCsv} />
              </label>
            </div>
            <div className="topo-actions topo-actions-dl">
              <button className="btn btn-primary btn-sm" onClick={baixarPng}><i className="fas fa-image" /> Baixar PNG</button>
              <button className="btn btn-secondary btn-sm" onClick={baixarSvg}><i className="fas fa-bezier-curve" /> Baixar SVG</button>
              <button className="btn btn-secondary btn-sm" onClick={baixarPdf}><i className="fas fa-file-pdf" /> Baixar PDF</button>
            </div>
            <p className="topo-hint">
              Cada rota criada é salva automaticamente no <b>banco de dados (nuvem)</b> — o carimbo
              acima confirma. Se a nuvem estiver indisponível, fica salva no dispositivo e volta ao banco quando a
              conexão existir. “Novo projeto” nunca apaga o logotipo e arquiva o projeto anterior no banco.
            </p>
          </section>
        </div>

        {/* ---------------- PRÉVIA ---------------- */}
        <div className="topo-preview">
          <div className="topo-zoombar">
            <button className="topo-mini-btn" title="Reduzir" onClick={() => setZoom((z) => Math.max(0.05, Number((z - 0.2).toFixed(2))))}><i className="fas fa-minus" /></button>
            <span className="topo-zoom-val">{Math.round(zoom * 100)}%</span>
            <button className="topo-mini-btn" title="Ampliar" onClick={() => setZoom((z) => Math.min(4, Number((z + 0.2).toFixed(2))))}><i className="fas fa-plus" /></button>
            <button className="topo-mini-btn" title="Ajustar à tela" onClick={fitToScreen}><i className="fas fa-expand" /></button>
            <span className="topo-size">{layout.W} × {layout.H} px</span>
          </div>
          <div className="topo-viewport" ref={viewRef}>
            <div style={{ width: layout.W * zoom, height: layout.H * zoom }}>
              <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', width: layout.W, height: layout.H }}>
                <TopoSvg layout={layout} logo={logoDataUri} svgRef={svgRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========================= SVG (prévia + base das exportações) ========================= */

const TopoSvg: React.FC<{
  layout: Layout;
  logo: string;
  svgRef: React.Ref<SVGSVGElement>;
}> = ({ layout: ly, logo, svgRef }) => (
  <svg
    ref={svgRef}
    width={ly.W}
    height={ly.H}
    viewBox={`0 0 ${ly.W} ${ly.H}`}
    className="topo-svg"
    role="img"
    aria-label="Mapa de topologia de rede"
  >
    <defs>
      <marker id="topoArrow" markerWidth="12" markerHeight="10" refX="10.5" refY="5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L12,5 L0,10 Z" fill={LINK_COLOR} />
      </marker>
      <linearGradient id="topoLilac" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d6c9ee" />
        <stop offset="50%" stopColor="#b9a8e0" />
        <stop offset="100%" stopColor="#a99bd6" />
      </linearGradient>
      <linearGradient id="topoGreen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9bc58a" />
        <stop offset="45%" stopColor="#cfe8c2" />
        <stop offset="100%" stopColor="#9bc58a" />
      </linearGradient>
      <linearGradient id="topoBox" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f5f5f7" />
        <stop offset="40%" stopColor="#e0e2e6" />
        <stop offset="100%" stopColor="#c7c9cd" />
      </linearGradient>
    </defs>

    <rect x={0} y={0} width={ly.W} height={ly.H} fill="#ffffff" />

    {/* Logotipo: data URI embutido — garante presença em PNG/SVG/PDF */}
    {logo ? (
      <image href={logo} x={MARGIN - 20} y={MARGIN - 30} width={186} height={59} preserveAspectRatio="xMidYMid meet" />
    ) : null}

    {/* Título do projeto centralizado no topo */}
    {ly.title.trim() ? (
      <text
        x={ly.W / 2}
        y={MARGIN + 28}
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize={26}
        fontWeight={700}
        fill="#1b2237"
      >
        {ly.title}
      </text>
    ) : null}

    {/* ligações nó→nó (retas e cotovelos ortogonais) */}
    {ly.nodeLinks.map((l, i) => (
      <polyline
        key={`nl${i}`}
        points={l.pts.map((pt) => `${Math.round(pt[0])},${Math.round(pt[1])}`).join(' ')}
        fill="none"
        stroke={LINK_COLOR}
        strokeWidth={1.6}
      />
    ))}

    {/* links roteador ↔ nó (seta opcional no último link) */}
    {ly.routerLinks.map((l, i) => (
      <line
        key={`rl${i}`}
        x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
        stroke={LINK_COLOR}
        strokeWidth={1.6}
        markerEnd={l.arrow ? 'url(#topoArrow)' : undefined}
      />
    ))}

    {/* caixas de informação (posições idênticas à medição em measureInfoBox) */}
    {ly.bands.map((band, bi) =>
      band.box ? (
        <g key={`box${bi}`}>
          <rect x={band.box.x} y={band.box.y} width={band.box.w} height={band.box.h} rx={4}
                fill="url(#topoBox)" stroke="#9a9ea6" strokeWidth={1} />
          <rect x={band.box.x + 26} y={band.box.y + 8} width={2} height={band.box.h - 16}
                fill="#9a9ea6" opacity={0.6} />
          <text x={band.box.x + 42} y={band.box.y + 28}
                fontFamily="Arial, sans-serif" fontSize={13.5} fontStyle="italic" fontWeight={700} fill="#c81e1e">
            {band.box.info.titulo}
          </text>
          {band.box.descL.map((l, k) => (
            <text key={`dsc${k}`} x={band.box.x + 42} y={band.box.y + band.box.descY0 + k * 16}
                  fontFamily="Arial, sans-serif" fontSize={12.5} fontStyle="italic" fontWeight={600} fill="#242c3c">
              {l}
            </text>
          ))}
          <line
            x1={band.box.x + 42} y1={band.box.y + band.box.sepY}
            x2={band.box.x + band.box.w - 42} y2={band.box.y + band.box.sepY}
            stroke="#454c5a" strokeWidth={2} strokeDasharray="9 5"
          />
          {band.box.detL.map((l, k) => (
            <text key={`det${k}`} x={band.box.x + 42} y={band.box.y + band.box.detY0 + k * 15.5}
                  fontFamily="Arial, sans-serif" fontSize={12} fontWeight={700} fill="#1e2534">
              {l}
            </text>
          ))}
        </g>
      ) : null
    )}

    {/* nós de transmissão (lilás) */}
    {ly.bands.map((band, bi) =>
      band.seq.map((n, i) => (
        <g key={`nd${bi}_${i}`}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={Math.min(17, n.h / 2)}
                fill={LILAC_FILL} stroke={LILAC_EDGE} strokeWidth={1.4} />
          {n.lines1.map((l, k) => (
            <text key={`t1${k}`} x={n.x + n.w / 2} y={n.y + 20 + k * 17} textAnchor="middle"
                  fontFamily="Arial, sans-serif" fontSize={13} fontWeight={700} fill="#231736">
              {l}
            </text>
          ))}
          {n.line2 ? (
            <text x={n.x + n.w / 2} y={n.y + 20 + n.lines1.length * 17} textAnchor="middle"
                  fontFamily="Arial, sans-serif" fontSize={12} fill="#231736">
              {n.line2}
            </text>
          ) : null}
          {n.line3 ? (
            <text x={n.x + n.w / 2} y={n.y + 20 + (n.lines1.length + 1) * 17} textAnchor="middle"
                  fontFamily="Arial, sans-serif" fontSize={11} fontStyle="italic" fontWeight={600} fill="#3a2c55">
              {n.line3}
            </text>
          ) : null}
        </g>
      ))
    )}

    {/* roteadores / switches (verde) */}
    {ly.routers.map((r, i) => (
      <g key={`rt${i}`}>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={Math.min(24, r.h / 2)}
              fill={GREEN_FILL} stroke={GREEN_EDGE} strokeWidth={2} />
        {r.lines1.map((l, k) => (
          <text key={`rtt${k}`}
                x={r.x + r.w / 2}
                y={r.y + r.h / 2 + 6 + (k - (r.lines1.length - 1) / 2) * 20}
                textAnchor="middle"
                fontFamily="Arial, sans-serif" fontSize={16} fontWeight={700} fill="#182a12">
            {l}
          </text>
        ))}
      </g>
    ))}

    {/* estado vazio */}
    {ly.empty ? (
      <text x={ly.W / 2} y={ly.H / 2} textAnchor="middle"
            fontFamily="Arial, sans-serif" fontSize={18} fill="#8a93a5">
        Adicione uma rota para gerar o mapa
      </text>
    ) : null}
  </svg>
);

export default TopologiaTab;
