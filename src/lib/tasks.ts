import type { LucideIcon } from "lucide-react";
import { Bot, MessageCircle, Globe2, UsersRound } from "lucide-react";

export type TaskSlug = "treinamento-ia" | "rcs" | "compartilhamento" | "indique-ganhe";

export type Task = {
  slug: TaskSlug;
  title: string;
  short: string;
  description: string;
  earnings: string;
  requirements: string[];
  icon: LucideIcon;
  accent: string; // gradient
};

export const tasks: Task[] = [
  {
    slug: "treinamento-ia",
    title: "Treinamento de IA",
    short:
      "Ajude a treinar inteligências artificiais completando tarefas simples no WhatsApp. Ganhe entre R$50 e R$300 por dia.",
    description:
      "Ajude a treinar inteligências artificiais completando tarefas simples no WhatsApp. Ganhe entre R$50 e R$300 por dia.",
    earnings: "R$ 50 – R$ 300 por dia",
    requirements: [
      "WhatsApp ativo",
      "Português fluente",
      "Atenção aos detalhes",
    ],
    icon: Bot,
    accent: "linear-gradient(135deg,#1e5eff, #7aa5ff)",
  },
  {
    slug: "rcs",
    title: "RCS",
    short:
      "Interaja com mensagens RCS e ganhe de R$0,30 a R$1,00 por tarefa concluída.",
    description:
      "Interaja com mensagens RCS e ganhe de R$0,30 a R$1,00 por tarefa concluída.",
    earnings: "R$ 0,30 – R$ 1,00 por tarefa",
    requirements: [
      "Chip ativo em smartphone Android",
      "Mensagens RCS habilitadas",
      "Responder em até 24 horas",
    ],
    icon: MessageCircle,
    accent: "linear-gradient(135deg,#ff66c4,#ffa1dc)",
  },
  {
    slug: "compartilhamento",
    title: "Compartilhamento",
    short:
      "Compartilhe conteúdos e receba de R$0,30 a R$1,00 por tarefa concluída.",
    description:
      "Compartilhe conteúdos e receba de R$0,30 a R$1,00 por tarefa concluída.",
    earnings: "R$ 0,30 – R$ 1,00 por tarefa",
    requirements: [
      "Ao menos 200 seguidores",
      "Perfil público",
      "Postar conforme briefing",
    ],
    icon: Globe2,
    accent: "linear-gradient(135deg,#5b8dff,#ff66c4)",
  },
  {
    slug: "indique-ganhe",
    title: "Indique & Ganhe",
    short:
      "Ganhe R$0,50 por indicação válida + bônus extras conforme sua rede cresce.",
    description:
      "Ganhe R$0,50 por indicação válida + bônus extras conforme sua rede cresce.",
    earnings: "R$ 0,50 por indicação + bônus",
    requirements: [
      "Conta verificada",
      "Compartilhar link pessoal",
      "Amigo completar 1ª tarefa",
    ],
    icon: UsersRound,
    accent: "linear-gradient(135deg,#1e5eff,#ff66c4)",
  },
];

export function getTask(slug: string): Task | undefined {
  return tasks.find((t) => t.slug === slug);
}
