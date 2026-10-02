# Foco

Aplicação TanStack Start preparada para deploy no Vercel com PostgreSQL, modo convidado local e contas Better Auth.

## Configuração local

1. Instale as dependências com `pnpm install`.
2. Para usar contas, configure em `.env` `DATABASE_URL`, `BETTER_AUTH_SECRET` (segredo aleatório com pelo menos 32 caracteres), `BETTER_AUTH_URL`, `RESEND_API_KEY` e `EMAIL_FROM` com um remetente de domínio verificado no Resend. O cadastro só libera a conta depois da confirmação do email, e a recuperação de senha usa o mesmo serviço.
3. Crie as tabelas do banco (as tabelas de autenticação ficam no schema `public`):

   ```sh
   pnpm db:push
   ```

4. Inicie com `pnpm dev`.

## Deploy no Vercel

Importe o repositório no Vercel e mantenha a detecção automática do TanStack Start. Configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY` e `EMAIL_FROM` no ambiente Production e rode `pnpm db:push` apontando para o banco de produção. Confira que o Drizzle só vai criar/atualizar tabelas em `public` antes de confirmar. Publique novamente após as variáveis e tabelas estarem prontas.

Para ativar o login Google, crie credenciais OAuth do tipo Web no Google Cloud e configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Vercel. Adicione `https://SEU_DOMINIO` como origem JavaScript autorizada e `https://SEU_DOMINIO/api/auth/callback/google` como URI de redirecionamento autorizada. Cadastre também o domínio em `BETTER_AUTH_URL`.

Para alterações futuras no schema, gere migrações com `pnpm db:generate` e aplique-as com `pnpm db:migrate`.

Ao criar uma conta, o app importa as tarefas e sessões do modo convidado deste navegador e também os dados antigos vinculados ao UUID anônimo, uma única vez.
