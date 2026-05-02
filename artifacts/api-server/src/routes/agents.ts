import { Router, type IRouter } from "express";
import { runSundayAgent } from "../lib/sundayAgent";

const router: IRouter = Router();

router.post("/agents/sunday-run", (req, res) => {
  const churchName = (req.body?.churchName as string) ?? "Demo Church Lagos";
  const start = Date.now();
  try {
    const results = runSundayAgent(churchName);
    res.json({ ...results, durationMs: Date.now() - start });
  } catch (err: any) {
    res.status(500).json({ error: "Agent run failed", message: err.message });
  }
});

export default router;
