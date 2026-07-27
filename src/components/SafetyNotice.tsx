import { ShieldAlert } from "lucide-react";

export function SafetyNotice() {
  return (
    <section className="mt-6 animate-fade-up">
      <div className="glass rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-gradient-soft text-white">
            <ShieldAlert size={18} />
          </span>
          <div>
            <h3 className="text-sm font-bold">Importante</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              O não cumprimento das regras de cada tarefa poderá resultar na
              reprovação da atividade. O envio de informações falsas, conteúdo
              duplicado, tentativas de fraude ou qualquer atividade irregular
              poderá ocasionar a suspensão ou o bloqueio permanente da conta,
              conforme análise da equipe da Infinity Gain.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
