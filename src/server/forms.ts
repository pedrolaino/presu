import { z } from "zod";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

/** Parses FormData text fields with a schema; returns field errors in Spanish for the form. */
export function parseForm<T extends z.ZodType>(schema: T, form: FormData) {
  const values = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data as z.infer<T> };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { state: { error: "Revisá los datos marcados.", fieldErrors } satisfies FormState };
}

export const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);
export const requiredText = (max: number, message: string) => text(max).min(1, message);
export const optionalEmail = text(120).refine(
  (v) => v === "" || z.email().safeParse(v).success,
  "Revisá el email.",
);

export const isUuid = (id: string) => z.uuid().safeParse(id).success;

/** Escapes a user search for ILIKE. */
export const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, "\\$&")}%`;
