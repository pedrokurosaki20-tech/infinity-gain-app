# Infinity Gain

Plataforma de tarefas e ganhos online em português, com um backend de disparo WhatsApp integrado.

## Stack

- **Frontend:** TanStack Start (SSR), React 19, Tailwind CSS v4, Supabase (auth + banco)
- **Backend WhatsApp:** Express + Baileys (WhatsApp Web API), Bun runtime
- **Banco de dados:** Supabase (dois projetos distintos — ver abaixo)

## Serviços

| Serviço                  | Porta | Descrição                             |
| ------------------------ | ----- | ------------------------------------- |
| WhatsApp Server          | 3000  | API de disparos em massa via WhatsApp |
| Frontend (Infinity Gain) | 5000  | App React com TanStack Start          |

## Como rodar

### WhatsApp Server (porta 3000)

```bash
bun whatsapp-server.ts
```

Workflow configurado: **WhatsApp Server**

### Frontend Infinity Gain

O projeto veio do Lovable (TanStack Start + Vite). Para rodar em dev:

```bash
bun run dev
```

## Rotas da API WhatsApp

| Método | Rota                   | Descrição                       |
| ------ | ---------------------- | ------------------------------- |
| GET    | /api/status            | Status da conexão WhatsApp      |
| POST   | /api/connect           | Gera Pairing Code para conectar |
| POST   | /api/disconnect        | Desconecta e apaga a sessão     |
| POST   | /api/disparar          | Dispara mensagens em massa      |
| GET    | /api/contatos          | Lista contatos do Supabase      |
| POST   | /api/contatos/importar | Importa lista de telefones      |
| GET    | /api/db-credentials    | Info do banco de dados          |

## Banco de dados — Supabase (WhatsApp Sender)

- **Tabela:** `telefone`
- **Coluna:** `números` (texto)
- **URL:** configurada em `WHATSAPP_SUPABASE_URL`
- **Chave:** configurada em `WHATSAPP_SUPABASE_KEY`

## Banco de dados — Supabase (Infinity Gain)

Projeto separado, credenciais em `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).

## Sincronização com Lovable

Este projeto é conectado ao Lovable via GitHub. Alterações no código do frontend (`src/`) devem ser commitadas e enviadas ao branch conectado para sincronizar com o Lovable. **Não fazer force push nem rebase de commits já publicados.**

## Arquivos principais

- `whatsapp-server.ts` — servidor Express + Baileys
- `db-client.ts` — integração com Supabase (leitura/importação de contatos)
- `src/` — frontend Infinity Gain (TanStack Start)
- `supabase/` — migrations do banco do Infinity Gain

## User preferences

- Idioma de comunicação: Português (pt-BR)
- Sincronizar alterações com o Lovable via GitHub
