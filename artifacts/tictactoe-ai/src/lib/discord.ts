export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

export interface DiscordContext {
  user: DiscordUser;
  guildId: string | null;
  channelId: string | null;
}

const CLIENT_ID = "1504610846536499220";

let _initialized = false;
let _result: DiscordContext | null = null;

function isInsideDiscord(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has("frame_id");
  } catch {
    return false;
  }
}

export async function initDiscord(): Promise<DiscordContext | null> {
  if (_initialized) return _result;
  _initialized = true;

  if (!isInsideDiscord()) return null;

  try {
    const { DiscordSDK } = await import("@discord/embedded-app-sdk");

    const sdk = new DiscordSDK(CLIENT_ID);

    await Promise.race([
      sdk.ready(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000)
      ),
    ]);

    const { code } = await sdk.commands.authorize({
      client_id: CLIENT_ID,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify"],
    });

    const tokenRes = await fetch("/api/discord/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!tokenRes.ok) throw new Error("Token exchange failed");

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    await sdk.commands.authenticate({ access_token });

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) throw new Error("Failed to get user info");

    const user = (await userRes.json()) as DiscordUser;

    _result = {
      user,
      guildId: sdk.guildId ?? null,
      channelId: sdk.channelId ?? null,
    };

    return _result;
  } catch (err) {
    console.warn("[Discord] Init failed:", err);
    return null;
  }
}

export function getAvatarUrl(user: DiscordUser): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  const idx =
    Number(
      user.discriminator === "0"
        ? BigInt(user.id) >> 22n
        : user.discriminator
    ) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}
