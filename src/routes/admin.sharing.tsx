import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Pencil,
  RefreshCw,
  ShieldCheck,
  XCircle,
  History,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  CAMPAIGN_BUCKET,
  PLATFORM_LABEL,
  SHARE_PLATFORMS,
  resolveCampaignFileUrl,
  type SharePlatform,
} from "@/lib/share-campaigns";

export const Route = createFileRoute("/admin/sharing")({
  head: () => ({
    meta: [
      { title: "Compartilhamentos — Infinity Gain" },
      {
        name: "description",
        content: "Valide publicações e edite as campanhas de cada rede social.",
      },
    ],
  }),
  component: AdminSharingPage,
});

type SubmissionStatus = "pending" | "approved" | "rejected";

type Row = {
  id: string;
  user_id: string;
  proof_path: string;
  link: string | null;
  platform: string | null;
  status: SubmissionStatus;
  reward_amount: number;
  rejection_reason: string | null;
  created_at: string;
  profile?: { name: string | null } | null;
  proof_url?: string | null;
};

type CampaignRow = {
  id: string;
  platform: string;
  title: string | null;
  text_content: string | null;
  file_url: string | null;
  file_type: string | null;
  share_url: string | null;
  active: boolean;
};

type LogRow = {
  id: string;
  platform: string;
  action: string;
  admin_name: string | null;
  created_at: string;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const statusMeta: Record<SubmissionStatus, { label: string; className: string; Icon: typeof Clock }> = {
  pending: { label: "Pendente", className: "bg-[color:var(--brand-blue)]/15 text-[color:var(--brand-blue)]", Icon: Clock },
  approved: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-400", Icon: CheckCircle2 },
  rejected: { label: "Reprovado", className: "bg-red-500/15 text-red-400", Icon: XCircle },
};

function AdminSharingPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [platform, setPlatform] = useState<SharePlatform>("facebook");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rewardFor, setRewardFor] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);

  // form
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [fileType, setFileType] = useState<"image" | "video">("image");
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/" });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
    })();
  }, [navigate]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("task_submissions")
      .select("id, user_id, proof_path, link, platform, status, reward_amount, rejection_reason, created_at")
      .eq("task_type", "compartilhamento")
      .eq("platform", platform)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Row[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      for (const r of list) r.profile = map.get(r.user_id) ?? null;
    }
    await Promise.all(
      list.map(async (r) => {
        const { data: sig } = await supabase.storage.from("task-proofs").createSignedUrl(r.proof_path, 3600);
        r.proof_url = sig?.signedUrl ?? null;
      })
    );
    setRows(list);

    const { data: camps } = await supabase.rpc("admin_list_share_campaigns");
    const c = ((camps ?? []) as CampaignRow[]).find((x) => x.platform === platform) ?? null;
    setCampaign(c);
    setTitle(c?.title ?? "");
    setText(c?.text_content ?? "");
    setShareUrl(c?.share_url ?? "");
    setFileType((c?.file_type as any) === "video" ? "video" : "image");
    setFileUrl(c?.file_url ?? "");

    const { data: lg } = await supabase
      .from("share_campaign_logs")
      .select("id, platform, action, admin_name, created_at")
      .eq("platform", platform)
      .order("created_at", { ascending: false })
      .limit(10);
    setLogs((lg ?? []) as LogRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const ch = supabase
      .channel(`admin-sharing-${platform}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, platform]);

  async function review(id: string, approve: boolean, amount?: number) {
    setBusyId(id);
    const { error } = await supabase.rpc("review_task_submission", {
      _id: id,
      _approve: approve,
      _amount: approve ? (amount ?? 0.5) : undefined,
    });
    if (error) toast.error(error.message);
    else {
      setRewardFor(null);
      toast.success(approve ? "✅ Publicação aprovada e saldo creditado." : "Publicação reprovada.");
      await load();
    }
    setBusyId(null);
  }

  async function uploadCampaignFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${platform}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(CAMPAIGN_BUCKET)
      .upload(path, f, { contentType: f.type, upsert: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setFileUrl(path);
    setFileType(f.type.startsWith("video") ? "video" : "image");
    toast.success("✅ Arquivo enviado.");
  }

  async function removeFile() {
    if (fileUrl && !/^https?:\/\//i.test(fileUrl)) {
      await supabase.storage.from(CAMPAIGN_BUCKET).remove([fileUrl]);
    }
    setFileUrl("");
  }

  async function saveCampaign(active: boolean) {
    setSaving(true);
    const { error } = await supabase.rpc("admin_save_share_campaign", {
      _platform: platform,
      _title: title,
      _text_content: text,
      _share_url: shareUrl,
      _file_url: fileUrl,
      _file_type: fileType,
      _active: active,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("✅ Campanha salva. Já está valendo para todos os usuários.");
    setEditing(false);
    await load();
  }

  async function previewFile() {
    const url = await resolveCampaignFileUrl(fileUrl);
    if (url) window.open(url, "_blank", "noopener");
    else toast.warning("⚠️ Nenhum arquivo cadastrado.");
  }

  if (checking) {
    return (
      <AppShell>
        <div className="mt-20 text-center text-sm text-muted-foreground">Verificando acesso…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="glass mt-10 rounded-3xl p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 text-[color:var(--brand-pink)]" size={28} />
          <p className="text-sm font-semibold">Acesso restrito</p>
        </div>
      </AppShell>
    );
  }

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link to="/admin" className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Voltar">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Compartilhamentos</h1>
        <button onClick={load} className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Atualizar">
          <RefreshCw size={16} />
        </button>
      </header>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link to="/admin/dashboard" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Dashboard</Link>
        <Link to="/admin" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Saques</Link>
        <Link to="/admin/tasks/$type" params={{ type: "rcs" }} className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Tarefas RCS</Link>
        <span className="shrink-0 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow">Compartilhamentos</span>
        <Link to="/admin/referrals" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Indicados</Link>
        <Link to="/admin/checkin" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Check-in</Link>
      </nav>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {SHARE_PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setPlatform(p);
              setEditing(false);
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              platform === p ? "bg-brand-gradient text-white shadow-glow" : "glass text-muted-foreground"
            }`}
          >
            {PLATFORM_LABEL[p]}
          </button>
        ))}
      </div>

      {/* Editar campanha */}
      <section className="mt-5">
        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Campanha atual</p>
              <p className="truncate text-sm font-semibold">
                {campaign?.title || `Campanha ${PLATFORM_LABEL[platform]}`}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {campaign?.active === false ? "Desativada" : campaign ? "Ativa" : "Não cadastrada"}
              </p>
            </div>
            <button
              onClick={() => setEditing((v) => !v)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-xs font-semibold text-white shadow-glow"
            >
              <Pencil size={13} /> Editar Publicação
            </button>
          </div>

          {editing && (
            <div className="mt-4 space-y-3">
              <Field label="Título interno da campanha">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Ex.: Campanha Instagram — Fevereiro"
                />
              </Field>

              <Field label="Texto oficial da publicação">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Texto que o usuário vai copiar…"
                />
              </Field>

              <Field label="Link oficial da publicação">
                <input
                  value={shareUrl}
                  onChange={(e) => setShareUrl(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="https://…"
                />
              </Field>

              <div className="glass rounded-2xl p-3">
                <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Tipo de mídia</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["image", "video"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFileType(t)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        fileType === t ? "bg-brand-gradient text-white shadow-glow" : "bg-white/5 text-muted-foreground"
                      }`}
                    >
                      {t === "image" ? "Imagem" : "Vídeo"}
                    </button>
                  ))}
                </div>

                <p className="mt-3 truncate text-[11px] text-muted-foreground">
                  {fileUrl ? fileUrl.split("/").pop() : "Nenhum arquivo enviado"}
                </p>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="cursor-pointer rounded-xl bg-white/5 px-2 py-2 text-center text-xs font-semibold text-white">
                    Enviar
                    <input
                      type="file"
                      accept={fileType === "video" ? "video/*" : "image/*"}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadCampaignFile(f);
                      }}
                    />
                  </label>
                  <button onClick={previewFile} className="rounded-xl bg-white/5 px-2 py-2 text-xs font-semibold text-white">
                    Visualizar
                  </button>
                  <button onClick={removeFile} className="rounded-xl bg-red-500/80 px-2 py-2 text-xs font-semibold text-white">
                    Excluir
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={saving}
                  onClick={() => saveCampaign(true)}
                  className="rounded-xl bg-brand-gradient px-3 py-2.5 text-xs font-semibold text-white shadow-glow disabled:opacity-50"
                >
                  Salvar e ativar
                </button>
                <button
                  disabled={saving}
                  onClick={() => saveCampaign(false)}
                  className="rounded-xl bg-white/5 px-3 py-2.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                >
                  Salvar e desativar
                </button>
              </div>
              <button
                onClick={() => {
                  setEditing(false);
                  load();
                }}
                className="w-full rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-muted-foreground"
              >
                Cancelar alterações
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Validar publicações */}
      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Validar publicações ({pending.length} pendentes)
        </h2>
        <div className="space-y-3">
          {loading ? (
            <div className="glass rounded-3xl px-4 py-6 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : rows.length === 0 ? (
            <div className="glass rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum envio para {PLATFORM_LABEL[platform]}.
            </div>
          ) : (
            rows.map((r) => {
              const meta = statusMeta[r.status];
              const Icon = meta.Icon;
              const busy = busyId === r.id;
              return (
                <div key={r.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.profile?.name || "Usuário"}</p>
                      <p className="text-[11px] text-muted-foreground">ID: {r.user_id.slice(0, 8)} · {fmtDate(r.created_at)}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                      <Icon size={10} />
                      {meta.label}
                    </span>
                  </div>

                  {r.link && (
                    <a href={r.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[color:var(--brand-blue)] hover:underline">
                      <ExternalLink size={12} /> Abrir link da publicação
                    </a>
                  )}

                  {r.proof_url && (
                    <a href={r.proof_url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-2xl border border-white/10">
                      <img src={r.proof_url} alt="Print enviado" className="max-h-72 w-full bg-black/40 object-contain" />
                      <span className="flex items-center justify-center gap-1 bg-white/5 py-1.5 text-[11px] font-semibold text-muted-foreground">
                        <Eye size={12} /> Visualizar print
                      </span>
                    </a>
                  )}

                  {r.status === "approved" && (
                    <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                      Creditado: R$ {Number(r.reward_amount).toFixed(2).replace(".", ",")}
                    </p>
                  )}
                  {r.status === "rejected" && (
                    <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      Reprovado · R$ 0,00 {r.rejection_reason ? `· ${r.rejection_reason}` : ""}
                    </p>
                  )}

                  {r.status === "pending" &&
                    (rewardFor === r.id ? (
                      <div className="mt-3">
                        <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Escolha a recompensa</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[0.3, 0.5, 0.7, 1].map((v) => (
                            <button
                              key={v}
                              disabled={busy}
                              onClick={() => review(r.id, true, v)}
                              className="rounded-xl bg-emerald-500/90 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              R$ {v.toFixed(2).replace(".", ",")}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setRewardFor(null)} className="mt-2 w-full rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-muted-foreground">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() => setRewardFor(r.id)}
                          className="flex-1 rounded-xl bg-emerald-500/90 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Aprovar
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => review(r.id, false)}
                          className="flex-1 rounded-xl bg-red-500/90 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Reprovar
                        </button>
                      </div>
                    ))}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Histórico de alterações */}
      <section className="mt-5 pb-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          <History size={14} /> Histórico de alterações
        </h2>
        <div className="glass space-y-2 rounded-3xl p-4">
          {logs.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">Nenhuma alteração registrada.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-xs font-semibold text-white/90">
                  {l.admin_name || "Administrador"} · {PLATFORM_LABEL[l.platform as SharePlatform] ?? l.platform}
                </p>
                <p className="text-[11px] text-muted-foreground">{l.action}</p>
                <p className="text-[10px] text-muted-foreground">{fmtDate(l.created_at)}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl px-3 py-2.5">
      <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
