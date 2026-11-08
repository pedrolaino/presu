import { config } from "@/config";
import { db } from "@/db";
import { formatQuoteNumber } from "@/domain/share";
import { documentVersion } from "@/domain/versions";
import { getQuote } from "@/server/data/quotes";
import { renderQuotePdf } from "@/server/pdf";
import { allowRequest } from "@/server/rate-limit";
import { requireBusiness } from "@/server/session";

export async function GET(_req: Request, ctx: RouteContext<"/app/quotes/[id]/pdf">) {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  if (!(await allowRequest(db, `pdf:${business.id}`, config.rateLimits.pdf, new Date()))) {
    return new Response("Generaste muchos PDF seguidos. Probá de nuevo en unos minutos.", {
      status: 429,
    });
  }
  const detail = await getQuote(db, business.id, id);
  if (!detail) return new Response("No encontrado", { status: 404 });

  const version = documentVersion(detail.versions, detail.quote)!;
  const pdf = await renderQuotePdf(business, detail.quote.number, version);
  const name = `presupuesto-${formatQuoteNumber(detail.quote.number).slice(1)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}
