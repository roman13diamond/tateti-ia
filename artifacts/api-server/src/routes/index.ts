import { Router, type IRouter } from "express";
import healthRouter from "./health";
import discordRouter from "./discord";
import discordInteractionsRouter from "./discord-interactions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/discord", discordRouter);
router.use("/discord", discordInteractionsRouter);

export default router;
