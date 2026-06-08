import {
  useCallback,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { useParams } from "react-router-dom";
import { ProfilePostGrid } from "../components/posts/ProfilePostGrid";
import { ProfileHeader } from "../components/profiles/ProfileHeader";
import { useAuth } from "../contexts/useAuth";
import { fetchProfile } from "../lib/api/profilesApi";
import { followUser, unfollowUser } from "../lib/api/socialApi";
import type { ApiProfile } from "../lib/api/types";

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
        <div className="space-y-4 rounded-lg border border-dashed border-app-border bg-app-surface p-8">
          <p className="text-sm text-app-muted">
            Sign in to view profile details.
          </p>
          <button
            type="button"
            onClick={signIn}
            className="inline-flex h-10 items-center justify-center rounded-md bg-app-accent px-4 text-sm font-semibold text-app-surface transition-colors hover:bg-app-accentHover focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg"
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
          <ProfilePostGrid posts={profile.posts} />

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
              className="inline-flex h-10 items-center justify-center rounded-md border border-app-border bg-app-surface px-4 text-sm font-semibold text-app-text transition-colors hover:bg-app-surfaceMuted focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-60"
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

function ProfileShell({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-app-accentText">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-app-text sm:text-4xl">
          Profile
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
