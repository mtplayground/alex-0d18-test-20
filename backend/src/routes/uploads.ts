import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createPresignedUploadUrl } from "../services/storageService.js";
import { getAuthenticatedUserId, parseRequest } from "./helpers.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const allowedImageTypes = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

const presignedUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(allowedImageTypes),
  contentLength: z.coerce.number().int().positive().max(MAX_UPLOAD_BYTES)
});

export const uploadsRouter = Router();

uploadsRouter.post(
  "/presigned-url",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = parseRequest({
        schema: presignedUploadSchema,
        input: req.body,
        res,
        message: "Invalid upload request"
      });

      if (!body) {
        return;
      }

      const userId = getAuthenticatedUserId(req, res);

      if (!userId) {
        return;
      }

      const upload = await createPresignedUploadUrl({
        userId,
        contentType: body.contentType,
        contentLength: body.contentLength
      });

      res.status(201).json(upload);
    } catch (error) {
      next(error);
    }
  }
);
