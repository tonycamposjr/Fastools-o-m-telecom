# Fastools Desktop (Electron)

Aplicativo Windows que roda o **Fastools** e o **SIGITM** na mesma janela — o
SIGITM é exibido em uma **view nativa** (WebContentsView), não em iframe, então
o bloqueio `X-Frame-Options: SAMEORIGIN` não se aplica.

## Como rodar

Requisitos: Node.js 20+ e conexão com a internet (para baixar o Electron na
primeira vez).

```powershell
cd desktop
npm install
npm start
```

O `npm start` já compila o Fastools (`npm run build:desktop` na raiz) e abre a
janela. Primeira execução do `npm install` baixa o runtime do Electron (~100 MB).

## Como usar

1. No Painel, clique no card **SIGITM** (grupo "sistemas").
2. O SIGITM carrega **dentro da janela**, na área do conteúdo, com o cabeçalho e
   o rodapé do Fastools visíveis.
3. O botão **"Voltar ao Painel"** (barra de controles) fecha a view e volta.
4. Login/SSO do SIGITM fica salvo entre execuções (`partition: persist:sigitm`).

## Atalhos

| Tecla | Ação |
|---|---|
| `F12` | DevTools |
| `Ctrl+R` | Recarregar o Fastools |

## Desenvolvimento (hot reload)

Com o Vite rodando na raiz (`npm run dev`):

```powershell
$env:FASTOOLS_URL = "http://localhost:3000"
cd desktop
npm run start:only
```

## Gerar um executável portátil (.exe)

```powershell
cd desktop
npm run dist
```

O `.exe` sai em `desktop/release/` (electron-builder é baixado na hora pelo npx).
O build do Fastools é embutido em `resources/dist` automaticamente.

## Por que não iframe no site?

O servidor do SIGITM responde com `X-Frame-Options: SAMEORIGIN` + desafio
Cloudflare. O navegador bloqueia iframes de outros domínios por segurança — não
há contorno em JavaScript/CSS. No Electron, a página roda como navegação de
nível superior dentro de uma view nativa; a restrição de enquadramento não
existe nesse contexto.
