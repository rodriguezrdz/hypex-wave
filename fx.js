/* ============================================================================
   HYPEX WAVE v3 — fx.js · Camada de FX "Obsidian Aurora"
   ----------------------------------------------------------------------------
   Motor de FX vanilla, ZERO dependências. Dono: Engenheiro de Animação B.
   Contrato (design-tokens.md §3-§4):
     - NUNCA referencia internos de app.js — somente DOM público.
     - app.js é intocável; fx.js carregado DEPOIS dele.
     - Falha de qualquer módulo JAMAIS derruba os outros nem o app.
   API pública: window.HXFX { version, init(), destroy(), aurora, countUp,
   tilt, magnetic, page }
   ========================================================================= */
(function () {
  'use strict';

  /* ============================== UTILIDADES ============================== */

  var VERSION = '3.1.0';

  /** Estado global compartilhado entre módulos (flags baratas, sem layout). */
  var state = {
    booted: false,
    reduced: false,   // prefers-reduced-motion: reduce
    noAnim: false,    // body.no-anim (kill-switch via S.ui.anim do app)
    destroyed: false
  };

  function $(id) { return document.getElementById(id); }

  function detectReduced() {
    try {
      return !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  function detectNoAnim() {
    try { return !!(document.body && document.body.classList.contains('no-anim')); }
    catch (_) { return false; }
  }

  /** Motion permitido? (gate único usado por todos os módulos) */
  function motionOK() {
    return !state.reduced && !state.noAnim;
  }

  /** Pointer fino + desktop (guardas dos módulos 3 e 4). */
  function fineDesktop() {
    try {
      return !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches) &&
        window.innerWidth > 768;
    } catch (_) { return false; }
  }

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

  /* ==========================================================================
     MÓDULO 1 — AuroraCanvas
     Canvas fixo z-index 0, 3 ribbons senoidais (ciano/menta/azul-profundo),
     blend "lighter", respiração ~14s, opacidade .16 no app / .35 no login.
     Pauses: document.hidden · body.no-anim · prefers-reduced-motion.
     Performance: gradientes pré-criados no resize, zero alocação JS/frame,
     DPR cap 2, resize com debounce.
     ======================================================================== */
  var aurora = (function () {
    var canvas = null, ctx = null;
    var rafId = 0;
    var W = 0, H = 0, DPR = 1;
    var gradients = [];            // criados 1x por resize (nunca por frame)
    var lastTs = 0;
    var loginVisible = true;       // #ls visível? (opacidade .35 vs .16)
    var lsObserver = null;         // MutationObserver de style/class em #ls
    var frameTick = 0;             // contador p/ checagem periódica de login

    /* Configuração fixa dos 3 ribbons — frações de W/H, rad/ms. */
    var RIBBONS = [
      { r: 0,   g: 229, b: 255, amp: 0.085, wl: 1.9,  speed: 0.00016, phase: 0.0, thick: 0.050 },
      { r: 125, g: 249, b: 198, amp: 0.130, wl: 1.25, speed: -0.00011, phase: 2.1, thick: 0.062 },
      { r: 27,  g: 79,  b: 216, amp: 0.110, wl: 2.6,  speed: 0.00007, phase: 4.2, thick: 0.075 }
    ];

    var BREATH_MS = 14000;         // ciclo de respiração ~14s

    /* PERF v3.1: render em baixa resolução + limitador de FPS.
       As ondas são gradientes suaves — o upscale CSS é imperceptível e
       economiza ~4-6× de fill-rate na GPU. O governador ajusta via setTier. */
    var scale = 0.5;               // fração da viewport usada como backing store
    var minFrameMs = 1000 / 30;    // teto de 30fps (movimento lento, basta)
    var ribbonsActive = RIBBONS.length;
    var frozen = false;            // tier 2: quadro estático permanente
    var lastDrawTs = -1;

    function buildGradients() {
      gradients.length = 0;
      for (var i = 0; i < RIBBONS.length; i++) {
        var rb = RIBBONS[i];
        // Gradiente horizontal: transparente → cor → tom claro → cor → transparente.
        var gr = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gr.addColorStop(0.00, 'rgba(' + rb.r + ',' + rb.g + ',' + rb.b + ',0)');
        gr.addColorStop(0.22, 'rgba(' + rb.r + ',' + rb.g + ',' + rb.b + ',0.85)');
        gr.addColorStop(0.50, 'rgba(' +
          Math.min(255, rb.r + 40) + ',' + Math.min(255, rb.g + 20) + ',' + rb.b + ',1)');
        gr.addColorStop(0.78, 'rgba(' + rb.r + ',' + rb.g + ',' + rb.b + ',0.85)');
        gr.addColorStop(1.00, 'rgba(' + rb.r + ',' + rb.g + ',' + rb.b + ',0)');
        gradients.push(gr);
      }
    }

    function setSize() {
      if (!canvas) return;
      DPR = 1;                                       // backing próprio já é reduzido
      W = Math.max(1, window.innerWidth);
      H = Math.max(1, window.innerHeight);
      canvas.width = Math.max(160, Math.round(W * scale));
      canvas.height = Math.max(120, Math.round(H * scale));
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      buildGradients();
      lastDrawTs = -1;
    }

    /** Desenha 1 frame. Escalar puro — nenhuma alocação de objeto/array aqui. */
    function draw(ts) {
      var sec = ts / 1000;
      var breath = Math.sin(sec * (Math.PI * 2 / (BREATH_MS / 1000)));
      var peak = loginVisible ? 0.35 : 0.16;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      for (var i = 0; i < ribbonsActive && i < RIBBONS.length; i++) {
        var rb = RIBBONS[i];
        var alpha = peak * (0.55 + 0.45 * Math.sin(breath * Math.PI * 2 + i * 2.09));
        if (alpha < 0.02) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = gradients[i];

        var ampH = rb.amp * canvas.height;
        var cy = canvas.height * (0.32 + 0.18 * i);           // faixas verticais distintas
        var basePhase = rb.phase + ts * rb.speed;

        var step = Math.max(8, canvas.width / 60);
        var first = true;
        var x, u, yMid, th, yTop, yBot;

        // Banda superior (esquerda → direita)
        for (x = -step; x <= canvas.width + step; x += step) {
          u = x / canvas.width;
          yMid = cy +
            ampH * Math.sin(u * rb.wl * Math.PI * 2 + basePhase) +
            ampH * 0.35 * Math.sin(u * rb.wl * 3.7 * Math.PI * 2 - ts * rb.speed * 1.6 + rb.phase);
          th = rb.thick * canvas.height * (0.65 + 0.35 * Math.sin(u * rb.wl * 1.6 * Math.PI * 2 + ts * rb.speed * 0.8 + rb.phase * 2));
          yTop = yMid - th * 0.5;
          if (first) { ctx.moveTo(x, yTop); first = false; } else { ctx.lineTo(x, yTop); }
        }
        // Banda inferior (direita → esquerda, fechando o path)
        for (x = canvas.width + step; x >= -step; x -= step) {
          u = x / canvas.width;
          yMid = cy +
            ampH * Math.sin(u * rb.wl * Math.PI * 2 + basePhase) +
            ampH * 0.35 * Math.sin(u * rb.wl * 3.7 * Math.PI * 2 - ts * rb.speed * 1.6 + rb.phase);
          th = rb.thick * canvas.height * (0.65 + 0.35 * Math.sin(u * rb.wl * 1.6 * Math.PI * 2 + ts * rb.speed * 0.8 + rb.phase * 2));
          yBot = yMid + th * 0.5;
          ctx.lineTo(x, yBot);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function canRun() {
      return !!ctx && !document.hidden && !frozen && motionOK();
    }

    function frame(ts) {
      rafId = 0;
      if (!canRun()) return;
      lastTs = ts;
      // Checagem barata de login a cada ~60 ticks (~2s) como fallback do observer.
      if ((++frameTick % 60) === 0) refreshLogin();
      // Limitador de FPS: movimento lento dispensa 60Hz.
      if (lastDrawTs < 0 || ts - lastDrawTs >= minFrameMs) {
        lastDrawTs = ts;
        draw(ts);
      }
      rafId = requestAnimationFrame(frame);
    }

    function ensureLoop() {
      if (!rafId && canRun()) rafId = requestAnimationFrame(frame);
    }

    /** Pausa: congela o loop e deixa 1 frame estático como fundo. */
    function pauseStatic() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (ctx) draw(lastTs || 1200);
    }

    function refreshLogin() {
      var ls = $('ls');
      if (!ls) { loginVisible = false; return; }
      var cs;
      try { cs = getComputedStyle(ls); } catch (_) { cs = null; }
      loginVisible = !!cs && cs.display !== 'none' && cs.visibility !== 'hidden';
    }

    function onVisibility() { document.hidden ? pauseStatic() : ensureLoop(); }

    function onMotionFlagChange() { motionOK() ? ensureLoop() : pauseStatic(); }

    var resizeTimer = 0;
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resizeTimer = 0;
        try {
          setSize();
          refreshLogin();
          if (!canRun()) draw(lastTs || 1200);
        } catch (_) { /* nunca propagar erro de resize */ }
      }, 180);
    }

    /** Tier de performance (governador): 0 cheio · 1 eco · 2 mínimo estático. */
    function setTier(t) {
      if (t === 2) { frozen = true; pauseStatic(); return; }
      frozen = false;
      if (t === 1) { scale = 0.35; minFrameMs = 1000 / 22; ribbonsActive = 2; }
      else { scale = 0.5; minFrameMs = 1000 / 30; ribbonsActive = RIBBONS.length; }
      if (canvas) setSize();
      if (motionOK()) ensureLoop(); else pauseStatic();
    }

    function start() {
      if (canvas) return;
      canvas = document.createElement('canvas');
      canvas.id = 'fxAurora';
      // Atrás de tudo; painéis semi-transparentes do app/login deixam ver.
      canvas.style.cssText =
        'position:fixed;inset:0;z-index:0;pointer-events:none;display:block;';
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) { canvas.parentNode.removeChild(canvas); canvas = null; return; }

      setSize();
      refreshLogin();

      // Resposta imediata a mudanças de display/classe em #ls (login ↔ app).
      lsObserver = new MutationObserver(function () { refreshLogin(); });
      var ls = $('ls');
      if (ls) lsObserver.observe(ls, { attributes: true, attributeFilter: ['style', 'class'] });

      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('resize', onResize, { passive: true });

      ensureLoop();
    }

    function stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (resizeTimer) { clearTimeout(resizeTimer); resizeTimer = 0; }
      if (lsObserver) { lsObserver.disconnect(); lsObserver = null; }
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = null; ctx = null; gradients.length = 0;
    }

    return {
      label: 'AuroraCanvas',
      start: start,
      stop: stop,
      setTier: setTier,
      /** Redesenho estático manual (ex.: pós-troca de tema). */
      repaint: function () { if (ctx) draw(lastTs || 1200); },
      /** Força re-leitura do estado login/app. */
      refresh: refreshLogin
    };
  })();

  /* ==========================================================================
     MÓDULO 2 — CountUp
     MutationObserver em #mc e #sb (o #rvtotal vive na sidebar) + 1ª varredura
     no load. Alvos: .kpi-v · .tnum · #rvtotal. Parse pt-BR robusto
     ("R$ 1.234,56", "-R$ 987,00", "− R$ …", "12,3%", "1.234"), preservando
     prefixo/sufixo literais. Formatação de volta com Intl pt-BR e decimais
     detectados. Uma animação por elemento/valor (WeakSet + WeakMap).
     ======================================================================== */
  var countUp = (function () {
    var SEL = '.kpi-v, .tnum, #rvtotal';
    var DUR = 900;                                  // ~900ms outExpo (contrato §3)
    var animated = new WeakSet();                   // trava durante a animação
    var lastText = new WeakMap();                   // último texto já animado
    var nfCache = {};                               // NumberFormatter por nº de decimais
    var scanQueued = false;
    var mcObs = null, sbObs = null;

    var NUM_RX = /^([\s\S]*?)((?:\d{1,3}(?:\.\d{3})+(?:,\d+)?)|(?:\d+,\d+)|(?:\d+))(?:\s*)([\s\S]*)$/;

    function nfFor(decimals) {
      if (!nfCache[decimals]) {
        nfCache[decimals] = new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      }
      return nfCache[decimals];
    }

    /**
     * Extrai { prefix, value, decimals, suffix } de texto pt-BR.
     * Retorna null quando não é um número único limpo (skip silencioso).
     * Regras anti-falso-positivo: sufixo não pode conter dígito nem "/"
     * (elimina datas ISO/BR e textos com dois números).
     */
    function parse(text) {
      if (!text || text.length > 64) return null;
      var m = NUM_RX.exec(text);
      if (!m) return null;
      var prefix = m[1];
      var raw = m[2];
      var suffix = m[3];

      if (/\d|\//.test(suffix)) return null;        // data / segundo número → skip

      // Sinal: apenas quando o prefixo TERMINA num sinal dedicado
      // (cobre "-R$ 987,00", "− R$ 987,00", "+ R$ …", "-987,00";
      //  ignora hifens intra-palavra como "e-mail: 5").
      var neg = /[+\u2212-]\s*(?:R\$)?\s*$/.test(prefix) && /^[-\u2212]/.test(prefix.replace(/^\s*[+~(]*\s*/, ''));

      var hasComma = raw.indexOf(',') !== -1;
      var decimals = hasComma ? (raw.split(',')[1] || '').length : 0;
      var numeric = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
      if (!isFinite(numeric)) return null;

      return { prefix: prefix, value: numeric, decimals: decimals, suffix: suffix, neg: neg };
    }

    function compose(p, value) {
      var mag = p.neg ? -value : value;
      var formatted = nfFor(clamp(p.decimals, 0, 8)).format(Math.abs(value));
      return p.prefix + formatted + p.suffix;
    }

    /** Anima 0 → valor com easing outExpo via rAF. */
    function animate(el, text, parsed) {
      animated.add(el);
      var p = parsed;
      var target = p.value;

      if (target === 0) {                            // nada a animar
        lastText.set(el, text);
        animated.delete(el);
        return;
      }

      var t0 = performance.now();
      function tick(now) {
        var t = clamp((now - t0) / DUR, 0, 1);
        var e = 1 - Math.pow(2, -10 * t);            // outExpo
        if (t >= 1) e = 1;
        var out = compose(p, target * e);
        el.textContent = out;
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          lastText.set(el, el.textContent);           // valor final exato escrito
          animated.delete(el);
        }
      }
      requestAnimationFrame(tick);
    }

    /** Varredura: anima todo alvo novo/não-processado dentro de #mc e #sb. */
    function scan() {
      var roots = [];
      var mc = $('mc'); if (mc) roots.push(mc);
      var sb = $('sb'); if (sb) roots.push(sb);

      for (var r = 0; r < roots.length; r++) {
        var nodes = roots[r].querySelectorAll(SEL);
        for (var i = 0; i < nodes.length; i++) {
          var el = nodes[i];
          if (animated.has(el)) continue;             // já em animação
          var text = el.textContent;
          if (lastText.get(el) === text) continue;    // mesmo valor → nada a fazer

          var parsed = parse(text);
          if (!parsed) { lastText.set(el, text); continue; }

          // Reduced-motion / no-anim: valor final direto (texto já está correto).
          if (!motionOK()) { lastText.set(el, text); continue; }
          // Elemento invisível: registra sem gastar frames.
          if (el.getClientRects().length === 0) { lastText.set(el, text); continue; }

          animate(el, text, parsed);
        }
      }
    }

    function scheduleScan() {
      if (scanQueued) return;
      scanQueued = true;
      requestAnimationFrame(function () {
        scanQueued = false;
        try { scan(); } catch (_) { /* isolado */ }
      });
    }

    function start() {
      var mc = $('mc');
      var sb = $('sb');

      // Observer ÚNICO em #mc alimenta count-up E transição de página.
      mcObs = new MutationObserver(function () {
        scheduleScan();
        page.onMainMutated();
      });
      if (mc) mcObs.observe(mc, { childList: true, subtree: true });

      // Sidebar: cobre #rvtotal (atualizações parciais via touch()).
      if (sb) {
        sbObs = new MutationObserver(scheduleScan);
        sbObs.observe(sb, { childList: true, subtree: true });
      }

      // Primeira varredura após load + varredura imediata se DOM já populado.
      window.addEventListener('load', scheduleScan, { once: true });
      scheduleScan();
    }

    function stop() {
      if (mcObs) { mcObs.disconnect(); mcObs = null; }
      if (sbObs) { sbObs.disconnect(); sbObs = null; }
      window.removeEventListener('load', scheduleScan);
    }

    return {
      label: 'CountUp',
      start: start,
      stop: stop,
      scan: scan,
      /** Utilitário público: testa o parser (diagnóstico no console). */
      parse: parse
    };
  })();

  /* ==========================================================================
     MÓDULO 3 — TiltCards (delegado)
     mousemove delegado no document → .gc/.kpi com perspectiva 900px e
     rotação ≤6°, brilho radial via CSS vars --mx/--my. Guardas: pointer:fine,
     largura >768, motion permitido. Throttle rAF; reset em saída/scroll/blur.
     ======================================================================== */
  var tilt = (function () {
    var SEL = '.gc, .kpi';
    var MAX_DEG = 6;
    var lastEl = null;
    var queued = false;
    var evX = 0, evY = 0, evTarget = null;
    var bound = false;

    function reset(el) {
      if (!el) return;
      el.style.transform = '';
      el.style.transition = '';
      el.style.willChange = '';
    }

    function apply(el) {
      var rect = el.getBoundingClientRect();       // 1 leitura → depois writes
      if (!rect.width || !rect.height) return;
      var px = clamp((evX - rect.left) / rect.width, 0, 1);
      var py = clamp((evY - rect.top) / rect.height, 0, 1);

      var rotY = (px - 0.5) * 2 * MAX_DEG;
      var rotX = -(py - 0.5) * 2 * MAX_DEG;

      // Writes agrupados após a leitura — zero layout thrashing.
      el.style.willChange = 'transform';
      el.style.transition = 'transform .18s ease-out';
      el.style.transform =
        'perspective(900px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' +
        rotY.toFixed(2) + 'deg) translate3d(0,0,0)';
      // CSS vars para brilho radial consumível pelo styles.css da frente A.
      el.style.setProperty('--mx', Math.round(px * rect.width) + 'px');
      el.style.setProperty('--my', Math.round(py * rect.height) + 'px');
    }

    function flush() {
      queued = false;
      try {
        var el = evTarget && evTarget.closest ? evTarget.closest(SEL) : null;
        if (el !== lastEl) { reset(lastEl); lastEl = el; }
        if (el) apply(el);
      } catch (_) { /* isolado */ }
    }

    function onMouseMove(e) {
      if (!fineDesktop() || !motionOK()) { if (lastEl) { reset(lastEl); lastEl = null; } return; }
      evX = e.clientX; evY = e.clientY; evTarget = e.target;
      if (!queued) { queued = true; requestAnimationFrame(flush); }
    }

    function onLeaveCtx() { if (lastEl) { reset(lastEl); lastEl = null; } }

    function start() {
      if (bound) return;
      bound = true;
      document.addEventListener('mousemove', onMouseMove, { passive: true });
      document.addEventListener('mouseleave', onLeaveCtx);
      window.addEventListener('scroll', onLeaveCtx, { passive: true });
      window.addEventListener('blur', onLeaveCtx);
    }

    function stop() {
      if (!bound) return;
      bound = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onLeaveCtx);
      window.removeEventListener('scroll', onLeaveCtx);
      window.removeEventListener('blur', onLeaveCtx);
      onLeaveCtx();
    }

    return { label: 'TiltCards', start: start, stop: stop };
  })();

  /* ==========================================================================
     MÓDULO 4 — MagneticButtons (delegado)
     .bp/.lbtn/.lgbtn → translate ≤4px na direção do cursor (fator 0.18),
     retorno com spring CSS (inline — sem colidir com transitions globais).
     Mesmas guardas do módulo 3.
     ======================================================================== */
  var magnetic = (function () {
    var SEL = '.bp, .lbtn, .lgbtn';
    var FACTOR = 0.18;
    var MAX_PX = 4;
    var SPRING = 'transform .45s cubic-bezier(.22,1.61,.36,1)';
    var lastEl = null;
    var queued = false;
    var evX = 0, evY = 0, evTarget = null;
    var bound = false;

    function clearSpringWatch(el) {
      if (!el) return;
      if (el.__fxSpringHandler) {
        el.removeEventListener('transitionend', el.__fxSpringHandler);
        el.__fxSpringHandler = null;
      }
    }

    function reset(el) {
      if (!el) return;
      clearSpringWatch(el);
      el.style.transition = SPRING;
      el.style.transform = 'translate3d(0,0,0)';
      var done = function () {
        el.style.transition = '';
        el.style.transform = '';
        clearSpringWatch(el);
      };
      el.__fxSpringHandler = done;
      el.addEventListener('transitionend', done, { once: true });
    }

    function apply(el) {
      var rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = clamp((evX - cx) * FACTOR, -MAX_PX, MAX_PX);
      var dy = clamp((evY - cy) * FACTOR, -MAX_PX, MAX_PX);
      el.style.willChange = 'transform';
      el.style.transition = 'transform .12s ease-out';
      el.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
    }

    function flush() {
      queued = false;
      try {
        var el = evTarget && evTarget.closest ? evTarget.closest(SEL) : null;
        if (el !== lastEl) {
          if (lastEl) reset(lastEl);
          lastEl = el;
        }
        if (el) apply(el);
      } catch (_) { /* isolado */ }
    }

    function onMouseMove(e) {
      if (!fineDesktop() || !motionOK()) { if (lastEl) { reset(lastEl); lastEl = null; } return; }
      evX = e.clientX; evY = e.clientY; evTarget = e.target;
      if (!queued) { queued = true; requestAnimationFrame(flush); }
    }

    function onLeaveCtx() { if (lastEl) { reset(lastEl); lastEl = null; } }

    function start() {
      if (bound) return;
      bound = true;
      document.addEventListener('mousemove', onMouseMove, { passive: true });
      document.addEventListener('mouseleave', onLeaveCtx);
      window.addEventListener('scroll', onLeaveCtx, { passive: true });
      window.addEventListener('blur', onLeaveCtx);
    }

    function stop() {
      if (!bound) return;
      bound = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onLeaveCtx);
      window.removeEventListener('scroll', onLeaveCtx);
      window.removeEventListener('blur', onLeaveCtx);
      onLeaveCtx();
    }

    return { label: 'MagneticButtons', start: start, stop: stop };
  })();

  /* ==========================================================================
     MÓDULO 5 — PageTransition
     Em nova renderização de #mc (childList), aplica classe "page-enter" com
     keyframes curtos (opacity + translateY(10px) + scale(.995)). Estilo
     próprio injetado via <style id="fxStyles"> — SOMENTE classes/keyframes
     do fx. Anti-loop: a classe vive em #mc (atributo) e o observer é
     childList → mutações próprias não re-disparam.
     ======================================================================== */
  var page = (function () {
    var STYLE_ID = 'fxStyles';
    var CLS = 'page-enter';
    var FALLBACK_MS = 600;
    var styleEl = null;
    var busy = false;
    var removeTimer = 0;
    var armed = false;                 // arma somente quando #mc esvaziou↔encheu

    var CSS_TEXT =
      '@keyframes fxPageEnter{from{opacity:0;transform:translate3d(0,10px,0) scale(.995)}' +
      'to{opacity:1;transform:translate3d(0,0,0) scale(1)}}' +
      '.' + CLS + '{animation:fxPageEnter .42s cubic-bezier(.19,1,.22,1) both}' +
      'body.no-anim .' + CLS + '{animation:none}' +
      '@media (prefers-reduced-motion:reduce){.' + CLS + '{animation:none}}';

    function injectStyles() {
      if (styleEl && styleEl.parentNode) return;
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      styleEl.textContent = CSS_TEXT;
      document.head.appendChild(styleEl);
    }

    function play() {
      var mc = $('mc');
      if (!mc || !mc.firstElementChild) return;
      if (!motionOK() || busy) return;
      busy = true;
      mc.classList.add(CLS);

      var finish = function () {
        if (removeTimer) { clearTimeout(removeTimer); removeTimer = 0; }
        mc.classList.remove(CLS);
        mc.removeEventListener('animationend', finish);
        busy = false;
      };
      mc.addEventListener('animationend', finish);
      removeTimer = setTimeout(finish, FALLBACK_MS);   // segurança p/ animationend perdido
    }

    /** Chamado pelo observer compartilhado do countUp (módulo 2). */
    function onMainMutated() {
      var mc = $('mc');
      if (!mc) return;
      // Arma quando o container fica vazio (entre renders) e dispara ao encher.
      if (!mc.firstElementChild) { armed = true; return; }
      if (armed) { armed = false; play(); }
      else if (!armed && !busy) { armed = false; play(); }
    }

    function start() {
      injectStyles();
    }

    function stop() {
      if (removeTimer) { clearTimeout(removeTimer); removeTimer = 0; }
      var mc = $('mc');
      if (mc) {
        mc.classList.remove(CLS);
        // remove todos os listeners 'animationend' deste módulo via clone-safe:
        // como usamos referência anônima, garantimos estado limpo assim:
        busy = false; armed = false;
      }
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }

    return { label: 'PageTransition', start: start, stop: stop, onMainMutated: onMainMutated };
  })();

  /* ==========================================================================
     MÓDULO 6 — Performance Governor
     Mede o FPS real do navegador em janelas de ~1.4s e degrada camadas caras
     sob pressão: T0 cheio → T1 eco (sem tilt/magnetic, aurora leve) →
     T2 mínimo (aurora congelada). Recuperação com histerese (4 janelas boas).
     Hardware modesto (deviceMemory/cores baixos) já nasce em T1.
     ======================================================================== */
  var governor = (function () {
    var tier = 0;
    var rafId = 0, frames = 0, winStart = 0;
    var badStreak = 0, goodStreak = 0;
    var WINDOW_MS = 1400, DEGRADE_BELOW = 42, UPGRADE_ABOVE = 56, GOOD_TO_UPGRADE = 4;

    function hwWeak() {
      try {
        return !!(navigator.deviceMemory && navigator.deviceMemory <= 4) ||
               !!(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
      } catch (_) { return false; }
    }

    function apply(t) {
      if (t === tier) return;
      tier = t;
      var de = document.documentElement;
      de.classList.remove('fx-perf-1', 'fx-perf-2');
      try {
        if (t === 1) de.classList.add('fx-perf-1');
        else if (t === 2) de.classList.add('fx-perf-2');
        aurora.setTier(t);
        if (t === 0) { tilt.start(); magnetic.start(); }
        else { tilt.stop(); magnetic.stop(); }
      } catch (_) { /* isolado */ }
    }

    function loop(ts) {
      rafId = 0;
      frames++;
      if (!winStart) winStart = ts;
      var elapsed = ts - winStart;
      if (elapsed >= WINDOW_MS) {
        var fps = (frames * 1000) / elapsed;
        frames = 0; winStart = ts;
        if (fps < DEGRADE_BELOW) {
          badStreak++; goodStreak = 0;
          if (badStreak >= 2 && tier < 2) { apply(tier + 1); badStreak = 0; }
        } else if (fps > UPGRADE_ABOVE && tier > 0) {
          goodStreak++; badStreak = 0;
          if (goodStreak >= GOOD_TO_UPGRADE) { apply(tier - 1); goodStreak = 0; }
        } else if (badStreak > 0) {
          badStreak--;
        }
      }
      if (motionOK() && !state.destroyed) rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (rafId || !motionOK()) return;
      if (hwWeak()) apply(1);                 // máquina modesta: nasce em eco
      winStart = 0; frames = 0;
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    return { label: 'PerformanceGovernor', start: start, stop: stop, apply: apply };
  })();

  /* ============================ FLAGS GLOBAIS ============================= */

  var reducedMQ = null;      // MediaQueryList de prefers-reduced-motion
  var bodyClassObs = null;   // MutationObserver p/ body.no-anim (S.ui.anim)
  var mqHandler = null;      // referência nomeada p/ remoção segura

  function watchGlobalFlags() {
    state.reduced = detectReduced();
    state.noAnim = detectNoAnim();

    try {
      if (window.matchMedia) {
        reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
        mqHandler = function () {
          state.reduced = detectReduced();
          aurora.refresh();
        };
        if (reducedMQ.addEventListener) reducedMQ.addEventListener('change', mqHandler);
        else if (reducedMQ.addListener) reducedMQ.addListener(mqHandler); // Safari antigo
      }
    } catch (_) { reducedMQ = null; mqHandler = null; }

    try {
      bodyClassObs = new MutationObserver(function () {
        state.noAnim = detectNoAnim();
        aurora.refresh();          // liga/desliga o loop da aurora ao vivo
      });
      if (document.body) {
        bodyClassObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      }
    } catch (_) { bodyClassObs = null; }
  }

  function unwatchGlobalFlags() {
    try {
      if (reducedMQ && mqHandler) {
        if (reducedMQ.removeEventListener) reducedMQ.removeEventListener('change', mqHandler);
        else if (reducedMQ.removeListener) reducedMQ.removeListener(mqHandler);
      }
    } catch (_) {}
    reducedMQ = null;
    mqHandler = null;
    if (bodyClassObs) { bodyClassObs.disconnect(); bodyClassObs = null; }
  }

  /* ================================ BOOT ================================== */

  /**
   * Inicializa todos os módulos, cada um em try/catch independente.
   * Idempotente: chamada repetida é ignorada.
   */
  function init() {
    if (state.booted || state.destroyed) return;
    state.booted = true;

    watchGlobalFlags();

    // Módulo 1 — Aurora (fundo vivo; primeiro a existir, atrás de tudo).
    try { aurora.start(); }
    catch (err) { safeWarn('AuroraCanvas', err); }

    // Módulo 5 — estilos das transições (antes do 1º render observado).
    try { page.start(); }
    catch (err) { safeWarn('PageTransition', err); }

    // Módulos 3 e 4 — interações delegadas (sobrevivem a re-render).
    try { tilt.start(); }
    catch (err) { safeWarn('TiltCards', err); }

    try { magnetic.start(); }
    catch (err) { safeWarn('MagneticButtons', err); }

    // Módulo 2 — observers de dados (dispara 1ª varredura + no load).
    try { countUp.start(); }
    catch (err) { safeWarn('CountUp', err); }

    // Módulo 6 — governador adaptativo: mede FPS e degrada sozinho.
    try { governor.start(); }
    catch (err) { safeWarn('PerformanceGovernor', err); }

    // Charts mais leves: corta animações longas do Chart.js globalmente.
    try {
      if (window.Chart && window.Chart.defaults && window.Chart.defaults.animation) {
        window.Chart.defaults.animation.duration = 300;
      }
    } catch (_) {}
  }

  function safeWarn(module, err) {
    try { console.warn('[HXFX:' + module + '] desativado:', err && err.message ? err.message : err); }
    catch (_) { /* console indisponível */ }
  }

  /** Desmonta TUDO (listeners, observers, rAF, canvas, style tag). */
  function destroy() {
    if (!state.booted) return;
    state.destroyed = true;
    state.booted = false;

    try { aurora.stop(); } catch (_) {}
    try { countUp.stop(); } catch (_) {}
    try { tilt.stop(); } catch (_) {}
    try { magnetic.stop(); } catch (_) {}
    try { page.stop(); } catch (_) {}
    try { governor.stop(); } catch (_) {}
    try { unwatchGlobalFlags(); } catch (_) {}

    state.destroyed = false;   // permite re-init limpo (hot-reload)
  }

  /* ============================ API PÚBLICA =============================== */

  window.HXFX = {
    version: VERSION,
    init: init,
    destroy: destroy,
    /** M1: fundo aurora (start/stop/repaint/refresh). */
    aurora: aurora,
    /** M2: count-up (scan manual, parser p/ diagnóstico). */
    countUp: countUp,
    /** M3: tilt 3D em cards (start/stop). */
    tilt: tilt,
    /** M4: botões magnéticos (start/stop). */
    magnetic: magnetic,
    /** M5: transição de página (onMainMutated p/ uso manual). */
    page: page,
    /** M6: governador de performance (start/stop/apply). */
    governor: governor
  };

  /* Auto-inicialização: imediata ou no DOMContentLoaded. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      try { init(); } catch (_) { /* última linha de defesa */ }
    });
  } else {
    try { init(); } catch (_) { /* última linha de defesa */ }
  }

})();
