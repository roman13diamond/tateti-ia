import { useState, useEffect, type ReactNode } from "react";
import { DiscordCtx } from "./useDiscord";
import type { DiscordContext } from "@/lib/discord";

interface DiscordState {
  ctx: DiscordContext | null;
  loading: boolean;
  inDiscord: boolean;
}

export function DiscordProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DiscordState>({
    ctx: null,
    loading: false,
    inDiscord: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { initDiscord } = await import("@/lib/discord");
        const ctx = await initDiscord();
        if (!cancelled) {
          setState({ ctx, loading: false, inDiscord: ctx !== null });
        }
      } catch {
        if (!cancelled) {
          setState({ ctx: null, loading: false, inDiscord: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <DiscordCtx.Provider value={state}>{children}</DiscordCtx.Provider>;
}
