import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { ZodError } from "zod";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "ValidationError", issues: err.issues });
    return;
  }
  const e = err as Error & { status?: number; statusCode?: number };
  const status = e.status ?? e.statusCode ?? 500;
  req.log?.error({ err: e }, "request failed");
  res.status(status).json({ error: e.name ?? "Error", message: e.message ?? "Internal Server Error" });
});

export default app;
