import { CheckCircle, Eye, HourglassMedium, Stack } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { googleEnabled } from "@/server/auth";
import { signInWithGoogle, startDemo } from "@/server/auth-actions";

const sample = [
  ["Instalación de tomacorriente", "6 unidad × $ 22.000,00", "$ 132.000,00"],
  ["Cable unipolar 2,5 mm²", "45 metro × $ 1.250,00", "$ 56.250,00"],
  ["Térmica bipolar 2x20 A", "1 unidad × $ 16.500,00", "$ 16.500,00"],
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const { demo } = await searchParams;
  return (
    <>
      <header className="landing-head">
        <span className="brand" style={{ padding: 0 }}>
          <span className="brand-mark" aria-hidden>
            P
          </span>
          Presu
        </span>
        {googleEnabled && (
          <form action={signInWithGoogle}>
            <button type="submit" className="btn-secondary">
              Entrar
            </button>
          </form>
        )}
      </header>

      <main>
        <section className="hero">
          <div>
            <h1>Presupuestos que tu cliente acepta desde el celular.</h1>
            <p className="hero-lead">
              Armá el presupuesto con tu lista de precios, mandalo por WhatsApp con un link y
              enterate cuándo lo abren y quién lo acepta. Sin PDFs armados a mano.
            </p>
            <div className="actions hero-actions">
              <form action={startDemo}>
                <button type="submit">Probar con datos de ejemplo</button>
              </form>
              {googleEnabled && (
                <form action={signInWithGoogle}>
                  <button type="submit" className="btn-secondary">
                    Entrar con Google
                  </button>
                </form>
              )}
            </div>
            {demo === "limit" && (
              <p className="alert" role="alert" style={{ marginTop: "var(--s4)" }}>
                Se crearon muchas cuentas de prueba seguidas. Probá de nuevo en un rato.
              </p>
            )}
            <p style={{ marginTop: "var(--s3)" }}>
              <small>La prueba no pide datos y se borra sola a las 24 horas.</small>
            </p>
          </div>

          <figure className="hero-preview stack" aria-label="Ejemplo de un presupuesto aceptado">
            <p className="muted">Presupuesto #0005 de Gómez Electricidad</p>
            <h2>Para Laura Fernández</h2>
            <ul className="items">
              {sample.map(([name, meta, total]) => (
                <li key={name}>
                  <div>
                    <div className="item-name">{name}</div>
                    <div className="item-meta">{meta}</div>
                  </div>
                  <div className="item-total">{total}</div>
                </li>
              ))}
            </ul>
            <dl className="totals">
              <dt className="total-label">Total con IVA</dt>
              <dd className="total-value">$ 247.747,50</dd>
            </dl>
            <div className="signature">
              <CheckCircle size={28} weight="duotone" aria-hidden className="ic" />
              <p>
                Aceptado hoy a las 11:20 por
                <span className="signature-name">Laura Fernández</span>
              </p>
            </div>
          </figure>
        </section>

        <section className="landing-section" aria-labelledby="problems-title">
          <h2 id="problems-title">Lo que se pierde con un PDF por WhatsApp</h2>
          <div className="problems">
            <div className="problem">
              <Eye size={32} weight="duotone" aria-hidden className="ic" color="var(--green)" />
              <h3>Saber si lo abrió</h3>
              <p className="muted">
                Presu registra la primera vez que tu cliente abre el link. Ya no hace falta
                preguntarle si le llegó.
              </p>
            </div>
            <div className="problem">
              <HourglassMedium
                size={32}
                weight="duotone"
                aria-hidden
                className="ic"
                color="var(--green)"
              />
              <h3>Precios que no quedan viejos</h3>
              <p className="muted">
                Cada presupuesto tiene fecha de validez. Si vence, lo reactivás con los precios de
                hoy y ves qué cambió antes de mandarlo.
              </p>
            </div>
            <div className="problem">
              <Stack size={32} weight="duotone" aria-hidden className="ic" color="var(--green)" />
              <h3>Qué versión aceptó</h3>
              <p className="muted">
                Si lo cambiás después de mandarlo, queda una versión nueva. Lo que el cliente aceptó
                no se toca nunca.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="how-title">
          <h2 id="how-title">Cómo funciona</h2>
          <ol className="steps">
            <li>
              <h3>Cargás tu lista de precios</h3>
              <p className="muted">
                Materiales, horas de trabajo, servicios. En pesos o en dólares.
              </p>
            </li>
            <li>
              <h3>Armás el presupuesto</h3>
              <p className="muted">
                Elegís el cliente y los ítems; el total con IVA se calcula solo.
              </p>
            </li>
            <li>
              <h3>Lo mandás por WhatsApp</h3>
              <p className="muted">Tu cliente lo ve en el celular, sin crear ninguna cuenta.</p>
            </li>
            <li>
              <h3>Lo acepta con su nombre</h3>
              <p className="muted">Y vos lo ves en el momento, con todo el historial.</p>
            </li>
          </ol>
        </section>
      </main>

      <footer className="site-foot actions" style={{ justifyContent: "space-between" }}>
        <span className="muted">Presu, presupuestos para oficios y freelancers.</span>
        <Link href="/privacy">Política de privacidad</Link>
      </footer>
    </>
  );
}
