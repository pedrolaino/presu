"use client";

import { respond } from "@/server/actions/public";
import { ActionForm, Input, Textarea } from "./form";

export function RespondForms({ token, version }: { token: string; version: number }) {
  const action = respond.bind(null, token);
  return (
    <section className="decide stack" aria-labelledby="accept-title">
      <h2 id="accept-title">¿Te sirve?</h2>
      <p className="muted">
        Si estás de acuerdo, escribí tu nombre y aceptalo. Quien te lo mandó lo ve al momento.
      </p>
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
      <details>
        <summary>No me sirve, quiero rechazarlo</summary>
        <ActionForm action={action} submitLabel="Rechazar presupuesto" submitClassName="btn-danger">
          <input type="hidden" name="decision" value="reject" />
          <input type="hidden" name="version" value={version} />
          <Textarea label="Motivo (opcional)" name="reason" rows={3} maxLength={500} />
        </ActionForm>
      </details>
    </section>
  );
}
