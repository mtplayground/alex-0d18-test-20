import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req: Request, res: Response) => {
  res.json({
    user: req.auth?.user
  });
});
