import {
  useCallback,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { FeedPostCard } from "../components/posts/FeedPostCard";
import type { FollowButtonState } from "../components/social/FollowButton";
import { useAuth } from "../contexts/useAuth";
import { fetchFeed } from "../lib/api/feedApi";
import { followUser, unfollowUser } from "../lib/api/socialApi";
import type { ApiFeedPost, FeedPage } from "../lib/api/types";

const FEED_PAGE_SIZE = 20;
type FollowState = FollowButtonState;

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
        <div className="space-y-4 rounded-lg border border-dashed border-app-border bg-app-surface p-8">
          <p className="text-sm text-app-muted">
            Sign in to see posts from people you follow.
          </p>
          <button
            type="button"
            onClick={signIn}
            className="inline-flex h-10 items-center justify-center rounded-md bg-app-accent px-4 text-sm font-semibold text-app-surface transition-colors hover:bg-app-accentHover focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg"
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
            <FeedPostCard
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
          className="inline-flex h-10 items-center justify-center rounded-md border border-app-border bg-app-surface px-4 text-sm font-semibold text-app-text transition-colors hover:bg-app-surfaceMuted focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingMore ? "Loading" : "Load more"}
        </button>
      ) : null}
    </FeedShell>
  );
}

function FeedShell({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-app-accentText">Home</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-app-text sm:text-4xl">
          Following feed
        </h1>
      </div>
      {children}
    </section>
  );
}

function StatusPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-app-border bg-app-surface p-8 text-sm text-app-muted">
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
