import { Router, type Request, type Response } from "express";
import { sendUnauthorized } from "../http/responses.js";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req: Request, res: Response) => {
  if (!req.auth?.user) {
    sendUnauthorized(res, "Missing authenticated user");
    return;
  }

  res.json({
    user: req.auth.user
  });
});
