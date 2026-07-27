import axios from "axios";

const SUPABASE_URL =
  process.env.WHATSAPP_SUPABASE_URL || "https://tksuvtitmlbrpauwsxof.supabase.co/rest/v1";
const SUPABASE_KEY =
  process.env.WHATSAPP_SUPABASE_KEY || "sb_publishable_si0MtfRcPInr03o9Dl8otA_omdrPGWu";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Busca todos os contatos da tabela `telefone` no Supabase.
 * A tabela possui uma coluna chamada `números` (tipo texto).
 */
export async function getContactsFromDB(): Promise<{
  success: boolean;
  phones: string[];
  count: number;
}> {
  try {
    const response = await axios.get(`${SUPABASE_URL}/telefone`, {
      params: { select: "números" },
      headers,
    });

    const phones: string[] = (response.data || [])
      .map(
        (row: Record<string, string>) =>
          row["números"] || row["numeros"] || row["phone"] || row["telefone"],
      )
      .filter((n: string | undefined) => !!n && String(n).trim() !== "");

    return { success: true, phones, count: phones.length };
  } catch (err: any) {
    console.error(
      "Erro ao buscar contatos do Supabase:",
      err?.response?.data || err?.message || err,
    );
    return { success: false, phones: [], count: 0 };
  }
}

/**
 * Importa uma lista de telefones para a tabela `telefone` no Supabase.
 * Ignora duplicatas via upsert.
 */
export async function importContacts(
  phones: string[],
): Promise<{ success: boolean; imported: number }> {
  if (!phones.length) return { success: true, imported: 0 };

  const rows = phones
    .map((p) => p.replace(/\D/g, ""))
    .filter((p) => p.length >= 10)
    .map((p) => ({ números: p }));

  try {
    await axios.post(`${SUPABASE_URL}/telefone`, rows, {
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates",
      },
    });

    return { success: true, imported: rows.length };
  } catch (err: any) {
    console.error(
      "Erro ao importar contatos para Supabase:",
      err?.response?.data || err?.message || err,
    );
    throw new Error(
      err?.response?.data?.message || err?.message || "Erro ao importar contatos no Supabase",
    );
  }
}

/**
 * Retorna informações de configuração do banco (sem expor a chave completa).
 */
export function getDBCredentials(): { url: string; keyPreview: string; configured: boolean } {
  return {
    url: SUPABASE_URL,
    keyPreview: SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 20)}...` : "não configurado",
    configured: !!SUPABASE_KEY,
  };
}
