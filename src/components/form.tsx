"use client";

import { createContext, startTransition, use, useActionState, type ReactNode } from "react";
import type { FormState } from "@/server/forms";

const FormStateContext = createContext<FormState>({});

/** A form bound to a server action; shows the action's errors next to each field. */
export function ActionForm({
  action,
  submitLabel,
  children,
  okMessage,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  children: ReactNode;
  okMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <FormStateContext value={state}>
      <form
        action={formAction}
        // Submitting by hand keeps what the user typed when the action returns errors;
        // a plain form action would reset every field.
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
        className="stack"
      >
        {children}
        {state.error && <p role="alert">{state.error}</p>}
        {state.ok && okMessage && <p role="status">{okMessage}</p>}
        <button type="submit" disabled={pending}>
          {submitLabel}
        </button>
      </form>
    </FormStateContext>
  );
}

type FieldProps = { label: string; name: string; hint?: string };

function Field({ label, name, hint, children }: FieldProps & { children: ReactNode }) {
  const error = use(FormStateContext).fieldErrors?.[name];
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

function useAria(name: string, hint?: string) {
  const error = use(FormStateContext).fieldErrors?.[name];
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ");
  return { id: name, name, "aria-invalid": !!error, "aria-describedby": describedBy || undefined };
}

export function Input({ label, name, hint, ...props }: FieldProps & React.ComponentProps<"input">) {
  const aria = useAria(name, hint);
  return (
    <Field label={label} name={name} hint={hint}>
      <input {...aria} {...props} />
    </Field>
  );
}

export function Textarea({
  label,
  name,
  hint,
  ...props
}: FieldProps & React.ComponentProps<"textarea">) {
  const aria = useAria(name, hint);
  return (
    <Field label={label} name={name} hint={hint}>
      <textarea {...aria} {...props} />
    </Field>
  );
}

export function Select({
  label,
  name,
  hint,
  options,
  ...props
}: FieldProps & React.ComponentProps<"select"> & { options: { value: string; label: string }[] }) {
  const aria = useAria(name, hint);
  return (
    <Field label={label} name={name} hint={hint}>
      <select {...aria} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
