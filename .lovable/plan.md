## Root cause

The Vite dev log shows the real failure:

```
Serialization error: Seroval Error (specific: 1)
  value: Symbol(react.forward_ref)
```

`src/routes/task.$slug.tsx` has:

```ts
loader: ({ params }) => {
  const task = getTask(params.slug);
  if (!task) throw notFound();
  return { task };
},
```

`task` includes `icon: LucideIcon`, which is a React `forwardRef` component. TanStack Start serializes loader data with Seroval to send it to the client for hydration. Seroval cannot serialize React components, so SSR crashes. The `/api/status` 500/502 the runtime overlay complains about is a downstream symptom (client polls `/api/status` after the blank screen), not the cause.

## Fix

Keep the loader small and serializable: return only the slug (or a plain-serializable subset), and resolve the full `Task` (with `icon`) on the client via `getTask` — icons are React components and belong in the component tree, not in serialized loader data.

Change in `src/routes/task.$slug.tsx`:

1. `loader` returns `{ slug: params.slug, title, short }` (plain strings) after validating `getTask` exists. Keep `throw notFound()` when missing.
2. `head` reads from the plain-string `loaderData` (already does — no icon needed).
3. `TaskDetail` calls `getTask(slug)` locally to obtain the full `Task` (including `icon`). No serialization involved.

No other files need changes. `src/lib/tasks.ts` stays as-is.

## Verification

- Reload `/task/treinamento-ia` — page renders, no Seroval error in the Vite log, no blank screen, no `/api/status` 500 overlay.
- Reload each task slug (`rcs`, `compartilhamento`, `sistema-email`, `indique-ganhe`) and an invalid slug (still shows `TaskNotFound`).