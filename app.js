"use strict";
// ============================================================
// HYPEX WAVE — app.js
// Estado + Persistência (localStorage + Supabase) + Auth + UI
// ============================================================

// ===== UTILS =====
const $ = (id) => document.getElementById(id);
const fmtBRL = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
const fmtNum = (n) => new Intl.NumberFormat("pt-BR").format(Number(n) || 0);
function pad2(n) { return String(n).padStart(2, "0"); }
function todayStr() { const d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function daysDiff(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T12:00:00");
  const n = new Date(); n.setHours(12, 0, 0, 0);
  return Math.round((d - n) / 86400000);
}

// ===== SEED =====
function seedTransactions() {
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear(), today = now.getDate();
  const d = (day) => y + "-" + pad2(m + 1) + "-" + pad2(Math.min(day, today));
  return [
    { id: 101, desc: "Venda HYPEX Method", type: "Entrada", value: 297, method: "PIX", date: d(2) },
    { id: 102, desc: "Venda FinanceX Pro", type: "Entrada", value: 197, method: "Cartão", date: d(4) },
    { id: 103, desc: "Assinatura ActiveCampaign", type: "Saída", value: 245, method: "Cartão", date: d(5) },
    { id: 104, desc: "Comissão Afiliação Kiwify", type: "Entrada", value: 156, method: "PIX", date: d(8) },
    { id: 105, desc: "Venda BodyTransform", type: "Entrada", value: 147, method: "PIX", date: d(11) },
    { id: 106, desc: "Assinatura Hotmart", type: "Saída", value: 99, method: "Boleto", date: d(13) },
    { id: 107, desc: "Investimento Meta Ads", type: "Saída", value: 2840, method: "Cartão", date: d(15) },
    { id: 108, desc: "Venda HYPEX Method (combo)", type: "Entrada", value: 497, method: "Cartão", date: d(18) },
    { id: 109, desc: "Comissão Kirvano", type: "Entrada", value: 213, method: "PIX", date: d(20) },
    { id: 110, desc: "Ferramentas & Softwares", type: "Saída", value: 380, method: "Cartão", date: d(22) }
  ];
}
function seedSales() {
  const names = ["HYPEX Method", "FinanceX Pro", "BodyTransform"];
  const prices = [297, 197, 147];
  const plats = ["Kiwify", "Kirvano", "Cakto"];
  const buyers = ["M. Oliveira", "J. Santos", "A. Ferreira", "C. Lima", "R. Alves", "P. Souza", "L. Costa", "T. Rocha"];
  const out = [];
  for (let i = 0; i < 26; i++) {
    const p = Math.floor(Math.random() * 3);
    out.push({
      id: 200 + i,
      product: names[p],
      buyer: buyers[Math.floor(Math.random() * buyers.length)],
      value: prices[p] + (Math.random() > 0.75 ? 100 : 0),
      platform: plats[Math.floor(Math.random() * plats.length)],
      status: Math.random() > 0.18 ? "Pago" : "Pendente",
      date: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString()
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function defaultState() {
  return {
    user: { name: "", email: "", role: "DONO" },
    revenueTarget: 100000,
    tasks: {
      todo: [
        { id: 1, title: "Criar campanha Meta Ads para o Q4", pri: "high", due: "", assignee: "Nunez" },
        { id: 2, title: "Revisar relatório financeiro mensal", pri: "med", due: "", assignee: "Equipe" }
      ],
      doing: [{ id: 3, title: "Desenvolver landing page do Produto X", pri: "high", due: "", assignee: "Dev" }],
      done: [{ id: 4, title: "Configurar integração Kiwify", pri: "low", due: "", assignee: "Nunez" }]
    },
    events: [],
    products: [
      { id: 1, name: "HYPEX Method", niche: "Produtividade", price: 297, revenue: 18420, conv: 3.2 },
      { id: 2, name: "FinanceX Pro", niche: "Finanças", price: 197, revenue: 12640, conv: 4.1 },
      { id: 3, name: "BodyTransform", niche: "Emagrecimento", price: 147, revenue: 9870, conv: 5.3 }
    ],
    affiliations: [
      { id: 1, platform: "Kiwify", commission: 40, sales: 28, profit: 4380 },
      { id: 2, platform: "Kirvano", commission: 35, sales: 19, profit: 2850 }
    ],
    team: [
      { id: 1, name: "Nunez", email: "rodriguez.founder@gmail.com", role: "Dono", sales: 89, revenue: 34200, commission: 0, status: "Ativo" },
      { id: 2, name: "Ana Silva", email: "ana@hypex.com", role: "Gerente", sales: 34, revenue: 13200, commission: 1320, status: "Ativo" },
      { id: 3, name: "Carlos Dev", email: "carlos@hypex.com", role: "Colaborador", sales: 18, revenue: 7020, commission: 702, status: "Ativo" }
    ],
    campaigns: [
      { id: 1, name: "Black Friday Q4", platform: "Meta Ads", budget: 3200, spend: 2840, roi: 340, status: "Ativa" },
      { id: 2, name: "Google Search Produto A", platform: "Google Ads", budget: 1500, spend: 1500, roi: 220, status: "Finalizada" },
      { id: 3, name: "TikTok Awareness", platform: "TikTok Ads", budget: 800, spend: 420, roi: 0, status: "Pausada" }
    ],
    creatives: [
      { id: 1, name: "Criativo-001-VSL", platform: "Meta Ads", revenue: 18240, roi: 340, roas: 4.2, conv: 3.8, status: "Ativo" },
      { id: 2, name: "Criativo-002-IMG", platform: "Meta Ads", revenue: 9120, roi: 280, roas: 3.8, conv: 2.9, status: "Ativo" },
      { id: 3, name: "Keyword-Brand", platform: "Google Ads", revenue: 12480, roi: 220, roas: 3.2, conv: 4.1, status: "Ativo" },
      { id: 4, name: "TK-Reels-A", platform: "TikTok Ads", revenue: 4200, roi: 180, roas: 2.8, conv: 2.1, status: "Pausado" },
      { id: 5, name: "Tab-Native-01", platform: "Taboola", revenue: 2880, roi: 140, roas: 2.2, conv: 1.4, status: "Ativo" }
    ],
    integrations: { meta: true, google: false, tiktok: false, taboola: false, outbrain: false, analytics: true, stripe: false, paypal: false, kirvano: true, kiwify: true, cakto: false },
    funnel: null,
    testProducts: [
      { id: 1, name: "Programa Alpha", endsAt: Date.now() + ((2 * 24 + 14) * 3600 + 32 * 60) * 1000 },
      { id: 2, name: "Curso Beta", endsAt: Date.now() + ((1 * 24 + 8) * 3600 + 11 * 60) * 1000 },
      { id: 3, name: "Ebook Gamma", endsAt: Date.now() + (3 * 3600 + 45 * 60) * 1000 }
    ],
    roles: [
      { id: 1, name: "Dono", perms: ["Tudo"] },
      { id: 2, name: "Sócio", perms: ["Dashboard", "Financeiro", "Equipe", "Relatórios", "Admin"] },
      { id: 3, name: "Administrador", perms: ["Dashboard", "Equipe", "Campanhas", "Relatórios"] },
      { id: 4, name: "Gerente", perms: ["Dashboard", "Tarefas", "Produtos", "Vendas"] },
      { id: 5, name: "Colaborador", perms: ["Dashboard", "Tarefas", "Vendas Próprias"] }
    ],
    ui: { primary: "#00D9FF", accent: "#00FFFF", anim: true, glow: true, glass: true },
    notifLastSeen: null,
    auditLog: []
  };
}

let S = defaultState();
S.transactions = seedTransactions();
S.salesHistory = seedSales();

// ===== PERSISTÊNCIA LOCAL =====
const LS_KEY = "hypexwave.state.v1";
const LS_SESSION = "hypexwave.session";
const LS_SBCFG = "hypexwave.supabase";

function saveLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { console.warn("saveLocal", e); }
}
const saveLocalDebounced = debounce(saveLocal, 500);
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    S = Object.assign(defaultState(), parsed);
    S.transactions = parsed.transactions && parsed.transactions.length ? parsed.transactions : seedTransactions();
    S.salesHistory = parsed.salesHistory && parsed.salesHistory.length ? parsed.salesHistory : seedSales();
    if (!parsed.ui) S.ui = defaultState().ui;
    if (!parsed.roles || !parsed.roles.length) S.roles = defaultState().roles;
    if (!parsed.creatives) S.creatives = defaultState().creatives;
    if (!parsed.tasks) S.tasks = defaultState().tasks;
  } catch (e) { console.warn("loadLocal", e); }
}

// ===== AUDIT LOG =====
function audit(action) {
  S.auditLog.unshift({ t: new Date().toISOString(), user: (S.user && S.user.email) || "sistema", action });
  if (S.auditLog.length > 80) S.auditLog.length = 80;
}

// ===== EMAILJS =====
let emailjsReady = false;
function getEmailJSCfg() {
  const w = window.EMAILJS_CONFIG || {};
  if (w.serviceId && w.templateId && w.publicKey) return w;
  return null;
}
function ensureEmailJS() {
  return new Promise((res, rej) => {
    if (window.emailjs && window.emailjs.send) return res();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    s.onload = () => res();
    s.onerror = () => rej(new Error("Falha ao carregar SDK do EmailJS"));
    document.head.appendChild(s);
  });
}
async function emailSend(toEmail, toName, message) {
  const cfg = getEmailJSCfg();
  if (!cfg) return { ok: false, reason: "not-configured" };
  await ensureEmailJS();
  try {
    if (!emailjsReady) { window.emailjs.init({ publicKey: cfg.publicKey }); emailjsReady = true; }
    await window.emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email: toEmail,
      to_name: toName,
      subject: "HYPEX WAVE — Você recebeu um convite",
      message
    });
    return { ok: true };
  } catch (e) {
    console.warn("emailSend", e);
    return { ok: false, reason: e.message || "send-failed" };
  }
}

// ===== TOUCH (mutação -> salvar local + nuvem) =====
function touch(skipCloud) {
  saveLocalDebounced();
  if (!skipCloud) pushCloudDebounced();
}
function logAndTouch(action) { audit(action); touch(); }

// ===== SUPABASE =====
let sbClient = null;
function getCfg() {
  const w = window.SUPABASE_CONFIG || {};
  if (w.url && w.key) return { url: w.url.replace(/\/$/, ""), key: w.key };
  try {
    const ls = JSON.parse(localStorage.getItem(LS_SBCFG) || "null");
    if (ls && ls.url && ls.key) return { url: ls.url.replace(/\/$/, ""), key: ls.key };
  } catch (e) {}
  return null;
}
function ensureSupabaseJS() {
  return new Promise((res, rej) => {
    if (window.supabase && window.supabase.createClient) return res();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = () => res();
    s.onerror = () => rej(new Error("Falha ao carregar SDK Supabase"));
    document.head.appendChild(s);
  });
}
async function getSB() {
  const cfg = getCfg();
  if (!cfg) return null;
  if (sbClient) return sbClient;
  await ensureSupabaseJS();
  sbClient = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, detectSessionInUrl: true } });
  return sbClient;
}
function setSync(mode, label) {
  const pill = $("syncpill");
  if (!pill) return;
  pill.className = mode;
  $("synclabel").textContent = label || (mode === "cloud" ? "Nuvem OK" : mode === "saving" ? "Salvando..." : mode === "error" ? "Erro sync" : "Local");
}
async function pushCloud() {
  const sb = await getSB();
  if (!sb || !S.user || !S.user.id) return;
  setSync("saving");
  try {
    const payload = JSON.parse(JSON.stringify(S));
    payload._syncedAt = new Date().toISOString();
    const { error } = await sb.from("app_data")
      .upsert({ user_id: S.user.id, data: payload, updated_at: payload._syncedAt }, { onConflict: "user_id" });
    if (error) throw error;
    setSync("cloud");
  } catch (e) {
    console.warn("pushCloud", e);
    setSync("error");
  }
}
const pushCloudDebounced = debounce(pushCloud, 1200);
async function pullCloud(sbUser) {
  const sb = await getSB();
  if (!sb || !sbUser) return;
  try {
    const { data, error } = await sb.from("app_data")
      .select("data,updated_at").eq("user_id", sbUser.id).maybeSingle();
    if (error) throw error;
    let localTime = "";
    try { localTime = JSON.parse(localStorage.getItem(LS_KEY) || "{}")._syncedAt || ""; } catch (e) {}
    if (data && data.data && data.updated_at >= (localTime || "")) {
      S = Object.assign(defaultState(), data.data);
      saveLocal();
    } else {
      const payload = JSON.parse(JSON.stringify(S));
      payload._syncedAt = new Date().toISOString();
      await sb.from("app_data")
        .upsert({ user_id: sbUser.id, data: payload, updated_at: payload._syncedAt }, { onConflict: "user_id" });
    }
    setSync("cloud");
  } catch (e) {
    console.warn("pullCloud", e);
    setSync("error");
  }
}


// ===== AUTENTICAÇÃO =====
const AUTH_EMAILS = ["rodriguez.founder@gmail.com", "admin@hypexwave.com", "owner@hypexwave.com"];
let signupMode = false;

function loginInfoText() {
  const cfg = getCfg();
  if (cfg) {
    $("lmodebadge").className = "lmodebadge lmode-cloud";
    $("lmodebadge").textContent = "BANCO DE DADOS CONECTADO";
    $("linfo").style.display = "none";
    $("lnamefield").style.display = signupMode ? "block" : "none";
    $("lforgot").style.display = signupMode ? "none" : "inline";
    $("ltogglemode").textContent = signupMode ? "Já tenho conta" : "Criar conta";
    $("lbtn").textContent = signupMode ? "✨ CRIAR MINHA CONTA" : "⚡ ENTRAR NA PLATAFORMA";
    $("lnote").textContent = "Dados sincronizados na nuvem (Supabase)";
  } else {
    $("lmodebadge").className = "lmodebadge lmode-local";
    $("lmodebadge").textContent = "MODO LOCAL";
    $("linfo").style.display = "block";
    $("linfo").innerHTML = "<strong>Contas de acesso:</strong><br>rodriguez.founder@gmail.com · admin@hypexwave.com · owner@hypexwave.com<br>Senha: qualquer, com 4+ caracteres." +
      (((window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.key) && !cfg) ? "<br><br>🔑 Chave do Supabase já configurada — falta só a <strong>Project URL</strong>. Entre e abra o menu <strong>Banco de Dados</strong> para colar." : "");
    $("lnamefield").style.display = "none";
    $("lforgot").style.display = "none";
    $("ltogglemode").textContent = "Conectar banco de dados";
    $("lbtn").textContent = "⚡ ENTRAR NA PLATAFORMA";
    $("lnote").textContent = "⚠ Modo local — dados salvos apenas neste navegador";
  }
}
function toggleSignup() {
  if (!getCfg()) { navToAfterLogin = "database"; startAppLocal(AUTH_EMAILS[0]); return; }
  signupMode = !signupMode;
  loginInfoText();
}
async function doResetPwd() {
  const em = $("lemail").value.trim();
  if (!em) { lerr("Digite seu email acima primeiro."); return; }
  const sb = await getSB();
  const { error } = await sb.auth.resetPasswordForEmail(em);
  if (error) lerr("Não foi possível enviar: " + error.message);
  else showToast("📧 Email de recuperação enviado!", "ok");
}
function lerr(msg) { const e = $("lerr"); e.textContent = msg; e.style.display = "block"; }

