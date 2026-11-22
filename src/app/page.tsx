import { CheckCircle, Eye, HourglassMedium, Stack } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { googleEnabled } from "@/server/auth";
import { signInWithGoogle, startDemo } from "@/server/auth-actions";

const sample = [
  ["Instalación de tomacorriente", "6 unidades × $ 22.000,00", "$ 132.000,00"],
  ["Cable unipolar 2,5 mm²", "45 m × $ 1.250,00", "$ 56.250,00"],
  ["Térmica bipolar 2x20 A", "1 unidad × $ 16.500,00", "$ 16.500,00"],
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const { demo } = await searchParams;
  return (
    <>
      <header className="landing-head">
        <Link href="/" className="brand" style={{ padding: 0 }}>
          <Logo height={44} />
        </Link>
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
              Armá el presupuesto con tu lista de precios y mandá el link por WhatsApp. Desde Presu
              podés ver cuándo lo abren y con qué nombre lo aceptan.
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
                Por ahora no se pueden crear más cuentas de prueba. Probá de nuevo en un rato.
              </p>
            )}
            <p style={{ marginTop: "var(--s3)" }}>
              <small>Probá sin registrarte. La cuenta de prueba dura 24 horas.</small>
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
          <h2 id="problems-title">Después de mandar el presupuesto</h2>
          <div className="problems">
            <div className="problem">
              <Eye size={32} weight="duotone" aria-hidden className="ic" color="var(--green)" />
              <h3>Cuándo abrieron el link</h3>
              <p className="muted">
                Presu registra la primera apertura del link sin contar tus propias visitas.
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
              <h3>Actualizar un presupuesto vencido</h3>
              <p className="muted">
                Cada presupuesto tiene fecha de vencimiento. Si vence, podés reactivarlo con los
                precios actuales de tu catálogo y revisar qué cambió antes de volver a mandarlo.
              </p>
            </div>
            <div className="problem">
              <Stack size={32} weight="duotone" aria-hidden className="ic" color="var(--green)" />
              <h3>Qué versión aceptó</h3>
              <p className="muted">
                Si editás una versión que ya mandaste, Presu guarda una revisión. La versión que
                aceptó tu cliente queda guardada tal como la vio.
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
                Podés cargar materiales, horas de trabajo y servicios en pesos o en dólares.
              </p>
            </li>
            <li>
              <h3>Armás el presupuesto</h3>
              <p className="muted">
                Elegís el cliente y los ítems. Presu calcula el total con el IVA que corresponda.
              </p>
            </li>
            <li>
              <h3>Lo mandás por WhatsApp</h3>
              <p className="muted">Tu cliente puede abrir el link en el celu sin registrarse.</p>
            </li>
            <li>
              <h3>Lo acepta con su nombre</h3>
              <p className="muted">
                En el historial ves cuándo lo aceptó tu cliente y el nombre que escribió.
              </p>
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
