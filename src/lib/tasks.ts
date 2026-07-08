import type { LucideIcon } from "lucide-react";
import { Brain, Share2, MessageSquareText, Users } from "lucide-react";

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
    short: "Ajude a treinar modelos avaliando respostas curtas.",
    description:
      "Avalie respostas, classifique conteúdos e contribua para o aprendizado de modelos de inteligência artificial. Tarefas rápidas de 30 a 60 segundos.",
    earnings: "R$ 2,50 – R$ 8,00 por tarefa",
    requirements: [
      "Português fluente",
      "Atenção aos detalhes",
      "Smartphone ou desktop com internet",
    ],
    icon: Brain,
    accent: "linear-gradient(135deg,#1e5eff, #7aa5ff)",
  },
  {
    slug: "rcs",
    title: "RCS",
    short: "Interaja com mensagens RCS e valide entregas.",
    description:
      "Receba, visualize e valide mensagens RCS de marcas parceiras. Simples, seguro e pago por interação concluída.",
    earnings: "R$ 0,80 – R$ 3,00 por interação",
    requirements: [
      "Chip ativo em smartphone Android",
      "Mensagens RCS habilitadas",
      "Responder em até 24 horas",
    ],
    icon: MessageSquareText,
    accent: "linear-gradient(135deg,#ff66c4,#ffa1dc)",
  },
  {
    slug: "compartilhamento",
    title: "Compartilhamento",
    short: "Compartilhe conteúdos nas suas redes e ganhe por visualização.",
    description:
      "Publique conteúdos aprovados nas suas redes sociais e receba comissão por cada visualização e engajamento gerado.",
    earnings: "R$ 5,00 – R$ 40,00 por campanha",
    requirements: [
      "Ao menos 200 seguidores",
      "Perfil público",
      "Postar conforme briefing",
    ],
    icon: Share2,
    accent: "linear-gradient(135deg,#5b8dff,#ff66c4)",
  },
  {
    slug: "indique-ganhe",
    title: "Indique & Ganhe",
    short: "Convide amigos e ganhe comissão vitalícia.",
    description:
      "Convide amigos com seu link exclusivo. Você ganha um bônus imediato e 10% de comissão vitalícia sobre os ganhos deles.",
    earnings: "R$ 10 por indicação + 10% vitalício",
    requirements: [
      "Conta verificada",
      "Compartilhar link pessoal",
      "Amigo completar 1ª tarefa",
    ],
    icon: Users,
    accent: "linear-gradient(135deg,#1e5eff,#ff66c4)",
  },
];

export function getTask(slug: string): Task | undefined {
  return tasks.find((t) => t.slug === slug);
}
