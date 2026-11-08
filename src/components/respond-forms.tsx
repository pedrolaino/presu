"use client";

import { respond } from "@/server/actions/public";
import { ActionForm, Input, Textarea } from "./form";

export function RespondForms({ token, version }: { token: string; version: number }) {
  const action = respond.bind(null, token);
  return (
    <div className="stack">
      <section className="stack" aria-labelledby="accept-title">
        <h2 id="accept-title">Aceptar</h2>
        <ActionForm action={action} submitLabel="Aceptar presupuesto">
          <input type="hidden" name="decision" value="accept" />
          <input type="hidden" name="version" value={version} />
          <Input
            label="Tu nombre"
            name="name"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
          />
        </ActionForm>
      </section>
      <details>
        <summary>No me sirve, quiero rechazarlo</summary>
        <ActionForm action={action} submitLabel="Rechazar presupuesto">
          <input type="hidden" name="decision" value="reject" />
          <input type="hidden" name="version" value={version} />
          <Textarea label="Motivo (opcional)" name="reason" rows={3} maxLength={500} />
        </ActionForm>
      </details>
    </div>
  );
}
