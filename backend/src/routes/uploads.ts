import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { sendUnauthorized, sendValidationError } from "../http/responses.js";
import { requireAuth } from "../middleware/auth.js";
import { createPresignedUploadUrl } from "../services/storageService.js";

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
      const parsed = presignedUploadSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(res, parsed.error, "Invalid upload request");
        return;
      }

      const userId = req.auth?.user.googleSub;

      if (!userId) {
        sendUnauthorized(res, "Missing authenticated user");
        return;
      }

      const upload = await createPresignedUploadUrl({
        userId,
        contentType: parsed.data.contentType,
        contentLength: parsed.data.contentLength
      });

      res.status(201).json(upload);
    } catch (error) {
      next(error);
    }
  }
);
