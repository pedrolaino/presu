"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { shareQuote } from "@/server/actions/quotes";

const noop = () => () => {};
let shareSupport: boolean | undefined;
function canShareFiles() {
  shareSupport ??= !!navigator.canShare?.({
    files: [new File([""], "x.pdf", { type: "application/pdf" })],
  });
  return shareSupport;
}

/**
 * Copy link, WhatsApp and (on phones that support it) sharing the PDF file.
 * Each one marks the quote as sent; the link is known up front so the browser keeps the user gesture.
 */
export function ShareButtons({
  quoteId,
  url,
  message,
  pdfName,
}: {
  quoteId: string;
  url: string;
  message: string;
  pdfName: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const canSharePdf = useSyncExternalStore(noop, canShareFiles, () => false);

  async function markSent() {
    const result = await shareQuote(quoteId);
    if ("error" in result) setStatus(result.error);
    router.refresh();
    return !("error" in result);
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    if (await markSent()) setStatus("Link copiado.");
  }

  async function sharePdf() {
    try {
      const res = await fetch(`/app/quotes/${quoteId}/pdf`);
      if (!res.ok) throw new Error(await res.text());
      const file = new File([await res.blob()], pdfName, { type: "application/pdf" });
      await navigator.share({ files: [file], text: message });
      await markSent();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setStatus("No se pudo compartir el PDF. Probá con el link.");
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`;
  return (
    <div className="stack">
      <div className="actions">
        <button type="button" onClick={copy}>
          Copiar link
        </button>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void markSent()}
        >
          Enviar por WhatsApp
        </a>
        {canSharePdf && (
          <button type="button" onClick={sharePdf}>
            Compartir PDF
          </button>
        )}
      </div>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
