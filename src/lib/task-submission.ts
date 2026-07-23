import { supabase } from "@/integrations/supabase/client";

export type TaskType = "rcs" | "compartilhamento";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function uploadProof(file: File, userId: string): Promise<string> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error("Formato inválido. Envie PNG, JPG ou WEBP.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Arquivo muito grande (máx. 5MB).");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("task-proofs")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function submitTaskProof(args: {
  taskType: TaskType;
  file: File;
  link?: string;
  platform?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Faça login para enviar a validação.");
  const path = await uploadProof(args.file, userData.user.id);
  const { data, error } = await supabase.rpc("submit_task_proof", {
    _task_type: args.taskType,
    _proof_path: path,
    _link: args.link ?? undefined,
    _platform: args.platform ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
