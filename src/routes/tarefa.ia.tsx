import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { InternalDashboardControl } from "@/components/InternalDashboardControl";

export const Route = createFileRoute("/tarefa/ia")({
  head: () => ({
    meta: [
      { title: "Treinamento IA — Infinity Gain" }
    ],
  }),
  component: IaTrainingScreen,
});

function IaTrainingScreen() {
  return (
    <AppShell>
      <div className="w-full min-h-screen bg-background text-foreground py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black tracking-tight">Módulo de Treinamento Computacional</h1>
            <p className="text-muted-foreground text-xs">
              Gerencie a sincronização de dados e lotes em background.
            </p>
          </div>

          <InternalDashboardControl />
        </div>
      </div>
    </AppShell>
  );
}

