import React, { useState, useEffect, useRef } from 'react';

interface NsapTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface EquipamentoNsap {
  hostname: string;
  regiaoSigla: string;
  siteSigla: string;
  tipo: string;
  sequencia: string;
  modelo: string;
  versao: string;
  idHex: string;
}

const NSAP_EQ_DB_KEY = 'nsap_equipamentos_v1';
const NSAP_EQ_FILE_KEY = 'nsap_equipamentos_file_v1';
const NSAP_EQ_MAX_RENDER = 100;

/**
 * Faz o parse do CSV de equipamentos (colunas: hostname, regiao_sigla,
 * site_sigla, tipo, sequencia, modelo, versao, id_hex).
 * Detecta separador (vírgula ou ponto-e-vírgula) e aceita campos entre aspas.
 */
function parseEquipamentosCsv(text: string): EquipamentoNsap[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const detectDelim = (line: string): string => {
    const semis = (line.match(/;/g) || []).length;
    const commas = (line.match(/,/g) || []).length;
    return semis > commas ? ';' : ',';
  };

  const splitLine = (line: string, delim: string): string[] =>
    line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''));

  const delim = detectDelim(lines[0]);
  const headers = splitLine(lines[0], delim).map((h) => h.toLowerCase().trim());
  const idx = (name: string) => headers.indexOf(name);

  const iHost = idx('hostname');
  const iRegiao = idx('regiao_sigla');
  const iSite = idx('site_sigla');
  const iTipo = idx('tipo');
  const iSeq = idx('sequencia');
  const iModelo = idx('modelo');
  const iVersao = idx('versao');
  const iId = idx('id_hex');

  if (iHost === -1 || iId === -1) return [];

  const out: EquipamentoNsap[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delim);
    const hostname = (cols[iHost] || '').toUpperCase().trim();
    const idHex = (cols[iId] || '').toUpperCase().replace(/[^0-9A-F]/g, '');
    if (!hostname || !idHex) continue;
    out.push({
      hostname,
      regiaoSigla: iRegiao >= 0 ? (cols[iRegiao] || '').toUpperCase() : '',
      siteSigla: iSite >= 0 ? (cols[iSite] || '').toUpperCase() : '',
      tipo: iTipo >= 0 ? (cols[iTipo] || '').toUpperCase() : '',
      sequencia: iSeq >= 0 ? (cols[iSeq] || '') : '',
      modelo: iModelo >= 0 ? (cols[iModelo] || '').toLowerCase() : '',
      versao: iVersao >= 0 ? (cols[iVersao] || '') : '',
      idHex,
    });
  }
  return out;
}

