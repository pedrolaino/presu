import { config } from "@/config";
import { db } from "@/db";
import { formatQuoteNumber } from "@/domain/share";
import { getPublicQuote } from "@/server/data/public";
import { renderQuotePdf } from "@/server/pdf";
import { allowRequest } from "@/server/rate-limit";
import { clientIp } from "@/server/session";

export async function GET(_req: Request, ctx: RouteContext<"/p/[token]/pdf">) {
  const { token } = await ctx.params;
  if (!(await allowRequest(db, `pdf:${await clientIp()}`, config.rateLimits.pdf, new Date()))) {
    return new Response("Hubo muchas descargas seguidas. Probá de nuevo en unos minutos.", {
      status: 429,
    });
  }
  const now = new Date();
  const found = await getPublicQuote(db, token, now);
  if (!found) return new Response("No encontrado", { status: 404 });
  if (
    !(await allowRequest(
      db,
      `pdf-quote:${found.quote.id}`,
      config.rateLimits.publicPdfPerQuote,
      now,
    ))
  ) {
    return new Response("Hubo muchas descargas seguidas. Probá de nuevo en unos minutos.", {
      status: 429,
    });
  }

  const pdf = await renderQuotePdf(found.business, found.quote.number, found.version);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="presupuesto-${formatQuoteNumber(found.quote.number).slice(1)}.pdf"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
