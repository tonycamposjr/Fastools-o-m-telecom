# Central de Campo — Rede & OTDR (v4.0)

Projeto único que integra as **duas ferramentas** em um só app:

1. **Sistema Unificado de Ferramentas de Rede** (base v3.1 — 10 utilitários)
2. **Leitor OTDR — Análise SOR** (módulo completo de leitura/analise de traços `.SOR`)

Visual **neumórfico + glassmorphism** ("vidrofosco") permanente: superfícies translúcidas com blur,
sombras suaves de dupla luz, modo claro/escuro, e layout **responsivo para celular** com
barra de navegação inferior. O acabamento em vidro agora é fixo (sem alternância); o botão
**tema claro/escuro** continua disponível na barra de controles.

---

## Contas de usuário, login e segurança (novo — backend próprio)

O app agora exige **conta própria (usuário + senha)** para acessar as ferramentas, com
backend dedicado em `backend/` (Node.js + Express + SQLite embutido do Node) que substitui o Firebase no módulo OTDR:

- **Autenticação**: cadastro/login/logout; senhas como **hash bcrypt (custo 12)**, nunca em texto;
  **cookie de sessão `HttpOnly` + `SameSite=Lax` (+ `Secure` em produção)**;
  **bloqueio de força bruta** (5 falhas em 15 min → 429) e rate-limit por IP em login/cadastro;
  senha mínima de 8 caracteres; proteção **CSRF** (double-submit cookie) em toda escrita.
- **Isolamento por usuário**: todas as tabelas têm `user_id` e a checagem de dono é feita
  **no servidor em toda rota**; IDs alheios retornam 404 (sem vazar existência).
  O id de dono vindo do cliente é ignorado.
- **Uploads**: corpo binário bruto, máx. 30 MB, extensão em whitelist, nome armazenado
  aleatório em `uploads/{user_id}/`, download obrigatoriamente `attachment` + `nosniff`;
  listar/baixar/excluir só do próprio usuário.
- **Admin**: semeado no primeiro boot via variáveis `ADMIN_LOGIN`/`ADMIN_PASSWORD`
  (nunca no código). Painel para criar/editar/desativar/excluir usuários, ver/excluir
  **dados e arquivos de qualquer usuário** e consultar **logs de atividade** (sem senhas).
- **HTTPS**: em produção use proxy reverso (nginx/Caddy) ou defina `TLS_KEY`/`TLS_CERT`.

### Rodar localmente (dev)

```bash
# terminal 1 — backend (API :3001)
cd backend
cp .env.example .env        # preencha ADMIN_LOGIN/ADMIN_PASSWORD
npm install
npm run dev

# terminal 2 — front (Vite :3000, já faz proxy /api → :3001)
npm install
npm run dev                 # http://localhost:3000
```

### Rodar em produção

```bash
npm run build               # gera dist/ (o backend serve o front automaticamente)
cd backend
npm install
NODE_ENV=production ADMIN_LOGIN=... ADMIN_PASSWORD=... npm start   # porta 3001
# atrás do nginx/caddy com HTTPS, ou defina TLS_KEY/TLS_CERT para HTTPS nativo
```

### Testes (isolamento comprovado)

```bash
cd backend && npm test      # 20 testes: dois usuários não acessam dados/arquivos um do outro,
                            # CSRF, força bruta, validações e papel admin — todos verificados no servidor
```

### Variáveis de ambiente (`backend/.env`, apenas `.env.example` vai ao git)

| Variável | Função |
|---|---|
| `ADMIN_LOGIN` / `ADMIN_PASSWORD` | credenciais do admin semeado no primeiro boot |
| `PORT` / `HOST` / `NODE_ENV` | porta/host; `production` ativa cookies Secure + HSTS |
| `SESSION_TTL_HOURS` | validade da sessão (padrão 168 = 7 dias) |
| `DB_PATH` / `UPLOAD_DIR` | caminhos do banco SQLite e dos uploads |
| `TLS_KEY` / `TLS_CERT` | HTTPS nativo (opcional; senão use proxy reverso) |
| `SERVE_DIST` | pasta do build do front servido pelo backend (padrão `../dist`) |

---

## Ferramentas incluídas (12)

| Ferramenta | O que faz |
|---|---|
| **Leitor OTDR (.SOR)** | Lê arquivos `.SOR` e sincroniza histórico/configurações/arquivos com a conta no servidor |
| **Carimbo de Fibras** | Gerador padronizado de carimbos/vistorias de fibra óptica (exporta PDF) |
| **Calculadora Óptica** | Orçamento de potência, atenuações, margens e viabilidade de enlaces |
| **Tabela de Atenuação** | Referência de atenuações teóricas por km e perdas típicas |
| **Conversor NSAP** | Conversão bidirecional NSAP ↔ IP estruturado |
| **Script Datacom** | Templates CLI para VLANs, rate-limits e portas em switches Datacom |
| **Registros de Campo** | Chamados, ordens de serviço, vistorias e histórico (nuvem + local) |
| **Controle de TA** | Termos de atendimento, enlaces, ativações e sobressalentes |
| **Rotas HL4** | Mapas/rotas HL4 em PNG (upload + visualização) |
| **Consulta de Equipamentos** | Catálogo IndexedDB (~21.600 itens) com busca e filtros |
| **Mapa KML** | Carrega `.KML`, mostra pontos no mapa (Leaflet) e abre rota no Google Maps |
| **Mapa de Topologia** | Gerador automático de diagramas de topologia de rede (SVG/PNG/PDF) com rotas, equipamentos e caixas de informação |

