// ============================================================
// HYPEX WAVE — config.js
// ============================================================
// ✅ SUPABASE CONECTADO
//   URL:      https://ipdwdrzhsuekwhxfoghj.supabase.co
//   Chave:    publishable (segura para frontend)
//
// 🔒 A sb_secret_ NUNCA vai aqui — apenas servidores.
// ============================================================
window.SUPABASE_CONFIG = {
  url: "https://ipdwdrzhsuekwhxfoghj.supabase.co",
  key: "sb_publishable_HgmhuAwT0YpppvjdR9IQeg_KWtJQ6c4"
};

// OPCIONAL — HYPEX AI com Claude (Anthropic).
// Sem chave, a IA local analítica responde usando os dados reais da plataforma.
window.ANTHROPIC_KEY = null;

// ============================================================
// OPCIONAL — EmailJS (emails de convite/boas-vindas pelo navegador)
// 1. Crie conta grátis em https://www.emailjs.com
// 2. Email Services → conecte seu Gmail/outlook → copie o Service ID
// 3. Email Templates → New template → copie o Template ID
//    (use as variáveis: {{to_name}} {{to_email}} {{message}})
// 4. Account → General → copie a Public Key
// 5. Cole os três abaixo e faça commit+push.
// ============================================================
window.EMAILJS_CONFIG = {
  serviceId: null,   // ex: "service_xxxxxxx"
  templateId: null,  // ex: "template_xxxxxxx"
  publicKey: null    // ex: "xxxxxxxxxxxxx"
};
