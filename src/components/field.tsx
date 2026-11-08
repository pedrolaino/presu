import type { ReactNode } from "react";

/** Label + control + error message, wired with aria attributes. */
export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {hint && <small id={`${name}-hint`}>{hint}</small>}
      {error && (
        <small id={`${name}-error`} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