export default function NsapTab({ showToast }: NsapTabProps) {
  const [nsapInput, setNsapInput] = useState('39076F800000000000000300E10007720F61541D');
  const [nsapError, setNsapError] = useState('');
  const [len, setLen] = useState(0);

  const [afi, setAfi] = useState('–');
  const [idi, setIdi] = useState('–');
  const [ver, setVer] = useState('–');
  const [auth, setAuth] = useState('–');
  const [res, setRes] = useState('–');
  const [dom, setDom] = useState('–');
  const [area, setArea] = useState('–');
  const [sys, setSys] = useState('–');
  const [sel, setSel] = useState('–');

  // ===== Base de equipamentos (upload CSV + busca por hostname) =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [equipamentos, setEquipamentos] = useState<EquipamentoNsap[]>(() => {
    try {
      const raw = localStorage.getItem(NSAP_EQ_DB_KEY);
      if (raw) return JSON.parse(raw) as EquipamentoNsap[];
    } catch { /* ignore */ }
    return [];
  });
  const [csvFileName, setCsvFileName] = useState<string>(() => localStorage.getItem(NSAP_EQ_FILE_KEY) || '');
  const [hostSearch, setHostSearch] = useState('');
  const [selectedEq, setSelectedEq] = useState<EquipamentoNsap | null>(null);
  const [csvError, setCsvError] = useState('');

  useEffect(() => {
    try {
      if (equipamentos.length) {
        localStorage.setItem(NSAP_EQ_DB_KEY, JSON.stringify(equipamentos));
      } else {
        localStorage.removeItem(NSAP_EQ_DB_KEY);
      }
      if (csvFileName) {
        localStorage.setItem(NSAP_EQ_FILE_KEY, csvFileName);
      } else {
        localStorage.removeItem(NSAP_EQ_FILE_KEY);
      }
    } catch { /* storage cheio ou indisponível */ }
  }, [equipamentos, csvFileName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      setCsvError('Selecione um arquivo .csv.');
      showToast('Selecione um arquivo .csv.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const list = parseEquipamentosCsv(String(reader.result || ''));
        if (!list.length) {
          setCsvError('CSV sem dados válidos. Verifique as colunas "hostname" e "id_hex".');
          showToast('CSV inválido ou vazio.', 'error');
          return;
        }
        setEquipamentos(list);
        setCsvFileName(file.name);
        setSelectedEq(null);
        setHostSearch('');
        setCsvError('');
        showToast(`${list.length} equipamentos importados de ${file.name}!`, 'success');
      } catch {
        setCsvError('Falha ao processar o arquivo.');
        showToast('Falha ao processar o arquivo.', 'error');
      }
    };
    reader.onerror = () => {
      setCsvError('Falha ao ler o arquivo.');
      showToast('Falha ao ler o arquivo.', 'error');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleClearCsv = () => {
    setEquipamentos([]);
    setCsvFileName('');
    setSelectedEq(null);
    setHostSearch('');
    setCsvError('');
    showToast('Base de equipamentos removida.', 'info');
  };

  const handleSelectEq = (eq: EquipamentoNsap) => {
    setSelectedEq(eq);
    setNsapInput(eq.idHex); // o useEffect existente dispara o parse automaticamente
    showToast(`Equipamento ${eq.hostname} carregado.`, 'success');
  };

  const query = hostSearch.trim().toUpperCase();
  const resultados = query
    ? equipamentos.filter((eq) => eq.hostname.includes(query))
    : equipamentos;
  const resultadosVisiveis = resultados.slice(0, NSAP_EQ_MAX_RENDER);

  const normalize = (s: string) => {
    return (s || '').toUpperCase().replace(/[^0-9A-F]/g, '');
  };

  const isHex = (s: string) => {
    return /^[0-9A-F]*$/.test(s);
  };

  const clearOutputs = () => {
    setAfi('–');
    setIdi('–');
    setVer('–');
    setAuth('–');
    setRes('–');
    setDom('–');
    setArea('–');
    setSys('–');
    setSel('–');
    setNsapError('');
  };

  const parseNsap = (val: string) => {
    clearOutputs();
    const s = normalize(val);
    setLen(s.length);

    if (!s) {
      setNsapError('Cole a string NSAP (40 caracteres hexadecimais).');
      return;
    }

    if (!isHex(s)) {
      setNsapError('Somente caracteres hexadecimais (0-9, A-F).');
      return;
    }

    if (s.length !== 40) {
      setNsapError(`A string precisa ter 40 hex. Você forneceu ${s.length}.`);
      return;
    }

    setAfi(s.slice(0, 2));
    setIdi(s.slice(2, 6));
    setVer(s.slice(6, 8));
    setAuth(s.slice(8, 14));
    setRes(s.slice(14, 18));
    setDom(s.slice(18, 22));
    setArea(s.slice(22, 26));
    setSys(s.slice(26, 38));
    setSel(s.slice(38, 40));

    showToast('NSAP analisado com sucesso!', 'success');
  };

  useEffect(() => {
    const norm = normalize(nsapInput);
    setLen(norm.length);
    if (norm.length === 40) {
      parseNsap(nsapInput);
    } else {
      clearOutputs();
      if (norm.length > 0) {
        setNsapError(`A string precisa ter 40 hex. Você forneceu ${norm.length}.`);
      }
    }
  }, [nsapInput]);

  const handleManualParse = () => {
    parseNsap(nsapInput);
  };

  const handleClear = () => {
    setNsapInput('');
    setLen(0);
    clearOutputs();
  };

  const handleCopyField = (fieldName: string, value: string) => {
    if (value === '–') return;
    navigator.clipboard.writeText(value)
      .then(() => showToast(`${fieldName.toUpperCase()} copiado!`, 'success'))
      .catch(() => showToast('Erro ao copiar.', 'error'));
  };

  const handleCopyAll = () => {
    if (afi === '–') {
      showToast('Nenhum dado decodificado para copiar.', 'error');
      return;
    }

    const fullText = `AFI: ${afi}
IDI: ${idi}
VER: ${ver}
AUTH: ${auth}
RES: ${res}
DOM: ${dom}
Area Address: ${area}
System ID: ${sys}
NSAP Selector: ${sel}`;

    navigator.clipboard.writeText(fullText)
      .then(() => showToast('Todos os campos copiados!', 'success'))
      .catch(() => showToast('Erro ao copiar.', 'error'));
  };

  return (
    <div className="tab-content active" style={{ display: 'block' }}>
      <div className="nsap-container">
        <div className="nsap-header">
          <i className="fas fa-code-branch"></i>
          <h2>Separador de NSAP (formato Q3 da tela "NE Settings")</h2>
        </div>

        <div className="nsap-main">
          <section className="nsap-panel">
            <label className="nsap-label" htmlFor="nsapInput">
              <i className="fas fa-paste"></i> Cole aqui a string NSAP (40 hex):
            </label>
            <input
              className="nsap-input"
              id="nsapInput"
              type="text"
              value={nsapInput}
              onChange={(e) => setNsapInput(e.target.value)}
              placeholder="Ex.: 39076F800000000000000300E10007720F61541D"
              autoComplete="off"
            />
            <div className="nsap-actions">
              <button className="nsap-btn primary" onClick={handleManualParse}>
                <i className="fas fa-cut"></i> Separar
              </button>
              <button className="nsap-btn" onClick={handleClear}>
                <i className="fas fa-eraser"></i> Limpar
              </button>
              <button className="nsap-btn" onClick={handleCopyAll}>
                <i className="fas fa-copy"></i> Copiar Tudo
              </button>
              <span className="nsap-pill">
                <i className="fas fa-ruler"></i> Comprimento: <span id="len">{len}</span>/40
              </span>
            </div>
            
            {nsapError && (
              <div className="nsap-error" style={{ display: 'flex' }}>
                <i className="fas fa-exclamation-circle"></i> {nsapError}
              </div>
            )}

            <p className="nsap-muted">
              <i className="fas fa-info-circle"></i> Estrutura: <br />
              <span className="nsap-mono">AFI(2) | IDI(4) | VER(2) | AUTH(6) | RES(4) | DOM(4) | Area(4) | SystemID(12) | NSAP Selector(2)</span>
            </p>
          </section>

          <section className="nsap-panel" aria-live="polite">
            <div className="nsap-row">
              <div className="nsap-key">AFI</div>
              <div className="nsap-value">
                {afi}
                {afi !== '–' && <button className="copy-btn" onClick={() => handleCopyField('afi', afi)} style={{ display: 'inline-block' }}>Copiar</button>}
              </div>
            </div>
            <div className="nsap-row">
              <div className="nsap-key">IDI</div>
              <div className="nsap-value">
                {idi}
                {idi !== '–' && <button className="copy-btn" onClick={() => handleCopyField('idi', idi)} style={{ display: 'inline-block' }}>Copiar</button>}
              </div>
            </div>
            <div className="nsap-row">
              <div className="nsap-key">VER</div>
              <div className="nsap-value">
                {ver}
                {ver !== '–' && <button className="copy-btn" onClick={() => handleCopyField('ver', ver)} style={{ display: 'inline-block' }}>Copiar</button>}
              </div>
            </div>
            <div className="nsap-row">
              <div className="nsap-key">AUTH</div>
              <div className="nsap-value">
                {auth}
                {auth !== '–' && <button className="copy-btn" onClick={() => handleCopyField('auth', auth)} style={{ display: 'inline-block' }}>Copiar</button>}
              </div>
            </div>
            <div className="nsap-row">
              <div className="nsap-key">RES</div>
              <div className="nsap-value">
                {res}
                {res !== '–' && <button className="copy-btn" onClick={() => handleCopyField('res', res)} style={{ display: 'inline-block' }}>Copiar</button>}
              </div>
            </div>
            <div className="nsap-row">
              <div className="nsap-key">DOM</div>
              <div className="nsap-value">
                {dom}
                {dom !== '–' && <button className="copy-btn" onClick={() => handleCopyField('dom', dom)} style={{ display: 'inline-block' }}>Copiar</button>}
              </div>
            </div>
            <div className="nsap-row">
              <div className="nsap-key">Area Address</div>
              <div className="nsap-value">
                {area}
                {area !== '–' && <button className="copy-btn" onClick={() => handleCopyField('area address', area)} style={{ display: 'inline-block' }}>Copiar</button>}
              </div>
            </div>
            <div className="nsap-row">
              <div className="nsap-key">System ID</div>
              <div className="nsap-value">
                {sys}
                {sys !== '–' && <button className="copy-btn" onClick={() => handleCopyField('system id', sys)} style={{ display: 'inline-block' }}>Copiar</button>}
              </div>
            </div>
            <div className="nsap-row">
              <div className="nsap-key">NSAP Selector</div>
              <div className="nsap-value">
                {sel}
                {sel !== '–' && <button className="copy-btn" onClick={() => handleCopyField('nsap selector', sel)} style={{ display: 'inline-block' }}>Copiar</button>}
              </div>
            </div>
          </section>

          {/* ===== Base de equipamentos: upload CSV + busca por hostname ===== */}
          <section className="nsap-panel nsap-eq-panel">
          <div className="nsap-eq-head">
            <label className="nsap-label" style={{ marginBottom: 0 }}>
              <i className="fas fa-network-wired"></i> Equipamentos
            </label>
            <div className="nsap-eq-toolbar">
              <button className="nsap-btn primary" onClick={() => fileInputRef.current?.click()}>
                <i className="fas fa-file-upload"></i> Upload CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {equipamentos.length > 0 && (
                <>
                  <span className="nsap-pill">
                    <i className="fas fa-database"></i> {equipamentos.length} equipamentos
                  </span>
                  <span className="nsap-eq-file" title={csvFileName}>
                    <i className="fas fa-file-csv"></i> {csvFileName}
                  </span>
                  <button className="nsap-btn" onClick={handleClearCsv} title="Remover base carregada">
                    <i className="fas fa-trash-alt"></i> Remover base
                  </button>
                </>
              )}
            </div>
          </div>

          {csvError && (
            <div className="nsap-error" style={{ display: 'flex' }}>
              <i className="fas fa-exclamation-circle"></i> {csvError}
            </div>
          )}

          {equipamentos.length > 0 && (
            <>
              <div className="nsap-eq-searchbox">
                <i className="fas fa-search"></i>
                <input
                  className="nsap-eq-search"
                  type="text"
                  value={hostSearch}
                  onChange={(e) => setHostSearch(e.target.value)}
                  placeholder="Buscar equipamento por hostname (ex.: CGT_AA_AD16_013)"
                  autoComplete="off"
                />
                {hostSearch && (
                  <button className="nsap-eq-clear" onClick={() => setHostSearch('')} title="Limpar busca">
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              {selectedEq && (
                <div className="nsap-eq-selected">
                  <i className="fas fa-check-circle"></i>
                  <span className="nsap-eq-host">{selectedEq.hostname}</span>
                  <span className="nsap-eq-meta">
                    {selectedEq.regiaoSigla} / {selectedEq.siteSigla} &bull; {selectedEq.tipo} &bull; {selectedEq.modelo} v{selectedEq.versao}
                  </span>
                  <span className="nsap-eq-id">{selectedEq.idHex}</span>
                </div>
              )}

              {resultados.length === 0 ? (
                <div className="nsap-eq-empty">
                  <i className="fas fa-search-minus"></i> Nenhum equipamento encontrado para "{hostSearch}".
                </div>
              ) : (
                <div className="nsap-eq-list">
                  {resultadosVisiveis.map((eq) => (
                    <div
                      key={eq.hostname}
                      className={`nsap-eq-item${selectedEq?.hostname === eq.hostname ? ' selected' : ''}`}
                      onClick={() => handleSelectEq(eq)}
                    >
                      <div className="nsap-eq-info">
                        <span className="nsap-eq-host">{eq.hostname}</span>
                        <span className="nsap-eq-meta">
                          {eq.regiaoSigla} / {eq.siteSigla} &bull; {eq.tipo} &bull; {eq.modelo} v{eq.versao}
                        </span>
                      </div>
                      <span className="nsap-eq-id">{eq.idHex}</span>
                    </div>
                  ))}
                  {resultados.length > NSAP_EQ_MAX_RENDER && (
                    <div className="nsap-eq-empty">
                      Mostrando {NSAP_EQ_MAX_RENDER} de {resultados.length} resultados — refine a busca.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {equipamentos.length === 0 && !csvError && (
            <p className="nsap-muted">
              <i className="fas fa-info-circle"></i> Faça o upload de um arquivo .csv com as colunas{' '}
              <span className="nsap-mono">hostname, regiao_sigla, site_sigla, tipo, sequencia, modelo, versao, id_hex</span>{' '}
              para buscar equipamentos por hostname e preencher o NSAP automaticamente.
            </p>
          )}
          </section>
        </div>

        <div className="nsap-footer">
          <i className="fas fa-lightbulb"></i> Dica: a string pode ser colada com espaços ou hífens; o sistema normaliza automaticamente.
        </div>
      </div>
    </div>
  );
}
