import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useAuth } from "../contexts/useAuth";
import {
  fetchFeed,
  followUser,
  unfollowUser,
  type ApiFeedPost,
  type FeedPage
} from "../lib/api";

const FEED_PAGE_SIZE = 20;

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
  followState,
  isCurrentUser,
  onToggleFollow
}: {
  post: ApiFeedPost;
  followState: FollowState;
  isCurrentUser: boolean;
  onToggleFollow: (authorId: string) => void;
}) {
  const displayName = useMemo(
    () => post.author.name?.trim() || post.author.email,
    [post.author.email, post.author.name]
  );
  const publishedAt = new Date(post.createdAt).toLocaleString();

  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="flex min-w-0 items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            avatarUrl={post.author.avatarUrl}
            displayName={displayName}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {displayName}
            </p>
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
      </div>
    </article>
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

function getUserInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}
