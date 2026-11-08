import type { QuoteEventType } from "@/db/schema";
import { TIME_ZONE } from "@/domain/dates";
import { InvalidTransitionError, type DisplayStatus } from "@/domain/status";

export const statusLabels: Record<DisplayStatus, string> = {
  draft: "Borrador",
  sent: "Enviado",
  viewed: "Visto",
  accepted: "Aceptado",
  rejected: "Rechazado",
  expired: "Vencido",
};

export const eventLabels: Record<QuoteEventType, string> = {
  created: "Creado",
  sent: "Enviado",
  viewed: "Visto por el cliente",
  accepted: "Aceptado",
  rejected: "Rechazado",
  new_version: "Nueva versión",
  reactivated: "Reactivado",
};

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const dateTimeFormat = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "2026-04-25" -> "25/4/2026" (a calendar date, no time zone shift). */
export const formatDate = (isoDate: string) => dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
export const formatDateTime = (date: Date) => dateTimeFormat.format(date);

/** Spanish message for an action the quote's state does not allow. */
export function transitionMessage(e: InvalidTransitionError): string {
  if (e.action === "edit")
    return "Un presupuesto aceptado o rechazado no se cambia. Duplicalo para armar uno nuevo.";
  if (e.action === "send") return "La fecha de validez ya pasó. Cambiala antes de enviarlo.";
  if (e.action === "accept" && e.status === "expired")
    return "Este presupuesto venció y ya no se puede aceptar.";
  if (e.action === "reactivate") return "Solo se pueden reactivar presupuestos vencidos.";
  return "Esto no se puede hacer en el estado actual del presupuesto.";
}