async function doLogin() {
  const btn = $("lbtn");
  const em = $("lemail").value.trim();
  const pw = $("lpwd").value;
  if (!em || !pw) return lerr("Preencha email e senha.");
  if (pw.length < 4) return lerr("A senha precisa de pelo menos 4 caracteres.");
  btn.disabled = true;

  if (getCfg()) {
    try {
      const sb = await getSB();
      if (signupMode) {
        const nm = $("lname").value.trim() || em.split("@")[0];
        const { data, error } = await sb.auth.signUp({ email: em, password: pw, options: { data: { name: nm } } });
        if (error) throw error;
        if (!data.session) {
          btn.disabled = false;
          if (getEmailJSCfg()) {
            emailSend(em, nm, "Olá " + nm + "! Sua conta na HYPEX WAVE foi criada. Confirme seu email pelo link que o Supabase enviou e depois faça login em https://rodriguezrdz.github.io/hypex-wave/");
          }
          return lerr("Conta criada! Confirme seu email antes de entrar." + (getEmailJSCfg() ? " Enviamos uma cópia por EmailJS." : ""));
        }
        await onCloudSession(data.session, data.user);
        return;
      }
      const { data, error } = await sb.auth.signInWithPassword({ email: em, password: pw });
      if (error) throw error;
      await onCloudSession(data.session, data.user);
      return;
    } catch (e) {
      btn.disabled = false;
      const map = { "Invalid login credentials": "Email ou senha inválidos.", "Email not confirmed": "Confirme seu email antes de entrar." };
      return lerr(map[e.message] || ("Erro: " + e.message));
    }
  }
  if (!AUTH_EMAILS.includes(em)) { btn.disabled = false; return lerr("Email não autorizado. Acesso restrito."); }
  startAppLocal(em);
}
async function doGLogin() {
  if (!getCfg()) { showToast("🔐 Login com Google requer o Supabase conectado — entre e abra Banco de Dados.", "warn"); return; }
  const sb = await getSB();
  await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
}
async function ensureProfile(sb, user, name) {
  try {
    const { data } = await sb.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!data) await sb.from("profiles").insert({ id: user.id, name: name || (user.user_metadata && user.user_metadata.name) || user.email, role: "Dono" });
  } catch (e) { console.warn("ensureProfile", e.message); }
}
async function onCloudSession(session, user) {
  const metaName = user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name);
  S.user = {
    id: user.id,
    email: user.email,
    name: metaName || (user.email || "").split("@")[0],
    role: "DONO",
    avatar: ((metaName || user.email || "?")[0] || "?").toUpperCase(),
    picture: user.user_metadata && user.user_metadata.avatar_url
  };
  await ensureProfile(await getSB(), user, S.user.name);
  await pullCloud(user);
  enterApp();
}
function startAppLocal(em) {
  const known = S.team.find((m) => m.email === em);
  S.user = {
    id: null,
    email: em,
    name: known ? known.name : em.split("@")[0],
    role: known ? String(known.role).toUpperCase() : "DONO",
    avatar: ((known ? known.name[0] : em[0]) || "?").toUpperCase()
  };
  localStorage.setItem(LS_SESSION, JSON.stringify({ email: em, t: Date.now() }));
  audit("Login (modo local): " + em);
  saveLocal();
  enterApp();
}
async function doLogout() {
  audit("Logout");
  saveLocal();
  if (getCfg()) { const sb = await getSB(); try { await sb.auth.signOut(); } catch (e) {} }
  localStorage.removeItem(LS_SESSION);
  location.reload();
}

// ===== BOOT =====
let navToAfterLogin = null;
function enterApp() {
  $("ls").style.display = "none";
  $("app").style.display = "block";
  $("uname").textContent = S.user.name || S.user.email;
  $("urole").textContent = S.user.role || "MEMBRO";
  const av = $("uav");
  av.textContent = S.user.avatar || (S.user.name || "?")[0].toUpperCase();
  av.style.background = "";
  applyUiPrefs();
  updateSidebarRevenue();
  setSync(getCfg() ? "cloud" : "local");
  renderPage(navToAfterLogin || "dashboard");
  navToAfterLogin = null;
  refreshNotifs();
}
function updateSidebarRevenue() {
  const income = finMetrics().income;
  const pct = Math.min((income / (S.revenueTarget || 100000)) * 100, 100);
  const el = $("rvtotal"), em = $("rvmeta"), bar = $("rvbf");
  if (el) el.textContent = fmtBRL(income);
  if (em) em.textContent = "Meta: " + fmtBRL(0) + " → " + fmtBRL(S.revenueTarget);
  if (bar) setTimeout(() => { bar.style.width = pct.toFixed(1) + "%"; }, 250);
}
window.addEventListener("load", async () => {
  loadLocal();
  applyUiPrefs();
  loginInfoText();
  if (getCfg()) {
    try {
      const sb = await getSB();
      const { data } = await sb.auth.getSession();
      if (data && data.session) { await onCloudSession(data.session, data.session.user); return; }
      sb.auth.onAuthStateChange(async (ev, sess) => {
        if (ev === "SIGNED_IN" && sess && $("app").style.display !== "block") await onCloudSession(sess, sess.user);
      });
      return;
    } catch (e) { console.warn(e); showToast("Falha ao conectar ao Supabase — usando modo local", "warn"); }
  }
  try {
    const sess = JSON.parse(localStorage.getItem(LS_SESSION) || "null");
    if (sess && sess.email && AUTH_EMAILS.includes(sess.email)) {
      const em = sess.email;
      const known = S.team.find((m) => m.email === em);
      S.user = { id: null, email: em, name: known ? known.name : em.split("@")[0], role: known ? String(known.role).toUpperCase() : "DONO", avatar: ((known ? known.name[0] : em[0]) || "?").toUpperCase() };
      enterApp();
      return;
    }
  } catch (e) {}
  if (!getCfg()) {
    $("lemail").value = AUTH_EMAILS[0];
    $("lpwd").value = "hypex2025";
  }
});

// ===== NAV =====
const PAGE_TITLES = { dashboard: "Dashboard", tasks: "Tarefas", planning: "Planejamento", products: "Produtos", vitrine: "Vitrine", sales: "Minhas Vendas", financial: "Financeiro", team: "Equipe", individual: "Relatório Individual", ads: "Anúncios", campaigns: "Campanhas", integrations: "Integrações", funnels: "Funis", appearance: "Aparência", database: "Banco de Dados", admin: "Admin", roles: "Cargos" };
let currentPage = "dashboard";
let vitrineTimer = null;
function nav(el, page) {
  document.querySelectorAll(".ni").forEach((n) => n.classList.remove("active"));
  el.classList.add("active");
  renderPage(page);
  if (window.innerWidth <= 768) closeSidebar();
  const bnavMap = { dashboard: "bnav-dashboard", tasks: "bnav-tasks", financial: "bnav-financial", campaigns: "bnav-campaigns" };
  document.querySelectorAll(".bnav-item").forEach((b) => b.classList.remove("active"));
  if (bnavMap[page]) { const bn = $(bnavMap[page]); if (bn) bn.classList.add("active"); }
}
function navTo(page) {
  let target = null;
  document.querySelectorAll(".ni[data-page]").forEach((n) => { if (n.dataset.page === page) target = n; });
  if (target) nav(target, page);
  else renderPage(page);
}
function renderPage(p) {
  currentPage = p;
  destroyCharts();
  if (vitrineTimer) { clearInterval(vitrineTimer); vitrineTimer = null; }
  closePanels();
  $("tbtitle").textContent = PAGE_TITLES[p] || p;
  const mc = $("mc");
  mc.innerHTML = "";
  const pages = { dashboard: pgDashboard, tasks: pgTasks, planning: pgPlanning, products: pgProducts, vitrine: pgVitrine, sales: pgSales, financial: pgFinancial, team: pgTeam, individual: pgIndividual, ads: pgAds, campaigns: pgCampaigns, integrations: pgIntegrations, funnels: pgFunnels, appearance: pgAppearance, database: pgDatabase, admin: pgAdmin, roles: pgRoles };
  if (pages[p]) pages[p](mc);
  else mc.innerHTML = '<div class="sh"><div class="stitle">Em desenvolvimento</div></div>';
}
function mobileNav(page, el) {
  document.querySelectorAll(".bnav-item").forEach((b) => b.classList.remove("active"));
  if (el) el.classList.add("active");
  closeSidebar();
  document.querySelectorAll(".ni").forEach((n) => n.classList.toggle("active", n.dataset.page === page));
  renderPage(page);
}
function toggleSidebar() { $("sb").classList.toggle("mobile-open"); $("sbBackdrop").classList.toggle("show"); }
function closeSidebar() { $("sb").classList.remove("mobile-open"); $("sbBackdrop").classList.remove("show"); }

// ===== TOAST / MODALS / PANELS =====
let toastT;
function showToast(msg, type) {
  const t = $("toast");
  const icons = { info: "ℹ️", ok: "✅", err: "❌", warn: "⚠️" };
  t.innerHTML = (icons[type] || icons.info) + " " + msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 3400);
}
function openM(id) { $(id).classList.add("open"); }
function closeM(id) { $(id).classList.remove("open"); }
function closePanels() { const g = $("gresults"); if (g) g.classList.remove("open"); const n = $("notifpanel"); if (n) n.classList.remove("open"); }

// ===== CHARTS =====
let chartInst = {};
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#00D9FF"; }
function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}
function chartDefaults() {
  const c = cssVar("--c");
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "rgba(255,255,255,0.6)", font: { size: 11 }, boxWidth: 10 } },
      tooltip: { backgroundColor: "rgba(6,10,26,0.95)", borderColor: hexToRgba(c, 0.3), borderWidth: 1, titleColor: c, bodyColor: "rgba(255,255,255,0.8)" }
    },
    scales: {
      x: { ticks: { color: "rgba(255,255,255,0.45)", font: { size: 10 } }, grid: { color: hexToRgba(c, 0.06) } },
      y: { ticks: { color: "rgba(255,255,255,0.45)", font: { size: 10 } }, grid: { color: hexToRgba(c, 0.06) } }
    }
  };
}
function deepMerge(a, b) {
  const out = Object.assign({}, a);
  for (const k in b) {
    if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k]) out[k] = deepMerge(a[k], b[k]);
    else out[k] = b[k];
  }
  return out;
}
function mkChart(id, type, labels, datasets, extra) {
  const ctx = $(id);
  if (!ctx || typeof Chart === "undefined") return null;
  const opts = deepMerge(chartDefaults(), extra || {});
  const cfg = { type, data: { labels, datasets }, options: opts };
  if (type === "pie" || type === "doughnut") delete cfg.options.scales;
  const ch = new Chart(ctx, cfg);
  chartInst[id] = ch;
  return ch;
}
function destroyCharts() {
  Object.values(chartInst).forEach((c) => { try { c.destroy(); } catch (e) {} });
  chartInst = {};
}

// ===== MÉTRICAS DERIVADAS =====
function finMetrics() {
  let income = 0, expenses = 0;
  (S.transactions || []).forEach((t) => { if (t.type === "Entrada") income += t.value; else expenses += t.value; });
  return { income, expenses, balance: income - expenses, netMargin: income > 0 ? ((income - expenses) / income) * 100 : 0 };
}

// ============================================================
// PÁGINAS
// ============================================================

