CREATE TABLE "follows" (
    "follower_id" TEXT NOT NULL,
    "followee_id" TEXT NOT NULL,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "followee_id")
);

CREATE INDEX "follows_followee_id_idx" ON "follows"("followee_id");

ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("google_sub") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("google_sub") ON DELETE CASCADE ON UPDATE CASCADE;
