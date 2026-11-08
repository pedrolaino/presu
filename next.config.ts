import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pdfkit reads its font metrics from disk at runtime.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: { "/**/pdf": ["./node_modules/pdfkit/js/data/**"] },
};

export default nextConfig;
