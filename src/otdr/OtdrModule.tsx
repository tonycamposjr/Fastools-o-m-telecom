/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as api from '../lib/api';
import type { AuthUser } from '../lib/api';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  parseSor,
  classify,
  labelFor,
  escHtml,
  EVENT_COLORS,
  eventKindIconSvg,
  type TraceData
} from './sor';

// Custom SVG Icons
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default function OtdrModule({ user }: { user: AuthUser | null }) {
  // Conta autenticada vem do app (backend próprio, sessão HttpOnly).
  // user = null → Modo Local: histórico/configurações em localStorage.

  // Application State
  const [activeTab, setActiveTab] = useState<'leitura' | 'arquivo' | 'traco' | 'eventos' | 'medicoes' | 'config' | 'sobre'>('leitura');
  const [trace, setTrace] = useState<TraceData | null>(null);
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number } | null>(null);
  const [refTrace, setRefTrace] = useState<TraceData | null>(null);
  const [refFile, setRefFile] = useState<{ name: string; size: number } | null>(null);
  const [compareOn, setCompareOn] = useState(true);
  const [traceTheme, setTraceTheme] = useState<string>('orange-black');
  const [cursorsOn, setCursorsOn] = useState(true);
  const [cursors, setCursors] = useState({ A: { km: 0 }, B: { km: 0 } });
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // In-app Notification Toast (replaces window.alert)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Delete Confirm Modal State (replaces window.confirm)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Analysis Thresholds
  const [thresholds, setThresholds] = useState({
    medium: 0.4,
    high: 1.0,
    reflect: -40
  });

  // Database / Local History
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Arquivos enviados à conta do usuário no servidor (uploads isolados por user)
  const [myFiles, setMyFiles] = useState<api.OtdrFileRow[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<any>(null);
  const zoomRef = useRef({ min: 0, max: 1 });
  const draggingRef = useRef<any>(null);

  // PWA & Connection Hooks
  const { isInstallable, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Helper for Toast display
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // Sync settings + history: backend por conta, ou localStorage (Modo Local)
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      try {
        const localSettings = JSON.parse(localStorage.getItem('otdrThresholds') || 'null');
        if (localSettings && !cancelled) {
          setThresholds(localSettings);
        }
        const theme = localStorage.getItem('otdrTraceTheme');
        if (theme && !cancelled) setTraceTheme(theme);
      } catch (e) {}
      setLocalHistory(loadLocalHistoricalTraces());
      return;
    }
    (async () => {
      try {
        const cloudSettings = await api.getOtdrSettings();
        if (cloudSettings && !cancelled) {
          setThresholds({
            medium: cloudSettings.mediumLoss ?? 0.4,
            high: cloudSettings.highLoss ?? 1.0,
            reflect: cloudSettings.reflectLimit ?? -40
          });
          if (cloudSettings.traceTheme) {
            setTraceTheme(cloudSettings.traceTheme);
          }
        }
      } catch (e) {
        console.error('Erro ao sincronizar configurações:', e);
      }
      if (!cancelled) {
        loadHistoricalTraces();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Histórico local (Modo Local)
  const loadLocalHistoricalTraces = (): any[] => {
    try {
      const history = JSON.parse(localStorage.getItem('otdrLocalHistory') || '[]');
      return Array.isArray(history) ? history : [];
    } catch (e) {
      return [];
    }
  };

  // Carrega a lista de arquivos do usuário ao abrir a aba Arquivo
  useEffect(() => {
    if (activeTab === 'arquivo' && user) {
      api
        .listFiles()
        .then(setMyFiles)
        .catch((e) => console.error('Erro ao listar arquivos:', e));
    }
    if (activeTab === 'arquivo' && !user) {
      setMyFiles([]);
    }
  }, [activeTab, user]);

  const handleMyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 30 * 1024 * 1024) {
      showToast('Arquivo maior que o limite de 30 MB.', 'error');
      e.target.value = '';
      return;
    }
    setFilesLoading(true);
    try {
      const row = await api.uploadFile(f);
      setMyFiles((prev) => [row, ...prev]);
      showToast('Arquivo enviado para sua conta no servidor!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Erro no upload do arquivo.', 'error');
    } finally {
      setFilesLoading(false);
      e.target.value = '';
    }
  };

  const handleDeleteMyFile = async (id: string) => {
    try {
      await api.deleteFile(id);
      setMyFiles((prev) => prev.filter((x) => x.id !== id));
      showToast('Arquivo removido da sua conta.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Erro ao remover arquivo.', 'error');
    }
  };

  const handleDownloadMyFile = async (row: api.OtdrFileRow) => {
    try {
      await api.downloadFile(row.id, row.originalName);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao baixar arquivo.', 'error');
    }
  };

  // Set trace background theme
  useEffect(() => {
    const root = document.documentElement;
    const palettes: Record<string, any> = {
      blue: { bg: '#EEF2F7', grid: 'rgba(107,117,144,0.14)', text: 'rgba(107,117,144,0.75)', line: '#5B5FEF', fill: 'rgba(91,95,239,0.08)', event: 'rgba(107,117,144,0.35)' },
      'orange-black': { bg: '#050607', grid: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.78)', line: '#FF9800', fill: 'rgba(255,152,0,0.08)', event: 'rgba(255,152,0,0.42)' },
      'green-black': { bg: '#050607', grid: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.78)', line: '#39FF14', fill: 'rgba(57,255,20,0.07)', event: 'rgba(57,255,20,0.40)' }
    };
    const pal = palettes[traceTheme] || palettes['orange-black'];
    root.style.setProperty('--trace-bg', pal.bg);
    root.style.setProperty('--trace-grid', pal.grid);
    root.style.setProperty('--trace-text', pal.text);
    root.style.setProperty('--trace-line', pal.line);
    root.style.setProperty('--trace-fill', pal.fill);
    root.style.setProperty('--trace-event', pal.event);

    // Save choice
    if (user) {
      api.saveOtdrSettings({
        mediumLoss: thresholds.medium,
        highLoss: thresholds.high,
        reflectLimit: thresholds.reflect,
        traceTheme: traceTheme
      }).catch(console.error);
    } else {
      localStorage.setItem('otdrTraceTheme', traceTheme);
    }

    if (trace) {
      drawGraph();
    }
  }, [traceTheme, trace]);

  // Redraw when cursors, selections, thresholds, or compare settings change
  useEffect(() => {
    if (trace) {
      drawGraph();
    }
  }, [trace, cursors, selectedEvent, cursorsOn, refTrace, compareOn, thresholds]);

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isReference = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorText(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as ArrayBuffer;
        const parsed = parseSor(result);

        if (parsed.warning) {
          setErrorText(parsed.warning);
        }

        if (isReference) {
          setRefTrace(parsed);
          setRefFile({ name: file.name, size: file.size });
          setCompareOn(true);
          showToast('Traço de referência carregado com sucesso.', 'info');
        } else {
          setTrace(parsed);
          setCurrentFile({ name: file.name, size: file.size });
          setSelectedEvent(null);
          // Default cursors from start to last event
          const lastEventKm = parsed.events.reduce((max, ev) => Math.max(max, ev.distanceKm || 0), 0);
          setCursors({
            A: { km: 0 },
            B: { km: lastEventKm || parsed.summary.fiberLengthKm }
          });
          zoomRef.current = { min: 0, max: 1 };
          showToast('Arquivo .SOR carregado com sucesso!', 'success');
        }
      } catch (err: any) {
        setErrorText(err.message || 'Falha ao processar o arquivo .SOR.');
        showToast(err.message || 'Falha ao processar o arquivo .SOR.', 'error');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorText('Erro ao carregar arquivo do disco.');
      setLoading(false);
      showToast('Erro ao carregar arquivo do disco.', 'error');
    };
    reader.readAsArrayBuffer(file);
  };

  // Load user's history from backend (isolated per account on the server)
  const loadHistoricalTraces = async () => {
    setHistoryLoading(true);
    try {
      if (!user) {
        setLocalHistory(loadLocalHistoricalTraces());
        return;
      }
      const traces = await api.listTraces();
      if (traces) {
        setLocalHistory(traces);
      }
    } catch (e) {
      console.error('Erro ao buscar histórico na conta:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Save parsed trace into history (Cloud or LocalStorage)
  const handleSaveTrace = async () => {
    if (!trace || !currentFile) return;

    setHistoryLoading(true);
    const traceId = 'tr_' + Date.now();
    const traceObj = {
      id: traceId,
      fileName: currentFile.name,
      fileSize: currentFile.size,
      testDate: trace.summary.testDate?.toISOString() || new Date().toISOString(),
      wavelengthNm: trace.summary.wavelengthNm,
      pulseWidthNs: trace.summary.pulseWidthNs,
      ior: trace.summary.ior,
      fiberLengthKm: trace.summary.fiberLengthKm,
      acquisitionRangeKm: trace.summary.acquisitionRangeKm,
      fiberType: trace.summary.fiberType,
      cableId: trace.summary.cableId,
      fiberId: trace.summary.fiberId,
      dataPoints: trace.summary.dataPoints,
      spacingM: trace.summary.spacingM,
      backscatterDb: trace.summary.backscatterDb,
      traceType: trace.summary.traceType,
      orlDb: trace.footer?.orlDb || 0,
      totalLossDb: trace.footer?.totalLossDb || 0,
      events: trace.events,
      curvePoints: trace.curve.points
    };

    try {
      if (user) {
        await api.saveTrace(traceObj);
        await loadHistoricalTraces();
      } else {
        const history = loadLocalHistoricalTraces();
        history.unshift(traceObj);
        localStorage.setItem('otdrLocalHistory', JSON.stringify(history));
        setLocalHistory(history);
      }
      showToast('Traço salvo com sucesso no histórico!', 'success');
    } catch (e) {
      console.error('Erro ao salvar traço:', e);
      showToast('Erro ao salvar traço. Verifique as permissões de rede.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Delete Trace from history
  const confirmDeleteTrace = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    setHistoryLoading(true);

    try {
      if (user) {
        await api.deleteTrace(id);
        await loadHistoricalTraces();
      } else {
        const history = loadLocalHistoricalTraces().filter((t: any) => t.id !== id);
        localStorage.setItem('otdrLocalHistory', JSON.stringify(history));
        setLocalHistory(history);
      }
      showToast('Traço removido do histórico.', 'info');
    } catch (err) {
      console.error('Erro ao remover do histórico:', err);
      showToast('Erro ao remover do histórico.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load a historic trace into current viewer
  const handleLoadFromHistory = (histTrace: any) => {
    const loaded: TraceData = {
      summary: {
        testDate: new Date(histTrace.testDate),
        wavelengthNm: histTrace.wavelengthNm,
        pulseWidthNs: histTrace.pulseWidthNs,
        ior: histTrace.ior,
        fiberLengthKm: histTrace.fiberLengthKm,
        acquisitionRangeKm: histTrace.acquisitionRangeKm,
        fiberType: histTrace.fiberType || '',
        cableId: histTrace.cableId || '',
        fiberId: histTrace.fiberId || '',
        dataPoints: histTrace.dataPoints || 0,
        spacingM: histTrace.spacingM || 0,
        backscatterDb: histTrace.backscatterDb || 0,
        traceType: histTrace.traceType || ''
      },
      events: histTrace.events || [],
      footer: histTrace.totalLossDb ? { totalLossDb: histTrace.totalLossDb, orlDb: histTrace.orlDb } : null,
      curve: {
        points: histTrace.curvePoints || [],
        numPointsTotal: (histTrace.curvePoints || []).length,
        numPointsReturned: (histTrace.curvePoints || []).length
      }
    };

    setTrace(loaded);
    setCurrentFile({ name: histTrace.fileName, size: histTrace.fileSize || 0 });
    setSelectedEvent(null);
    zoomRef.current = { min: 0, max: 1 };
    
    // Set cursors to default span
    const lastEventKm = (loaded.events || []).reduce((max, ev) => Math.max(max, ev.distanceKm || 0), 0);
    setCursors({
      A: { km: 0 },
      B: { km: lastEventKm || loaded.summary.fiberLengthKm }
    });

    setActiveTab('leitura');
    showToast(`Carregado: ${histTrace.fileName}`, 'info');
  };

  // Get trace value at specific distance
  const valAtKm = (km: number) => {
    if (!trace || !trace.curve.points.length) return 0;
    const pts = trace.curve.points;
    const hi = pts.length - 1;
    if (km <= pts[0].distanceKm) return pts[0].valueDb;
    if (km >= pts[hi].distanceKm) return pts[hi].valueDb;
    let lo = 0, h = hi;
    while (h - lo > 1) {
      const mid = (lo + h) >> 1;
      if (pts[mid].distanceKm < km) lo = mid; else h = mid;
    }
    const p0 = pts[lo], p1 = pts[h];
    const sp = p1.distanceKm - p0.distanceKm;
    const t = sp > 0 ? (km - p0.distanceKm) / sp : 0;
    return p0.valueDb + (p1.valueDb - p0.valueDb) * t;
  };

  // Neumorphic canvas graph plotting
  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas || !trace) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { left: 44, right: 14, top: 16, bottom: 24 };
    const plotW = rect.width - pad.left - pad.right;
    const plotH = rect.height - pad.top - pad.bottom;

    const fullLength = trace.curve.points.length ? trace.curve.points[trace.curve.points.length - 1].distanceKm : 1;
    const fromKm = zoomRef.current.min * fullLength;
    const toKm = zoomRef.current.max * fullLength;
    const span = Math.max(toKm - fromKm, 0.0001);

    const pts = trace.curve.points.filter((p) => p.distanceKm >= fromKm - span * 0.02 && p.distanceKm <= toKm + span * 0.02);
    const activePts = pts.length >= 2 ? pts : trace.curve.points;

    let maxVal = 0, minVal = 0;
    for (let i = 0; i < activePts.length; i++) {
      if (activePts[i].valueDb > maxVal) maxVal = activePts[i].valueDb;
      if (activePts[i].valueDb < minVal) minVal = activePts[i].valueDb;
    }
    maxVal = Math.max(maxVal, 1);
    const vpad = (maxVal - minVal) * 0.08;
    maxVal += vpad; minVal -= vpad;

    const xS = (km: number) => pad.left + ((km - fromKm) / span) * plotW;
    const yS = (db: number) => pad.top + plotH - ((db - minVal) / (maxVal - minVal || 1)) * plotH;

    layoutRef.current = {
      pad,
      plotW,
      plotH,
      fromKm,
      span,
      xS,
      yS,
      kmFromX: (x: number) => Math.max(0, Math.min(fullLength, fromKm + ((x - pad.left) / plotW) * span))
    };

    // Background clearing
    ctx.clearRect(0, 0, rect.width, rect.height);
    const bgStyle = getComputedStyle(document.documentElement).getPropertyValue('--trace-bg').trim() || '#EEF2F7';
    ctx.fillStyle = bgStyle;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid & text
    const gridStyle = getComputedStyle(document.documentElement).getPropertyValue('--trace-grid').trim() || 'rgba(107,117,144,0.14)';
    const textStyle = getComputedStyle(document.documentElement).getPropertyValue('--trace-text').trim() || 'rgba(107,117,144,0.75)';
    ctx.strokeStyle = gridStyle;
    ctx.lineWidth = 1;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillStyle = textStyle;

    const xDivs = 7;
    for (let gx = 0; gx <= xDivs; gx++) {
      const kx = fromKm + (span / xDivs) * gx;
      const xx = xS(kx);
      ctx.beginPath(); ctx.moveTo(xx, pad.top); ctx.lineTo(xx, pad.top + plotH); ctx.stroke();
      ctx.textAlign = gx === 0 ? 'left' : (gx === xDivs ? 'right' : 'center');
      ctx.fillText(kx.toFixed(1), xx, rect.height - 6);
    }
    ctx.textAlign = 'left';
    ctx.fillText('km', rect.width - pad.right + 2, rect.height - 6);

    const yDivs = 5;
    for (let gy = 0; gy <= yDivs; gy++) {
      const yv = minVal + ((maxVal - minVal) / yDivs) * gy;
      const yy = yS(yv);
      ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(pad.left + plotW, yy); ctx.stroke();
      ctx.fillText(yv.toFixed(0), 2, yy + 3);
    }
    ctx.fillText('dB', 2, pad.top - 4);

    // Reference comparison trace
    if (refTrace && compareOn && refTrace.curve.points.length) {
      const rPts = refTrace.curve.points.filter((p) => p.distanceKm >= fromKm - span * 0.02 && p.distanceKm <= toKm + span * 0.02);
      const activeRefPts = rPts.length >= 2 ? rPts : refTrace.curve.points;
      ctx.strokeStyle = '#8B95B8';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      for (let ri = 0; ri < activeRefPts.length; ri++) {
        const rx = xS(activeRefPts[ri].distanceKm);
        const ry = yS(activeRefPts[ri].valueDb);
        if (ry < pad.top || ry > pad.top + plotH) continue;
        if (ri === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Main Fill under the curve
    ctx.beginPath();
    for (let pi = 0; pi < activePts.length; pi++) {
      const px = xS(activePts[pi].distanceKm);
      const py = yS(activePts[pi].valueDb);
      if (pi === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineTo(xS(activePts[activePts.length - 1].distanceKm), pad.top + plotH);
    ctx.lineTo(xS(activePts[0].distanceKm), pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--trace-fill').trim() || 'rgba(91,95,239,0.08)';
    ctx.fill();

    // Trace line stroke
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--trace-line').trim() || '#5B5FEF';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let pj = 0; pj < activePts.length; pj++) {
      const qx = xS(activePts[pj].distanceKm);
      const qy = yS(activePts[pj].valueDb);
      if (pj === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
    }
    ctx.stroke();

    // Plot key events
    ctx.font = 'bold 10px -apple-system, sans-serif';
    trace.events.forEach((e, idx) => {
      if (e.distanceKm < fromKm - span * 0.05 || e.distanceKm > toKm + span * 0.05) return;
      const ex = xS(e.distanceKm);
      const kind = classify(e);
      const baseColor = EVENT_COLORS[kind];
      const lossColor = (typeof e.spliceLossDb === 'number' && isFinite(e.spliceLossDb))
        ? (e.spliceLossDb >= thresholds.high ? '#E5484D' : (e.spliceLossDb >= thresholds.medium ? '#F5A524' : baseColor))
        : baseColor;
      const color = lossColor;
      const isSel = selectedEvent === idx;

      ctx.strokeStyle = isSel ? color : (getComputedStyle(document.documentElement).getPropertyValue('--trace-event').trim() || 'rgba(107,117,144,0.35)');
      ctx.lineWidth = isSel ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(ex, pad.top + 18); ctx.lineTo(ex, pad.top + plotH); ctx.stroke();

      const r = isSel ? 11 : 9;
      ctx.beginPath(); ctx.arc(ex, pad.top + 9, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      if (isSel) {
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(String(e.eventNumber), ex, pad.top + 12.5);
    });
    ctx.textAlign = 'left';

    // Plot cursors
    if (cursorsOn) {
      [['A', cursors.A, '#3F8CFF'], ['B', cursors.B, '#8B5CF6']].forEach((c) => {
        const label = c[0] as string;
        const cur = c[1] as { km: number };
        const color = c[2] as string;
        if (cur.km < fromKm || cur.km > toKm) return;
        const cx = xS(cur.km);
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(cx, pad.top); ctx.lineTo(cx, pad.top + plotH); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.fillRect(cx - 9, rect.height - pad.bottom + 2, 18, 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, rect.height - pad.bottom + 12);
        ctx.textAlign = 'left';
      });
    }
  };

  // Redraw when resized (ResizeObserver no contêiner + fallback para window.resize).
  // Mantém zoom, marcadores A/B e seleção de eventos: apenas redesenha com a mesma view.
  useEffect(() => {
    const canvas = canvasRef.current;
    const handleResize = () => {
      if (trace) drawGraph();
    };

    let observer: ResizeObserver | null = null;
    if (canvas && typeof ResizeObserver !== 'undefined') {
      const wrap = canvas.closest('.chart-wrap') || canvas.parentElement || canvas;
      observer = new ResizeObserver(() => handleResize());
      observer.observe(wrap);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [trace, traceTheme, cursors, selectedEvent, cursorsOn, refTrace, compareOn, thresholds]);

  // Handle zooming controls
  const handleZoomBy = (factor: number) => {
    const mid = (zoomRef.current.min + zoomRef.current.max) / 2;
    const halfSpan = (zoomRef.current.max - zoomRef.current.min) / 2 * factor;
    const min = Math.max(0, mid - halfSpan);
    const max = Math.min(1, mid + halfSpan);
    if (max - min < 0.01) return;
    zoomRef.current = { min, max };
    drawGraph();
  };

  // Reset zoom entirely
  const handleResetZoom = () => {
    zoomRef.current = { min: 0, max: 1 };
    drawGraph();
  };

  // Toggle fullscreen mode
  const handleFitScreen = () => {
    const el = canvasRef.current?.closest('.card');
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().then(() => {
        setTimeout(drawGraph, 60);
      });
    }
  };

  // Canvas Interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!layoutRef.current || !trace) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;

    // Detect if clicking cursor A or B
    const TOL = 12;
    if (cursorsOn) {
      const ax = layoutRef.current.xS(cursors.A.km);
      const bx = layoutRef.current.xS(cursors.B.km);
      if (Math.abs(x - ax) <= TOL) {
        draggingRef.current = { type: 'cursorA' };
        canvasRef.current?.setPointerCapture(e.pointerId);
        return;
      }
      if (Math.abs(x - bx) <= TOL) {
        draggingRef.current = { type: 'cursorB' };
        canvasRef.current?.setPointerCapture(e.pointerId);
        return;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current || !layoutRef.current || !trace) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const km = layoutRef.current.kmFromX(x);

    if (draggingRef.current.type === 'cursorA') {
      setCursors(prev => ({ ...prev, A: { km } }));
    } else if (draggingRef.current.type === 'cursorB') {
      setCursors(prev => ({ ...prev, B: { km } }));
    }
  };

  const handlePointerUp = () => {
    draggingRef.current = null;
  };

  // Wheel zoom centered on hover position
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!trace || !layoutRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const kmAtCursor = layoutRef.current.kmFromX(x);

    const fullLength = trace.curve.points.length ? trace.curve.points[trace.curve.points.length - 1].distanceKm : 1;
    const currentSpan = (zoomRef.current.max - zoomRef.current.min) * fullLength;
    const factor = e.deltaY < 0 ? 0.82 : 1 / 0.82;
    const newSpan = Math.max(currentSpan * factor, fullLength * 0.01);

    const ratio = (kmAtCursor - (zoomRef.current.min * fullLength)) / Math.max(currentSpan, 0.0001);
    let newFrom = Math.max(0, kmAtCursor - ratio * newSpan);
    let newTo = Math.min(fullLength, newFrom + newSpan);
    newFrom = Math.max(0, newTo - newSpan);

    zoomRef.current = {
      min: newFrom / fullLength,
      max: newTo / fullLength
    };
    drawGraph();
  };

  // Double Click / single click to center zoom or select event
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!layoutRef.current || !trace) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const km = layoutRef.current.kmFromX(x);

    // Click to select nearest event
    let closestIdx: number | null = null;
    let minDist = 0.5; // tolerance in km
    trace.events.forEach((ev, idx) => {
      const d = Math.abs(ev.distanceKm - km);
      if (d < minDist) {
        minDist = d;
        closestIdx = idx;
      }
    });

    if (closestIdx !== null) {
      setSelectedEvent(closestIdx);
    }
  };

  // Calculations for readout
  const aKm = cursors.A.km;
  const bKm = cursors.B.km;
  const aVal = valAtKm(aKm);
  const bVal = valAtKm(bKm);
  const diffKm = Math.abs(bKm - aKm);
  const diffDb = Math.abs(bVal - aVal);

  const accumulatedLossDb = () => {
    if (!trace) return 0;
    return trace.events.reduce((sum, e) => sum + (e.spliceLossDb || 0), 0);
  };

  // Highlight classes
  const lossSeverity = (loss?: number) => {
    if (loss === undefined || !isFinite(loss)) return null;
    if (loss >= thresholds.high) return 'high';
    if (loss >= thresholds.medium) return 'medium';
    return null;
  };

  const getLossClass = (loss?: number) => {
    const sev = lossSeverity(loss);
    return sev === 'high' ? ' loss-high text-[#E5484D] font-bold' : (sev === 'medium' ? ' loss-medium text-[#F5A524] font-bold' : '');
  };

  const getReflectClass = (refl?: number | null) => {
    if (refl == null) return '';
    return refl >= thresholds.reflect ? ' loss-high text-[#E5484D] font-bold' : '';
  };

  // Sync settings immediately to Firestore or LocalStorage
  const handleThresholdChange = (key: 'medium' | 'high' | 'reflect', val: number) => {
    const updated = { ...thresholds, [key]: val };
    
    // Ensure medium <= high
    if (key === 'medium' && val > updated.high) {
      updated.high = val;
    } else if (key === 'high' && val < updated.medium) {
      updated.medium = val;
    }

    setThresholds(updated);

    if (user) {
      api.saveOtdrSettings({
        mediumLoss: updated.medium,
        highLoss: updated.high,
        reflectLimit: updated.reflect,
        traceTheme: traceTheme
      }).catch(console.error);
    } else {
      localStorage.setItem('otdrThresholds', JSON.stringify(updated));
    }
  };

  // Restaura os limiares padrão (como o botão "Restaurar padrão" do modelo)
  const handleThresholdReset = () => {
    const defaults = { medium: 0.4, high: 1.0, reflect: -40 };
    setThresholds(defaults);
    if (user) {
      api.saveOtdrSettings({
        mediumLoss: defaults.medium,
        highLoss: defaults.high,
        reflectLimit: defaults.reflect,
        traceTheme: traceTheme
      }).catch(console.error);
    } else {
      localStorage.setItem('otdrThresholds', JSON.stringify(defaults));
    }
    showToast('Limiares restaurados ao padrão.', 'info');
  };

  // Generate Report HTML block
  const buildReportBodyHtml = () => {
    if (!trace) return '';
    const s = trace.summary;
    const testDateFormatted = s.testDate ? new Date(s.testDate).toLocaleString('pt-BR') : '—';
    const chartImage = canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
    const hasComments = trace.events.some((e) => e.comment && e.comment.trim() !== '');

    const eventsRows = trace.events.map((e) => {
      const kind = classify(e);
      const distText = `${e.distanceKm.toFixed(3)} km`;
      const attenText = typeof e.slopeDbKm === 'number' && isFinite(e.slopeDbKm) ? `${e.slopeDbKm.toFixed(4)} dB/km` : '—';
      
      let lossCell = '—';
      if (typeof e.spliceLossDb === 'number') {
        const val = e.spliceLossDb.toFixed(3) + ' dB';
        if (e.spliceLossDb >= 1.0) {
          lossCell = `<span style="display:inline-block; min-width:76px; padding:3px 10px; border:2px solid #E5484D; background:rgba(229,72,77,0.10); border-radius:6px; color:#C4171E; font-weight:700; text-align:center;">${val}</span>`;
        } else if (e.spliceLossDb >= 0.4) {
          lossCell = `<span style="display:inline-block; min-width:76px; padding:3px 10px; border:2px solid #F5A524; background:rgba(245,165,36,0.10); border-radius:6px; color:#B7690A; font-weight:700; text-align:center;">${val}</span>`;
        } else {
          lossCell = `<span>${val}</span>`;
        }
      }

      let reflCell = '—';
      if (e.reflectanceDb != null) {
        const val = e.reflectanceDb.toFixed(1) + ' dB';
        if (e.reflectanceDb >= -40.0) {
          reflCell = `<span style="display:inline-block; min-width:76px; padding:3px 10px; border:2px solid #E5484D; background:rgba(229,72,77,0.10); border-radius:6px; color:#C4171E; font-weight:700; text-align:center;">${val}</span>`;
        } else {
          reflCell = `<span>${val}</span>`;
        }
      }

      return `<tr>
        <td style="padding: 10px 14px; border: 1px solid #D8DEE8; text-align: left;">${e.eventNumber}</td>
        <td style="padding: 10px 14px; border: 1px solid #D8DEE8; text-align: left; font-weight: 500;">${labelFor(kind)}</td>
        <td style="padding: 10px 14px; border: 1px solid #D8DEE8; text-align: left;">${distText}</td>
        <td style="padding: 10px 14px; border: 1px solid #D8DEE8; text-align: left;">${lossCell}</td>
        <td style="padding: 10px 14px; border: 1px solid #D8DEE8; text-align: left;">${attenText}</td>
        <td style="padding: 10px 14px; border: 1px solid #D8DEE8; text-align: left;">${reflCell}</td>
        ${hasComments ? `<td style="padding: 10px 14px; border: 1px solid #D8DEE8; text-align: left;">${escHtml(e.comment)}</td>` : ''}
      </tr>`;
    }).join('');

    return `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1B2237; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 800; color: #5B5FEF; border-bottom: 2px solid #5B5FEF; padding-bottom: 8px;">Relatório de Análise OTDR</h1>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 18px 0; font-size: 13px; line-height: 1.6; background: #F4F6FA; padding: 14px; border-radius: 8px;">
          <div>
            <strong>Nome do arquivo:</strong> ${escHtml(currentFile?.name)}<br>
            <strong>Data do teste:</strong> ${testDateFormatted}<br>
            <strong>Comprimento total:</strong> ${s.fiberLengthKm.toFixed(3)} km<br>
            <strong>Faixa de aquisição:</strong> ${s.acquisitionRangeKm.toFixed(3)} km
          </div>
          <div>
            <strong>Comprimento de onda:</strong> ${s.wavelengthNm.toFixed(0)} nm<br>
            <strong>Largura de pulso:</strong> ${s.pulseWidthNs} ns<br>
            <strong>Índice de refração (IOR):</strong> ${s.ior.toFixed(5)}<br>
            <strong>Perda acumulada total:</strong> ${accumulatedLossDb().toFixed(3)} dB
          </div>
        </div>

        <div style="font-size: 13px; line-height: 1.6; margin-bottom: 18px; padding: 10px; border-left: 4px solid #3F8CFF; background: #E8ECF8;">
          <strong>Análise do Trecho Selecionado (A - B):</strong><br>
          Distância entre marcadores: <strong>${diffKm.toFixed(3)} km</strong><br>
          Perda total do trecho: <strong>${diffDb.toFixed(3)} dB</strong>
        </div>

        ${chartImage ? `
          <h2 style="font-size: 16px; font-weight: 700; color: #1B2237; margin: 24px 0 8px;">Visualização do Traço</h2>
          <div style="border: 1px solid #D8DEE8; border-radius: 8px; overflow: hidden; padding: 8px; margin-bottom: 24px;">
            <img src="${chartImage}" style="width: 100%; height: auto; display: block;" />
          </div>
        ` : ''}

        <h2 style="font-size: 16px; font-weight: 700; color: #1B2237; margin-top: 24px;">Tabela de Eventos Detectados</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; font-family: Arial, sans-serif;">
          <thead>
            <tr style="background-color: #F8FAFC; border-bottom: 2px solid #CBD5E1;">
              <th style="padding: 10px 14px; text-align: left; border: 1px solid #D8DEE8; font-weight: 700; color: #1E293B;">Nº</th>
              <th style="padding: 10px 14px; text-align: left; border: 1px solid #D8DEE8; font-weight: 700; color: #1E293B;">Tipo</th>
              <th style="padding: 10px 14px; text-align: left; border: 1px solid #D8DEE8; font-weight: 700; color: #1E293B;">Distância</th>
              <th style="padding: 10px 14px; text-align: left; border: 1px solid #D8DEE8; font-weight: 700; color: #1E293B;">Perda</th>
              <th style="padding: 10px 14px; text-align: left; border: 1px solid #D8DEE8; font-weight: 700; color: #1E293B;">Atenuação</th>
              <th style="padding: 10px 14px; text-align: left; border: 1px solid #D8DEE8; font-weight: 700; color: #1E293B;">Reflexão</th>
              ${hasComments ? '<th style="padding: 10px 14px; text-align: left; border: 1px solid #D8DEE8; font-weight: 700; color: #1E293B;">Comentário</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${eventsRows}
          </tbody>
        </table>

        <div style="margin-top: 12px; font-size: 11.5px; color: #475569; display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #F5A524; background: rgba(245,165,36,0.12); border-radius: 4px;"></span>
            Perda entre 0.400 e 0.999 dB
          </span>
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #E5484D; background: rgba(229,72,77,0.12); border-radius: 4px;"></span>
            Perda ≥ 1.000 dB ou reflectância ≥ -40 dB
          </span>
        </div>

        <div style="margin-top: 24px; font-size: 11px; color: #6B7590; text-align: center; border-top: 1px solid #D8DEE8; padding-top: 12px;">
          Gerado pelo Leitor OTDR com suporte a Banco de Dados Cloud e PWA offline.
        </div>
      </div>
    `;
  };

  // Safe iframe-based printing (No window.open / popup)
  const handlePrintReport = () => {
    const reportHtml = buildReportBodyHtml();
    let printIframe = document.getElementById('otdrPrintIframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'otdrPrintIframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);
    }
    const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Relatório OTDR — ${escHtml(currentFile?.name || '')}</title>
            <style>body { margin: 0; padding: 0; font-family: Arial, sans-serif; }</style>
          </head>
          <body>
            ${reportHtml}
          </body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      }, 300);
    }
  };

  const handleExportCsv = () => {
    if (!trace) return;
    const lines = ['distancia_km,valor_db'];
    trace.curve.points.forEach((p) => {
      lines.push(p.distanceKm.toFixed(6) + ',' + p.valueDb.toFixed(3));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (currentFile ? currentFile.name.replace(/\.sor$/i, '') : 'traco') + '_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Curva exportada em CSV com sucesso.', 'info');
  };

  const handleExportEventsCsv = () => {
    if (!trace) return;
    const lines = ['numero;tipo;distancia_km;perda_db;atenuacao_db_km;reflexao_db;perda_acumulada_db;comentario'];
    let cum = 0;
    trace.events.forEach((e) => {
      if (typeof e.spliceLossDb === 'number') cum += e.spliceLossDb;
      const kind = classify(e);
      lines.push([
        e.eventNumber,
        labelFor(kind),
        e.distanceKm.toFixed(6),
        typeof e.spliceLossDb === 'number' ? e.spliceLossDb.toFixed(3) : '',
        typeof e.slopeDbKm === 'number' ? e.slopeDbKm.toFixed(4) : '',
        e.reflectanceDb != null ? e.reflectanceDb.toFixed(1) : '',
        cum.toFixed(3),
        '"' + (e.comment || '').replace(/"/g, '""') + '"'
      ].join(';'));
    });
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (currentFile ? currentFile.name.replace(/\.sor$/i, '') : 'traco') + '_eventos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Tabela de eventos exportada em CSV.', 'info');
  };

  const handleDownloadPdf = () => {
    if (!trace) return;
    const jsPDF = (window as any).jspdf?.jsPDF;
    const html2canvas = (window as any).html2canvas;

    if (!jsPDF || !html2canvas) {
      showToast('Bibliotecas de PDF carregando. Você também pode clicar em "Gerar Relatório Impresso" para salvar como PDF.', 'info');
      return;
    }

    setLoading(true);
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed; left:-9999px; top:0; width:760px; background:#fff; color:#1B2237; font-family:Arial,sans-serif; padding:28px; box-sizing:border-box';
    holder.innerHTML = buildReportBodyHtml();
    document.body.appendChild(holder);

    html2canvas(holder, { scale: 2, backgroundColor: '#ffffff' }).then((canvas: any) => {
      document.body.removeChild(holder);
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = canvas.height * imgW / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;

      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      pdf.save((currentFile ? currentFile.name.replace(/\.sor$/i, '') : 'relatorio_otdr') + '.pdf');
      setLoading(false);
      showToast('Arquivo PDF baixado com sucesso!', 'success');
    }).catch((err: any) => {
      if (holder.parentNode) document.body.removeChild(holder);
      setLoading(false);
      showToast('Erro ao renderizar PDF. Utilize "Gerar Relatório Impresso".', 'error');
    });
  };

  return (
    <div className="otdr-root">
      {/* ================= IN-APP TOAST ================= */}
      {toast && (
        <div className={`otdr-toast ${
          toast.type === 'success' ? 'toast-success' :
          toast.type === 'error' ? 'toast-error' : 'toast-info'
        }`}>
          {toast.text}
        </div>
      )}

      {/* ================= IN-APP DELETE CONFIRM MODAL ================= */}
      {deleteTargetId && (
        <div className="otdr-modal-overlay">
          <div className="otdr-modal-card otdr-modal-center">
            <h3 className="otdr-modal-title">Excluir Traço do Histórico?</h3>
            <p className="otdr-modal-text">Esta medição será permanentemente removida do banco de dados.</p>
            <div className="otdr-modal-actions">
              <button 
                onClick={() => setDeleteTargetId(null)} 
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteTrace} 
                className="btn btn-danger"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= OFFLINE TOAST ================= */}
      {!isOnline && (
        <div className="otdr-offline">
          <span className="otdr-offline-dot animate-pulse" />
          Modo Offline — Exibindo dados em cache local.
        </div>
      )}

      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar select-none">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#5B5FEF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h4l2 7 4-14 2 7h8" />
            </svg>
          </div>
          <div className="brand-label">OTDR</div>
        </div>

        {/* Desktop Drag and Drop import */}
        <div 
          className="import-card" 
          onClick={() => document.getElementById('fileInput')?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const syntheticEvent = { target: { files: [file] } } as any;
              handleFileUpload(syntheticEvent);
            }
          }}
        >
          <svg className="ic-cloud" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 18a4.5 4.5 0 01-.4-8.98A5.5 5.5 0 0117 8a4 4 0 011 7.87"/>
            <path d="M12 12v7M9.5 16.5L12 19l2.5-2.5"/>
          </svg>
          <div className="ic-title">Importar .SOR</div>
          <div className="ic-sub">Arraste e solte o arquivo aqui ou clique para selecionar</div>
          <input type="file" id="fileInput" className="hidden" accept=".sor" onChange={(e) => handleFileUpload(e)} />
        </div>

        <nav className="mt-4 flex flex-col gap-1 w-full">
          <button className={`nav-item ${activeTab === 'leitura' ? 'active' : ''}`} onClick={() => setActiveTab('leitura')} title="Leitura">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
            Leitura
          </button>
          <button className={`nav-item ${activeTab === 'arquivo' ? 'active' : ''}`} onClick={() => setActiveTab('arquivo')} title="Arquivo e Histórico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h5l2 2h11v10H3z"/></svg>
            Arquivo
          </button>
          <button className={`nav-item ${activeTab === 'traco' ? 'active' : ''}`} onClick={() => setActiveTab('traco')} title="Traço">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l5-6 4 4 8-9"/></svg>
            Traço
          </button>
          <button className={`nav-item ${activeTab === 'eventos' ? 'active' : ''}`} onClick={() => setActiveTab('eventos')} title="Eventos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.4" fill="currentColor" stroke="none"/></svg>
            Eventos
          </button>
          <button className={`nav-item ${activeTab === 'medicoes' ? 'active' : ''}`} onClick={() => setActiveTab('medicoes')} title="Medições">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 16l5-9 4 6 3-4 6 7"/><path d="M3 20h18"/></svg>
            Medições
          </button>
          <button className={`nav-item ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')} title="Configurações">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.56-1H3a2 2 0 110-4h.09A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.56V3a2 2 0 114 0v.09A1.7 1.7 0 0015 4.6a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9a1.7 1.7 0 001.56 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.56 1z"/></svg>
            Configurações
          </button>
          <button className={`nav-item ${activeTab === 'sobre' ? 'active' : ''}`} onClick={() => setActiveTab('sobre')} title="Sobre">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>
            Sobre
          </button>
        </nav>
      </aside>

      {/* ================= MOBILE SECTION NAV ================= */}
      <nav className="sk-subnav">
        <button className={`nav-item ${activeTab === 'leitura' ? 'active' : ''}`} onClick={() => setActiveTab('leitura')} title="Leitura">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
          Leitura
        </button>
        <button className={`nav-item ${activeTab === 'arquivo' ? 'active' : ''}`} onClick={() => setActiveTab('arquivo')} title="Arquivo e Histórico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h5l2 2h11v10H3z"/></svg>
          Arquivo
        </button>
        <button className={`nav-item ${activeTab === 'traco' ? 'active' : ''}`} onClick={() => setActiveTab('traco')} title="Traço">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l5-6 4 4 8-9"/></svg>
          Traço
        </button>
        <button className={`nav-item ${activeTab === 'eventos' ? 'active' : ''}`} onClick={() => setActiveTab('eventos')} title="Eventos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.4" fill="currentColor" stroke="none"/></svg>
          Eventos
        </button>
        <button className={`nav-item ${activeTab === 'medicoes' ? 'active' : ''}`} onClick={() => setActiveTab('medicoes')} title="Medições">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 16l5-9 4 6 3-4 6 7"/><path d="M3 20h18"/></svg>
          Medições
        </button>
        <button className={`nav-item ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')} title="Configurações">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.56-1H3a2 2 0 110-4h.09A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.56V3a2 2 0 114 0v.09A1.7 1.7 0 0015 4.6a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9a1.7 1.7 0 001.56 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.56 1z"/></svg>
          Configurações
        </button>
        <button className={`nav-item ${activeTab === 'sobre' ? 'active' : ''}`} onClick={() => setActiveTab('sobre')} title="Sobre">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>
          Sobre
        </button>
      </nav>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="main">
        {/* Mobile View responsive header action */}
        <div className="mobile-import-card" onClick={() => document.getElementById('mobileFileInput')?.click()}>
          <div className="mobile-import-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 18a4.5 4.5 0 01-.4-8.98A5.5 5.5 0 0117 8a4 4 0 011 7.87"/>
              <path d="M12 12v7M9.5 16.5L12 19l2.5-2.5"/>
            </svg>
          </div>
          <div className="mobile-import-copy">
            <b>Importar arquivo .SOR</b>
            <span>Toque para selecionar um arquivo OTDR</span>
          </div>
          <div className="mobile-import-arrow">›</div>
          <input type="file" id="mobileFileInput" className="hidden" accept=".sor" onChange={(e) => handleFileUpload(e)} />
        </div>

        {/* Top Header Session with Authentication & PWA Install Prompts */}
        <div className="topbar">
          <div>
            <h1>Leitor OTDR</h1>
            <div className="sub">Leitura e análise de arquivos .SOR</div>
          </div>
          <div className="otdr-topbtns">
            {/* PWA Install flow button */}
            {isInstallable && (
              <button 
                onClick={install} 
                className="otdr-topbtn otdr-topbtn-primary"
              >
                <GlobeIcon />
                Instalar App
              </button>
            )}

            {isIOS && (
              <button 
                onClick={() => setShowIOSGuide(true)} 
                className="otdr-topbtn"
              >
                Instalar no iOS
              </button>
            )}

            {/* Conta (backend próprio) — logout fica no cabeçalho global */}
            <div className="otdr-user-box">
              <span className="otdr-user-name">
                Olá, {user ? (user.name || user.username) : 'Convidado — Modo Local'}
                {user?.role === 'admin' && ' · admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Metric cards rows */}
        <div className="metrics-row">
          {trace ? (
            <>
              <div className="metric-card">
                <div className="metric-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 16l5-9 4 6 3-4 6 7"/><path d="M3 20h18"/></svg>
                </div>
                <div>
                  <div className="metric-label">Comprimento Total</div>
                  <div className="metric-value">{trace.summary.fiberLengthKm.toFixed(3)} km</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
                </div>
                <div>
                  <div className="metric-label">Perda de eventos acumulados</div>
                  <div className="metric-value">{accumulatedLossDb().toFixed(3)} dB</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 15l6-6"/><path d="M8 12L5.5 14.5a3.5 3.5 0 004.9 4.9L13 17"/><path d="M16 12l2.5-2.5a3.5 3.5 0 00-4.9-4.9L11 7"/></svg>
                </div>
                <div>
                  <div className="metric-label">ORL Médio</div>
                  <div className="metric-value">{trace.footer ? trace.footer.orlDb.toFixed(1) : '—'} dB</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l2 7 4-14 2 7h8"/></svg>
                </div>
                <div>
                  <div className="metric-label">Pulso</div>
                  <div className="metric-value">{trace.summary.pulseWidthNs} ns</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></svg>
                </div>
                <div>
                  <div className="metric-label">Comprimento de onda</div>
                  <div className="metric-value">{trace.summary.wavelengthNm.toFixed(0)} nm</div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Main Grid View */}
        <div className={`body-grid ${['arquivo', 'config', 'medicoes', 'sobre'].includes(activeTab) ? 'single-col' : ''}`}>
          
          {/* ================= LEFT COLUMN ================= */}
          <div className="left-col flex flex-col gap-4">
            
            {/* Trace visual chart container */}
            {['leitura', 'traco'].includes(activeTab) && (
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Traço OTDR</div>
                  <div className="icon-btns">
                    <button onClick={() => handleZoomBy(0.6)} title="Aproximar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg></button>
                    <button onClick={() => handleZoomBy(1/0.6)} title="Afastar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/></svg></button>
                    <button onClick={handleResetZoom} title="Redefinir Zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><path d="M12 3a9 9 0 106.7 3"/><path d="M21 3v5h-5"/></svg></button>
                    <button onClick={handleFitScreen} title="Tela Cheia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
                  </div>
                </div>
                <div className="chart-wrap">
                  <canvas 
                    ref={canvasRef} 
                    id="traceCanvas"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onClick={handleCanvasClick}
                    onWheel={handleWheel}
                  />
                  {loading && (
                    <div className="loading-overlay show">
                      <span className="spinner"></span>
                      <span>Lendo arquivo...</span>
                    </div>
                  )}
                </div>
                {errorText && (
                  <div className="error-box mx-4 mb-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
                    <span>{errorText}</span>
                  </div>
                )}
                <div className="chart-hint">Clique em um evento para ver os detalhes · role a roda do mouse para zoom</div>
                {!trace && (
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12h4l2 7 4-14 2 7h8"/></svg>
                    <b>Nenhum arquivo carregado</b>
                    <span>Importe um arquivo .SOR para visualizar o traço</span>
                  </div>
                )}
              </div>
            )}

            {/* Event Table */}
            {['leitura', 'eventos'].includes(activeTab) && trace && (
              <div className="card">
                <div className="card-head pb-3">
                  <div className="card-title">Eventos Detectados</div>
                  <div className="icon-btns">
                    <button onClick={handleExportEventsCsv} title="Exportar Eventos em CSV"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg></button>
                  </div>
                </div>
                <div className="events-scroll">
                  <table className="events">
                    <thead>
                      <tr>
                        <th>Nº</th>
                        <th>Tipo</th>
                        <th>Distância (km)</th>
                        <th>Perda (dB)</th>
                        <th>Atenuação (dB/km)</th>
                        <th>Reflexão (dB)</th>
                        <th>Perda Acum. (dB)</th>
                        <th>Comentário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let cum = 0;
                        return trace.events.map((e, idx) => {
                          if (typeof e.spliceLossDb === 'number') cum += e.spliceLossDb;
                          const kind = classify(e);
                          const dotColor = EVENT_COLORS[kind];
                          const isSelected = selectedEvent === idx;
                          const lossSev = typeof e.spliceLossDb === 'number' && isFinite(e.spliceLossDb) ? getLossClass(e.spliceLossDb) : '';
                          const reflSev = e.reflectanceDb != null && e.reflectanceDb >= thresholds.reflect ? ' loss-high text-[#D92F38] font-bold' : '';
                          return (
                            <tr
                              key={idx}
                              className={isSelected ? 'sel' : ''}
                              onClick={() => setSelectedEvent(idx)}
                            >
                              <td><span className="ev-num" style={{ backgroundColor: dotColor }}>{e.eventNumber}</span></td>
                              <td>
                                <span className="ev-badge">
                                  <span className="ev-dot" style={{ backgroundColor: dotColor }} dangerouslySetInnerHTML={{ __html: eventKindIconSvg(kind) }} />
                                  {labelFor(kind)}
                                </span>
                              </td>
                              <td className="strong">{e.distanceKm.toFixed(3)}</td>
                              <td className={`event-loss${lossSev}`}>
                                {typeof e.spliceLossDb === 'number' ? e.spliceLossDb.toFixed(3) : '—'}
                              </td>
                              <td>{typeof e.slopeDbKm === 'number' && isFinite(e.slopeDbKm) ? e.slopeDbKm.toFixed(4) : '—'}</td>
                              <td className={`event-loss${reflSev}`}>
                                {e.reflectanceDb != null ? e.reflectanceDb.toFixed(1) : '—'}
                              </td>
                              <td>{cum.toFixed(3)}</td>
                              <td>{e.comment ? e.comment : '—'}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* ================= RIGHT COLUMN (SIDE PANELS) ================= */}
          <div className="side-col">
            
            {/* Active File / Histórico Tab details */}
            {activeTab === 'arquivo' && !user && (
              <div className="panel">
                <div className="panel-title">Meus Arquivos (.SOR e outros)</div>
                <div className="history-empty">
                  Nuvem indisponível no Modo Local. Quando você estiver conectado a um servidor, os arquivos ficam privados na sua conta e podem ser enviados (máx. 30 MB).
                </div>
                <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'rgba(120,130,150,0.8)' }}>
                  Uploads de outros usuários são invisíveis e inacessíveis — a verificação de dono é feita no servidor.
                </div>
              </div>
            )}

            {activeTab === 'arquivo' && (
              <div className="panel">
                <div className="panel-title">Histórico de Medições</div>
                {historyLoading ? (
                  <div className="history-loading">
                    <LoaderIcon />
                    Buscando histórico...
                  </div>
                ) : localHistory.length === 0 ? (
                  <div className="history-empty">
                    Nenhum traço salvo no histórico. Toque em "Salvar Traço no Histórico" para guardar suas análises.
                  </div>
                ) : (
                  <div className="history-list">
                    {localHistory.map((h, i) => (
                      <div key={i} className="history-item" onClick={() => handleLoadFromHistory(h)}>
                        <div className="history-info">
                          <div className="history-title">{h.fileName}</div>
                          <div className="history-meta">
                            {Number(h.fiberLengthKm || 0).toFixed(3)} km · {h.wavelengthNm}nm · {new Date(h.testDate).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div className="history-actions">
                          <button 
                            className="history-del-btn" 
                            title="Excluir" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(h.id);
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Meus arquivos no servidor (uploads por conta, downloads e exclusão próprios) */}
            {activeTab === 'arquivo' && user && (
              <div className="panel">
                <div className="panel-title">Meus Arquivos (.SOR e outros)</div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(120,140,180,0.4)', fontWeight: 700, fontSize: '13px' }}>
                    <i className="fas fa-cloud-upload-alt"></i>
                    {filesLoading ? 'Enviando...' : 'Enviar arquivo (máx. 30 MB)'}
                    {filesLoading ? null : (
                      <input type="file" accept=".sor,.kml,.kmz,.png,.jpg,.jpeg,.pdf,.csv,.json,.txt,.xml,.zip" style={{ display: 'none' }} onChange={handleMyFileUpload} />
                    )}
                  </label>
                </div>
                {myFiles.length === 0 ? (
                  <div className="history-empty">Nenhum arquivo enviado ainda. Os arquivos ficam privados na sua conta ({user.username}).</div>
                ) : (
                  <div className="history-list">
                    {myFiles.map((f) => (
                      <div key={f.id} className="history-item" onClick={() => handleDownloadMyFile(f)}>
                        <div className="history-info">
                          <div className="history-title">{f.originalName}</div>
                          <div className="history-meta">
                            {(f.size / 1024).toFixed(1)} KB · {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div className="history-actions">
                          <button
                            className="history-del-btn"
                            title="Baixar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadMyFile(f);
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                          </button>
                          <button
                            className="history-del-btn"
                            title="Excluir"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMyFile(f.id);
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'rgba(120,130,150,0.8)' }}>
                  Uploads de outros usuários são invisíveis e inacessíveis — a verificação de dono é feita no servidor.
                </div>
              </div>
            )}

            {/* Current Metadata Block */}
            {['leitura', 'arquivo'].includes(activeTab) && (
              <div className="panel">
                <div className="panel-title">Arquivo</div>
                {currentFile ? (
                  <div className="file-row">
                    <div className="file-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div>
                    <div>
                      <div className="file-name">{currentFile.name}</div>
                      <div className="file-meta">
                        {trace?.summary.testDate ? new Date(trace.summary.testDate).toLocaleDateString('pt-BR') + ' ' + new Date(trace.summary.testDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        {'  ·  '}{(currentFile.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <div className="file-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="10" fill="none"/><path d="M8 12l3 3 5-6"/></svg>
                    </div>
                  </div>
                ) : (
                  <div className="no-file">Nenhum arquivo carregado</div>
                )}
              </div>
            )}

            {/* Config summary view */}
            {['leitura', 'config'].includes(activeTab) && (
              <div className="panel">
                <div className="panel-title">Configurações da Leitura</div>
                <div>
                  <div className="cfg-row"><span>Comprimento de onda</span><span className="cfg-val">{trace ? trace.summary.wavelengthNm.toFixed(0) + ' nm' : '—'}</span></div>
                  <div className="cfg-row"><span>ORL (retorno óptico)</span><span className="cfg-val">{trace?.footer ? trace.footer.orlDb.toFixed(1) + ' dB' : '—'}</span></div>
                  <div className="cfg-row"><span>Largura de pulso</span><span className="cfg-val">{trace ? trace.summary.pulseWidthNs + ' ns' : '—'}</span></div>
                  <div className="cfg-row"><span>Pontos de amostra</span><span className="cfg-val">{trace ? trace.summary.dataPoints.toLocaleString('pt-BR') : '—'}</span></div>
                  <div className="cfg-row"><span>Índice de refração (IOR)</span><span className="cfg-val">{trace ? trace.summary.ior.toFixed(5) : '—'}</span></div>
                  <div className="cfg-row"><span>Faixa de aquisição</span><span className="cfg-val">{trace ? trace.summary.acquisitionRangeKm.toFixed(3) + ' km' : '—'}</span></div>
                  {trace?.summary.fiberType && <div className="cfg-row"><span>Tipo de fibra</span><span className="cfg-val">{trace.summary.fiberType}</span></div>}
                  {trace?.summary.cableId && <div className="cfg-row"><span>Cabo</span><span className="cfg-val">{trace.summary.cableId}</span></div>}
                  {trace?.summary.fiberId && <div className="cfg-row"><span>Fibra</span><span className="cfg-val">{trace.summary.fiberId}</span></div>}
                </div>
              </div>
            )}

            {/* Threshold limits panel */}
            {activeTab === 'config' && (
              <div className="panel">
                <div className="panel-title">Limiares de Análise</div>
                <div>
                  <div className="thresh-row">
                    <span>Perda média (laranja) ≥</span>
                    <span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={thresholds.medium}
                        onChange={(e) => handleThresholdChange('medium', parseFloat(e.target.value) || 0)}
                      /> dB
                    </span>
                  </div>
                  <div className="thresh-row">
                    <span>Perda alta (vermelho) ≥</span>
                    <span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={thresholds.high}
                        onChange={(e) => handleThresholdChange('high', parseFloat(e.target.value) || 0)}
                      /> dB
                    </span>
                  </div>
                  <div className="thresh-row">
                    <span>Reflectância ruim ≥</span>
                    <span>
                      <input
                        type="number"
                        step="1"
                        value={thresholds.reflect}
                        onChange={(e) => handleThresholdChange('reflect', parseFloat(e.target.value) || -40)}
                      /> dB
                    </span>
                  </div>
                </div>
                <div className="thresh-note mt-2 text-[10px] text-gray-400">
                  Esses limiares definem as cores de destaque na tabela de eventos, no gráfico e no relatório impresso. Ajuste conforme o padrão de aceitação da sua operadora.
                </div>
                <button className="btn btn-ghost" onClick={handleThresholdReset} style={{ marginTop: 12 }}>
                  Restaurar padrão
                </button>
              </div>
            )}

            {/* Chart Themes */}
            {['leitura', 'traco'].includes(activeTab) && (
              <div className="panel">
                <div className="panel-title">Visual do Gráfico</div>
                <div className="trace-themes">
                  <button className={`trace-theme ${traceTheme === 'blue' ? 'active' : ''}`} onClick={() => setTraceTheme('blue')}>
                    <span className="theme-swatch blue-swatch"></span>
                    <span><b>Original</b><small>Traço azul / fundo claro</small></span>
                  </button>
                  <button className={`trace-theme ${traceTheme === 'orange-black' ? 'active' : ''}`} onClick={() => setTraceTheme('orange-black')}>
                    <span className="theme-swatch orange-black-swatch"></span>
                    <span><b>Traço laranja / fundo preto</b><small>Alto contraste</small></span>
                  </button>
                  <button className={`trace-theme ${traceTheme === 'green-black' ? 'active' : ''}`} onClick={() => setTraceTheme('green-black')}>
                    <span className="theme-swatch green-black-swatch"></span>
                    <span><b>Traço verde fluorescente / fundo preto</b><small>Alto contraste</small></span>
                  </button>
                </div>
              </div>
            )}

            {/* Comparar Traço */}
            {['leitura', 'traco', 'arquivo'].includes(activeTab) && (
              <div className="panel">
                <div className="panel-title">Comparar Traço</div>
                <div className="compare-row">
                  <label className="btn btn-ghost m-0 cursor-pointer" htmlFor="refFileUp" style={{ marginTop: 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 18a4.5 4.5 0 01-.4-8.98A5.5 5.5 0 0117 8a4 4 0 011 7.87"/><path d="M12 12v7M9.5 16.5L12 19l2.5-2.5"/></svg>
                    Carregar referência
                  </label>
                  <input type="file" id="refFileUp" className="hidden" accept=".sor" onChange={(e) => handleFileUpload(e, true)} />
                </div>
                {refFile ? (
                  <div className="compare-file" style={{ marginTop: 10 }}>{refFile.name}</div>
                ) : (
                  <div className="no-file" style={{ marginTop: 10 }}>Nenhum traço de referência carregado</div>
                )}
                {refFile && (
                  <div className="compare-legend">
                    <span className="compare-swatch" style={{ background: '#8B95B8' }}></span> Traço de referência
                    <button
                      className={`toggle ${compareOn ? 'on' : ''}`}
                      style={{ marginLeft: 'auto' }}
                      aria-label="Mostrar ou ocultar o traço de referência"
                      onClick={() => setCompareOn(!compareOn)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Cursors layout panel */}
            {['leitura', 'medicoes'].includes(activeTab) && (
              <div className="panel">
                <div className="panel-title">
                  Cursores
                  <button className={`toggle ${cursorsOn ? 'on' : ''}`} onClick={() => setCursorsOn(!cursorsOn)} />
                </div>
                <div style={{ opacity: cursorsOn ? 1 : 0.4 }} className="transition-opacity">
                  <div className="cursor-row">
                    <span className="cursor-tag tag-a">A</span>
                    <b>{aKm.toFixed(3)} km</b>
                    <span className="dim">{aVal.toFixed(3)} dB</span>
                  </div>
                  <div className="cursor-row">
                    <span className="cursor-tag tag-b">B</span>
                    <b>{bKm.toFixed(3)} km</b>
                    <span className="dim">{bVal.toFixed(3)} dB</span>
                  </div>
                  <div className="cursor-diff">
                    <span>A – B · Perda do trecho</span>
                    <b>{diffKm.toFixed(3)} km · {diffDb.toFixed(3)} dB</b>
                  </div>
                </div>
              </div>
            )}

            {/* About */}
            {activeTab === 'sobre' && (
              <div className="panel">
                <div className="about-panel">
                  <h2>Leitor OTDR</h2>
                  <p>Aplicativo local (100% client-side) para leitura e análise de traços OTDR em arquivos .SOR (Bellcore/Telcordia SR-4731 v2.x).</p>
                  <ul className="list-disc pl-4 mt-2 flex flex-col gap-1">
                    <li>Nenhum dado é enviado a servidores sem sua conta — todo o processamento ocorre no seu navegador.</li>
                    <li>Suporta importação, medição por cursores, tabela de eventos, comparação de traços e geração de relatório.</li>
                    <li>Limiares de perda/reflectância são configuráveis na aba Configurações.</li>
                    <li>Histórico, configurações e arquivos são sincronizados com a sua conta no servidor (isolados por usuário) com funcionamento offline via PWA.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Dynamic export buttons */}
            <div className="panel">
              <button 
                className="btn btn-primary" 
                onClick={handlePrintReport} 
                disabled={!trace}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                Gerar Relatório
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={handleDownloadPdf} 
                disabled={!trace}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
                Baixar PDF
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={handleExportCsv} 
                disabled={!trace}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
                Exportar Traço
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleSaveTrace} 
                disabled={!trace}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
                Salvar Traço no Histórico
              </button>
            </div>

          </div>

        </div>

        {/* Real-time status bar layout */}
        <div className="statusbar select-none">
          <span className="ok" style={trace ? undefined : { visibility: 'hidden' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            Arquivo carregado com sucesso
          </span>
          <span>Unidades: km / dB</span>
        </div>
      </main>

      {/* ================= iOS PWA SHARE DIALOG ================= */}
      {showIOSGuide && (
        <div className="otdr-modal-overlay">
          <div className="otdr-modal-card">
            <h3 className="otdr-modal-title">Instalar Leitor OTDR no iPhone / iPad</h3>
            <p className="otdr-modal-text">
              1. Toque no botão de <strong>Compartilhar</strong> na barra do Safari inferior.<br />
              2. Role a lista e selecione <strong>Adicionar à Tela de Início</strong>.<br />
              3. Toque em Adicionar no canto superior para ter acesso offline completo!
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="btn btn-ghost"
            >
              Fechar Guia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
