import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CommentComposer } from "../comments/CommentComposer";
import { CommentList } from "../comments/CommentList";
import { formatCount } from "../formatCount";
import { FollowButton, type FollowButtonState } from "../social/FollowButton";
import { UserAvatar } from "../users/UserAvatar";
import {
  createComment,
  fetchComments,
  likePost,
  unlikePost
} from "../../lib/api/socialApi";
import type {
  ApiComment,
  ApiFeedPost,
  CommentsPage
} from "../../lib/api/types";

const COMMENTS_PAGE_SIZE = 20;

export function FeedPostCard({
  post,
  token,
  followState,
  isCurrentUser,
  onToggleFollow
}: {
  post: ApiFeedPost;
  token: string;
  followState: FollowButtonState;
  isCurrentUser: boolean;
  onToggleFollow: (authorId: string) => void;
}) {
  const displayName = useMemo(
    () => post.author.name?.trim() || post.author.email,
    [post.author.email, post.author.name]
  );
  const publishedAt = new Date(post.createdAt).toLocaleString();
  const [isLiked, setIsLiked] = useState(post.viewerHasLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [isLikeUpdating, setIsLikeUpdating] = useState(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsPagination, setCommentsPagination] = useState<
    CommentsPage["pagination"] | null
  >(null);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsStatus, setCommentsStatus] = useState<
    "idle" | "loading" | "loading-more" | "submitting"
  >("idle");
  const [commentContent, setCommentContent] = useState("");
  const [interactionError, setInteractionError] = useState<string | null>(null);

  useEffect(() => {
    setIsLiked(post.viewerHasLiked);
    setLikesCount(post.likesCount);
    setCommentsCount(post.commentsCount);
    setComments([]);
    setCommentsPagination(null);
    setCommentsLoaded(false);
    setCommentsStatus("idle");
    setCommentContent("");
    setInteractionError(null);
  }, [post.commentsCount, post.id, post.likesCount, post.viewerHasLiked]);

  async function handleLikeToggle() {
    if (isLikeUpdating) {
      return;
    }

    setIsLikeUpdating(true);
    setInteractionError(null);

    try {
      const nextState = isLiked
        ? await unlikePost({ token, postId: post.id })
        : await likePost({ token, postId: post.id });

      setIsLiked(nextState.liked);
      setLikesCount(nextState.likesCount);
    } catch {
      setInteractionError("Like status could not be updated.");
    } finally {
      setIsLikeUpdating(false);
    }
  }

  async function loadComments({
    offset,
    append
  }: {
    offset: number;
    append: boolean;
  }) {
    setCommentsStatus(append ? "loading-more" : "loading");
    setInteractionError(null);

    try {
      const page = await fetchComments({
        token,
        postId: post.id,
        limit: COMMENTS_PAGE_SIZE,
        offset
      });

      setComments((currentComments) =>
        append ? [...currentComments, ...page.comments] : page.comments
      );
      setCommentsPagination(page.pagination);
      setCommentsLoaded(true);
      setCommentsStatus("idle");
    } catch {
      setCommentsStatus("idle");
      setInteractionError("Comments could not be loaded.");
    }
  }

  async function handleCommentSubmit() {
    const trimmedContent = commentContent.trim();

    if (!trimmedContent || commentsStatus === "submitting") {
      return;
    }

    setCommentsStatus("submitting");
    setInteractionError(null);

    try {
      const comment = await createComment({
        token,
        postId: post.id,
        content: trimmedContent
      });

      setCommentsCount((currentCount) => currentCount + 1);

      if (commentsLoaded) {
        setComments((currentComments) => [comment, ...currentComments]);
        setCommentsPagination((currentPagination) =>
          currentPagination
            ? {
                ...currentPagination,
                nextOffset:
                  currentPagination.nextOffset === null
                    ? null
                    : currentPagination.nextOffset + 1
              }
            : {
                limit: COMMENTS_PAGE_SIZE,
                offset: 0,
                nextOffset: null,
                hasMore: false
              }
        );
      } else {
        const page = await fetchComments({
          token,
          postId: post.id,
          limit: COMMENTS_PAGE_SIZE,
          offset: 0
        });

        setComments(page.comments);
        setCommentsPagination(page.pagination);
        setCommentsLoaded(true);
      }

      setCommentContent("");
      setCommentsStatus("idle");
    } catch {
      setCommentsStatus("idle");
      setInteractionError("Comment could not be posted.");
    }
  }

  const canLoadMoreComments = Boolean(
    commentsPagination?.hasMore && commentsPagination.nextOffset
  );
  const isCommentsLoading = commentsStatus === "loading";
  const isCommentsLoadingMore = commentsStatus === "loading-more";
  const isCommentSubmitting = commentsStatus === "submitting";

  return (
    <article className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
      <header className="flex min-w-0 items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/profile/${encodeURIComponent(post.authorId)}`}
            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg"
          >
            <UserAvatar
              avatarUrl={post.author.avatarUrl}
              displayName={displayName}
            />
          </Link>
          <div className="min-w-0">
            <Link
              to={`/profile/${encodeURIComponent(post.authorId)}`}
              className="block truncate text-sm font-semibold text-app-text transition-colors hover:text-app-accentText focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg"
            >
              {displayName}
            </Link>
            <p className="truncate text-xs text-app-muted">
              {post.author.email}
            </p>
          </div>
        </div>

        {isCurrentUser ? null : (
          <FollowButton
            followState={followState}
            onClick={() => onToggleFollow(post.authorId)}
            size="sm"
          />
        )}
      </header>

      <img
        src={post.imageUrl}
        alt={post.caption?.trim() || `Post by ${displayName}`}
        className="aspect-square w-full bg-app-surfaceMuted object-cover"
        loading="lazy"
      />

      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleLikeToggle()}
            disabled={isLikeUpdating}
            aria-pressed={isLiked}
            className={[
              "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-60",
              isLiked
                ? "bg-app-accent text-app-surface hover:bg-app-accentHover"
                : "border border-app-border bg-app-surface text-app-text hover:bg-app-surfaceMuted"
            ].join(" ")}
          >
            {isLikeUpdating ? "Saving" : isLiked ? "Liked" : "Like"}
          </button>
          <span className="text-sm font-medium text-app-text">
            {formatCount(likesCount, "like")}
          </span>
          <span className="text-sm text-app-muted">
            {formatCount(commentsCount, "comment")}
          </span>
        </div>

        {post.caption ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-app-text">
            {post.caption}
          </p>
        ) : null}
        <time
          dateTime={post.createdAt}
          className="block text-xs leading-5 text-app-muted"
        >
          {publishedAt}
        </time>

        <div className="space-y-3 border-t border-app-border pt-3">
          {commentsLoaded ? (
            <CommentList comments={comments} />
          ) : (
            <button
              type="button"
              onClick={() =>
                void loadComments({
                  offset: 0,
                  append: false
                })
              }
              disabled={isCommentsLoading}
              className="text-sm font-semibold text-app-accentText transition-colors hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCommentsLoading
                ? "Loading comments"
                : commentsCount > 0
                  ? `View ${formatCount(commentsCount, "comment")}`
                  : "View comments"}
            </button>
          )}

          {canLoadMoreComments ? (
            <button
              type="button"
              onClick={() =>
                void loadComments({
                  offset: commentsPagination?.nextOffset ?? 0,
                  append: true
                })
              }
              disabled={isCommentsLoadingMore}
              className="text-sm font-semibold text-app-accentText transition-colors hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCommentsLoadingMore ? "Loading" : "Load more comments"}
            </button>
          ) : null}

          <CommentComposer
            id={`comment-${post.id}`}
            value={commentContent}
            isSubmitting={isCommentSubmitting}
            onChange={setCommentContent}
            onSubmit={() => void handleCommentSubmit()}
          />

          {interactionError ? (
            <p className="text-sm text-red-700">{interactionError}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
