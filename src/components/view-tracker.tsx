"use client";

import { useEffect } from "react";
import { trackView } from "@/server/actions/public";

export function ViewTracker({ token }: { token: string }) {
  useEffect(() => {
    void trackView(token);
  }, [token]);
  return null;
}
