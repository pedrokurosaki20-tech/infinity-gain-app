## Problema

As páginas `/admin/tasks/rcs`, `/admin/tasks/compartilhamento` e `/admin/referrals` não abrem porque o arquivo `src/routes/admin.tsx` é a rota-pai dessas filhas, mas seu componente (`AdminPage`) renderiza a tela de saques completa e **não inclui `<Outlet />`**. No TanStack Router, sem `<Outlet />` no pai, nenhuma rota filha é montada — por isso clicar nas abas muda a URL mas a tela continua a mesma (ou fica em branco dependendo do estado).

## Correção

Transformar `/admin` em um layout com um índice separado:

1. **Criar `src/routes/admin.route.tsx`** (novo arquivo de layout do segmento `/admin`)
   - `createFileRoute` com um componente mínimo que retorna apenas `<Outlet />`.
   - Sem verificação de admin aqui — cada folha já verifica (evita duplicar lógica).

2. **Renomear `src/routes/admin.tsx` → `src/routes/admin.index.tsx`**
   - Muda o `createFileRoute("/admin")` para `createFileRoute("/admin/")`.
   - Mantém 100% do conteúdo atual (painel de saques, filtros, cards, botões de status). Nada da UI muda.

3. **Deixar `admin.tasks.$type.tsx` e `admin.referrals.tsx` como estão** — passam a montar corretamente sob o novo layout.

4. **Não editar `src/routeTree.gen.ts`** — o Vite plugin regenera automaticamente ao salvar.

## Resultado esperado

- `/admin` → continua mostrando o painel de saques (via `admin.index.tsx`).
- `/admin/tasks/rcs` e `/admin/tasks/compartilhamento` → abrem as telas de validação de tarefas.
- `/admin/referrals` → abre o histórico de indicados.
- As abas no topo do painel navegam normalmente entre as três seções.

## Verificação

Após aplicar, abrir `/admin`, clicar em cada aba (Saques, Tarefas RCS, Compartilhamento, Indicados) e confirmar que cada página renderiza. Checar console por erros de rota duplicada.