## Como rodar

```bash
npm install
npm run dev        # http://localhost:3000   (use --host para acessar pelo celular na mesma rede)
npm run build      # gera dist/ (PWA)
npm run preview    # serve o build em http://localhost:4173
npm run lint       # verificação TypeScript (tsc --noEmit)
```

## Página online (GitHub Pages)

A cada push na `main`, o workflow `.github/workflows/pages.yml` publica o front-end em:

**https://tonycamposjr.github.io/Fastools-o-m-telecom/**

No Pages **não existe backend** — o app abre em **Modo Local**: as 12 ferramentas
funcionam com dados gravados no próprio dispositivo e o Leitor OTDR mantém
histórico/limiares em `localStorage`. O chip laranja "Modo Local (sem servidor)"
fica no topo com o botão **Entrar**, que reconecta quando um backend está no ar
(na rede local com proxy, ou hospedado em um servidor próprio).

## Modo Local (backend indisponível)

- A tela de login só aparece quando o servidor responde; sem servidor, o app entra direto.
- Chip "Modo Local (sem servidor)" + botão **Entrar** (a tela de login ganha o link
  "← Continuar sem conta (Modo Local)").
- OTDR: histórico salvo em `localStorage` (`otdrLocalHistory`), limiares e tema em
  `otdrThresholds` / `otdrTraceTheme`.
- "Meus Arquivos" (nuvem por conta) fica indisponível até reconectar.

## PWA (instalar no celular)

O app é um PWA completo (ícones, manifest e service worker com cache offline):

- **Android / Chrome**: menu → "Instalar aplicativo" / "Adicionar à tela inicial"
- **iPhone / Safari**: Compartilhar → "Adicionar à Tela de Início" (o módulo OTDR
  inclui um guia interno de instalação)

Após a primeira visita, o app abre **offline** (recursos locais continuam funcionando;
sincronização volta sozinha quando houver rede).

## Dados e nuvem

- **Local (funciona 100% offline)**: `localStorage` + **IndexedDB/Dexie** (equipamentos, KML, etc.).
- **Backend próprio (contas por usuário/senha)**: histórico de traços OTDR, configurações
  (limiares/tema) e uploads de arquivos são sincronizados com a **conta do usuário logado**,
  isolados no servidor por `user_id` (login Google do OTDR foi substituído).
- **Firebase** (mantido): banco **"rede"** → Registros de Campo, Controle de TA, Rotas HL4.
- O aviso de status no rodapé (LED verde/cinza) indica Online/Offline.

## Estrutura do projeto

```
backend/             # BACKEND de contas/isolamento/admin (Node+Express+SQLite)
  src/               #   db, auth (bcrypt+lockout), csrf, guards, otdr, files, admin
  tests/             #   isolation.test.mjs (20 testes, incl. isolamento entre usuários)
  .env.example       #   modelo de variáveis (copie para .env)
src/
  App.tsx            # Shell: painel, abas, tema, navegação + gate de autenticação
  index.css          # Base de layout herdada do sistema de rede (estrutura, grids, mídia queries)
  skeuo.css          # TEMA SKEUOMÓRFICO: tokens de materiais, relevos, LEDs, claro/escuro, módulo OTDR
  components/        # 12 ferramentas de rede + AuthScreen (login/cadastro) + AdminTab (painel admin)
  otdr/
    sor.ts           # Parser binário .SOR + tipos + helpers (fidelidade bit a bit com o original)
    OtdrModule.tsx   # Módulo OTDR completo (UI, canvas do traço, eventos, nuvem própria, PDF)
  lib/               # api.ts (cliente do backend), firebase.ts (banco "rede"), kmlDb, equipamentosDb…
  utils/             # opticalBudget (cálculo óptico)
  hooks/             # usePWAInstall, useOnlineStatus
```

## Notas técnicas

- **Stack**: React 19 + Vite 6 + TypeScript + Tailwind v4 + `vite-plugin-pwa` + Dexie + Leaflet + Firebase.
- As **bibliotecas externas** (Font Awesome, Leaflet CSS, jsPDF, html2canvas) vêm por CDN
  e são **cacheadas pelo service worker** para uso offline.
- O acabamento **glass** é permanente (neumorfismo + glassmorphism); o botão de **tema claro/escuro** fica na barra de controles.
- O Painel usa o estilo **Metro/Tela Iniciar** (tiles chapados, cantos retos, 12 ferramentas em fileiras pareadas).
- O card **SIGITM** (grupo "sistemas") abre o sistema da Vivo em janela dedicada no site; no **Fastools Desktop** ele roda embutido em view nativa (ver `desktop/README.md`).
- Os dois apps originais **não foram alterados** — continuam intactos em `TESTES APP/`.
- A configuração do Firebase é a mesma dos apps originais (chaves públicas de web).

---

**Central de Campo — Rede & OTDR v4.0 by Tony Campos**
