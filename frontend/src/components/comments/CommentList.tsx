import type { ApiComment } from "../../lib/api/types";

export function CommentList({ comments }: { comments: ApiComment[] }) {
  if (comments.length === 0) {
    return <p className="text-sm text-zinc-500">No comments yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {comments.map((comment) => {
        const displayName = comment.author.name?.trim() || comment.author.email;

        return (
          <li key={comment.id} className="text-sm leading-6">
            <p className="break-words text-zinc-800">
              <span className="font-semibold text-zinc-950">{displayName}</span>{" "}
              {comment.content}
            </p>
            <time
              dateTime={comment.createdAt}
              className="block text-xs leading-5 text-zinc-500"
            >
              {new Date(comment.createdAt).toLocaleString()}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
