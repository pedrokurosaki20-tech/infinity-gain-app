import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro com convite — Infinity Gain" },
      {
        name: "description",
        content:
          "Crie sua conta Infinity Gain usando um código de convite e comece a ganhar com tarefas online.",
      },
    ],
  }),
  component: CadastroRedirect,
});

function CadastroRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref") ?? "";
    navigate({
      to: "/register",
      search: ref ? ({ ref } as never) : undefined,
      replace: true,
    });
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      Redirecionando para o cadastro…
    </div>
  );
}
