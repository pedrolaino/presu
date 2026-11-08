export const logoDataUrl = (logo: Buffer | null) =>
  logo ? `data:image/png;base64,${logo.toString("base64")}` : null;
