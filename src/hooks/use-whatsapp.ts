import { useState, useEffect, useCallback, useRef } from "react";

const API = "/api/wa";

export type WaPhase =
  | { kind: "idle" }
  | { kind: "phone-input" }
  | { kind: "connecting"; phone: string }
  | { kind: "pairing"; code: string }
  | { kind: "connected" }
  | { kind: "sending"; total: number; sent: number; startedAt: number };

async function waFetch(path: string, opts?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`/api/wa${path}`, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // Tenta rota /api de fallback
      res = await fetch(`/api${path}`, {
        headers: { "Content-Type": "application/json" },
        ...opts,
      });
    }
  } catch {
    throw new Error("Falha ao conectar com o servidor. Tente novamente.");
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Resposta do servidor indisponível (${res.status}).`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
  return data;
}

export function useWhatsapp() {
  const [phase, setPhase] = useState<WaPhase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const sentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Verifica estado ao montar (sessão ativa pode existir) ──────────
  useEffect(() => {
    waFetch("/status")
      .then((data) => {
        if (data.status === "open") setPhase({ kind: "connected" });
      })
      .catch(() => {
        // servidor ainda não rodando ou sem sessão — ignora
      });
  }, []);

  // ── Polling: aguarda conexão enquanto em 'pairing' ─────────────────
  useEffect(() => {
    if (phase.kind !== "pairing") return;

    const id = setInterval(async () => {
      try {
        const data = await waFetch("/status");
        if (data.status === "open") {
          setPhase({ kind: "connected" });
        }
      } catch {
        // ignora erros de rede durante polling
      }
    }, 2000);

    return () => clearInterval(id);
  }, [phase.kind]);

  // ── Quando conecta, carrega contatos e dispara automaticamente ──────
  useEffect(() => {
    if (phase.kind !== "connected") return;

    let cancelled = false;

    async function startSending() {
      try {
        const { phones = [] } = await waFetch("/contatos");

        if (cancelled) return;

        if (phones.length === 0) {
          setError("Nenhum contato encontrado no banco de dados.");
          setPhase({ kind: "idle" });
          return;
        }

        setPhase({
          kind: "sending",
          total: phones.length,
          sent: 0,
          startedAt: Date.now(),
        });

        // Disparo em background — não aguarda (resposta é imediata)
        waFetch("/disparar", {
          method: "POST",
          body: JSON.stringify({ targets: phones }),
        }).catch((e) => console.error("Erro no disparo:", e));
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setPhase({ kind: "idle" });
        }
      }
    }

    startSending();
    return () => {
      cancelled = true;
    };
  }, [phase.kind]);

  // ── Estimativa de progresso (1 msg a cada ~37,5 s em média) ─────────
  useEffect(() => {
    if (phase.kind !== "sending") {
      if (sentTimerRef.current) {
        clearInterval(sentTimerRef.current);
        sentTimerRef.current = null;
      }
      return;
    }

    const AVG_DELAY_MS = 37_500; // média de 30-45 s

    sentTimerRef.current = setInterval(() => {
      setPhase((prev) => {
        if (prev.kind !== "sending") return prev;
        const next = Math.min(prev.sent + 1, prev.total);
        return { ...prev, sent: next };
      });
    }, AVG_DELAY_MS);

    return () => {
      if (sentTimerRef.current) clearInterval(sentTimerRef.current);
    };
  }, [phase.kind]);

  // ── Ações expostas ao componente ───────────────────────────────────
  const openPhoneInput = useCallback(() => {
    setError(null);
    setPhase({ kind: "phone-input" });
  }, []);

  const cancelPhoneInput = useCallback(() => {
    setError(null);
    setPhase({ kind: "idle" });
  }, []);

  const connect = useCallback(async (phone: string) => {
    setError(null);
    setPhase({ kind: "connecting", phone });
    try {
      const data = await waFetch("/connect", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setPhase({ kind: "pairing", code: data.pairingCode as string });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase({ kind: "phone-input" });
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await waFetch("/disconnect", { method: "POST" });
    } catch {
      // ignora erros de rede
    } finally {
      setPhase({ kind: "idle" });
      setError(null);
    }
  }, []);

  return { phase, error, openPhoneInput, cancelPhoneInput, connect, disconnect };
}
