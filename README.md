# HYPEX WAVE — Plataforma SaaS Empresarial

Aplicação web completa de gestão para negócios digitais: dashboard financeiro, kanban de tarefas, planejamento, produtos, vitrine, vendas, equipe, anúncios, campanhas, funis e assistente IA.

## 🌌 v3 — Obsidian Aurora (design & motion)

Redesign completo da experiência visual mantendo 100% do motor de negócio:

- **Aurora Canvas** — ondas vivas ciano/menta respirando atrás de painéis de vidro obsidiana (pausa automática em aba oculta, `reduced-motion` ou quando você desativa animações em Aparência).
- **Números que vivem** — KPIs, meta de faturamento e métricas animam com contagem suave a cada atualização.
- **Micro-interações** — cards com tilt 3D sutil, botões magnéticos, transição de página cinematográfica.
- **Dados isolados por conta** — cada usuário entra com tudo zerado; ninguém herda valores de outra conta no mesmo navegador (`fx.js` + governança no motor).
- Arquivos novos/alterados nesta versão: `styles.css` (design system v3), `index.html` (shell), `fx.js` (camada de FX). Motor `app.js` preservado.

## O que foi melhorado nesta versão

| Antes | Agora |
|---|---|
| Dados sumiam ao recarregar (só memória) | **Persistência total** — localStorage + sincronização em nuvem via Supabase |
| Login falso (qualquer senha passava, sessão não ficava) | **Autenticação real** (Supabase Auth: email/senha, criar conta, Google OAuth, recuperação de senha) + modo local com sessão persistente |
| Tabela de Produtos vazia (bug) | Corrigida — lista completa com remover |
| Histórico de Vendas quebrado (erro JS) | Corrigido — filtros reais por produto + KPIs |
| IA sempre dava erro (chamava API sem chave) | **HYPEX AI local funcional** (analisa seus dados reais, cria tarefas) + Claude opcional |
| Textos corrompidos ("Relat��rio", "Anǧncios") | Encoding 100% corrigido em PT-BR |
| ~870KB de imagens embutidas no HTML | Extraídas para `assets/` (carregamento mais rápido) |
| Botões decorativos | CSV real de Vendas e Financeiro, meta editável, notificações, busca global, log de auditoria, criativos/lançamentos/cargos com CRUD completo |

## Estrutura

```
hypex-wave/
├── index.html            # shell da aplicação
├── styles.css            # design system (tema cyber cyan)
├── app.js                # estado, auth, banco, páginas, IA
├── config.js             # credenciais opcionais (Supabase/Claude)
├── manifest.webmanifest  # PWA
├── assets/               # logo e orb
├── supabase/schema.sql   # schema do banco (cole no SQL Editor)
├── vercel.json           # config de deploy
└── deploy.ps1            # script auxiliar de publicação
```

## Rodar localmente

```bash
cd hypex-wave
npm start          # abre em http://localhost:3000
```
(ou simplesmente abra o `index.html` no navegador)

**Acesso (modo local):** `rodriguez.founder@gmail.com` · qualquer senha com 4+ caracteres.
Também funcionam: `admin@hypexwave.com` e `owner@hypexwave.com`.

---

## 🗄 Banco de dados grátis (Supabase) — configuração em 5 minutos

O app funciona offline (localStorage), mas conecte o Supabase para ter **banco Postgres na nuvem, multiusuário e login real** — tudo no plano gratuito:

1. Crie conta em [supabase.com](https://supabase.com) → **New Project** (plano Free).
2. Menu lateral → **SQL Editor** → New query → cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Settings → API** → copie:
   - `Project URL` (ex.: `https://abcd1234.supabase.co`)
   - `anon public` key
4. Abra o app → entre → menu **Banco de Dados** → cole os dois valores → **Salvar & Conectar**.

Pronto: o badge do topo muda para "Nuvem OK" e cada alteração sincroniza automaticamente. Cada usuário tem dados isolados (Row Level Security ativada).

### Alternativa: hardcode no deploy
Edite [`config.js`](config.js) preenchendo `window.SUPABASE_CONFIG = { url: "...", key: "..." }` e faça novo deploy — útil para já entregar configurado.

### Login com Google (opcional)
No painel Supabase: **Authentication → Providers → Google** → ative e informe as credenciais OAuth do Google Cloud Console. Depois use o botão "Continuar com Google" no app.

---

## 🚀 Publicar no Vercel (via GitHub)

### Opção A — Pelo site (mais fácil)
1. Suba este projeto para um repositório seu no GitHub (o script abaixo faz isso).
2. Acesse [vercel.com/new](https://vercel.com/new), clique em **Import** no repositório.
3. Framework Preset: **Other** (é estático). Clique em **Deploy**.

### Opção B — Script automático (`deploy.ps1`)
```powershell
.\deploy.ps1 -RepoName "hypex-wave"
```
O script faz: init do git → commit → cria o repo na sua conta GitHub → push → tenta o deploy via Vercel CLI (na primeira vez abrirá o navegador para você autorizar o login).

### Opção C — Vercel CLI direto
```bash
npm i -g vercel
vercel login
vercel --prod --yes
```

---

## Dúvidas rápidas

- **Meus dados somem se eu limpar o navegador?** Sem Supabase sim (estão no localStorage). Com Supabase conectado, não — estão na nuvem.
- **Posso usar sem Supabase?** Sim, o app é 100% funcional em modo local.
- **Como mudo as cores?** Menu Aparência — a escolha fica salva.
- **A HYPEX AI precisa de chave?** Não. Ela analisa os dados locais sozinha. Se quiser respostas em linguagem natural via Claude, defina `window.ANTHROPIC_KEY` no `config.js`.
