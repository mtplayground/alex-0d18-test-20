import { formatCount } from "../formatCount";
import type { ApiProfilePost } from "../../lib/api/types";

export function ProfilePostGrid({ posts }: { posts: ApiProfilePost[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-600">
        No posts yet.
      </div>
    );
  }

  return (
    <section
      aria-label="Profile posts"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      {posts.map((post) => (
        <article
          key={post.id}
          className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
        >
          <img
            src={post.imageUrl}
            alt={post.caption?.trim() || "Profile post"}
            className="aspect-square w-full bg-zinc-100 object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <div className="space-y-2 p-3">
            {post.caption ? (
              <p className="line-clamp-2 break-words text-sm leading-5 text-zinc-800">
                {post.caption}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span>{formatCount(post.likesCount, "like")}</span>
              <span>{formatCount(post.commentsCount, "comment")}</span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
