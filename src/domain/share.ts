/** 24 random bytes (192 bits), url-safe. `randomBytes` is injected so tests are deterministic. */
export function newShareToken(randomBytes: (n: number) => Uint8Array): string {
  return Buffer.from(randomBytes(24)).toString("base64url");
}

export function formatQuoteNumber(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}
