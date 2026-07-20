import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Central de Ajuda — Infinity Gain" },
      {
        name: "description",
        content:
          "Respostas para dúvidas frequentes sobre tarefas, pagamentos, saques e uso da plataforma Infinity Gain.",
      },
      { property: "og:title", content: "Central de Ajuda — Infinity Gain" },
      {
        property: "og:description",
        content:
          "Encontre respostas rápidas sobre cadastro, tarefas, saques e suporte na Infinity Gain.",
      },
    ],
  }),
  component: HelpPage,
});

const faqs: { q: string; a: string }[] = [
  {
    q: "Como faço meu cadastro?",
    a: "Basta acessar a tela de Cadastro, informar seu nome, telefone e criar uma senha. Após concluir o cadastro, você já poderá acessar as tarefas e começar a ganhar imediatamente.",
  },
  {
    q: "Como funcionam as tarefas?",
    a: "Cada tarefa possui regras próprias, valores e prazos específicos. Leia atentamente as instruções antes de iniciar e siga cada etapa corretamente para garantir a aprovação e o crédito da recompensa.",
  },
  {
    q: "Quanto tempo demora para receber?",
    a: "As validações e pagamentos seguem os prazos informados em cada tarefa e na área de saque. Assim que sua atividade for aprovada, o valor é creditado no seu saldo.",
  },
  { q: "Qual o saque mínimo?", a: "R$ 10,00." },
  { q: "Qual é a taxa de saque?", a: "5% sobre o valor solicitado." },
  { q: "Quanto tempo demora o saque?", a: "Até 24 horas úteis." },
  {
    q: "Posso utilizar várias contas?",
    a: "Não. Cada usuário pode possuir apenas uma conta na plataforma. Múltiplas contas resultarão em suspensão.",
  },
  {
    q: "Como entro em contato com o suporte?",
    a: "Utilize o Grupo de Suporte disponível na página Perfil.",
  },
];

function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link
          to="/profile"
          className="glass grid h-10 w-10 place-items-center rounded-full"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Central de Ajuda</h1>
        <span className="w-10" />
      </header>

      <section className="mt-6 animate-fade-up">
        <div className="glass flex items-center gap-3 rounded-3xl p-5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <HelpCircle size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold">Como podemos ajudar?</h2>
            <p className="text-xs text-muted-foreground">
              Respostas rápidas para as dúvidas mais frequentes.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="glass rounded-2xl">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold text-white">{f.q}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-sm leading-relaxed text-white/80 animate-fade-up">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}
