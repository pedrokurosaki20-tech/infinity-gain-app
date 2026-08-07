import logo from "@/assets/infinity-gain-logo.png.asset.json";

export type ReceiptData = {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  pix_key: string;
  pix_type: string;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
};

export const RECEIPT_W = 1080;
export const RECEIPT_H = 1660;

const BLUE = "#1E5EFF";
const PINK = "#FF66C4";

const brl = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function maskPixKey(key: string, type: string) {
  const digits = key.replace(/\D/g, "");
  if (type === "CPF" && digits.length === 11) {
    return `${digits.slice(0, 3)}.***.**${digits.slice(9)}`;
  }
  if (digits.length >= 8) {
    return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
  }
  return key.slice(0, 2) + "•••" + key.slice(-2);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const F = (size: number, weight = "400") =>
  `${weight} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;

export async function drawReceipt(
  canvas: HTMLCanvasElement,
  data: ReceiptData,
  opts: { revealPix?: boolean } = {},
) {
  canvas.width = RECEIPT_W;
  canvas.height = RECEIPT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, RECEIPT_W, RECEIPT_H);

  const glow = ctx.createRadialGradient(540, 120, 40, 540, 320, 780);
  glow.addColorStop(0, "rgba(30,94,255,0.30)");
  glow.addColorStop(0.6, "rgba(255,102,196,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, RECEIPT_W, RECEIPT_H);

  // Card
  const M = 60;
  const cardW = RECEIPT_W - M * 2;
  roundRect(ctx, M, M, cardW, RECEIPT_H - M * 2, 48);
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.stroke();

  // Top gradient bar
  ctx.save();
  roundRect(ctx, M, M, cardW, 12, 6);
  ctx.clip();
  const bar = ctx.createLinearGradient(M, 0, M + cardW, 0);
  bar.addColorStop(0, BLUE);
  bar.addColorStop(1, PINK);
  ctx.fillStyle = bar;
  ctx.fillRect(M, M, cardW, 12);
  ctx.restore();

  const cx = RECEIPT_W / 2;
  let y = M + 90;

  // Logo
  const img = await loadImage(logo.url);
  if (img) {
    const w = 420;
    const h = (img.height / img.width) * w;
    ctx.drawImage(img, cx - w / 2, y, w, h);
    y += h + 30;
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = F(56, "800");
    ctx.fillText("INFINITY GAIN", cx, y + 50);
    y += 110;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = F(26, "600");
  ctx.fillText("COMPROVANTE DE PAGAMENTO PIX", cx, y);
  y += 60;

  // Status pill
  const pillW = 440;
  const pillH = 62;
  roundRect(ctx, cx - pillW / 2, y, pillW, pillH, 31);
  ctx.fillStyle = "rgba(34,197,94,0.14)";
  ctx.fill();
  ctx.strokeStyle = "rgba(34,197,94,0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#4ade80";
  ctx.font = F(28, "700");
  ctx.fillText("✓  PAGAMENTO CONCLUÍDO", cx, y + 41);
  y += pillH + 70;

  // Amount
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = F(24, "600");
  ctx.fillText("VALOR RECEBIDO", cx, y);
  y += 90;
  const amountGrad = ctx.createLinearGradient(cx - 300, 0, cx + 300, 0);
  amountGrad.addColorStop(0, "#8fb4ff");
  amountGrad.addColorStop(1, "#ffa8dd");
  ctx.fillStyle = amountGrad;
  ctx.font = F(96, "800");
  ctx.fillText(brl(Number(data.net_amount)), cx, y);
  y += 60;

  // Divider
  ctx.beginPath();
  ctx.moveTo(M + 70, y);
  ctx.lineTo(RECEIPT_W - M - 70, y);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();
  y += 60;

  // Detail rows
  const lx = M + 70;
  const rx = RECEIPT_W - M - 70;

  const row = (label: string, value: string, strong = false) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = F(26, "500");
    ctx.fillText(label, lx, y);
    ctx.textAlign = "right";
    ctx.fillStyle = strong ? "#ffffff" : "rgba(255,255,255,0.9)";
    ctx.font = F(strong ? 30 : 28, strong ? "700" : "600");
    ctx.fillText(value, rx, y);
    y += 62;
  };

  if (data.user_name) row("Beneficiário", data.user_name, true);
  row("Chave PIX", opts.revealPix ? data.pix_key : maskPixKey(data.pix_key, data.pix_type));
  row("Tipo de chave", data.pix_type);
  row("Valor bruto", brl(Number(data.amount)));
  row("Taxa (5%)", `− ${brl(Number(data.fee))}`);
  row("Valor líquido", brl(Number(data.net_amount)), true);

  y += 10;
  ctx.beginPath();
  ctx.moveTo(lx, y - 30);
  ctx.lineTo(rx, y - 30);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  row("Solicitado em", dt(data.created_at));
  row("Pago em", dt(data.updated_at));

  // Transaction id box
  y += 20;
  const boxH = 120;
  roundRect(ctx, lx, y, rx - lx, boxH, 24);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = F(22, "600");
  ctx.fillText("CÓDIGO DA TRANSAÇÃO", cx, y + 45);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 26px "SF Mono", Menlo, Consolas, monospace`;
  ctx.fillText(data.id.toUpperCase(), cx, y + 88);

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = F(22, "500");
  ctx.fillText("infinitygain.site · Comprovante gerado pelo aplicativo", cx, RECEIPT_H - M - 60);
}

export function receiptFileName(id: string, ext: string) {
  return `comprovante-infinity-gain-${id.slice(0, 8)}.${ext}`;
}
