import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import {
  createComment,
  fetchFeed,
  fetchComments,
  followUser,
  likePost,
  unfollowUser,
  unlikePost,
  type ApiComment,
  type ApiFeedPost,
  type CommentsPage,
  type FeedPage
} from "../lib/api";

const FEED_PAGE_SIZE = 20;
const COMMENTS_PAGE_SIZE = 20;

type FollowState = {
  isFollowing: boolean;
  isUpdating: boolean;
};

type FeedStatus = "idle" | "loading" | "loading-more" | "error";

export function FeedPageView() {
  const { signIn, status: authStatus, token, user } = useAuth();
  const [posts, setPosts] = useState<ApiFeedPost[]>([]);
  const [pagination, setPagination] = useState<FeedPage["pagination"] | null>(
    null
  );
  const [feedStatus, setFeedStatus] = useState<FeedStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [followStates, setFollowStates] = useState<Record<string, FollowState>>(
    {}
  );

  const loadFeed = useCallback(
    async ({ offset, append }: { offset: number; append: boolean }) => {
      if (!token) {
        return;
      }

      setFeedStatus(append ? "loading-more" : "loading");
      setError(null);

      try {
        const page = await fetchFeed({
          token,
          limit: FEED_PAGE_SIZE,
          offset
        });

        setPosts((currentPosts) =>
          append ? [...currentPosts, ...page.posts] : page.posts
        );
        setPagination(page.pagination);
        setFollowStates((currentStates) =>
          getNextFollowStates({
            currentStates,
            posts: page.posts,
            currentUserId: user?.googleSub ?? null
          })
        );
        setFeedStatus("idle");
      } catch {
        setFeedStatus("error");
        setError("Feed could not be loaded.");
      }
    },
    [token, user?.googleSub]
  );

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setPosts([]);
      setPagination(null);
      setFollowStates({});
      setFeedStatus("idle");
      setError(null);
      return;
    }

    void loadFeed({ offset: 0, append: false });
  }, [authStatus, loadFeed]);

  const isInitialLoading = authStatus === "loading" || feedStatus === "loading";
  const isLoadingMore = feedStatus === "loading-more";
  const hasPosts = posts.length > 0;
  const canLoadMore = Boolean(pagination?.hasMore && pagination.nextOffset);

  async function handleFollowToggle(authorId: string) {
    if (!token) {
      return;
    }

    const current = followStates[authorId] ?? {
      isFollowing: true,
      isUpdating: false
    };

    if (current.isUpdating) {
      return;
    }

    setFollowStates((states) => ({
      ...states,
      [authorId]: {
        isFollowing: current.isFollowing,
        isUpdating: true
      }
    }));
    setError(null);

    try {
      if (current.isFollowing) {
        await unfollowUser({ token, userId: authorId });
      } else {
        await followUser({ token, userId: authorId });
      }

      setFollowStates((states) => ({
        ...states,
        [authorId]: {
          isFollowing: !current.isFollowing,
          isUpdating: false
        }
      }));
    } catch {
      setFollowStates((states) => ({
        ...states,
        [authorId]: {
          isFollowing: current.isFollowing,
          isUpdating: false
        }
      }));
      setError("Follow status could not be updated.");
    }
  }

  if (isInitialLoading) {
    return (
      <FeedShell>
        <StatusPanel>Loading feed.</StatusPanel>
      </FeedShell>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <FeedShell>
        <div className="space-y-4 rounded-lg border border-dashed border-zinc-300 bg-white p-8">
          <p className="text-sm text-zinc-600">
            Sign in to see posts from people you follow.
          </p>
          <button
            type="button"
            onClick={signIn}
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Sign in
          </button>
        </div>
      </FeedShell>
    );
  }

  if (!token) {
    return (
      <FeedShell>
        <StatusPanel>Session is unavailable.</StatusPanel>
      </FeedShell>
    );
  }

  return (
    <FeedShell>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {hasPosts ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,42rem)]">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              token={token}
              followState={
                followStates[post.authorId] ?? {
                  isFollowing: true,
                  isUpdating: false
                }
              }
              isCurrentUser={post.authorId === user?.googleSub}
              onToggleFollow={handleFollowToggle}
            />
          ))}
        </div>
      ) : (
        <StatusPanel>
          Follow people to build a feed, then their posts will show here.
        </StatusPanel>
      )}

      {canLoadMore ? (
        <button
          type="button"
          onClick={() =>
            void loadFeed({
              offset: pagination?.nextOffset ?? 0,
              append: true
            })
          }
          disabled={isLoadingMore}
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingMore ? "Loading" : "Load more"}
        </button>
      ) : null}
    </FeedShell>
  );
}

