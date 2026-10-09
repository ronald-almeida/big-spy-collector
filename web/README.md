# BIG Spy Dashboard

Painel Next.js para Vercel, com autenticação Auth.js por usuário e senha e páginas de visão geral, buscas, ofertas, palavras-chave e histórico.

## Dados

As APIs `/api/data` e `/api/search` exigem sessão autenticada. As chamadas ao backend existente acontecem apenas no servidor. Ofertas, palavras-chave e histórico continuam no banco original; não há cópia descartável em memória.

## Variáveis de ambiente

- `AUTH_SECRET`: segredo de sessão.
- `ADMIN_USERNAME`: usuário administrativo.
- `ADMIN_PASSWORD_HASH`: salt e hash scrypt separados por `:` (64 bytes de hash hexadecimal).
- `BACKEND_URL`: URL do backend BIG Spy.
- `BACKEND_TOKEN`: credencial de serviço do backend; nunca deve usar prefixo NEXT_PUBLIC.

O login usa sessão de 12 horas, proteção CSRF do Auth.js e limitação de tentativas por instância. Cadastro público não está habilitado. Para trocar a senha administrativa, atualize o hash na Vercel e altere AUTH_SECRET para invalidar sessões antigas.

## Desenvolvimento

`npm ci`, `npm run dev`, `npm run build`.

## Publicação

Projeto Vercel aponta para a pasta `web` deste repositório. O Worker coletor continua na raiz e é implantado pela Cloudflare.
