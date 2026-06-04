import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
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
        res.status(400).json({
          error: "Invalid upload request",
          details: parsed.error.flatten().fieldErrors
        });
        return;
      }

      const userId = req.auth?.user.googleSub;

      if (!userId) {
        res.status(401).json({
          error: "Missing authenticated user"
        });
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
