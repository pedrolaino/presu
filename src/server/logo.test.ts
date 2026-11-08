import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { LogoError, processLogo, sniffImageType } from "./logo";

const image = (format: "png" | "jpeg" | "webp", size = 800) =>
  sharp({ create: { width: size, height: size / 2, channels: 3, background: "#2a6" } })
    [format]()
    .toBuffer();

describe("sniffImageType", () => {
  it("recognizes formats by content", async () => {
    expect(sniffImageType(await image("png"))).toBe("png");
    expect(sniffImageType(await image("jpeg"))).toBe("jpeg");
    expect(sniffImageType(await image("webp"))).toBe("webp");
    expect(sniffImageType(new TextEncoder().encode("<svg></svg>"))).toBeNull();
  });
});

describe("processLogo", () => {
  it("resizes to fit and outputs png", async () => {
    const out = await processLogo(await image("jpeg"));
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(200);
  });

  it("rejects other formats even with an image extension", async () => {
    await expect(processLogo(new TextEncoder().encode("GIF89a...."))).rejects.toThrow(LogoError);
  });

  it("rejects files over 200 KB", async () => {
    await expect(processLogo(new Uint8Array(200 * 1024 + 1))).rejects.toThrow("200 KB");
  });

  it("rejects truncated images", async () => {
    const png = await image("png");
    await expect(processLogo(png.subarray(0, 40))).rejects.toThrow(LogoError);
  });
});
