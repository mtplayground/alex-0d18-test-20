import type { ApiComment } from "../../lib/api/types";

export function CommentList({ comments }: { comments: ApiComment[] }) {
  if (comments.length === 0) {
    return <p className="text-sm text-app-muted">No comments yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {comments.map((comment) => {
        const displayName = comment.author.name?.trim() || comment.author.email;

        return (
          <li key={comment.id} className="text-sm leading-6">
            <p className="break-words text-app-text">
              <span className="font-semibold text-app-text">{displayName}</span>{" "}
              {comment.content}
            </p>
            <time
              dateTime={comment.createdAt}
              className="block text-xs leading-5 text-app-muted"
            >
              {new Date(comment.createdAt).toLocaleString()}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
