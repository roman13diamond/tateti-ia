import { Router, type Request, type Response, type NextFunction } from "express";
import { createPublicKey, verify as cryptoVerify } from "crypto";

const router = Router();

function verifyEd25519(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string,
): boolean {
  try {
    const rawKey = Buffer.from(publicKeyHex, "hex");
    // Wrap raw 32-byte Ed25519 key in SubjectPublicKeyInfo DER envelope
    const prefix = Buffer.from("302a300506032b6570032100", "hex");
    const derKey = Buffer.concat([prefix, rawKey]);
    const publicKey = createPublicKey({ key: derKey, format: "der", type: "spki" });
    const message = Buffer.from(timestamp + rawBody);
    const signature = Buffer.from(signatureHex, "hex");
    return cryptoVerify(null, message, publicKey, signature);
  } catch {
    return false;
  }
}

// Capture raw body for signature verification before JSON parsing
function captureRawBody(req: Request, _res: Response, next: NextFunction): void {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    (req as Request & { rawBody: string }).rawBody = Buffer.concat(chunks).toString("utf8");
    try {
      (req as Request & { body: unknown }).body = JSON.parse(
        (req as Request & { rawBody: string }).rawBody,
      );
    } catch {
      (req as Request & { body: unknown }).body = {};
    }
    next();
  });
}

interface InteractionBody {
  type: number;
  data?: { name?: string };
}

router.post(
  "/interactions",
  captureRawBody,
  (req: Request, res: Response) => {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    const signature = req.headers["x-signature-ed25519"] as string | undefined;
    const timestamp = req.headers["x-signature-timestamp"] as string | undefined;
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";

    if (!publicKey || !signature || !timestamp) {
      res.status(401).json({ error: "Missing auth headers" });
      return;
    }

    if (!verifyEd25519(publicKey, signature, timestamp, rawBody)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const body = req.body as InteractionBody;

    // Ping
    if (body.type === 1) {
      res.json({ type: 1 });
      return;
    }

    // Slash command /tateti
    if (body.type === 2 && body.data?.name === "tateti") {
      const domains = process.env.REPLIT_DOMAINS?.split(",") ?? [];
      const domain = domains[0] ?? "";
      const appUrl = domain
        ? `https://${domain}/tictactoe-ai/`
        : "https://39383456-001e-4156-ae4f-73e2c469d2ae-00-3qnq9zi1lpy2i.kirk.replit.dev/tictactoe-ai/";

      res.json({
        type: 4,
        data: {
          embeds: [
            {
              title: "🎮 Ta-Te-Ti IA",
              description:
                `Jugá al Ta-Te-Ti contra una inteligencia artificial Q-Learning que aprende con cada partida.\n\n[**▶ Abrir juego**](${appUrl})`,
              color: 0x5865f2,
              fields: [
                { name: "Modos", value: "vs IA · 2 Jugadores · Puzzles", inline: true },
                { name: "IA", value: "Q-Learning adaptativo", inline: true },
              ],
              footer: { text: "Ta-Te-Ti IA · Q-Learning" },
            },
          ],
          flags: 64,
        },
      });
      return;
    }

    res.status(400).json({ error: "Unknown interaction" });
  },
);

export default router;
