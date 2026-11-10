# Financy

Aplicação de finanças pessoais para organizar receitas, despesas e categorias, acompanhar o saldo por período e manter seu perfil com foto. Cada usuário acessa somente os próprios dados.

O projeto usa React e TypeScript no frontend, Fastify com GraphQL no backend e PostgreSQL com Prisma no banco de dados.

## Requisitos

- Node.js 24.
- pnpm 10.18.0 (`npm install --global pnpm@10.18.0`).
- Docker com Docker Compose.

Execute os comandos abaixo na raiz do projeto.

## Preparação

Na primeira execução:

```sh
pnpm install --frozen-lockfile
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Se os arquivos `.env` já existirem, mantenha suas configurações. Em `backend/.env`, substitua `JWT_SECRET` por um segredo próprio. Para gerar um:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado para `JWT_SECRET`. As demais configurações dos exemplos atendem ao ambiente local.

## Rodar com Docker

```sh
pnpm containers:up
```

O comando constrói e inicia frontend, backend, PostgreSQL e Mailpit, aplicando as migrations automaticamente.

- Aplicação: [http://localhost:8080](http://localhost:8080).
- GraphQL: [http://localhost:8080/graphql](http://localhost:8080/graphql), endpoint de API sem interface gráfica.
- E-mails de desenvolvimento: [http://localhost:8025](http://localhost:8025).

Para parar:

```sh
docker compose --env-file backend/.env -f backend/compose.yaml --profile app down
```

Banco e fotos ficam em volumes persistentes e são preservados ao parar ou recriar os containers sem remover esses volumes.

## Rodar em desenvolvimento

Inicie apenas PostgreSQL e Mailpit e aguarde os serviços ficarem disponíveis:

```sh
docker compose -f backend/compose.yaml up -d --wait database mail
pnpm db:generate
pnpm db:migrate
```

Em um terminal, inicie a API:

```sh
pnpm dev
```

Em outro terminal, inicie o frontend:

```sh
pnpm dev:frontend
```

Acesse [http://localhost:5173](http://localhost:5173). A API estará em `http://localhost:3000/graphql` e os e-mails continuarão no Mailpit, porta 8025. Fora dos containers, as fotos são salvas em `backend/storage/avatars`, conforme `AVATAR_DIRECTORY`.

## Como usar

1. Clique em **Criar conta**, preencha seus dados e faça login. Use uma senha de quinze a 128 caracteres; espaços são permitidos.
2. Em **Categorias**, crie as classificações dos seus lançamentos, como Alimentação e Salário.
3. Em **Transações**, cadastre receitas e despesas, informando categoria, valor em reais e data. Também é possível editar e excluir lançamentos.
4. No **Dashboard**, escolha o mês ou um intervalo personalizado para acompanhar receitas, despesas e saldo. Lançamentos futuros dentro do período também entram nos totais.
5. Em **Meu perfil**, altere seu nome, adicione/troque/remova a foto ou altere sua senha. A foto aceita JPEG, PNG ou WebP estático de até 5 MiB.

Para recuperar a senha, use **Recuperar senha** no login e abra o e-mail no Mailpit. O link vale por trinta minutos e só pode ser usado uma vez. O ambiente local captura os e-mails no Mailpit, sem enviá-los para caixas reais.

## Verificações

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
