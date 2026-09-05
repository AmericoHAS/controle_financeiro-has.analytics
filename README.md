# HAS Analytics — Controle Financeiro

Aplicação Next.js preparada para GitHub, Vercel e Supabase. Os dados são sincronizados por usuário e protegidos por Row Level Security (RLS).

## Configuração inicial

1. Crie um projeto gratuito em https://supabase.com.
2. Abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
3. Em **Authentication > Users**, crie a sua conta administrativa usando o mesmo e-mail definido em `ADMIN_EMAIL`.
4. No Vercel, abra **Settings > Environment Variables** e cadastre todas as variáveis de `.env.example`.
5. Gere uma nova chave do Resend. Nunca coloque chaves reais no GitHub.
6. Faça um novo deploy no Vercel.

## Desenvolvimento local

Copie `.env.example` para `.env.local`, preencha os valores e execute:

```bash
npm install
npm run dev
```

## Segurança

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ser usada no navegador porque o acesso é limitado pelas políticas RLS.
- `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` são privadas e devem existir somente nas variáveis do Vercel.
- O aplicativo não armazena senha bancária, CVV ou número completo de cartão.
