import app from "./app";
import { logger } from "./lib/logger";
import { startSequenceScheduler } from "./lib/scheduler";
import { runSundayAgent, runPostServiceNotif } from "./lib/sundayAgent";
import cron from "node-cron";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startSequenceScheduler();

  // 6:00 AM every Sunday — full coordinator run
  cron.schedule("0 6 * * 0", () => {
    logger.info("Cron: Sunday morning agent firing");
    runSundayAgent();
  });

  // 1:00 PM every Sunday — post-service upload prompt
  cron.schedule("0 13 * * 0", () => {
    logger.info("Cron: Sunday post-service notification firing");
    runPostServiceNotif();
  });
});
