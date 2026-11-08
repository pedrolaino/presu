import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidad · Presu" };

export default function Privacy() {
  return (
    <main className="reading stack prose">
      <h1>Política de privacidad</h1>
      <p>
        <small>Última actualización: noviembre de 2026</small>
      </p>

      <h2>Qué datos de Google usamos</h2>
      <p>
        Cuando entrás con Google, Presu recibe tu <strong>nombre</strong>, tu <strong>email</strong>{" "}
        y tu <strong>foto de perfil</strong>. Los usamos solamente para crear tu cuenta,
        identificarte cuando volvés a entrar y completar de entrada el email de tu negocio. No
        pedimos acceso a tus contactos, tu correo ni tus archivos.
      </p>

      <h2>Qué otros datos guardamos</h2>
      <p>
        Los datos que cargás en la app: los de tu negocio, tus clientes, tu catálogo y tus
        presupuestos. Cuando un cliente abre o responde un presupuesto, guardamos la fecha, el
        nombre que escribe al aceptar y el motivo si lo rechaza. Para evitar abusos registramos por
        poco tiempo la dirección IP de algunas acciones.
      </p>

      <h2>Con quién los compartimos</h2>
      <p>
        Con nadie. No vendemos ni compartimos tus datos con terceros. Solo ve un presupuesto quien
        tenga su link, y podés desactivar el link cuando quieras.
      </p>

      <h2>Cuentas de prueba</h2>
      <p>Las cuentas creadas con “Probar con datos de ejemplo” se borran a las 24 horas.</p>

      <h2>Cómo borrar tu cuenta</h2>
      <p>
        Entrá a <strong>Negocio</strong> y tocá <strong>Borrar mi cuenta</strong>. Se borran en el
        momento tu cuenta y todos sus datos: negocio, clientes, catálogo y presupuestos. Los links
        que hayas compartido dejan de funcionar.
      </p>

      <p>
        <Link href="/">Volver al inicio</Link>
      </p>
    </main>
  );
}
