import { Router, type IRouter } from "express";
import { db, notify } from "../lib/db";
import { JoinWaitlistBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/waitlist", (req, res) => {
  const body = JoinWaitlistBody.parse(req.body);
  db.prepare("INSERT INTO waitlist (churchName, adminEmail) VALUES (?, ?)").run(
    body.churchName,
    body.adminEmail,
  );
  notify(
    "email",
    body.adminEmail,
    "Welcome to the ChurchOS waitlist",
    `Thank you for adding ${body.churchName} to the waitlist. We'll be in touch shortly.`,
  );
  res.status(201).json({ ok: true });
});

export default router;
