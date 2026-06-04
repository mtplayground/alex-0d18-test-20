import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getAuthenticatedUser } from "./helpers.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req, res);

  if (!user) {
    return;
  }

  res.json({
    user
  });
});
