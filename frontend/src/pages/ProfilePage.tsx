import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import {
  fetchProfile,
  followUser,
  unfollowUser,
  type ApiProfile
} from "../lib/api";

const PROFILE_PAGE_SIZE = 24;

type ProfileStatus = "idle" | "loading" | "loading-more" | "error";

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const { signIn, status: authStatus, token, user } = useAuth();
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isFollowUpdating, setIsFollowUpdating] = useState(false);

  const targetUserId = userId ?? user?.googleSub ?? null;
  const isOwnProfile = Boolean(
    targetUserId && user?.googleSub && targetUserId === user.googleSub
  );

  const loadProfile = useCallback(
    async ({ offset, append }: { offset: number; append: boolean }) => {
      if (!token || !targetUserId) {
        return;
      }

      setProfileStatus(append ? "loading-more" : "loading");
      setError(null);

      try {
        const nextProfile = await fetchProfile({
          token,
          userId: targetUserId,
          limit: PROFILE_PAGE_SIZE,
          offset
        });

        setProfile((currentProfile) => {
          if (!append || !currentProfile) {
            return nextProfile;
          }

          return {
            ...nextProfile,
            posts: [...currentProfile.posts, ...nextProfile.posts]
          };
        });
        setProfileStatus("idle");
      } catch {
        setProfileStatus("error");
        setError("Profile could not be loaded.");
      }
    },
    [targetUserId, token]
  );

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setProfile(null);
      setProfileStatus("idle");
      setError(null);
      return;
    }

    void loadProfile({ offset: 0, append: false });
  }, [authStatus, loadProfile]);

  async function handleFollowToggle() {
    if (!token || !profile || isOwnProfile || isFollowUpdating) {
      return;
    }

    const wasFollowing = profile.stats.viewerIsFollowing;
    setIsFollowUpdating(true);
    setError(null);

    try {
      if (wasFollowing) {
        await unfollowUser({ token, userId: profile.user.googleSub });
      } else {
        await followUser({ token, userId: profile.user.googleSub });
      }

      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              stats: {
                ...currentProfile.stats,
                viewerIsFollowing: !wasFollowing,
                followersCount: Math.max(
                  0,
                  currentProfile.stats.followersCount + (wasFollowing ? -1 : 1)
                )
              }
            }
          : currentProfile
      );
    } catch {
      setError("Follow status could not be updated.");
    } finally {
      setIsFollowUpdating(false);
    }
  }

  if (authStatus === "loading" || profileStatus === "loading") {
    return (
      <ProfileShell>
        <StatusPanel>Loading profile.</StatusPanel>
      </ProfileShell>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <ProfileShell>
        <div className="space-y-4 rounded-lg border border-dashed border-zinc-300 bg-white p-8">
          <p className="text-sm text-zinc-600">
            Sign in to view profile details.
          </p>
          <button
            type="button"
            onClick={signIn}
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Sign in
          </button>
        </div>
      </ProfileShell>
    );
  }

  if (!token || !targetUserId) {
    return (
      <ProfileShell>
        <StatusPanel>Session is unavailable.</StatusPanel>
      </ProfileShell>
    );
  }

  const canLoadMore = Boolean(
    profile?.pagination.hasMore && profile.pagination.nextOffset
  );
  const isLoadingMore = profileStatus === "loading-more";

  return (
    <ProfileShell>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {profile ? (
        <>
          <ProfileHeader
            profile={profile}
            isOwnProfile={isOwnProfile}
            isFollowUpdating={isFollowUpdating}
            onToggleFollow={handleFollowToggle}
          />
          <PostGrid profile={profile} />

          {canLoadMore ? (
            <button
              type="button"
              onClick={() =>
                void loadProfile({
                  offset: profile.pagination.nextOffset ?? 0,
                  append: true
                })
              }
              disabled={isLoadingMore}
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? "Loading" : "Load more"}
            </button>
          ) : null}
        </>
      ) : profileStatus === "error" ? null : (
        <StatusPanel>Profile not found.</StatusPanel>
      )}
    </ProfileShell>
  );
}

function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowUpdating,
  onToggleFollow
}: {
  profile: ApiProfile;
  isOwnProfile: boolean;
  isFollowUpdating: boolean;
  onToggleFollow: () => void;
}) {
  const displayName = useMemo(
    () => profile.user.name?.trim() || profile.user.email,
    [profile.user.email, profile.user.name]
  );

  return (
    <section className="grid gap-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <UserAvatar
        avatarUrl={profile.user.avatarUrl}
        displayName={displayName}
      />
      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-normal text-zinc-950">
              {displayName}
            </h2>
            <p className="truncate text-sm text-zinc-500">
              {profile.user.email}
            </p>
          </div>

          {isOwnProfile ? null : (
            <button
              type="button"
              onClick={onToggleFollow}
              disabled={isFollowUpdating}
              className={[
                "inline-flex h-10 shrink-0 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                profile.stats.viewerIsFollowing
                  ? "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
                  : "bg-emerald-700 text-white hover:bg-emerald-800"
              ].join(" ")}
            >
              {isFollowUpdating
                ? "Saving"
                : profile.stats.viewerIsFollowing
                  ? "Unfollow"
                  : "Follow"}
            </button>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <ProfileStat label="Posts" value={profile.stats.postsCount} />
          <ProfileStat label="Following" value={profile.stats.followingCount} />
          <ProfileStat label="Followers" value={profile.stats.followersCount} />
        </dl>
      </div>
    </section>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-zinc-50 px-3 py-2">
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-zinc-950">{value}</dd>
    </div>
  );
}

function PostGrid({ profile }: { profile: ApiProfile }) {
  if (profile.posts.length === 0) {
    return <StatusPanel>No posts yet.</StatusPanel>;
  }

  return (
    <section
      aria-label="Profile posts"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      {profile.posts.map((post) => (
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
        className="size-24 rounded-full border border-zinc-200 object-cover sm:size-28"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex size-24 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-3xl font-semibold text-emerald-800 sm:size-28"
    >
      {getUserInitial(displayName)}
    </div>
  );
}

function ProfileShell({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-700">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
          Profile
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

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function getUserInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}
