import { Download, Eye, EyeOff, FileText, ImageDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WithdrawalRow } from "@/components/WithdrawTracking";
import {
  RECEIPT_H,
  RECEIPT_W,
  drawReceipt,
  receiptFileName,
  type ReceiptData,
} from "@/lib/receipt";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function WithdrawReceipt({
  item,
  userName,
  title = "Comprovante de pagamento",
}: {
  item: WithdrawalRow;
  userName?: string | null;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);

  const data: ReceiptData = {
    id: item.id,
    amount: Number(item.amount),
    fee: Number(item.fee),
    net_amount: Number(item.net_amount),
    pix_key: item.pix_key,
    pix_type: item.pix_type,
    created_at: item.created_at,
    updated_at: item.updated_at,
    user_name: userName ?? null,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawReceipt(canvas, data, { revealPix: reveal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.updated_at, reveal, userName]);

  async function ensureDrawn() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    await drawReceipt(canvas, data, { revealPix: reveal });
    return canvas;
  }

  async function handlePng() {
    setBusy("png");
    const canvas = await ensureDrawn();
    canvas?.toBlob((blob) => {
      if (blob) download(blob, receiptFileName(item.id, "png"));
      setBusy(null);
    }, "image/png");
  }

  async function handlePdf() {
    setBusy("pdf");
    try {
      const canvas = await ensureDrawn();
      if (!canvas) return;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const scale = Math.min((pw - 40) / RECEIPT_W, (ph - 40) / RECEIPT_H);
      const w = RECEIPT_W * scale;
      const h = RECEIPT_H * scale;
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, pw, ph, "F");
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pw - w) / 2, (ph - h) / 2, w, h);
      pdf.save(receiptFileName(item.id, "pdf"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="glass rounded-3xl p-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[color:var(--brand-pink)]" />
          <h2 className="text-sm font-bold text-white">{title}</h2>
        </div>
        <button
          onClick={() => setReveal((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-muted-foreground"
        >
          {reveal ? <EyeOff size={12} /> : <Eye size={12} />}
          {reveal ? "Ocultar chave" : "Mostrar chave"}
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={handlePng}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {busy === "png" ? <Loader2 size={15} className="animate-spin" /> : <ImageDown size={15} />}
          Imagem
        </button>
        <button
          onClick={handlePdf}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          PDF
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        A chave PIX aparece parcialmente oculta por segurança. Use "Mostrar chave" apenas
        se precisar do comprovante completo.
      </p>
    </section>
  );
}
