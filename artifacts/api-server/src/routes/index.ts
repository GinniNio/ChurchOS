import { Router, type IRouter } from "express";
import healthRouter from "./health";
import visitorsRouter from "./visitors";
import programsRouter from "./programs";
import givingRouter from "./giving";
import membersRouter from "./members";
import sermonsRouter from "./sermons";
import notificationsRouter from "./notifications";
import waitlistRouter from "./waitlist";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(visitorsRouter);
router.use(programsRouter);
router.use(givingRouter);
router.use(membersRouter);
router.use(sermonsRouter);
router.use(notificationsRouter);
router.use(waitlistRouter);
router.use(aiRouter);

export default router;
