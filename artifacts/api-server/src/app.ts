import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Interactions endpoint needs raw body for Ed25519 verification — skip express.json() for it
app.use("/api/discord/interactions", (req, res, next) => next());
app.use((req, res, next) => {
  if (req.path === "/api/discord/interactions") return next();
  express.json()(req, res, next);
});

app.use("/api", router);

export default app;