function PostCard({
  post,
  token,
  followState,
  isCurrentUser,
  onToggleFollow
}: {
  post: ApiFeedPost;
  token: string;
  followState: FollowState;
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

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="flex min-w-0 items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/profile/${encodeURIComponent(post.authorId)}`}
            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            <UserAvatar
              avatarUrl={post.author.avatarUrl}
              displayName={displayName}
            />
          </Link>
          <div className="min-w-0">
            <Link
              to={`/profile/${encodeURIComponent(post.authorId)}`}
              className="block truncate text-sm font-semibold text-zinc-950 transition-colors hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              {displayName}
            </Link>
            <p className="truncate text-xs text-zinc-500">
              {post.author.email}
            </p>
          </div>
        </div>

        {isCurrentUser ? null : (
          <button
            type="button"
            onClick={() => onToggleFollow(post.authorId)}
            disabled={followState.isUpdating}
            className={[
              "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
              followState.isFollowing
                ? "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
                : "bg-emerald-700 text-white hover:bg-emerald-800"
            ].join(" ")}
          >
            {getFollowButtonLabel(followState)}
          </button>
        )}
      </header>

      <img
        src={post.imageUrl}
        alt={post.caption?.trim() || `Post by ${displayName}`}
        className="aspect-square w-full bg-zinc-100 object-cover"
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
              "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
              isLiked
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
            ].join(" ")}
          >
            {isLikeUpdating ? "Saving" : isLiked ? "Liked" : "Like"}
          </button>
          <span className="text-sm font-medium text-zinc-700">
            {formatCount(likesCount, "like")}
          </span>
          <span className="text-sm text-zinc-500">
            {formatCount(commentsCount, "comment")}
          </span>
        </div>

        {post.caption ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
            {post.caption}
          </p>
        ) : null}
        <time
          dateTime={post.createdAt}
          className="block text-xs leading-5 text-zinc-500"
        >
          {publishedAt}
        </time>

        <div className="space-y-3 border-t border-zinc-100 pt-3">
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
              className="text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCommentsLoadingMore ? "Loading" : "Load more comments"}
            </button>
          ) : null}

          <form onSubmit={handleCommentSubmit} className="space-y-2">
            <label htmlFor={`comment-${post.id}`} className="sr-only">
              Add a comment
            </label>
            <textarea
              id={`comment-${post.id}`}
              value={commentContent}
              onChange={(event) => setCommentContent(event.target.value)}
              maxLength={1000}
              rows={2}
              disabled={isCommentSubmitting}
              className="w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Add a comment."
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">
                {commentContent.length}/1000
              </span>
              <button
                type="submit"
                disabled={!commentContent.trim() || isCommentSubmitting}
                className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCommentSubmitting ? "Posting" : "Post"}
              </button>
            </div>
          </form>

          {interactionError ? (
            <p className="text-sm text-red-700">{interactionError}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CommentList({ comments }: { comments: ApiComment[] }) {
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

function UserAvatar({
  avatarUrl,
  displayName
}: {
  avatarUrl: string | null;
  displayName: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${displayName}'s profile image`}
        className="size-11 shrink-0 rounded-full border border-zinc-200 object-cover"
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800"
    >
      {getUserInitial(displayName)}
    </div>
  );
}

function FeedShell({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-700">Home</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
          Following feed
        </h1>
      </div>
      {children}
    </section>
  );
}

function StatusPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-600">
      {children}
    </div>
  );
}

function getNextFollowStates({
  currentStates,
  posts,
  currentUserId
}: {
  currentStates: Record<string, FollowState>;
  posts: ApiFeedPost[];
  currentUserId: string | null;
}): Record<string, FollowState> {
  const nextStates = { ...currentStates };

  for (const post of posts) {
    if (post.authorId === currentUserId || nextStates[post.authorId]) {
      continue;
    }

    nextStates[post.authorId] = {
      isFollowing: true,
      isUpdating: false
    };
  }

  return nextStates;
}

function getFollowButtonLabel(followState: FollowState): string {
  if (followState.isUpdating) {
    return "Saving";
  }

  return followState.isFollowing ? "Unfollow" : "Follow";
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function getUserInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}
