import { createContext, useContext } from "react";
import type { DiscordContext } from "@/lib/discord";

interface DiscordState {
  ctx: DiscordContext | null;
  loading: boolean;
  inDiscord: boolean;
}

export const DiscordCtx = createContext<DiscordState>({
  ctx: null,
  loading: false,
  inDiscord: false,
});

export function useDiscord() {
  return useContext(DiscordCtx);
}
