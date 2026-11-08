import Link from "next/link";

export default function NotFound() {
  return (
    <main className="reading stack">
      <h1>No encontramos esta página</h1>
      <p className="muted">
        Si te pasaron un link de un presupuesto, puede que lo hayan desactivado. Pedile uno nuevo a
        quien te lo mandó.
      </p>
      <p>
        <Link href="/">Ir al inicio</Link>
      </p>
    </main>
  );
}
