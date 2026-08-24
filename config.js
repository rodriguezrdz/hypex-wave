// ============================================================
// HYPEX WAVE — config.js
// ============================================================
// ✅ CHAVE JÁ CONFIGURADA (publishable key — segura para frontend).
//
// ⚠ FALTA SÓ 1 COISA: a Project URL do seu Supabase.
//   Onde pegar: painel do Supabase → Settings → API → "Project URL"
//   (parece: https://abcdefghijklmnop.supabase.co)
//
// Cole abaixo entre as aspas de url, salve, commit e push — pronto.
//
// Alternativa sem editar código: abra o app → menu Banco de Dados →
// cole a URL no campo (a chave já vem preenchida) → Salvar & Conectar.
//
// 🔒 NUNCA coloque aqui a sb_secret_... — ela é só para servidores.
// ============================================================
window.SUPABASE_CONFIG = {
  url: null,
  key: "sb_publishable_HgmhuAwT0YpppvjdR9IQeg_KWtJQ6c4"
};

// OPCIONAL — HYPEX AI com Claude (Anthropic).
// Sem chave, a IA local analítica responde usando os dados reais da plataforma.
window.ANTHROPIC_KEY = null;
