# HYPEX WAVE v3 — Design System "OBSIDIAN AURORA" (contrato canônico)

> Direção escolhida pelo usuário: 1 · Obsidian Aurora.
> Este arquivo é a FONTE ÚNICA DE VERDADE. Qualquer divergência entre código e este contrato = defeito.

## 1. Conceito
A marca chama **Wave** — o fundo ondula. Ondas de aurora vivas (canvas) respirando sob painéis de vidro obsidiana. Dados como herói, números tabulares precisos, motion com propósito (nada de fade genérico).

## 2. Tokens CSS obrigatórios (:root)
```css
--bg:#04060B;            /* obsidiana base */
--bg2:#070B12;           /* superfície elevada */
--bgc:rgba(10,15,24,.72);/* painel vidro */
--surface-hi:rgba(255,255,255,.035);
--glass:rgba(13,18,30,.55);
--c:#00E5FF;             /* acento primário elétrico */
--mint:#7DF9C6;          /* acento financeiro/positivo */
--cn:#8FF7FF;            /* ciano claro (gradientes) */
--cdim:rgba(0,229,255,.32);
--tx:#EEF3F8; --tx2:rgba(233,240,248,.62); --tx3:rgba(233,240,248,.36);
--bd:rgba(160,200,255,.08); --bdh:rgba(160,200,255,.17); --bdg:rgba(0,229,255,.45);
--ok:#3DDC97; --warn:#FFC24B; --err:#FF5D73;
--r-lg:20px; --r-md:14px; --r-sm:10px;
--f-display:'Clash Display',sans-serif;
--f-body:'Satoshi',sans-serif;
--f-brand:'Orbitron',sans-serif;
--f-mono:'Space Mono',monospace;
--ease:cubic-bezier(.19,1,.22,1);
--sh-card:0 1px 0 rgba(255,255,255,.05) inset, 0 24px 60px -30px rgba(0,0,0,.8);
--sh-pop:0 40px 90px -28px rgba(0,0,0,.9);
```
- Gradações numéricas SEMPRE `--f-mono` com `font-variant-numeric:tabular-nums`.
- Gradiente de marca permitido: `linear-gradient(135deg,var(--c),var(--mint))` — único.

## 3. Motion Signature (exatamente 2 momentos-assinatura)
1. **Aurora Canvas** (`fx.js`): 3 ribbons senoidais sobrepostos (ciano/menta/azul-profundo #1B4FD8), blend `lighter`, opacidade máx .16 no app / .35 no login, respiração lenta (~14s ciclo). Pausa com `document.hidden`, mata com `body.no-anim`, `prefers-reduced-motion` ou `S.ui.anim=false`.
2. **Count-Up nos números**: `.kpi-v`, `.tnum`, `.rvtotal`, KPIs renderizados → animam de 0 ao valor em ~900ms easing outExpo, via MutationObserver (funciona após cada `renderPage`).

Micro-interações permitidas: tilt 3D sutil (≤6°) em cards `.gc/.kpi` apenas pointer:fine · botões magnéticos (.bp,.lbtn) deslocamento ≤4px · reveals `.stagger` já existentes · focus glow nos inputs. PROIBIDO: parallax generalizado, animação em tudo, scroll-jack.

## 4. Integração fx.js ↔ app.js (CONTRATO RÍGIDO)
- `app.js` é INTOCÁVEL (motor validado por 21 testes).
- `index.html` carrega `<script src="fx.js"></script>` DEPOIS de app.js.
- fx.js NUNCA referencia funções internas de app.js. Somente DOM:
  - Observa `#mc` (MutationObserver childList+subtree) para count-up/transições de página.
  - Delegação global de eventos para tilt/magnetic (sobrevive a re-render).
  - Cria próprio `<canvas id="fxAurora">` fixo z-index 0 (app e login semi-transparentes deixam ver).
- Toda inicialização defensiva (try/catch por módulo): falha de FX jamais quebra o app.

## 5. Regras Anti AI-Slop (gate)
- Zero Inter default (Satoshi é o corpo), zero gradiente roxo, zero hero+3-cards uniforme.
- Raios variados (20/14/10), layout assimétrico onde o shell permite, copy PT-BR real (sem "Build the future").
- Charts Chart.js: paleta contínua com ciano família (#00E5FF/#7DF9C6/#1B4FD8) — harmonia garantida sem tocar app.js.

## 6. Arquivos da frente
| Arquivo | Dono | Ação |
|---|---|---|
| `styles.css` | Engenheiro Sênior A | Reescrita COMPLETA (design system v3) |
| `index.html` | Engenheiro Sênior A | Shell enriquecido, IDs/hooks 100% preservados |
| `fx.js` | Engenheiro de Animação B | Novo arquivo completo |
| `app.js`, `config.js` | — | INTOCÁVEIS |
