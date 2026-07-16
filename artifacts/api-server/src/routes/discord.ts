import { Router } from "express";

const router = Router();

router.post("/token", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: "Missing code" });
      return;
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      req.log.error("DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not configured");
      res.status(503).json({ error: "Discord not configured" });
      return;
    }

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Discord token exchange failed");
      res.status(500).json({ error: "Token exchange failed" });
      return;
    }

    const data = (await response.json()) as { access_token: string };
    res.json({ access_token: data.access_token });
  } catch (err) {
    req.log.error({ err }, "Discord token exchange error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
