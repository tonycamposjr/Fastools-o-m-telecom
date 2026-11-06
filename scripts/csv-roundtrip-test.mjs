/**
 * Teste de ida e volta do CSV da ferramenta Topologia (fora do navegador).
 * Garante: exportar → importar → dados idênticos → mapa idêntico.
 *
 * 1) Compilar:  node_modules/.bin/esbuild scripts/csv-roundtrip-test.mjs --bundle --format=esm --platform=node --outfile=scripts/.csv-test.mjs
 * 2) Executar:  node scripts/.csv-test.mjs
 */
import { buildCsv, parseCsv, exemploBORACEIA } from '../src/components/TopologiaTab.tsx';

const exemplo = exemploBORACEIA();
const csv1 = buildCsv(exemplo);

const res = parseCsv(csv1);
if (!res.ok || !res.projeto) {
  console.error('ERRO no parseCsv:', res.error);
  process.exit(1);
}
const back = res.projeto;

let falhas = 0;
const eq = (a, b, msg) => {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) { console.error('FALHOU:', msg, `\n  esperado: ${sa}\n  obtido:   ${sb}`); falhas++; }
};

eq(exemplo.titulo, back.titulo, 'titulo do projeto');
eq(exemplo.routers.map((r) => r.nome), back.routers.map((r) => r.nome), 'roteadores (ordem e nomes)');
eq(exemplo.rotas.length, back.rotas.length, 'quantidade de rotas');
for (let i = 0; i < exemplo.rotas.length; i++) {
  const a = exemplo.rotas[i];
  const b = back.rotas[i];
  eq(a.nome, b.nome, `rota ${i + 1}: nome`);
  eq(a.origem, b.origem, `rota ${i + 1}: origem`);
  eq(a.destino, b.destino, `rota ${i + 1}: destino`);
  eq(a.setaUltimoLink, b.setaUltimoLink, `rota ${i + 1}: seta`);
  eq(a.caixa.enabled, b.caixa.enabled, `rota ${i + 1}: caixa enabled`);
  eq(a.caixa.titulo, b.caixa.titulo, `rota ${i + 1}: caixa titulo`);
  eq(a.caixa.desc, b.caixa.desc, `rota ${i + 1}: caixa descricao (com quebra de linha)`);
  eq(a.caixa.detalhes, b.caixa.detalhes, `rota ${i + 1}: caixa detalhes (com quebra de linha)`);
  eq(a.equipamentos.length, b.equipamentos.length, `rota ${i + 1}: nº equipamentos`);
  eq(a.equipamentos.map((e) => [e.site, e.fabricante, e.obs]), b.equipamentos.map((e) => [e.site, e.fabricante, e.obs]), `rota ${i + 1}: equipamentos`);
}

// idempotência: reexportar o projeto importado gera o MESMO byte a byte do CSV
const csv2 = buildCsv(back);
eq(csv1, csv2, 're-export do CSV importado é idêntico');

if (falhas) { console.error(`\n${falhas} verificação(ões) falharam.`); process.exit(1); }
console.log('ROUND-TRIP OK: CSV exporta/importa e redesenha exatamente o projeto original.');