// ===== DASHBOARD =====
function pgDashboard(mc) {
  const fm = finMetrics();
  const goalPct = Math.min((fm.income / (S.revenueTarget || 1)) * 100, 100);
  const kpis = [
    { label: "Faturamento Bruto", val: fmtBRL(fm.income), chg: goalPct.toFixed(1) + "% da meta", up: true, ico: "💰" },
    { label: "Resultado Líquido", val: fmtBRL(fm.balance), chg: "Margem " + fm.netMargin.toFixed(1) + "%", up: fm.balance >= 0, ico: "📈" },
    { label: "Despesas Registradas", val: fmtBRL(fm.expenses), chg: (S.transactions || []).filter((t) => t.type === "Saída").length + " lançamentos", up: false, ico: "💸" },
    { label: "Meta Atual", val: fmtBRL(S.revenueTarget), chg: goalPct.toFixed(1) + "% concluída", up: true, ico: "🎯", bar: goalPct },
    { label: "Tx. Conversão Média", val: (S.products.reduce((a, p) => a + p.conv, 0) / (S.products.length || 1)).toFixed(1) + "%", chg: "entre produtos", up: true, ico: "🔄" },
    { label: "Vendas (30 dias)", val: fmtNum((S.salesHistory || []).length), chg: (S.salesHistory || []).filter((s) => s.status === "Pendente").length + " pendentes", up: true, ico: "🧾" },
    { label: "Campanhas Ativas", val: fmtNum(S.campaigns.filter((c) => c.status === "Ativa").length), chg: "de " + S.campaigns.length + " totais", up: true, ico: "📢" },
    { label: "Tarefas Pendentes", val: fmtNum(S.tasks.todo.length + S.tasks.doing.length), chg: S.tasks.done.length + " concluídas", up: S.tasks.todo.length + S.tasks.doing.length <= 5, ico: "✅" }
  ];
  const monthsPt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const byMonthInc = {}, byMonthExp = {};
  (S.transactions || []).forEach((t) => {
    const d = new Date(t.date + "T12:00:00");
    const k = monthsPt[d.getMonth()];
    const tgt = t.type === "Entrada" ? byMonthInc : byMonthExp;
    tgt[k] = (tgt[k] || 0) + t.value;
  });
  const mLabels = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); mLabels.push(monthsPt[d.getMonth()]); }
  const cashLabels = [], cashData = [];
  let run = 0;
  [...(S.transactions || [])].sort((a, b) => a.date.localeCompare(b.date)).forEach((t) => {
    run += t.type === "Entrada" ? t.value : -t.value;
    cashLabels.push(t.date.slice(8));
    cashData.push(run);
  });

  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Dashboard <span style="font-size:13px;font-family:Inter;font-weight:400;color:var(--tx2)">— Visão Geral do Negócio</span></div><div class="ssub">Olá, ' + esc(S.user.name || "empreendedor") + ' 👋 — dados atualizados agora</div></div>' +
    '<button class="bg" onclick="editGoal()">🎯 Definir meta</button></div>' +
    '<div class="g4 ms" id="kpiGrid"></div>' +
    '<div class="g2 ms"><div class="gc"><div class="chead"><span class="ctitle">Receita vs Despesas</span><span class="txxs txm">6 meses</span></div><div class="chart-container" style="height:200px"><canvas id="chartRevExp"></canvas></div></div>' +
    '<div class="gc"><div class="chead"><span class="ctitle">Fluxo de Caixa Acumulado</span><span class="txxs txm">Por lançamento</span></div><div class="chart-container" style="height:200px"><canvas id="chartCash"></canvas></div></div></div>' +
    '<div class="g2 ms"><div class="gc"><div class="chead"><span class="ctitle">Gastos por Método</span><span class="txxs txm">Despesas</span></div><div class="chart-container" style="height:200px"><canvas id="chartPie"></canvas></div></div>' +
    '<div class="gc"><div class="chead"><span class="ctitle">Receita por Produto</span><span class="txxs txm">Acumulado</span></div><div class="chart-container" style="height:200px"><canvas id="chartProd"></canvas></div></div></div>' +
    '<div class="g21 ms"><div class="gc"><div class="chead"><span class="ctitle">Últimas Vendas</span><button class="bg" style="font-size:10px;padding:4px 10px" onclick="navTo(\'sales\')">Ver todas</button></div>' +
    '<table class="dtable"><thead><tr><th>Produto</th><th>Valor</th><th>Status</th><th>Data</th></tr></thead><tbody id="recentSales"></tbody></table></div>' +
    '<div class="gc"><div class="chead"><span class="ctitle">Alertas & Notificações</span></div><div id="alertsList"></div></div></div>';

  const kg = $("kpiGrid");
  kpis.forEach((k) => {
    const d = document.createElement("div");
    d.className = "gc";
    d.innerHTML = '<div class="chead"><div class="ctitle">' + k.label + '</div><div class="cico">' + k.ico + '</div></div>' +
      '<div class="cval" style="' + (k.val.indexOf("-") === 0 ? "color:var(--err)" : "") + '">' + k.val + '</div>' +
      '<div class="cchg ' + (k.up ? "up" : "down") + '">' + (k.up ? "▲" : "▼") + " " + k.chg + "</div>" +
      (typeof k.bar === "number" ? '<div class="pbar mt2"><div class="pbfill" style="width:' + k.bar.toFixed(1) + '%"></div></div>' : "");
    kg.appendChild(d);
  });
  const tb = $("recentSales");
  (S.salesHistory || []).slice(0, 6).forEach((r) => {
    tb.innerHTML += "<tr><td>" + esc(r.product) + "</td><td style=\"color:var(--ok);font-family:'Space Mono',monospace\">" + fmtBRL(r.value) + '</td><td><span class="' + (r.status === "Pago" ? "bok" : "bwarn") + ' b">' + r.status + "</span></td><td style=\"color:var(--tx3)\">" + r.date.slice(0, 10) + "</td></tr>";
  });
  const alerts = computeAlerts();
  const al = $("alertsList");
  if (!alerts.length) al.innerHTML = '<div class="empty-state"><div class="es-ico">🎉</div>Nenhum alerta. Tudo sob controle!</div>';
  alerts.forEach((a) => {
    al.innerHTML += '<div style="padding:9px 11px;margin-bottom:6px;background:rgba(0,217,255,0.04);border:1px solid var(--bd);border-radius:7px;font-size:11px;display:flex;gap:8px;align-items:center">' + a.icon + "<span>" + esc(a.msg) + "</span></div>";
  });

  setTimeout(() => {
    const c = cssVar("--c"), cn = cssVar("--cn");
    mkChart("chartRevExp", "bar", mLabels, [
      { label: "Entradas", data: mLabels.map((m) => byMonthInc[m] || 0), backgroundColor: hexToRgba(c, 0.7), borderRadius: 5 },
      { label: "Saídas", data: mLabels.map((m) => byMonthExp[m] || 0), backgroundColor: "rgba(255,51,102,0.55)", borderRadius: 5 }]);
    mkChart("chartCash", "line", cashLabels, [{ label: "Acumulado", data: cashData, borderColor: "#00FF88", backgroundColor: "rgba(0,255,136,0.08)", fill: true, tension: 0.35, pointRadius: 3 }]);
    const methods = {};
    (S.transactions || []).filter((t) => t.type === "Saída").forEach((t) => { methods[t.method] = (methods[t.method] || 0) + t.value; });
    mkChart("chartPie", "doughnut", Object.keys(methods), [{ data: Object.values(methods), backgroundColor: [hexToRgba(c, 0.85), hexToRgba(cn, 0.5), "rgba(255,184,0,0.7)", "rgba(255,51,102,0.7)", "rgba(180,0,255,0.6)"], borderColor: "transparent", borderWidth: 2 }], { plugins: { legend: { position: "right" } } });
    mkChart("chartProd", "bar", S.products.map((p) => p.name), [{ label: "Receita (R$)", data: S.products.map((p) => p.revenue), backgroundColor: [hexToRgba(c, 0.8), hexToRgba(cn, 0.55), "rgba(255,184,0,0.6)"], borderRadius: 6 }]);
  }, 100);
}
function editGoal() {
  const v = prompt("Defina sua meta de faturamento (R$):", String(S.revenueTarget));
  if (v === null) return;
  const n = parseFloat(v.replace(",", "."));
  if (isNaN(n) || n <= 0) return showToast("Valor inválido", "err");
  S.revenueTarget = n;
  logAndTouch("Meta alterada para " + fmtBRL(n));
  updateSidebarRevenue();
  renderPage(currentPage);
  showToast("🎯 Meta atualizada!", "ok");
}

// ===== TAREFAS (KANBAN) =====
function pgTasks(mc) {
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Tarefas</div><div class="ssub">Kanban Board — arraste os cartões entre as colunas</div></div>' +
    '<button class="bp" onclick="openM(\'taskmod\')">+ Nova Tarefa</button></div>' +
    '<div class="kboard">' +
    '<div class="kcol" id="col-todo" ondragover="dOver(event)" ondrop="dDrop(event,\'todo\')"><div class="kcolh"><span class="kcolt">📝 Para Fazer</span><span class="kcnt" id="cnt-todo">0</span></div><div class="kcards" id="cards-todo"></div></div>' +
    '<div class="kcol" id="col-doing" ondragover="dOver(event)" ondrop="dDrop(event,\'doing\')"><div class="kcolh"><span class="kcolt" style="color:var(--warn)">⚙ Em Andamento</span><span class="kcnt" id="cnt-doing">0</span></div><div class="kcards" id="cards-doing"></div></div>' +
    '<div class="kcol" id="col-done" ondragover="dOver(event)" ondrop="dDrop(event,\'done\')"><div class="kcolh"><span class="kcolt" style="color:var(--ok)">✔ Concluído</span><span class="kcnt" id="cnt-done">0</span></div><div class="kcards" id="cards-done"></div></div>' +
    "</div>";
  renderKanban();
}
function renderKanban() {
  ["todo", "doing", "done"].forEach((col) => {
    const el = $("cards-" + col);
    if (!el) return;
    el.innerHTML = "";
    (S.tasks[col] || []).forEach((t) => {
      const d = document.createElement("div");
      d.className = "kcard";
      d.draggable = true;
      d.dataset.id = t.id;
      const overdue = col !== "done" && t.due && daysDiff(t.due) < 0;
      d.innerHTML = '<div class="ktitle">' + esc(t.title) + (overdue ? ' <span class="berr b">atrasada</span>' : "") + '</div>' +
        '<div class="kmeta"><div class="pdot ' + (t.pri === "high" ? "ph" : t.pri === "med" ? "pm" : "pl") + '"></div>' +
        '<div style="font-size:10px;color:var(--tx3)">' + esc(t.due || "") + "</div>" +
        '<div style="font-size:10px;color:var(--tx3)">' + esc(t.assignee || "") + "</div>" +
        '<span class="kdel" data-del="' + t.id + "|" + col + '">🗑</span></div>';
      d.addEventListener("dragstart", (e) => { dragCard = t; dragCol = col; d.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; });
      d.addEventListener("dragend", () => d.classList.remove("dragging"));
      d.querySelector("[data-del]").addEventListener("click", () => delTask(t.id, col));
      el.appendChild(d);
    });
    const cnt = $("cnt-" + col);
    if (cnt) cnt.textContent = (S.tasks[col] || []).length;
  });
}
let dragCard = null, dragCol = null;
function dOver(e) { e.preventDefault(); e.currentTarget.classList.add("drag-target"); }
function dDrop(e, targetCol) {
  e.preventDefault();
  document.querySelectorAll(".kcol").forEach((c) => c.classList.remove("drag-target"));
  if (!dragCard || dragCol === targetCol) return;
  S.tasks[dragCol] = S.tasks[dragCol].filter((t) => t.id !== dragCard.id);
  S.tasks[targetCol].push(dragCard);
  logAndTouch("Tarefa movida: " + dragCard.title + " → " + targetCol);
  dragCard = null; dragCol = null;
  renderKanban();
  refreshNotifs();
  showToast("📌 Tarefa movida!", "ok");
}
function addTask() {
  const t = $("ti").value.trim();
  if (!t) return showToast("Dê um título à tarefa", "warn");
  S.tasks.todo.push({ id: uid(), title: t, pri: $("tpri").value, due: $("tdue").value, assignee: $("tass").value.trim() });
  closeM("taskmod"); $("ti").value = ""; $("tdue").value = ""; $("tass").value = "";
  logAndTouch("Tarefa criada: " + t);
  refreshNotifs();
  if (currentPage === "tasks") renderKanban();
  showToast("✅ Tarefa criada!", "ok");
}
function delTask(id, col) {
  const t = S.tasks[col].find((x) => x.id === id);
  S.tasks[col] = S.tasks[col].filter((x) => x.id !== id);
  logAndTouch("Tarefa removida: " + (t ? t.title : "#" + id));
  renderKanban();
  refreshNotifs();
  showToast("🗑 Tarefa removida");
}


