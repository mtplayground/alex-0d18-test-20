import { useMemo } from "react";
import { FollowButton } from "../social/FollowButton";
import { UserAvatar } from "../users/UserAvatar";
import type { ApiProfile } from "../../lib/api/types";

export function ProfileHeader({
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
        size="lg"
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
            <FollowButton
              followState={{
                isFollowing: profile.stats.viewerIsFollowing,
                isUpdating: isFollowUpdating
              }}
              onClick={onToggleFollow}
            />
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
