// ============================================================
// HYPEX WAVE — config.js
// ============================================================
// OPÇÃO 1 (recomendada para produção): preencha abaixo com as
// credenciais do seu projeto Supabase e faça novo deploy.
//
//   Dashboard > Settings > API:
//     - Project URL  -> url
//     - anon public  -> key
//
// OPÇÃO 2: deixe como está (null) e configure DENTRO do app,
//   em Banco de Dados > Conectar Supabase. Fica salvo no navegador.
//
// Se nenhum dos dois estiver configurado, o app roda em
// MODO LOCAL (dados salvos apenas neste navegador).
// ============================================================
window.SUPABASE_CONFIG = {
  url: null,   // ex: "https://xxxxxxxxxxxx.supabase.co"
  key: null    // ex: "eyJhbGciOiJI..." (anon public)
};

// OPCIONAL — HYPEX AI com Claude (Anthropic).
// Sem chave, a IA local analítica responde usando os dados reais da plataforma.
window.ANTHROPIC_KEY = null; // ex: "sk-ant-..."
