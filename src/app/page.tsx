import Link from "next/link";
import { googleEnabled } from "@/server/auth";
import { signInWithGoogle, startDemo } from "@/server/auth-actions";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { demo } = await searchParams;
  return (
    <>
      <main className="page stack">
        <h1>Presu</h1>
        <p>
          Armá presupuestos, mandalos por link o por WhatsApp y enterate cuándo el cliente los abre
          y los acepta.
        </p>

        <h2>Cómo funciona</h2>
        <ol>
          <li>Cargás tus clientes y tu lista de precios.</li>
          <li>Armás el presupuesto y lo mandás con un link.</li>
          <li>El cliente lo abre desde el celular y lo acepta o lo rechaza.</li>
          <li>Ves en qué estado está cada uno y qué versión aceptó.</li>
        </ol>

        <div className="actions">
          {googleEnabled && (
            <form action={signInWithGoogle}>
              <button type="submit">Entrar con Google</button>
            </form>
          )}
          <form action={startDemo}>
            <button type="submit">Probar con datos de ejemplo</button>
          </form>
        </div>
        {demo === "limit" && (
          <p role="alert">
            Se crearon muchas cuentas de prueba seguidas. Probá de nuevo en un rato.
          </p>
        )}
        <p>
          <small>La cuenta de prueba no pide datos y se borra sola a las 24 horas.</small>
        </p>
      </main>
      <footer className="page">
        <Link href="/privacy">Política de privacidad</Link>
      </footer>
    </>
  );
}
