import { todayInArgentina } from "./dates";

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected";
export type DisplayStatus = QuoteStatus | "expired";
export type QuoteAction = "send" | "view" | "accept" | "reject" | "reactivate" | "edit";

/** `validUntil` is the last valid day: the version being sent for "send", the live version otherwise. */
export interface StatusInput {
  status: QuoteStatus;
  validUntil: string;
}

export class InvalidTransitionError extends Error {
  constructor(status: DisplayStatus, action: QuoteAction) {
    super(`Cannot ${action} a quote that is ${status}`);
  }
}

export function isExpired(q: StatusInput, now: Date): boolean {
  return (q.status === "sent" || q.status === "viewed") && q.validUntil < todayInArgentina(now);
}

export function displayStatus(q: StatusInput, now: Date): DisplayStatus {
  return isExpired(q, now) ? "expired" : q.status;
}

export function transition(q: StatusInput, action: QuoteAction, now: Date): QuoteStatus {
  const live = q.status === "sent" || q.status === "viewed";
  const expired = isExpired(q, now);
  const next = (() => {
    switch (action) {
      case "send":
        // The version being sent must still be valid today.
        return (q.status === "draft" || live) && q.validUntil >= todayInArgentina(now)
          ? "sent"
          : null;
      case "view":
        return q.status === "sent" ? "viewed" : null;
      case "accept":
        return live && !expired ? "accepted" : null;
      case "reject":
        return live ? "rejected" : null;
      case "reactivate":
        return expired ? "sent" : null;
      case "edit":
        return null; // editing is planned by planEdit, never a status change
    }
  })();
  if (!next) throw new InvalidTransitionError(displayStatus(q, now), action);
  return next;
}
