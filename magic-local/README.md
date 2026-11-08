# Magic Local

Aplicativo desktop de campo para **diagnóstico de rede e atendimento em HGU**,
inspirado nas funções locais do Magic Tool (`br.com.vivo.magictool` 3.10.99),
mas **sem login, sem backend e sem chamadas aos servidores da Vivo**.

Todo o processamento acontece na máquina do técnico: leitura da rede local,
conexão SSH direta no HGU, inventário, terminal e geração de laudo.

> Este é um projeto independente. Não contém o APK original, não usa tokens
> (`token_jwt.json` / `token_jwt_encoded.txt`) e não burla autenticação. A
> conexão com o HGU usa o usuário local `support` e a senha informada pelo
> próprio técnico — o mesmo acesso local já previsto no equipamento.

## O que faz

| Área | Recursos |
|---|---|
| **Painel** | Interface ativa, IPv4/máscara/MAC, gateway, DNS, teste de internet, resumo da última coleta |
| **HGU** | SSH na porta 22 (`support` + senha), inventário guiado por perfil, resumo de WAN/GPON/óptica, dispositivos e saídas completas |
| **Terminal** | Shell interativo na sessão SSH, histórico com ↑/↓, Ctrl+L, comandos rápidos de leitura |
| **Rede local** | Ping com perda/média, teste de portas TCP (22/53/80/443/7547) e varredura /24 com tabela ARP |
| **Laudo** | Consolidação em JSON/TXT, impressão e campos de operador/OS/observações |

### Perfis de HGU

- Askey Broadcom: `RTF3505VW-N1/N2`, `RTF3507VW-N1/N2`
- Askey ECNT: `RTF8117VW`, `RTF8115VW`, `RTF8115VW-SV`
- Askey Wi-Fi 6: `RTF8225VW`, `RTF8225VW-SV`
- Askey Wi-Fi 7: `RTF8316VW`
- Mitra Broadcom: `GPT-2541GNAC-N1/N2`
- Mitra ECNT: `GPT-2741GNAC`, `GPT-2731GN2A4P` e variantes
- Mitra Wi-Fi 6: `GPT-2742GX4X5v6`, `GPT-2742GX4X5v6-SV`

Os comandos de inventário são **somente de leitura** (`show`, `sys atsh`,
`version`, `wan show`, `route show`, `show ont optics`, `show map_info
dhcp_table`, `show wifi_plus all`, `show primary_diagnosis`).

## Segurança e privacidade

- Não existe tela de login, telemetria, analytics ou backend.
- A senha do HGU fica **apenas em memória** durante a sessão; não é gravada em
  disco nem em `localStorage`.
- O app não lê nem reaproveita tokens do APK original.
- Host e usuário podem ser lembrados localmente para agilizar o próximo
  atendimento; a senha nunca.
- Após 3 tentativas de senha erradas o HGU pode bloquear novas conexões por
  alguns minutos. O app avisa sobre isso antes da conexão.
- O terminal aceita comandos de escrita digitados pelo técnico. Use com
  responsabilidade: o app em si só executa leitura no inventário automático.

## Como rodar

Requisitos: Node.js 20+ e Electron 33 (instalado como dependência).

```powershell
cd magic-local
npm install
npm start
```

## Testes

```powershell
npm test          # 13 testes: perfis, parsing, laudo, rede e SSH com servidor simulado
npm run smoke     # abre o Electron, percorre as 5 abas e salva screenshots
```

O teste de integração sobe um **servidor SSH simulado** com `ssh2`, valida
conexão, execução de comandos, inventário e limpeza de eco/prompt — não precisa
de HGU físico.

Artefatos do smoke test: `test/artifacts/` (ignorado pelo git).

## Gerar o executável portátil

```powershell
npm run dist
```

Saída: `release/Magic Local 1.0.0.exe` (portátil, sem instalador).

## Estrutura

```
main.js              # processo principal, IPC de rede/SSH/laudo e smoke test
preload.js           # ponte segura window.magic (contextIsolation + sandbox)
lib/network.js       # interface/gateway, ping, portas, ARP e varredura /24
lib/hgu.js           # HguSession (ssh2), perfis e comandos de leitura
lib/parser.js        # resumo, óptica, dispositivos, checks e laudo TXT
renderer/            # UI Metro em pt-BR, tema claro/escuro, terminal e laudo
test/hgu.test.js     # testes unitários + servidor SSH simulado
test/smoke.js        # smoke test do Electron (dev e .exe empacotado)
scripts/make-icon.js # gera assets/icon.ico sem dependências externas
assets/              # ícone Metro
```

## Limitações conhecidas

- Não foi testado contra um HGU físico neste ambiente; o fluxo foi validado com
  servidor SSH simulado e saídas representativas.
- A saída varia por modelo/firmware. O parser cobre os formatos mapeados no APK,
  mas comandos desconhecidos continuam visíveis no terminal e no laudo.
- Funções do Magic Tool que dependem de login/Keycloak/API da Vivo (ordens,
  ETA, cadastro, backend) **não fazem parte** deste app por decisão de escopo.
- O laudo é local: não há sincronização em nuvem.
