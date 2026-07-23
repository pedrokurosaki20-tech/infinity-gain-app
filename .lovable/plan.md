## Visão geral

Hoje os botões "Validar Tarefa" nas telas de RCS e Compartilhamento são apenas UI — nada é persistido. Vou criar o fluxo completo de submissão + validação e uma página de indicados por usuário no painel admin.

## Backend (migração única)

**Bucket de storage privado** `task-proofs` (leitura só do dono via signed URL; admin lê tudo).

**Nova tabela `public.task_submissions`**
- `task_type` (enum: `rcs`, `compartilhamento`)
- `link` (texto opcional — usado por Compartilhamento)
- `platform` (texto opcional — Facebook/Instagram/X/TikTok/Kwai, só Compartilhamento)
- `proof_path` (caminho do print no bucket, obrigatório)
- `status` (enum: `pending`, `approved`, `rejected`, default `pending`)
- `reward_amount` (numérico — preenchido na aprovação a partir do valor fixo)
- `reviewed_by`, `reviewed_at`, `rejection_reason`
- RLS: usuário vê/cria as próprias; admin vê/atualiza todas.
- Realtime habilitado.

**Função RPC `submit_task_proof(_task_type, _proof_path, _link, _platform)`** — SECURITY DEFINER, insere como o usuário autenticado, valida campos.

**Função RPC `review_task_submission(_id, _approve, _reason)`** — SECURITY DEFINER, só admin, aprova/rejeita atomicamente. Ao aprovar, credita `profiles.balance` e `total_earnings` com o valor fixo da tarefa (RCS R$ 0,30 · Compartilhamento R$ 0,50). Evita dupla-aprovação.

**GRANTs** em todas as tabelas/funções conforme padrão do projeto.

## Frontend — usuário

**`src/components/RcsTask.tsx` e `CompartilhamentoTask.tsx`**
- Ligar o botão "Validar Tarefa" a um upload real: subir o print no bucket `task-proofs/<user_id>/<uuid>` e chamar `submit_task_proof`.
- Compartilhamento: coletar `link` e `platform` do card selecionado.
- Mostrar toast de sucesso e badge "Em análise" com o último status do usuário para aquela tarefa (consulta simples em `task_submissions`).

## Frontend — admin

**`src/routes/admin.tsx`** — adicionar navegação por abas no topo: **Saques · RCS · Compartilhamento · Indicados**. Layout atual dos saques fica como está.

**Nova página `src/routes/admin.tasks.$type.tsx`** (usada por RCS e Compartilhamento)
- Lista submissões filtráveis por status (Pendente/Aprovado/Rejeitado), busca por nome/telefone.
- Card por submissão: usuário (nome, telefone), data, link/plataforma (quando houver), preview do print (signed URL), botões **Aprovar** e **Rejeitar** (com motivo opcional). Atualizações em tempo real via Realtime.

**Nova página `src/routes/admin.referrals.tsx`**
- Busca de usuário (nome/telefone/código). Ao selecionar, mostra lista simples de todos os perfis cujo `referred_by` = `invite_code` do selecionado: nome, telefone, data de cadastro. Contador total no topo.

## Detalhes técnicos

- Uploads: `supabase.storage.from('task-proofs').upload(...)` client-side, com validação de tipo (jpg/png/webp) e tamanho (≤ 5 MB) via zod.
- Signed URLs geradas no admin via `createSignedUrl` (1 h) para exibir o print.
- Valores fixos das recompensas ficam num map no lado do servidor dentro do RPC (fonte única da verdade); não são enviados pelo cliente.
- Gate de admin reaproveita `has_role(auth.uid(), 'admin')` já existente.
- Sem alterações em Treinamento de IA e Sistema de E-mail (fora do escopo confirmado).

## Arquivos afetados

- Migração nova (tabela, enums, RPCs, RLS, Realtime).
- `src/components/RcsTask.tsx`, `src/components/CompartilhamentoTask.tsx` — upload + submissão real.
- `src/routes/admin.tsx` — adicionar barra de abas.
- Novos: `src/routes/admin.tasks.$type.tsx`, `src/routes/admin.referrals.tsx`.
- `src/integrations/supabase/types.ts` — regenerado após a migração.