// ===== PLANEJAMENTO =====
function pgPlanning(mc) {
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Planejamento</div><div class="ssub">Calendário completo de eventos</div></div>' +
    '<button class="bg" onclick="openM(\'evtmod\')">+ Novo Evento</button></div>' +
    '<div class="g21"><div class="gc"><div class="calh"><div class="calt" id="calTitle"></div><div class="calnav"><div class="calnb" onclick="changeMonth(-1)">‹</div><div class="calnb" onclick="changeMonth(1)">›</div></div></div><div class="calgrid" id="calGrid"></div></div>' +
    '<div class="gc"><div class="chead"><span class="ctitle">Próximos Eventos</span></div><div id="eventList"></div></div></div>';
  if (!S.calDate) S.calDate = new Date(); else S.calDate = new Date(S.calDate);
  renderCal();
}
function renderCal() {
  const d = S.calDate;
  const mn = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const title = $("calTitle");
  if (!title) return;
  title.textContent = mn[d.getMonth()] + " " + d.getFullYear();
  const grid = $("calGrid");
  grid.innerHTML = "";
  ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((dn) => {
    const h = document.createElement("div"); h.className = "caldname"; h.textContent = dn; grid.appendChild(h);
  });
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const today = new Date();
  for (let i = 0; i < first.getDay(); i++) {
    const prev = new Date(d.getFullYear(), d.getMonth(), -(first.getDay() - i - 1));
    const dd = document.createElement("div"); dd.className = "calday om"; dd.textContent = prev.getDate(); grid.appendChild(dd);
  }
  for (let i = 1; i <= last.getDate(); i++) {
    const dd = document.createElement("div"); dd.className = "calday";
    if (i === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) dd.classList.add("today");
    const dateStr = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(i);
    if ((S.events || []).some((e) => e.date === dateStr)) dd.classList.add("hev");
    dd.textContent = i;
    dd.onclick = () => { $("edate").value = dateStr; openM("evtmod"); };
    grid.appendChild(dd);
  }
  const el = $("eventList");
  el.innerHTML = "";
  const catIcons = { meet: "🔵", launch: "🟢", dead: "🔴", pers: "🟡" };
  const sorted = [...(S.events || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) { el.innerHTML = '<div class="empty-state">Nenhum evento cadastrado.<br>Clique num dia do calendário para criar.</div>'; return; }
  sorted.forEach((e) => {
    const dd = daysDiff(e.date);
    const rel = dd === 0 ? "Hoje" : dd === 1 ? "Amanhã" : dd > 1 ? "Em " + dd + " dias" : Math.abs(dd) + " dias atrás";
    el.innerHTML += '<div style="padding:10px;background:rgba(0,217,255,0.04);border:1px solid var(--bd);border-radius:8px;margin-bottom:7px;display:flex;gap:10px;align-items:center">' +
      '<span style="font-size:18px">' + (catIcons[e.cat] || "📅") + "</span>" +
      '<div><div style="font-size:12px;font-weight:500">' + esc(e.title) + '</div><div style="font-size:10px;color:var(--tx3)">' + e.date + " · " + rel + '</div></div>' +
      '<span class="kdel" data-evdel="' + e.id + '">🗑</span></div>';
  });
  el.querySelectorAll("[data-evdel]").forEach((s) => s.addEventListener("click", () => delEvent(Number(s.dataset.evdel))));
}
function changeMonth(delta) { S.calDate = new Date(S.calDate.getFullYear(), S.calDate.getMonth() + delta, 1); touch(true); renderCal(); }
function addEvent() {
  const t = $("eti").value.trim(); const dt = $("edate").value;
  if (!t || !dt) return showToast("Preencha título e data", "warn");
  S.events.push({ id: uid(), title: t, date: dt, cat: $("ecat").value });
  closeM("evtmod"); $("eti").value = "";
  logAndTouch("Evento criado: " + t);
  refreshNotifs();
  if (currentPage === "planning") renderCal();
  showToast("📅 Evento adicionado!", "ok");
}
function delEvent(id) {
  const ev = S.events.find((e) => e.id === id);
  S.events = S.events.filter((e) => e.id !== id);
  logAndTouch("Evento removido: " + (ev ? ev.title : "#" + id));
  refreshNotifs();
  renderCal();
}

// ===== PRODUTOS =====
function pgProducts(mc) {
  const t = S.activeTabProducts || "myprods";
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Produtos</div><div class="ssub">Gerencie seus produtos e afiliações</div></div>' +
    '<button class="bp" onclick="openM(\'prodmod\')">+ Novo Produto</button></div>' +
    '<div class="tabs"><div class="tab ' + (t === "myprods" ? "active" : "") + '" data-ptab="myprods">📦 Meus Produtos</div>' +
    '<div class="tab ' + (t === "affils" ? "active" : "") + '" data-ptab="affils">🔗 Minhas Afiliações</div></div>' +
    '<div id="prodContent"></div>';
  mc.querySelectorAll("[data-ptab]").forEach((el) => el.addEventListener("click", () => setProductsTab(el.dataset.ptab)));
  renderProductsTab(t);
}
function setProductsTab(tab) { S.activeTabProducts = tab; touch(true); renderPage("products"); }
function renderProductsTab(t) {
  const pc = $("prodContent");
  if (!pc) return;
  if (t === "affils") {
    pc.innerHTML = '<div class="gc tbl-wrap"><table class="dtable"><thead><tr><th>Plataforma</th><th>Comissão</th><th>Vendas</th><th>Lucro</th><th>Ação</th></tr></thead><tbody id="affTable"></tbody></table></div>';
    const at = $("affTable");
    if (!(S.affiliations || []).length) { at.innerHTML = '<tr><td colspan="5"><div class="empty-state">Nenhuma afiliação cadastrada.</div></td></tr>'; return; }
    S.affiliations.forEach((a) => {
      at.innerHTML += "<tr><td><strong>" + esc(a.platform) + "</strong></td><td><span class=\"bcyan\">" + a.commission + "%</span></td><td>" + a.sales + "</td>" +
        "<td style=\"color:var(--ok);font-family:'Space Mono',monospace\">" + fmtBRL(a.profit) + "</td>" +
        "<td><button class=\"bg danger\" data-afdel=\"" + a.id + "\" style=\"font-size:10px;padding:3px 9px\">Remover</button></td></tr>";
    });
    at.querySelectorAll("[data-afdel]").forEach((b) => b.addEventListener("click", () => delAffil(Number(b.dataset.afdel))));
    return;
  }
  pc.innerHTML = '<div class="gc tbl-wrap"><table class="dtable"><thead><tr><th>Nome</th><th>Nicho</th><th>Preço</th><th>Receita</th><th>Conversão</th><th>Ação</th></tr></thead><tbody id="prodTable"></tbody></table></div>';
  const pt = $("prodTable");
  if (!S.products.length) { pt.innerHTML = '<tr><td colspan="6"><div class="empty-state">Nenhum produto. Clique em "+ Novo Produto".</div></td></tr>'; return; }
  S.products.forEach((p) => {
    pt.innerHTML += "<tr><td><strong>" + esc(p.name) + "</strong></td><td>" + esc(p.niche) + "</td>" +
      "<td style=\"font-family:'Space Mono',monospace\">" + fmtBRL(p.price) + "</td>" +
      "<td style=\"color:var(--ok);font-family:'Space Mono',monospace\">" + fmtBRL(p.revenue) + "</td>" +
      "<td><span class=\"bcyan\">" + p.conv + "%</span></td>" +
      "<td><button class=\"bg danger\" data-pdel=\"" + p.id + "\" style=\"font-size:10px;padding:3px 9px\">Remover</button></td></tr>";
  });
  pt.querySelectorAll("[data-pdel]").forEach((b) => b.addEventListener("click", () => delProduct(Number(b.dataset.pdel))));
}
function addProduct() {
  const n = $("pni").value.trim();
  if (!n) return showToast("Informe o nome do produto", "warn");
  S.products.push({ id: uid(), name: n, niche: $("pniche").value.trim() || "Geral", price: parseFloat($("pprice").value) || 0, revenue: 0, conv: 0 });
  closeM("prodmod"); $("pni").value = ""; $("pniche").value = ""; $("pprice").value = "";
  logAndTouch("Produto criado: " + n);
  renderProductsTab(S.activeTabProducts || "myprods");
  showToast("📦 Produto adicionado!", "ok");
}
function delProduct(id) {
  const p = S.products.find((x) => x.id === id);
  S.products = S.products.filter((x) => x.id !== id);
  logAndTouch("Produto removido: " + (p ? p.name : "#" + id));
  renderProductsTab(S.activeTabProducts || "myprods");
  showToast("🗑 Produto removido");
}
function delAffil(id) {
  S.affiliations = S.affiliations.filter((x) => x.id !== id);
  logAndTouch("Afiliação removida #" + id);
  renderProductsTab("affils");
}

// ===== VITRINE =====
function pgVitrine(mc) {
  mc.innerHTML =
    '<div class="sh"><div class="stitle">Vitrine</div><div class="ssub">Produtos validados e em teste</div></div>' +
    '<div class="g3">' + S.products.map((p) =>
      '<div class="gc"><div style="font-size:18px;margin-bottom:9px">🏆</div>' +
      '<div class="orb" style="font-size:13px;font-weight:700;margin-bottom:4px">' + esc(p.name) + "</div>" +
      '<div style="font-size:11px;color:var(--tx2);margin-bottom:12px">' + esc(p.niche) + "</div>" +
      '<div class="flex jb mb2"><span class="txxs txm">Preço</span><span class="txs mono txc">' + fmtBRL(p.price) + "</span></div>" +
      '<div class="flex jb mb2"><span class="txxs txm">Conversão</span><span class="txs mono txc">' + p.conv + "%</span></div>" +
      '<div class="flex jb mb3"><span class="txxs txm">Faturamento</span><span class="txs mono txok">' + fmtBRL(p.revenue) + "</span></div>" +
      '<div class="pbar"><div class="pbfill" style="width:' + Math.min(p.conv * 15, 100) + '%"></div></div></div>'
    ).join("") + "</div>" +
    '<div class="gc mt4"><div class="chead"><span class="ctitle">⏳ Produtos em Teste (validação de 3 dias)</span><button class="bg" id="addTestBtn">+ Enviar para teste</button></div>' +
    '<div class="g3 mt2" id="testGrid"></div></div>';
  $("addTestBtn").addEventListener("click", addTestProduct);
  renderTestGrid();
  vitrineTimer = setInterval(renderTestGrid, 1000);
}
function renderTestGrid() {
  const g = $("testGrid");
  if (!g) return;
  g.innerHTML = (S.testProducts || []).map((p) => {
    const left = p.endsAt - Date.now();
    const done = left <= 0;
    const dd = done ? "Concluído" : Math.floor(left / 86400000) + "d " + Math.floor((left % 86400000) / 3600000) + "h " + Math.floor((left % 3600000) / 60000) + "m " + Math.floor((left % 60000) / 1000) + "s";
    return '<div style="padding:14px;background:rgba(255,184,0,0.06);border:1px solid rgba(255,184,0,0.2);border-radius:9px">' +
      '<div style="font-weight:600;font-size:13px;margin-bottom:6px">🧪 ' + esc(p.name) + "</div>" +
      '<div style="font-size:10px;color:var(--tx2);margin-bottom:8px">' + (done ? "Teste finalizado" : "Teste ativo") + "</div>" +
      '<div class="orb" style="font-size:14px;color:' + (done ? "var(--ok)" : "var(--warn)") + '">' + dd + "</div>" +
      '<div style="display:flex;gap:6px;margin-top:9px">' +
      (done ? '<button class="bp" data-promote="' + p.id + '" style="flex:1;font-size:9px;padding:5px">✔ Validar</button>' : "") +
      '<button class="bg danger" data-testdel="' + p.id + '" style="flex:1;font-size:9px;padding:5px">Descartar</button></div></div>';
  }).join("") || '<div class="empty-state" style="grid-column:1/-1">Nenhum produto em teste.</div>';
  g.querySelectorAll("[data-promote]").forEach((b) => b.addEventListener("click", () => promoteTestProduct(Number(b.dataset.promote))));
  g.querySelectorAll("[data-testdel]").forEach((b) => b.addEventListener("click", () => delTestProduct(Number(b.dataset.testdel))));
}
function addTestProduct() {
  const name = prompt("Nome do produto para teste:");
  if (!name) return;
  S.testProducts.push({ id: uid(), name: name.trim(), endsAt: Date.now() + 3 * 86400000 });
  logAndTouch("Produto enviado para teste: " + name.trim());
  renderTestGrid();
  showToast("🧪 Produto em teste por 3 dias", "ok");
}
function promoteTestProduct(id) {
  const p = (S.testProducts || []).find((x) => x.id === id);
  if (!p) return;
  S.products.push({ id: uid(), name: p.name, niche: "Validado", price: 197, revenue: 0, conv: 0 });
  S.testProducts = S.testProducts.filter((x) => x.id !== id);
  logAndTouch("Produto validado na vitrine: " + p.name);
  renderPage("vitrine");
  showToast("🏆 Produto promovido para Vitrine!", "ok");
}
function delTestProduct(id) {
  S.testProducts = S.testProducts.filter((x) => x.id !== id);
  touch();
  renderTestGrid();
}

// ===== VENDAS =====
let salesFilterProduct = "";
function pgSales(mc) {
  salesFilterProduct = salesFilterProduct || "";
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Minhas Vendas</div><div class="ssub">Relatórios de performance dos últimos 30 dias</div></div>' +
    '<div class="flex gap2"><select class="fi" id="salesFilterSel" style="width:170px;padding:7px 10px"><option value="">Todos os Produtos</option>' +
    S.products.map((p) => '<option value="' + esc(p.name) + '"' + (salesFilterProduct === p.name ? " selected" : "") + ">" + esc(p.name) + "</option>").join("") +
    '</select><button class="bp" id="exportSalesBtn">⬇ Exportar CSV</button></div></div>' +
    '<div class="g4 ms" id="salesKpis"></div>' +
    '<div class="g21 ms"><div class="gc"><div class="chead"><span class="ctitle">Vendas por Produto</span></div><div class="chart-container" style="height:220px"><canvas id="chartSalesBar"></canvas></div></div>' +
    '<div class="gc"><div class="chead"><span class="ctitle">Receita por Dia</span></div><div class="chart-container" style="height:220px"><canvas id="chartSalesLine"></canvas></div></div></div>' +
    '<div class="gc tbl-wrap"><div class="chead"><span class="ctitle">Histórico de Vendas</span><span class="txxs txm" id="salesCount"></span></div>' +
    '<table class="dtable"><thead><tr><th>#</th><th>Produto</th><th>Comprador</th><th>Valor</th><th>Plataforma</th><th>Status</th><th>Data</th></tr></thead><tbody id="salesTbl"></tbody></table></div>';
  $("salesFilterSel").addEventListener("change", function () { salesFilterProduct = this.value; renderSalesKpis(); renderSalesRows(); });
  $("exportSalesBtn").addEventListener("click", exportSalesCsv);
  renderSalesKpis();
  renderSalesRows();
  setTimeout(() => {
    mkChart("chartSalesBar", "bar", S.products.map((p) => p.name), [{ label: "Receita (R$)", data: S.products.map((p) => p.revenue), backgroundColor: hexToRgba(cssVar("--c"), 0.7), borderRadius: 6 }]);
    const dayMap = {};
    (S.salesHistory || []).forEach((s) => { const k = s.date.slice(0, 10); dayMap[k] = (dayMap[k] || 0) + s.value; });
    const days = Object.keys(dayMap).sort().slice(-14);
    mkChart("chartSalesLine", "line", days.map((k) => k.slice(5)), [{ label: "Receita (R$)", data: days.map((k) => dayMap[k]), borderColor: cssVar("--c"), backgroundColor: hexToRgba(cssVar("--c"), 0.08), fill: true, tension: 0.35, pointRadius: 3 }]);
  }, 100);
}
function filteredSales() { return salesFilterProduct ? (S.salesHistory || []).filter((s) => s.product === salesFilterProduct) : (S.salesHistory || []); }
function renderSalesKpis() {
  const all = filteredSales();
  const today = all.filter((s) => s.date.slice(0, 10) === todayStr());
  const avg = all.length ? all.reduce((a, s) => a + s.value, 0) / all.length : 0;
  const pend = all.filter((s) => s.status === "Pendente").length;
  $("salesKpis").innerHTML =
    '<div class="gc"><div class="ctitle mb2">Vendas Hoje</div><div class="cval txc">' + today.length + '</div><div class="cchg up">▲ registros de hoje</div></div>' +
    '<div class="gc"><div class="ctitle mb2">Receita Total</div><div class="cval" style="font-size:20px">' + fmtBRL(all.reduce((a, s) => a + s.value, 0)) + '</div><div class="cchg up">▲ no filtro atual</div></div>' +
    '<div class="gc"><div class="ctitle mb2">Ticket Médio</div><div class="cval txc" style="font-size:20px">' + fmtBRL(avg) + '</div><div class="cchg up">▲ média histórica</div></div>' +
    '<div class="gc"><div class="ctitle mb2">Pendentes</div><div class="cval" style="color:var(--warn)">' + pend + '</div><div class="cchg down">aguardando confirmação</div></div>';
}
function renderSalesRows() {
  const st = $("salesTbl");
  if (!st) return;
  const rows = filteredSales();
  $("salesCount").textContent = rows.length + " venda(s)";
  if (!rows.length) { st.innerHTML = '<tr><td colspan="7"><div class="empty-state">Nenhuma venda encontrada.</div></td></tr>'; return; }
  st.innerHTML = rows.map((r, i) =>
    "<tr><td style=\"color:var(--tx3)\">" + (i + 1) + "</td><td>" + esc(r.product) + "</td><td>" + esc(r.buyer) + "</td>" +
    "<td style=\"color:var(--ok);font-family:'Space Mono',monospace\">" + fmtBRL(r.value) + "</td><td>" + esc(r.platform) + "</td>" +
    '<td><span class="' + (r.status === "Pago" ? "bok" : "bwarn") + ' b">' + r.status + "</span></td>" +
    "<td style=\"color:var(--tx3)\">" + r.date.slice(0, 10) + "</td></tr>"
  ).join("");
}
function exportSalesCsv() {
  const rows = [["#", "Produto", "Comprador", "Valor", "Plataforma", "Status", "Data"]];
  filteredSales().forEach((r, i) => rows.push([i + 1, r.product, r.buyer, String(r.value.toFixed(2)).replace(".", ","), r.platform, r.status, r.date.slice(0, 10)]));
  downloadCsv("hypex-vendas.csv", rows);
  audit("Exportou CSV de vendas");
  saveLocal();
  showToast("⬇ CSV exportado!", "ok");
}

// ===== FINANCEIRO =====
function pgFinancial(mc) {
  const fm = finMetrics();
  const methods = {};
  (S.transactions || []).forEach((t) => { methods[t.method] = (methods[t.method] || 0) + 1; });
  const totalTx = (S.transactions || []).length || 1;
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Financeiro</div><div class="ssub">Controle financeiro completo da empresa</div></div>' +
    '<div class="flex gap2"><button class="bg" id="exportFinBtn">⬇ Exportar CSV</button><button class="bp" onclick="openM(\'transmod\')">+ Novo Lançamento</button></div></div>' +
    '<div class="g4 ms">' +
    '<div class="gc"><div class="ctitle mb2">Resultado Líquido</div><div class="cval" style="font-size:22px;color:' + (fm.balance >= 0 ? "var(--c)" : "var(--err)") + '">' + fmtBRL(fm.balance) + '</div><div class="cchg up">entradas − saídas</div></div>' +
    '<div class="gc"><div class="ctitle mb2">Entradas</div><div class="cval txok" style="font-size:22px">' + fmtBRL(fm.income) + '</div><div class="cchg up">▲ acumulado</div></div>' +
    '<div class="gc"><div class="ctitle mb2">Saídas</div><div class="cval" style="color:var(--err);font-size:22px">' + fmtBRL(fm.expenses) + '</div><div class="cchg down">▼ acumulado</div></div>' +
    '<div class="gc"><div class="ctitle mb2">Margem Líquida</div><div class="cval txw" style="font-size:22px">' + fm.netMargin.toFixed(1) + '%</div><div class="cchg up">▲ rentabilidade</div></div></div>' +
    '<div class="g21 ms"><div class="gc tbl-wrap"><div class="chead"><span class="ctitle">Extrato Financeiro</span><span class="txxs txm">' + (S.transactions || []).length + ' lançamentos</span></div>' +
    '<table class="dtable"><thead><tr><th>Descrição</th><th>Método</th><th>Tipo</th><th>Valor</th><th>Data</th><th></th></tr></thead><tbody id="extratTbl"></tbody></table></div>' +
    '<div><div class="gc mb3"><div class="chead"><span class="ctitle">Métodos Utilizados</span></div>' +
    Object.keys(methods).map((m) => '<div class="flex aic jb mb2"><span>' + esc(m) + '</span><span class="bcyan">' + Math.round(methods[m] / totalTx * 100) + '%</span></div>').join("") + "</div>" +
    '<div class="gc"><div class="chead"><span class="ctitle">Resumo por Tipo</span></div>' +
    '<div class="flex aic jb mb2" style="font-size:12px"><span>🟢 Entradas</span><span style="color:var(--ok)">' + fmtBRL(fm.income) + "</span></div>" +
    '<div class="flex aic jb mb2" style="font-size:12px"><span>🔴 Saídas</span><span style="color:var(--err)">' + fmtBRL(fm.expenses) + "</span></div>" +
    '<div class="flex aic jb" style="font-size:12px;border-top:1px solid var(--bd);padding-top:8px"><span><strong>Líquido</strong></span><span style="color:' + (fm.balance >= 0 ? "var(--ok)" : "var(--err)") + '"><strong>' + fmtBRL(fm.balance) + "</strong></span></div></div></div></div>";
  $("exportFinBtn").addEventListener("click", exportFinCsv);
  renderExtract();
}
function renderExtract() {
  const et = $("extratTbl");
  if (!et) return;
  const rows = [...(S.transactions || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  if (!rows.length) { et.innerHTML = '<tr><td colspan="6"><div class="empty-state">Sem lançamentos. Adicione o primeiro!</div></td></tr>'; return; }
  et.innerHTML = rows.map((r) =>
    "<tr><td>" + esc(r.desc) + '</td><td><span class="bcyan">' + esc(r.method) + "</span></td>" +
    '<td><span class="' + (r.type === "Entrada" ? "bok" : "berr") + ' b">' + r.type + "</span></td>" +
    "<td style=\"color:" + (r.type === "Entrada" ? "var(--ok)" : "var(--err)") + ";font-family:'Space Mono',monospace\">" + (r.type === "Entrada" ? "+" : "−") + " " + fmtBRL(r.value) + "</td>" +
    "<td style=\"color:var(--tx3)\">" + r.date + "</td>" +
    '<td><span class="kdel" data-trdel="' + r.id + '">🗑</span></td></tr>'
  ).join("");
  et.querySelectorAll("[data-trdel]").forEach((s) => s.addEventListener("click", () => delTransaction(Number(s.dataset.trdel))));
}
function addTransaction() {
  const d = $("trd").value.trim();
  const v = parseFloat($("trv").value.replace(",", "."));
  if (!d || isNaN(v) || v <= 0) return showToast("Preencha descrição e valor válidos", "warn");
  S.transactions.push({ id: uid(), desc: d, type: $("trt").value, value: v, method: $("trm").value, date: todayStr() });
  closeM("transmod"); $("trd").value = ""; $("trv").value = "";
  logAndTouch("Lançamento financeiro: " + d + " (" + fmtBRL(v) + ")");
  updateSidebarRevenue();
  refreshNotifs();
  if (currentPage === "financial") renderPage("financial");
  showToast("💾 Lançamento registrado!", "ok");
}
function delTransaction(id) {
  S.transactions = S.transactions.filter((t) => t.id !== id);
  logAndTouch("Lançamento removido #" + id);
  updateSidebarRevenue();
  renderPage("financial");
}
function exportFinCsv() {
  const rows = [["Descrição", "Tipo", "Método", "Valor", "Data"]];
  (S.transactions || []).forEach((t) => rows.push([t.desc, t.type, t.method, String(t.value.toFixed(2)).replace(".", ","), t.date]));
  downloadCsv("hypex-financeiro.csv", rows);
  audit("Exportou CSV financeiro");
  saveLocal();
  showToast("⬇ CSV exportado!", "ok");
}
function downloadCsv(name, rows) {
  const csv = rows.map((r) => r.map((c) => '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}


// ===== EQUIPE =====
function pgTeam(mc) {
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Equipe</div><div class="ssub">Gerencie membros e permissões</div></div>' +
    '<button class="bp" onclick="openM(\'invmod\')">+ Adicionar Membro</button></div>' +
    '<div class="gc mb4 tbl-wrap"><div class="chead"><span class="ctitle">Membros da Equipe</span></div>' +
    '<table class="dtable"><thead><tr><th>Membro</th><th>Cargo</th><th>Vendas</th><th>Faturamento</th><th>Comissão</th><th>Status</th><th></th></tr></thead><tbody id="teamTbl"></tbody></table></div>' +
    '<div class="g3"><div class="gc"><div class="ctitle mb2">Total Membros</div><div class="cval txc">' + S.team.length + "</div></div>" +
    '<div class="gc"><div class="ctitle mb2">Vendas Totais</div><div class="cval">' + S.team.reduce((a, t) => a + t.sales, 0) + "</div></div>" +
    '<div class="gc"><div class="ctitle mb2">Comissões Pagas</div><div class="cval txok" style="font-size:18px">' + fmtBRL(S.team.reduce((a, t) => a + t.commission, 0)) + "</div></div></div>";
  const tt = $("teamTbl");
  const roleColors = { Dono: "bcyan", "Sócio": "bok", Administrador: "bwarn", Gerente: "bwarn", Colaborador: "bcyan" };
  S.team.forEach((m) => {
    tt.innerHTML += "<tr>" +
      '<td><div class="flex aic gap2"><div class="uav" style="width:26px;height:26px;font-size:11px">' + esc((m.name || "?")[0]) + '</div><div><div style="font-size:12px;font-weight:500">' + esc(m.name) + '</div><div style="font-size:10px;color:var(--tx3)">' + esc(m.email) + "</div></div></div></td>" +
      '<td><span class="' + (roleColors[m.role] || "b") + ' b">' + esc(m.role) + "</span></td>" +
      "<td>" + m.sales + "</td>" +
      "<td style=\"color:var(--ok);font-family:'Space Mono',monospace\">" + fmtBRL(m.revenue) + "</td>" +
      "<td style=\"color:var(--warn);font-family:'Space Mono',monospace\">" + fmtBRL(m.commission) + "</td>" +
      '<td><span class="' + (m.status === "Ativo" ? "bok" : "bwarn") + ' b">' + esc(m.status || "Ativo") + "</span></td>" +
      "<td>" + (m.role !== "Dono" ? '<button class="bg danger" data-mdel="' + m.id + '" style="font-size:10px;padding:3px 8px">Remover</button>' : "") + "</td></tr>";
  });
  tt.querySelectorAll("[data-mdel]").forEach((b) => b.addEventListener("click", () => removeMember(Number(b.dataset.mdel))));
}
async function sendInvite() {
  const nm = $("iname").value.trim();
  const em = $("imail").value.trim();
  const role = $("irole").value;
  if (!nm || !em || em.indexOf("@") < 1) return showToast("Preencha nome e email válidos", "err");
  if (S.team.some((m) => m.email.toLowerCase() === em.toLowerCase())) return showToast("Este email já está na equipe", "err");
  S.team.push({ id: uid(), name: nm, email: em, role, sales: 0, revenue: 0, commission: 0, status: "Convite pendente" });
  closeM("invmod"); $("iname").value = ""; $("imail").value = "";
  logAndTouch("Membro adicionado: " + nm + " (" + role + ")");
  pgTeam($("mc"));
  showToast("✉ " + nm + " adicionado à equipe!", "ok");
  if (getEmailJSCfg()) {
    const r = await emailSend(em, nm,
      "Olá " + nm + "! Você foi convidado para a plataforma HYPEX WAVE como " + role +
      ". Acesse: https://rodriguezrdz.github.io/hypex-wave/ e crie sua conta com o email " + em + ".");
    showToast(r.ok ? "📧 Convite enviado por email para " + em : "⚠ Membro salvo, mas o email falhou (" + r.reason + ")", r.ok ? "ok" : "warn");
  }
}
function removeMember(id) {
  const m = S.team.find((x) => x.id === id);
  S.team = S.team.filter((x) => x.id !== id);
  logAndTouch("Membro removido: " + (m ? m.name : "#" + id));
  pgTeam($("mc"));
  showToast("🗑 Membro removido");
}

// ===== RELATÓRIO INDIVIDUAL =====
function pgIndividual(mc) {
  mc.innerHTML =
    '<div class="sh"><div class="stitle">Relatório Individual</div><div class="ssub">Performance por membro da equipe</div></div>' +
    '<div class="flex gap2 mb4" style="flex-wrap:wrap">' + S.team.map((t, i) => '<button class="bg" data-member="' + i + '" id="mbtn' + i + '">' + esc(t.name) + "</button>").join("") + "</div>" +
    '<div id="memberReport"></div>';
  mc.querySelectorAll("[data-member]").forEach((b) => b.addEventListener("click", () => showMemberReport(Number(b.dataset.member))));
  showMemberReport(0);
}
function showMemberReport(i) {
  document.querySelectorAll("[id^=mbtn]").forEach((b) => { b.style.background = ""; b.style.borderColor = ""; b.style.color = ""; });
  const btn = $("mbtn" + i);
  if (btn) { btn.style.background = "rgba(0,217,255,0.15)"; btn.style.borderColor = "var(--c)"; btn.style.color = "var(--c)"; }
  const m = S.team[i];
  if (!m) return;
  const commAcc = Math.round(m.commission * 3);
  const monthsName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  $("memberReport").innerHTML =
    '<div class="g4 ms">' +
    '<div class="gc"><div class="ctitle mb2">Vendas Totais</div><div class="cval txc">' + m.sales + "</div></div>" +
    '<div class="gc"><div class="ctitle mb2">Faturamento</div><div class="cval txok" style="font-size:18px">' + fmtBRL(m.revenue) + "</div></div>" +
    '<div class="gc"><div class="ctitle mb2">Comissão do Mês</div><div class="cval" style="color:var(--warn);font-size:18px">' + fmtBRL(m.commission) + "</div></div>" +
    '<div class="gc"><div class="ctitle mb2">Comissão Acumulada</div><div class="cval" style="color:var(--warn);font-size:18px">' + fmtBRL(commAcc) + "</div></div></div>" +
    '<div class="g3 ms">' +
    '<div class="gc"><div class="ctitle mb2">🏢 Empresa (85%)</div><div class="orb" style="font-size:28px;color:var(--c)">85%</div><div style="font-size:11px;color:var(--tx2);margin-top:4px">' + fmtBRL(m.revenue * 0.85) + "</div></div>" +
    '<div class="gc"><div class="ctitle mb2">👤 Funcionário (10%)</div><div class="orb" style="font-size:28px;color:var(--ok)">10%</div><div style="font-size:11px;color:var(--tx2);margin-top:4px">' + fmtBRL(m.revenue * 0.1) + "</div></div>" +
    '<div class="gc"><div class="ctitle mb2">🛡 Reserva Op. (5%)</div><div class="orb" style="font-size:28px;color:var(--warn)">5%</div><div style="font-size:11px;color:var(--tx2);margin-top:4px">' + fmtBRL(m.revenue * 0.05) + "</div></div></div>" +
    '<div class="gc tbl-wrap"><div class="chead"><span class="ctitle">Histórico de Comissões — ' + esc(m.name) + "</span></div>" +
    '<table class="dtable"><thead><tr><th>Período</th><th>Vendas</th><th>Faturamento</th><th>Comissão (10%)</th><th>Status</th></tr></thead><tbody>' +
    [1, 0.9, 0.8].map((f, idx) => {
      const dt = new Date(); dt.setMonth(dt.getMonth() - idx);
      return "<tr><td>" + monthsName[dt.getMonth()] + " " + dt.getFullYear() + "</td><td>" + Math.round(m.sales * f) + "</td>" +
        '<td style="color:var(--ok)">' + fmtBRL(Math.round(m.revenue * f)) + '</td><td style="color:var(--warn)">' + fmtBRL(Math.round(m.commission * f)) + '</td><td><span class="bok b">Pago</span></td></tr>';
    }).join("") + "</tbody></table></div>";
}

// ===== ANÚNCIOS =====
function pgAds(mc) {
  const totalRev = S.creatives.reduce((a, c) => a + c.revenue, 0);
  const bestRoas = S.creatives.length ? Math.max(...S.creatives.map((c) => c.roas)) : 0;
  const avgRoi = S.creatives.length ? Math.round(S.creatives.reduce((a, c) => a + c.roi, 0) / S.creatives.length) : 0;
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Anúncios</div><div class="ssub">Dashboard completo de mídia paga</div></div>' +
    '<button class="bp" onclick="openM(\'creativemod\')">+ Criativo</button></div>' +
    '<div class="g4 ms">' +
    '<div class="gc"><div class="ctitle mb2">Receita em Criativos</div><div class="cval txok" style="font-size:20px">' + fmtBRL(totalRev) + '</div><div class="cchg up">▲ acumulada</div></div>' +
    '<div class="gc"><div class="ctitle mb2">Melhor ROAS</div><div class="cval txc">' + bestRoas.toFixed(1) + 'x</div><div class="cchg up">▲ top criativo</div></div>' +
    '<div class="gc"><div class="ctitle mb2">Criativos Ativos</div><div class="cval">' + S.creatives.filter((c) => c.status === "Ativo").length + '</div><div class="cchg">de ' + S.creatives.length + " totais</div></div>" +
    '<div class="gc"><div class="ctitle mb2">ROI Médio</div><div class="cval txc">' + avgRoi + '%</div><div class="cchg up">▲ carteira</div></div></div>' +
    '<div class="gc ms tbl-wrap"><div class="chead"><span class="ctitle">Tabela de Criativos</span></div>' +
    '<table class="dtable"><thead><tr><th>Nome</th><th>Plataforma</th><th>Receita</th><th>ROI</th><th>ROAS</th><th>Conversão</th><th>Status</th><th></th></tr></thead><tbody id="creativesTbl"></tbody></table></div>' +
    '<div class="gc ms"><div class="chead"><span class="ctitle">Performance Comparada</span></div><div class="chart-container" style="height:200px"><canvas id="chartGrowth"></canvas></div></div>';
  const ct = $("creativesTbl");
  ct.innerHTML = S.creatives.map((c) =>
    "<tr><td>" + esc(c.name) + "</td><td>" + esc(c.platform) + "</td>" +
    "<td style=\"color:var(--ok);font-family:'Space Mono',monospace\">" + fmtBRL(c.revenue) + "</td>" +
    '<td style="color:var(--c)">' + c.roi + "%</td>" +
    '<td style="color:var(--c)">' + c.roas.toFixed ? c.roas + "x" : c.roas + "x</td>" +
    "<td>" + c.conv + "%</td>" +
    '<td><span class="' + (c.status === "Ativo" ? "bok" : "bwarn") + ' b">' + c.status + "</span></td>" +
    '<td><button class="bg danger" data-crdel="' + c.id + '" style="font-size:10px;padding:3px 8px">×</button></td></tr>'
  ).join("");
  ct.querySelectorAll("[data-crdel]").forEach((b) => b.addEventListener("click", () => delCreative(Number(b.dataset.crdel))));
  setTimeout(() => {
    mkChart("chartGrowth", "bar", S.creatives.map((c) => c.name), [
      { label: "ROI %", data: S.creatives.map((c) => c.roi), backgroundColor: hexToRgba(cssVar("--c"), 0.7), borderRadius: 5 },
      { label: "ROAS ×100", data: S.creatives.map((c) => Math.round(c.roas * 100)), backgroundColor: "rgba(0,255,136,0.55)", borderRadius: 5 }]);
  }, 100);
}
function addCreative() {
  const n = $("crn").value.trim();
  if (!n) return showToast("Informe o nome do criativo", "warn");
  S.creatives.push({ id: uid(), name: n, platform: $("crp").value, revenue: 0, roi: 0, roas: 0, conv: 0, status: "Ativo" });
  closeM("creativemod"); $("crn").value = "";
  logAndTouch("Criativo criado: " + n);
  pgAds($("mc"));
  showToast("➕ Criativo adicionado!", "ok");
}
function delCreative(id) {
  S.creatives = S.creatives.filter((c) => c.id !== id);
  logAndTouch("Criativo removido #" + id);
  pgAds($("mc"));
}

// ===== CAMPANHAS =====
function pgCampaigns(mc) {
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Campanhas</div><div class="ssub">Gerencie suas campanhas de marketing</div></div>' +
    '<button class="bp" onclick="openM(\'campmod\')">+ Nova Campanha</button></div>' +
    '<div class="g3 ms" id="campGrid"></div>';
  renderCampaigns();
}
function renderCampaigns() {
  const g = $("campGrid");
  if (!g) return;
  g.innerHTML = "";
  const statCls = { Ativa: "bok", Pausada: "bwarn", Finalizada: "berr" };
  if (!S.campaigns.length) { g.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Nenhuma campanha. Crie a primeira!</div>'; return; }
  S.campaigns.forEach((c) => {
    const pct = c.budget > 0 ? Math.min((c.spend / c.budget) * 100, 100) : 0;
    const d = document.createElement("div");
    d.className = "gc";
    d.innerHTML = '<div class="flex aic jb mb3"><span class="orb" style="font-size:13px;font-weight:700">' + esc(c.name) + '</span><span class="' + (statCls[c.status] || "b") + ' b">' + esc(c.status) + "</span></div>" +
      '<div style="font-size:11px;color:var(--tx2);margin-bottom:10px">📣 ' + esc(c.platform) + "</div>" +
      '<div class="flex jb txxs txm mb1"><span>Orçamento</span><span class="txs">' + fmtBRL(c.budget) + "</span></div>" +
      '<div class="flex jb txxs txm mb1"><span>Gasto</span><span class="txs" style="color:var(--warn)">' + fmtBRL(c.spend) + "</span></div>" +
      '<div class="flex jb txxs txm mb2"><span>ROI</span><span class="txs txc">' + c.roi + "%</span></div>" +
      '<div class="pbar"><div class="pbfill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
      '<div style="font-size:9px;color:var(--tx3);margin-top:4px">' + pct.toFixed(0) + "% do orçamento utilizado</div>" +
      '<div class="flex gap2 mt3">' +
      '<button class="bg" data-cstat="' + c.id + '" style="font-size:10px;flex:1">🔄 Status</button>' +
      '<button class="bg" data-cspend="' + c.id + '" style="font-size:10px;flex:1">💸 Gasto</button>' +
      '<button class="bg danger" data-campdel="' + c.id + '" style="font-size:10px">🗑</button></div>';
    d.querySelector("[data-cstat]").addEventListener("click", () => cycleCampaignStatus(c.id));
    d.querySelector("[data-cspend]").addEventListener("click", () => addCampaignSpend(c.id));
    d.querySelector("[data-campdel]").addEventListener("click", () => delCampaign(c.id));
    g.appendChild(d);
  });
}
function cycleCampaignStatus(id) {
  const order = ["Ativa", "Pausada", "Finalizada"];
  const c = S.campaigns.find((x) => x.id === id);
  if (!c) return;
  c.status = order[(order.indexOf(c.status) + 1) % order.length];
  logAndTouch("Campanha " + c.name + " → " + c.status);
  renderCampaigns();
  showToast("Status: " + c.status, "ok");
}
function addCampaignSpend(id) {
  const c = S.campaigns.find((x) => x.id === id);
  if (!c) return;
  const v = prompt("Valor gasto em \"" + c.name + "\" (R$):", "");
  if (v === null) return;
  const n = parseFloat(v.replace(",", "."));
  if (isNaN(n) || n <= 0) return showToast("Valor inválido", "err");
  c.spend = Math.round((c.spend + n) * 100) / 100;
  logAndTouch("Gasto registrado: " + c.name + " +" + fmtBRL(n));
  renderCampaigns();
  showToast("💸 Gasto registrado!", "ok");
}
function addCampaign() {
  const n = $("cni").value.trim();
  if (!n) return showToast("Informe o nome da campanha", "warn");
  S.campaigns.push({ id: uid(), name: n, platform: $("cplt").value, budget: parseFloat($("cbud").value.replace(",", ".")) || 0, spend: 0, roi: 0, status: $("cst").value });
  closeM("campmod"); $("cni").value = ""; $("cbud").value = "";
  logAndTouch("Campanha criada: " + n);
  renderCampaigns();
  showToast("🎯 Campanha criada!", "ok");
}


// ===== INTEGRAÇÕES =====
const INT_LIST = [
  { key: "meta", name: "Meta Ads", icon: "📱", desc: "Facebook & Instagram Ads" },
  { key: "google", name: "Google Ads", icon: "🔍", desc: "Search & Display" },
  { key: "tiktok", name: "TikTok Ads", icon: "🎵", desc: "TikTok for Business" },
  { key: "taboola", name: "Taboola", icon: "📰", desc: "Native Advertising" },
  { key: "outbrain", name: "Outbrain", icon: "🌐", desc: "Content Discovery" },
  { key: "analytics", name: "Google Analytics", icon: "📊", desc: "Web Analytics" },
  { key: "stripe", name: "Stripe", icon: "💳", desc: "Payment Processing" },
  { key: "paypal", name: "PayPal", icon: "🌍", desc: "Online Payments" },
  { key: "kirvano", name: "Kirvano", icon: "🛍", desc: "Plataforma de Infoprodutos" },
  { key: "kiwify", name: "Kiwify", icon: "⚡", desc: "Checkout Inteligente" },
  { key: "cakto", name: "Cakto", icon: "🛒", desc: "Plataforma de Vendas" }
];
function pgIntegrations(mc) {
  mc.innerHTML = '<div class="sh"><div class="stitle">Integrações</div><div class="ssub">Conecte suas ferramentas e plataformas</div></div><div class="g3" id="intGrid"></div>';
  const g = $("intGrid");
  INT_LIST.forEach((it) => {
    const on = S.integrations[it.key];
    const d = document.createElement("div");
    d.className = "intcard";
    d.innerHTML = '<div class="intinfo"><div class="inticon" style="font-size:20px">' + it.icon + '</div><div><div style="font-size:13px;font-weight:600">' + it.name + '</div><div style="font-size:11px;color:var(--tx3)">' + it.desc + "</div></div></div>" +
      '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:10px;color:' + (on ? "var(--ok)" : "var(--tx3)") + '">' + (on ? "Conectado" : "Desconectado") + '</span><div class="toggle ' + (on ? "on" : "") + '" data-int="' + it.key + '"></div></div>';
    d.querySelector("[data-int]").addEventListener("click", () => toggleInt(it.key));
    g.appendChild(d);
  });
}
function toggleInt(k) {
  S.integrations[k] = !S.integrations[k];
  logAndTouch("Integração " + k + (S.integrations[k] ? " ativada" : " desativada"));
  pgIntegrations($("mc"));
  showToast(S.integrations[k] ? "🔗 Integração ativada!" : "Integração desativada", "ok");
}

// ===== FUNIS =====
function pgFunnels(mc) {
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Funis</div><div class="ssub">Construtor visual de funis de venda — arraste os blocos</div></div>' +
    '<div class="flex gap2"><button class="bp" onclick="openM(\'funnelmod\')">+ Criar Funil</button>' +
    (S.funnel ? '<button class="bg danger" onclick="clearFunnel()">🗑 Limpar</button>' : "") + "</div></div>" +
    '<div class="fcanvas" id="fcanvas"><svg id="fsvg"></svg><div id="fnodes"></div>' +
    (S.funnel ? "" : '<div id="fempty" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:var(--tx3)"><div style="font-size:40px;margin-bottom:12px">🌊</div><div class="orb" style="font-size:14px">Crie um funil para começar</div><div style="font-size:12px;margin-top:6px">Clique em "+ Criar Funil" e escolha o nicho</div></div>') + "</div>";
  renderFunnelNodes();
}
const NODE_TYPES = {
  traffic: { icon: "📡", label: "Tráfego", color: "rgba(0,217,255,0.15)" },
  landing: { icon: "🖥️", label: "Landing Page", color: "rgba(0,255,136,0.1)" },
  vsl: { icon: "🎬", label: "VSL", color: "rgba(255,100,0,0.1)" },
  checkout: { icon: "💳", label: "Checkout", color: "rgba(255,184,0,0.1)" },
  upsell: { icon: "⬆️", label: "Upsell", color: "rgba(180,0,255,0.1)" },
  downsell: { icon: "⬇️", label: "Downsell", color: "rgba(255,51,102,0.1)" },
  whatsapp: { icon: "💬", label: "WhatsApp", color: "rgba(0,200,100,0.15)" },
  email: { icon: "📧", label: "Email", color: "rgba(0,150,255,0.1)" },
  product: { icon: "📦", label: "Produto", color: "rgba(255,230,0,0.1)" }
};
function createFunnel(niche) {
  closeM("funnelmod");
  const templates = {
    Emagrecimento: ["traffic", "landing", "vsl", "checkout", "upsell", "whatsapp"],
    Relacionamento: ["traffic", "landing", "vsl", "checkout", "downsell", "email"],
    "Finanças": ["traffic", "landing", "checkout", "upsell", "whatsapp", "product"],
    "Saúde": ["traffic", "landing", "vsl", "checkout", "upsell", "email"],
    "E-commerce": ["traffic", "landing", "product", "checkout", "upsell", "email"],
    Outros: ["traffic", "landing", "vsl", "checkout", "upsell", "email"]
  };
  const types = templates[niche] || templates.Outros;
  S.funnel = { niche, nodes: types.map((t, i) => ({ id: i, type: t, x: 40 + i * 150, y: 200 + (i % 2 === 0 ? -110 : 110) })) };
  logAndTouch("Funil criado: " + niche);
  renderPage("funnels");
  showToast('🌊 Funil "' + niche + '" criado!', "ok");
}
let fdrag = null, fdragOff = { x: 0, y: 0 };
function renderFunnelNodes() {
  const nd = $("fnodes"), sv = $("fsvg");
  if (!nd || !sv) return;
  nd.innerHTML = ""; sv.innerHTML = "";
  const nodes = S.funnel ? S.funnel.nodes : [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    const x1 = a.x + 65, y1 = a.y + 45, x2 = b.x + 65, y2 = b.y + 20;
    sv.innerHTML += '<path d="M' + x1 + "," + y1 + " C" + x1 + "," + (y1 + 40) + " " + x2 + "," + (y2 - 40) + " " + x2 + "," + y2 + '" stroke="rgba(0,217,255,0.35)" stroke-width="2" fill="none" stroke-dasharray="5,4"/><circle cx="' + x2 + '" cy="' + y2 + '" r="4" fill="var(--c)"/>';
  }
  nodes.forEach((n) => {
    const nt = NODE_TYPES[n.type];
    if (!nt) return;
    const div = document.createElement("div");
    div.className = "fnode";
    div.style.cssText = "left:" + n.x + "px;top:" + n.y + "px;background:" + nt.color + ";";
    div.innerHTML = '<div class="fnicon">' + nt.icon + '</div><div class="fntitle">' + nt.label + '</div><div class="fntype">' + n.type + "</div>";
    div.addEventListener("mousedown", (e) => { fdrag = n; fdragOff = { x: e.clientX - n.x, y: e.clientY - n.y }; div.style.zIndex = 20; e.preventDefault(); });
    nd.appendChild(div);
  });
}
document.addEventListener("mousemove", (e) => {
  if (!fdrag) return;
  fdrag.x = Math.max(0, e.clientX - fdragOff.x);
  fdrag.y = Math.max(0, e.clientY - fdragOff.y);
  renderFunnelNodes();
});
document.addEventListener("mouseup", () => { if (fdrag) { fdrag = null; touch(true); } });
function clearFunnel() {
  S.funnel = null;
  logAndTouch("Funil limpo");
  renderPage("funnels");
  showToast("🌊 Funil limpo");
}

// ===== APARÊNCIA =====
function applyUiPrefs() {
  const ui = S.ui;
  document.documentElement.style.setProperty("--c", ui.primary);
  document.documentElement.style.setProperty("--cn", ui.accent);
  document.body.classList.toggle("no-anim", !ui.anim);
  document.body.classList.toggle("no-glow", !ui.glow);
  document.body.classList.toggle("no-glass", !ui.glass);
}
function pgAppearance(mc) {
  const primaries = ["#00D9FF", "#00FF88", "#FF3366", "#FFB800", "#9B59B6", "#FF6B35"];
  const accents = ["#00FFFF", "#FFB800", "#00FF88", "#FF3366", "#A855F7", "#F97316"];
  mc.innerHTML =
    '<div class="sh"><div class="stitle">Aparência</div><div class="ssub">Personalize a interface — tudo é salvo automaticamente</div></div>' +
    '<div class="g2">' +
    '<div class="gc"><div class="ctitle mb3">Cor Primária</div><div class="flex gap2" style="flex-wrap:wrap">' +
    primaries.map((c) => '<div data-setpri="' + c + '" style="width:36px;height:36px;border-radius:8px;background:' + c + ';cursor:pointer;border:2px solid ' + (c.toLowerCase() === String(S.ui.primary).toLowerCase() ? "white" : "transparent") + ';transition:all .2s"></div>').join("") + "</div>" +
    '<div class="mt3"><label class="fl">Cor personalizada</label><input type="color" class="fi" value="' + S.ui.primary + '" style="height:38px;cursor:pointer" data-custompri></div></div>' +
    '<div class="gc"><div class="ctitle mb3">Cor Secundária (Destaque)</div><div class="flex gap2" style="flex-wrap:wrap">' +
    accents.map((c) => '<div data-setacc="' + c + '" style="width:36px;height:36px;border-radius:8px;background:' + c + ';cursor:pointer;border:2px solid ' + (c.toLowerCase() === String(S.ui.accent).toLowerCase() ? "white" : "transparent") + ';transition:all .2s"></div>').join("") + "</div></div>" +
    '<div class="gc"><div class="ctitle mb3">Interface</div>' +
    [["anim", "Animações"], ["glow", "Efeitos Glow"], ["glass", "Glassmorphism"]].map((s) =>
      '<div class="flex aic jb mb3" style="font-size:13px"><span>' + s[1] + '</span><div class="toggle ' + (S.ui[s[0]] ? "on" : "") + '" data-uipref="' + s[0] + '"></div></div>').join("") + "</div>" +
    '<div class="gc"><div class="ctitle mb3">Prévia</div>' +
    '<div style="background:rgba(0,0,0,0.25);border:1px solid var(--bd);border-radius:9px;padding:14px"><div class="orb" style="color:var(--c);font-weight:800;margin-bottom:8px">HYPEX WAVE</div><div class="pbar mb2"><div class="pbfill" style="width:62%"></div></div><button class="bp">Botão Primário</button> <button class="bg">Botão Ghost</button></div></div></div>';
  mc.querySelectorAll("[data-setpri]").forEach((el) => el.addEventListener("click", () => setPrimary(el.dataset.setpri)));
  mc.querySelectorAll("[data-setacc]").forEach((el) => el.addEventListener("click", () => setAccent(el.dataset.setacc)));
  mc.querySelectorAll("[data-uipref]").forEach((el) => el.addEventListener("click", function () {
    const key = this.dataset.uipref;
    S.ui[key] = !S.ui[key];
    this.classList.toggle("on", S.ui[key]);
    applyUiPrefs();
    touch(true);
  }));
  const custom = mc.querySelector("[data-custompri]");
  custom.addEventListener("change", () => setPrimary(custom.value));
}
function setPrimary(c) {
  S.ui.primary = c;
  applyUiPrefs();
  touch(true);
  pgAppearance($("mc"));
  showToast("🎨 Cor primária aplicada", "ok");
}
function setAccent(c) {
  S.ui.accent = c;
  applyUiPrefs();
  touch(true);
  pgAppearance($("mc"));
  showToast("🎨 Cor secundária aplicada", "ok");
}

// ===== BANCO DE DADOS =====
function maskKey(k) { return k ? k.slice(0, 12) + "••••••••" + k.slice(-4) : "—"; }
function pgDatabase(mc) {
  const cfg = getCfg();
  mc.innerHTML =
    '<div class="sh"><div class="stitle">Banco de Dados</div><div class="ssub">Supabase — Postgres gratuito com autenticação incluída</div></div>' +
    '<div class="g2">' +
    '<div class="gc"><div class="chead"><span class="ctitle">Status da Conexão</span><span class="' + (cfg ? "bok" : "bwarn") + ' b">' + (cfg ? "Conectado" : "Modo Local") + "</span></div>" +
    '<div style="font-size:12px;line-height:2">' +
    "URL: <span class='mono txs'>" + (cfg ? esc(cfg.url) : "—") + "</span><br>" +
    "API Key: <span class='mono txs'>" + (cfg ? maskKey(cfg.key) : ((window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.key) ? maskKey(window.SUPABASE_CONFIG.key) + " (config.js)" : "—")) + "</span><br>" +
    "Usuário: <span class='mono txs'>" + esc((S.user && S.user.email) || "—") + "</span></div>" +
    '<div class="mt3 flex gap2">' +
    '<button class="bg" id="testDbBtn"' + (cfg ? "" : " disabled style=\"opacity:.5\"") + ">Testar conexão</button>" +
    (cfg ? '<button class="bg danger" id="clearDbBtn">Desconectar banco</button>' : "") + "</div></div>" +
    '<div class="gc"><div class="chead"><span class="ctitle">Conectar Projeto Supabase</span></div>' +
    '<div class="fg"><label class="fl">Project URL</label><input class="fi" id="dburl" placeholder="https://xxxx.supabase.co"></div>' +
    '<div class="fg"><label class="fl">Publishable / Anon Key</label><input class="fi" id="dbkey" type="password" placeholder="sb_publishable_... ou eyJhbGciOi..."></div>' +
    '<div class="flex gap2 je"><button class="bg" id="testDbInputsBtn">🔌 Testar</button><button class="bp" id="saveDbBtn">💾 Salvar & Conectar</button></div>' +
    '<div class="mt3" style="font-size:11px;color:var(--tx2);line-height:1.7;background:rgba(0,217,255,0.04);border:1px solid var(--bd);border-radius:9px;padding:12px">' +
    "<strong>Como conectar (grátis):</strong><br>1. Crie uma conta em supabase.com<br>2. New Project (plano Free)<br>3. SQL Editor → cole o conteúdo de <span class='mono'>supabase/schema.sql</span> → Run<br>4. Settings → API → copie a <strong>Project URL</strong> (a chave publishable já vem pronta no config.js)<br>5. Cole a URL acima e salve.<br><br>Login por Google: ative em Authentication → Providers." + "</div></div></div>" +
    '<div class="gc mt4"><div class="chead"><span class="ctitle">Como funciona a sincronização</span></div>' +
    '<div style="font-size:12px;color:var(--tx2);line-height:1.9">• Sem banco: tudo é salvo neste navegador (localStorage) — nada se perde ao recarregar.<br>• Com banco: cada usuário tem seus dados isolados por RLS (Row Level Security) e sincronizados automaticamente.<br>• O indicador no topo mostra o estado da sincronização em tempo real.</div></div>';
  $("testDbInputsBtn").addEventListener("click", testDbInputs);
  $("testDbBtn").addEventListener("click", testDbConnection);
  if ($("clearDbBtn")) $("clearDbBtn").addEventListener("click", clearDbConfig);
  $("saveDbBtn").addEventListener("click", saveDbConfig);
  const wcfg = window.SUPABASE_CONFIG || {};
  const preUrl = (cfg && cfg.url) || wcfg.url || "";
  if (preUrl) $("dburl").value = preUrl;
  if (!cfg && wcfg.key) $("dbkey").value = wcfg.key;
}

function resolveDbKey() {
  const typed = $("dbkey").value.trim();
  if (typed) return typed;
  const existing = getCfg();
  if (existing && existing.key) return existing.key;
  const w = window.SUPABASE_CONFIG || {};
  return w.key || "";
}
async function testDbInputs() {
  const url = $("dburl").value.trim().replace(/\/$/, "");
  const key = resolveDbKey();
  if (!url || !key) return showToast("Preencha a Project URL (a chave já vem configurada)", "warn");
  pingSupabase(url, key);
}
async function testDbConnection() {
  const cfg = getCfg();
  if (!cfg) return;
  pingSupabase(cfg.url, cfg.key);
}
async function pingSupabase(url, key) {
  showToast("🔌 Testando conexão...", "info");
  try {
    const r = await fetch(url + "/auth/v1/health", { headers: { apikey: key, Authorization: "Bearer " + key } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    showToast("✅ Conexão OK! Banco acessível.", "ok");
  } catch (e) {
    showToast("❌ Falhou: " + e.message + " — confira URL/chave.", "err");
  }
}
function saveDbConfig() {
  const url = $("dburl").value.trim().replace(/\/$/, "");
  const key = resolveDbKey();
  if (url.indexOf("https://") !== 0 || !key) return showToast("Informe a Project URL válida (https://...)", "err");
  localStorage.setItem(LS_SBCFG, JSON.stringify({ url, key }));
  audit("Supabase configurado: " + url);
  saveLocal();
  showToast("💾 Banco conectado! Recarregando...", "ok");
  setTimeout(() => location.reload(), 900);
}
function clearDbConfig() {
  if (!confirm("Desconectar o banco? Os dados locais deste navegador continuam intactos.")) return;
  localStorage.removeItem(LS_SBCFG);
  audit("Supabase desconectado");
  saveLocal();
  location.reload();
}

// ===== ADMIN =====
function pgAdmin(mc) {
  const today = todayStr();
  const logsToday = S.auditLog.filter((l) => l.t.slice(0, 10) === today).length;
  const alertsCount = computeAlerts().length;
  mc.innerHTML =
    '<div class="sh"><div class="stitle">Admin</div><div class="ssub">Controle avançado de usuários e sistema</div></div>' +
    '<div class="g3 ms">' +
    '<div class="gc"><div class="chead"><span class="ctitle">👥 Usuários</span></div><div class="cval txc">' + S.team.length + '</div><div class="cchg up">Ativos na plataforma</div></div>' +
    '<div class="gc"><div class="chead"><span class="ctitle">📋 Logs Hoje</span></div><div class="cval">' + logsToday + '</div><div class="cchg">Ações registradas</div></div>' +
    '<div class="gc"><div class="chead"><span class="ctitle">🔔 Alertas</span></div><div class="cval" style="color:var(--warn)">' + alertsCount + '</div><div class="cchg down">Pendentes revisão</div></div></div>' +
    '<div class="g2 ms">' +
    '<div class="gc tbl-wrap"><div class="chead"><span class="ctitle">Controle de Usuários</span><button class="bp" onclick="openM(\'invmod\')">+ Adicionar</button></div>' +
    '<table class="dtable"><thead><tr><th>Usuário</th><th>Cargo</th><th>Último Acesso</th><th>Status</th></tr></thead><tbody>' +
    S.team.map((t) => "<tr><td>" + esc(t.name) + "</td><td>" + esc(t.role) + "</td><td style=\"color:var(--tx3)\">Hoje</td>" +
      '<td><span class="' + (t.status === "Ativo" ? "bok" : "bwarn") + ' b">' + esc(t.status || "Ativo") + "</span></td></tr>").join("") +
    "</tbody></table></div>" +
    '<div class="gc tbl-wrap"><div class="chead"><span class="ctitle">Logs de Auditoria</span><button class="bg" style="font-size:10px" id="clearAuditBtn">Limpar</button></div>' +
    '<div style="max-height:330px;overflow-y:auto" id="auditList"></div></div></div>';
  $("clearAuditBtn").addEventListener("click", clearAudit);
  renderAudit();
}
function renderAudit() {
  const el = $("auditList");
  if (!el) return;
  if (!S.auditLog.length) { el.innerHTML = '<div class="empty-state">Nenhuma ação registrada ainda.</div>'; return; }
  el.innerHTML = S.auditLog.map((l) =>
    '<div style="padding:8px 10px;border-bottom:1px solid rgba(0,217,255,0.06);font-size:11px"><span class="mono txm" style="font-size:9px">' + l.t.slice(11, 19) + '</span> <span style="color:var(--c)">' + esc(l.user) + "</span> — " + esc(l.action) + "</div>"
  ).join("");
}
function clearAudit() {
  S.auditLog = [];
  touch(true);
  renderAudit();
  showToast("Logs limpos");
}

// ===== CARGOS =====
function pgRoles(mc) {
  const colors = ["var(--c)", "var(--ok)", "var(--warn)", "rgba(180,0,255,0.9)", "var(--tx2)"];
  mc.innerHTML =
    '<div class="sh flex aic jb"><div><div class="stitle">Cargos</div><div class="ssub">Gerencie cargos e permissões da equipe</div></div>' +
    '<button class="bp" onclick="openM(\'rolemod\')">+ Novo Cargo</button></div>' +
    '<div class="g3">' + S.roles.map((r, i) =>
      '<div class="gc"><div class="chead"><span class="orb" style="font-size:13px;font-weight:700;color:' + colors[i % colors.length] + '">' + esc(r.name) + "</span>" +
      '<div class="flex gap1"><button class="bg danger" data-roledel="' + r.id + '" style="font-size:10px;padding:3px 8px">🗑</button></div></div>' +
      '<div style="font-size:11px;color:var(--tx2);margin-bottom:10px">Permissões (' + r.perms.length + "):</div>" +
      r.perms.map((p) => '<div style="padding:5px 8px;background:rgba(0,217,255,0.04);border:1px solid var(--bd);border-radius:5px;font-size:11px;margin-bottom:4px">✓ ' + esc(p) + "</div>").join("") + "</div>"
    ).join("") + "</div>";
  mc.querySelectorAll("[data-roledel]").forEach((b) => b.addEventListener("click", () => delRole(Number(b.dataset.roledel))));
}
function addRole() {
  const n = $("rln").value.trim();
  const perms = $("rlp").value.split("\n").map((s) => s.trim()).filter(Boolean);
  if (!n || !perms.length) return showToast("Informe nome e ao menos uma permissão", "warn");
  S.roles.push({ id: uid(), name: n, perms });
  closeM("rolemod"); $("rln").value = ""; $("rlp").value = "";
  logAndTouch("Cargo criado: " + n);
  pgRoles($("mc"));
  showToast("👔 Cargo criado!", "ok");
}
function delRole(id) {
  const r = S.roles.find((x) => x.id === id);
  if (r && r.name === "Dono") return showToast("Não é possível excluir o cargo Dono", "err");
  S.roles = S.roles.filter((x) => x.id !== id);
  logAndTouch("Cargo removido: " + (r ? r.name : "#" + id));
  pgRoles($("mc"));
}


// ===== NOTIFICAÇÕES =====
function computeAlerts() {
  const out = [];
  const fm = finMetrics();
  const goalPct = (fm.income / (S.revenueTarget || 1)) * 100;
  if (goalPct < 100) out.push({ icon: "🎯", msg: "Meta em " + goalPct.toFixed(1) + "% — faltam " + fmtBRL(Math.max(S.revenueTarget - fm.income, 0)) });
  else out.push({ icon: "🎉", msg: "Meta batida! Receita acumulada de " + fmtBRL(fm.income) });
  const overdue = [];
  ["todo", "doing"].forEach((c) => (S.tasks[c] || []).forEach((t) => { if (t.due && daysDiff(t.due) < 0) overdue.push(t.title); }));
  if (overdue.length) out.push({ icon: "⏰", msg: overdue.length + " tarefa(s) atrasada(s): " + overdue.slice(0, 2).join(", ") });
  const pend = (S.salesHistory || []).filter((s) => s.status === "Pendente").length;
  if (pend) out.push({ icon: "🧾", msg: pend + " pagamento(s) pendente(s) de confirmação" });
  const bestCamp = [...S.campaigns].sort((a, b) => b.roi - a.roi)[0];
  if (bestCamp && bestCamp.roi > 0) out.push({ icon: "📢", msg: "Campanha \"" + bestCamp.name + "\" com ROI de " + bestCamp.roi + "%" });
  return out;
}
function computeNotifs() {
  const list = computeAlerts().map((a) => ({ icon: a.icon, msg: a.msg, key: a.msg }));
  (S.events || []).forEach((e) => {
    const dd = daysDiff(e.date);
    if (dd !== null && dd >= 0 && dd <= 7) list.push({ icon: "📅", msg: e.title + " — " + (dd === 0 ? "hoje" : "em " + dd + " dia(s)"), key: "ev" + e.id });
  });
  return list;
}
function refreshNotifs() {
  const badge = $("notifbadge");
  if (!badge) return;
  const items = computeNotifs();
  const seen = S.notifLastSeen;
  const unseen = items.filter((i) => !seen || String(seen) < i.key);
  badge.classList.toggle("on", items.length > 0 && unseen.length > 0);
  const listEl = $("notiflist");
  if (listEl) listEl.innerHTML = items.map((i) => '<div class="npitem"><span>' + i.icon + "</span><span>" + esc(i.msg) + "</span></div>").join("") || '<div class="npitem">Nada por aqui. 🎉</div>';
}
document.addEventListener("click", (e) => {
  const bell = $("notifbell");
  const panel = $("notifpanel");
  if (!bell || !panel) return;
  if (bell.contains(e.target)) {
    panel.classList.toggle("open");
    const g = $("gresults");
    if (g) g.classList.remove("open");
  } else if (!panel.contains(e.target)) panel.classList.remove("open");
});
function markAllSeen(ev) {
  if (ev) ev.stopPropagation();
  S.notifLastSeen = new Date().toISOString();
  const badge = $("notifbadge");
  if (badge) badge.classList.remove("on");
  touch(true);
  showToast("Notificações marcadas como lidas");
}

// ===== BUSCA GLOBAL =====
function searchIndex() {
  const idx = [];
  Object.keys(PAGE_TITLES).forEach((p) => idx.push({ type: "Página", icon: "📄", label: PAGE_TITLES[p], page: p }));
  ["todo", "doing", "done"].forEach((c) => (S.tasks[c] || []).forEach((t) => idx.push({ type: "Tarefa", icon: "✅", label: t.title, page: "tasks" })));
  S.products.forEach((p) => idx.push({ type: "Produto", icon: "📦", label: p.name, page: "products" }));
  S.campaigns.forEach((c) => idx.push({ type: "Campanha", icon: "🎯", label: c.name, page: "campaigns" }));
  S.team.forEach((m) => idx.push({ type: "Membro", icon: "👤", label: m.name + " (" + m.email + ")", page: "team" }));
  (S.events || []).forEach((e) => idx.push({ type: "Evento", icon: "📅", label: e.title + " — " + e.date, page: "planning" }));
  return idx;
}
const gs = document.getElementById("gsearch");
if (gs) {
  gs.addEventListener("input", function () {
    const q = this.value.trim().toLowerCase();
    const box = $("gresults");
    if (!q) { box.classList.remove("open"); return; }
    const hits = searchIndex().filter((i) => i.label.toLowerCase().indexOf(q) >= 0).slice(0, 12);
    box.innerHTML = hits.length
      ? hits.map((h) => '<div class="gres" data-go="' + h.page + '"><span class="gres-ico">' + h.icon + "</span><span>" + esc(h.label) + '</span><span class="gres-type">' + h.type + "</span></div>").join("")
      : '<div class="gres">Nenhum resultado para "' + esc(q) + '"</div>';
    box.classList.add("open");
    box.querySelectorAll("[data-go]").forEach((el) => el.addEventListener("click", () => goResult(el.dataset.go)));
  });
  gs.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { const first = $("gresults").querySelector("[data-go]"); if (first) first.click(); }
  });
}
function goResult(page) {
  $("gresults").classList.remove("open");
  $("gsearch").value = "";
  navTo(page);
}
document.addEventListener("click", (e) => {
  const input = $("gsearch");
  if (!input) return;
  if (!input.parentElement.contains(e.target)) $("gresults").classList.remove("open");
});

// ============================================================
// HYPEX AI — motor analítico local (+ Claude opcional)
// ============================================================
let aiOpen = false, aiErrorShown = false;
function toggleAI() {
  aiOpen = !aiOpen;
  $("aimod").classList.toggle("open", aiOpen);
  if (aiOpen) $("aiinput").focus();
}
function aiMsg(text, cls) {
  const msgs = $("aimsgs");
  const m = document.createElement("div");
  m.className = "aimsg " + cls;
  m.textContent = text;
  msgs.appendChild(m);
  msgs.scrollTop = msgs.scrollHeight;
}
async function sendAI() {
  const inp = $("aiinput");
  const txt = inp.value.trim();
  if (!txt) return;
  inp.value = "";
  aiMsg(txt, "user");
  const typing = document.createElement("div");
  typing.className = "aitype";
  typing.innerHTML = "<span></span><span></span><span></span>";
  $("aimsgs").appendChild(typing);
  $("aimsgs").scrollTop = $("aimsgs").scrollHeight;
  let reply;
  try { reply = await aiAnswer(txt); }
  catch (e) { reply = "❌ Erro ao processar. Tente novamente."; }
  typing.remove();
  aiMsg(reply, "bot");
}
async function aiAnswer(q) {
  const key = window.ANTHROPIC_KEY;
  if (key) {
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 900,
          system: aiSystemPrompt(),
          messages: [{ role: "user", content: q }]
        })
      });
      const data = await resp.json();
      if (data.content && data.content[0] && data.content[0].text) return data.content[0].text;
    } catch (e) {
      if (!aiErrorShown) { aiErrorShown = true; showToast("IA remota indisponível — usando IA local", "warn"); }
    }
  }
  return localAI(q);
}
function aiSystemPrompt() {
  const fm = finMetrics();
  return "Você é a HYPEX AI, assistente operacional da plataforma HYPEX WAVE (SaaS empresarial para negócios digitais). Dados atuais: receita acumulada " + fmtBRL(fm.income) + ", despesas " + fmtBRL(fm.expenses) + ", saldo " + fmtBRL(fm.balance) + ", meta " + fmtBRL(S.revenueTarget) + ", produtos: " + S.products.map((p) => p.name).join(", ") + ", equipe: " + S.team.length + " membros, campanhas: " + S.campaigns.length + ". Responda sempre em português brasileiro, de forma objetiva e profissional.";
}
function localAI(raw) {
  const q = raw.toLowerCase();
  const fm = finMetrics();
  const goalPct = (fm.income / (S.revenueTarget || 1)) * 100;
  const has = (...ws) => ws.some((w) => q.indexOf(w) >= 0);

  const taskCreate = raw.match(/criar?\s+tarefa\s+(?:para\s+|de\s+)?["“']?(.+?)["”']?\s*$/i);
  if (taskCreate) {
    const title = taskCreate[1].trim();
    if (!title) return "Me diga o título da tarefa. Ex.: \"criar tarefa revisar anúncios\".";
    S.tasks.todo.push({ id: uid(), title: title.charAt(0).toUpperCase() + title.slice(1), pri: "med", due: "", assignee: S.user.name || "" });
    logAndTouch("HYPEX AI criou tarefa: " + title);
    refreshNotifs();
    return "✅ Tarefa criada em \"Para Fazer\": \"" + title + "\".";
  }

  if (has("resumo", "relatório", "relatorio", "visão geral", "visao geral", "como estou", "situação")) {
    return "📊 RESUMO EXECUTIVO\n\n• Receita acumulada: " + fmtBRL(fm.income) + "\n• Despesas: " + fmtBRL(fm.expenses) + "\n• Resultado líquido: " + fmtBRL(fm.balance) + " (margem " + fm.netMargin.toFixed(1) + "%)\n• Progresso da meta (" + fmtBRL(S.revenueTarget) + "): " + goalPct.toFixed(1) + "%\n• Vendas (30d): " + (S.salesHistory || []).length + "\n• Tarefas pendentes: " + (S.tasks.todo.length + S.tasks.doing.length) + "\n• Campanhas ativas: " + S.campaigns.filter((c) => c.status === "Ativa").length + "\n\nDica: pergunte por \"faturamento\", \"campanhas\", \"produtos\" ou \"equipe\" para detalhes.";
  }
  if (has("meta", "objetivo")) {
    const falta = Math.max(S.revenueTarget - fm.income, 0);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const perDay = falta / Math.max(daysInMonth - now.getDate() + 1, 1);
    return "🎯 META ATUAL\n\n• Meta: " + fmtBRL(S.revenueTarget) + "\n• Progresso: " + goalPct.toFixed(1) + "% (" + fmtBRL(fm.income) + ")\n• Falta: " + fmtBRL(falta) + "\n• Ritmo necessário: ~" + fmtBRL(perDay) + "/dia até o fim do mês.\n\n" + (goalPct >= 75 ? "Você está muito perto! 🚀" : goalPct >= 40 ? "Bom ritmo, mantenha o foco." : "Vale acelerar as campanhas com melhor ROI.");
  }
  if (has("faturamento", "receita", "vendas", "faturei")) {
    const top = [...S.products].sort((a, b) => b.revenue - a.revenue)[0];
    const today = (S.salesHistory || []).filter((s) => s.date.slice(0, 10) === todayStr());
    const ticket = (S.salesHistory || []).length ? (S.salesHistory || []).reduce((a, s) => a + s.value, 0) / (S.salesHistory || []).length : 0;
    return "💰 FATURAMENTO\n\n• Acumulado no extrato: " + fmtBRL(fm.income) + "\n• Líquido: " + fmtBRL(fm.balance) + "\n• Vendas hoje: " + today.length + "\n• Ticket médio (30d): " + fmtBRL(ticket) + "\n• Produto líder: " + (top ? top.name + " (" + fmtBRL(top.revenue) + ")" : "—") + "\n\nMeta: " + goalPct.toFixed(1) + "% concluída.";
  }
  if (has("despesa", "gasto", "saldo", "financeiro", "custo")) {
    const byMethod = {};
    (S.transactions || []).filter((t) => t.type === "Saída").forEach((t) => { byMethod[t.method] = (byMethod[t.method] || 0) + t.value; });
    const lines = Object.keys(byMethod).map((k) => "• " + k + ": " + fmtBRL(byMethod[k]));
    return "💳 FINANCEIRO\n\n• Entradas: " + fmtBRL(fm.income) + "\n• Saídas: " + fmtBRL(fm.expenses) + "\n• Saldo: " + fmtBRL(fm.balance) + "\n• Margem líquida: " + fm.netMargin.toFixed(1) + "%\n\nDespesas por método:\n" + (lines.join("\n") || "• Nenhuma despesa registrada");
  }
  if (has("campanha", "campanhas", "anúncio", "anuncio", "anúncios", "roi", "roas", "tráfego", "trafego")) {
    const sorted = [...S.campaigns].sort((a, b) => b.roi - a.roi);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const totalBudget = S.campaigns.reduce((a, c) => a + c.budget, 0);
    const totalSpend = S.campaigns.reduce((a, c) => a + c.spend, 0);
    return "📢 CAMPANHAS\n\n• Orçamento total: " + fmtBRL(totalBudget) + "\n• Gasto total: " + fmtBRL(totalSpend) + " (" + (totalBudget ? (totalSpend / totalBudget * 100).toFixed(0) : 0) + "%)\n• Melhor ROI: " + (best ? best.name + " (" + best.roi + "%)" : "—") + "\n• Pior ROI: " + (worst ? worst.name + " (" + worst.roi + "%)" : "—") + "\n• Ativas: " + S.campaigns.filter((c) => c.status === "Ativa").length + " de " + S.campaigns.length + "\n\n" + (best && best.roi >= 200 ? "Recomendo aumentar orçamento de \"" + best.name + "\". 🚀" : "Considere pausar campanhas com ROI baixo.");
  }
  if (has("produto", "produtos", "oferta")) {
    const sorted = [...S.products].sort((a, b) => b.conv - a.conv);
    return "📦 PRODUTOS\n\n" + S.products.map((p) => "• " + p.name + ": " + fmtBRL(p.revenue) + " | conv " + p.conv + "% | " + fmtBRL(p.price)).join("\n") + "\n\nMelhor conversão: " + (sorted[0] ? sorted[0].name + " (" + sorted[0].conv + "%)" : "—") + ". Em teste: " + (S.testProducts || []).length + " produto(s).";
  }
  if (has("equipe", "time", "membro", "funcionário", "funcionario", "colaborador")) {
    const sorted = [...S.team].sort((a, b) => b.revenue - a.revenue);
    return "👥 EQUIPE (" + S.team.length + " membros)\n\n" + sorted.map((m, i) => (i + 1) + "º " + m.name + " — " + m.sales + " vendas, " + fmtBRL(m.revenue) + ", comissão " + fmtBRL(m.commission)).join("\n") + "\n\nComissões totais pagas: " + fmtBRL(S.team.reduce((a, m) => a + m.commission, 0));
  }
  if (has("tarefa", "tarefas", "pendente", "pendências", "pendencias", "to-do", "todo")) {
    const overdue = [];
    ["todo", "doing"].forEach((c) => (S.tasks[c] || []).forEach((t) => { if (t.due && daysDiff(t.due) < 0) overdue.push(t.title); }));
    return "✅ TAREFAS\n\n• Para fazer: " + S.tasks.todo.length + "\n• Em andamento: " + S.tasks.doing.length + "\n• Concluídas: " + S.tasks.done.length + "\n• Atrasadas: " + overdue.length + (overdue.length ? " → " + overdue.join(", ") : "") + "\n\nQuer criar uma? Diga: \"criar tarefa <nome>\"";
  }
  if (has("evento", "agenda", "próximo", "proximo", "reunião", "reuniao")) {
    const upcoming = [...(S.events || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    if (!upcoming.length) return "📅 Nenhum evento na agenda. Quer adicionar um pelo menu Planejamento?";
    return "📅 PRÓXIMOS EVENTOS\n\n" + upcoming.map((e) => "• " + e.date + " — " + e.title).join("\n");
  }
  if (has("funil", "funis", "funnel")) {
    if (!S.funnel) return "🌊 Nenhum funil criado ainda. Vá em Funis e clique em \"+ Criar Funil\" — eu recomendo começar pelo template de Emagrecimento ou Finanças.";
    return "🌊 Funil ativo: \"" + S.funnel.niche + "\" com " + S.funnel.nodes.length + " etapas: " + S.funnel.nodes.map((n) => n.type).join(" → ");
  }
  if (has("integração", "integracao", "integrações", "integracoes", "conectado")) {
    const connected = Object.keys(S.integrations).filter((k) => S.integrations[k]);
    return "🔗 INTEGRAÇÕES (" + connected.length + " conectadas)\n\n" + connected.map((k) => "• " + k).join("\n");
  }
  if (has("olá", "ola", "oi", "hey", "ajuda", "help", "o que você faz")) {
    return "🤖 Sou a HYPEX AI, analista da sua plataforma. Posso ajudar com:\n\n• \"resumo\" — visão executiva completa\n• \"faturamento\" / \"financeiro\" — números do negócio\n• \"meta\" — progresso e ritmo necessário\n• \"campanhas\" — ROI e recomendações\n• \"produtos\" / \"equipe\" — rankings\n• \"tarefas\" / \"eventos\" — pendências\n• \"criar tarefa ...\" — crio na hora!\n\nO que você quer saber?";
  }
  return "🤖 Não entendi completamente. Tente:\n\n• \"resumo\" — visão geral do negócio\n• \"faturamento\" ou \"meta\"\n• \"campanhas\" ou \"produtos\"\n• \"criar tarefa <descrição>\"\n\nOu digite \"ajuda\" para ver tudo que faço.";
}

// ===== ATALHOS DE TECLADO =====
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    const input = $("gsearch");
    if (input) input.focus();
  }
  if (e.key === "Escape") {
    document.querySelectorAll(".moverlay.open").forEach((m) => m.classList.remove("open"));
    if (aiOpen) toggleAI();
    closePanels();
  }
});

