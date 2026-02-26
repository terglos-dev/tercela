# Tercela

Plataforma open-source de atendimento omnichannel. Conecte canais como WhatsApp, gerencie conversas em tempo real e organize contatos — tudo em uma interface unificada.

## Pré-requisitos

- [Bun](https://bun.sh) >= 1.3
- [PostgreSQL](https://www.postgresql.org/) 15+ **ou** [Docker](https://www.docker.com/)

## Quick Start com Docker

```bash
git clone https://github.com/tercela/tercela.git
cd tercela
docker compose up -d
```

Acesse http://localhost:3000 — API em http://localhost:3333/reference.

## Quick Start sem Docker

```bash
# 1. Instale dependências
bun install

# 2. Configure o ambiente
cp .env.example .env
# Edite .env com sua DATABASE_URL e JWT_SECRET

# 3. Crie as tabelas e seed
bun run db:push
bun run db:seed

# 4. Inicie em modo dev
bun run dev
```

Acesse http://localhost:3000 — API em http://localhost:3333/reference.

## Credenciais padrão

| Email              | Senha    |
|--------------------|----------|
| admin@tercela.com  | admin123 |

## Estrutura do projeto

```
tercela/
├── apps/
│   ├── api/          # Hono + Bun (porta 3333)
│   └── web/          # Nuxt 3 (porta 3000)
├── packages/
│   └── shared/       # Tipos e utilitários compartilhados
├── docker-compose.yml
├── .env.example
└── package.json
```

## Scripts

| Comando              | Descrição                          |
|----------------------|------------------------------------|
| `bun run dev`        | Inicia API + Web em modo dev       |
| `bun run dev:api`    | Inicia somente a API               |
| `bun run dev:web`    | Inicia somente o frontend          |
| `bun run db:push`    | Aplica schema no banco             |
| `bun run db:seed`    | Popula banco com dados iniciais    |
| `bun run docker:up`  | Sobe todos os serviços via Docker  |
| `bun run docker:down`| Para os serviços Docker            |

## API Reference

Com o servidor rodando, acesse http://localhost:3333/reference para a documentação interativa (Scalar).

## Licença

MIT
