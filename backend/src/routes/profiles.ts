import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { getPrismaClient } from "../db/prisma.js";
import { sendNotFound } from "../http/responses.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getProfile,
  profileParamsSchema,
  profileQuerySchema
} from "../services/profilesService.js";
import { getAuthenticatedUserId, parseRequest } from "./helpers.js";

export const profilesRouter = Router();

profilesRouter.get(
  "/:userId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseRequest({
        schema: profileParamsSchema,
        input: req.params,
        res,
        message: "Invalid profile request"
      });

      if (!params) {
        return;
      }

      const query = parseRequest({
        schema: profileQuerySchema,
        input: req.query,
        res,
        message: "Invalid profile request"
      });

      if (!query) {
        return;
      }

      const viewerId = getAuthenticatedUserId(req, res);

      if (!viewerId) {
        return;
      }

      const { userId } = params;
      const { limit, offset } = query;
      const result = await getProfile({
        prisma: getPrismaClient(),
        userId,
        viewerId,
        limit,
        offset
      });

      if (result.status === "user-not-found") {
        sendNotFound(res, "User was not found");
        return;
      }

      res.json({
        profile: result.data
      });
    } catch (error) {
      next(error);
    }
  }
);
