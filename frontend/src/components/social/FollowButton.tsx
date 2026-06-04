export type FollowButtonState = {
  isFollowing: boolean;
  isUpdating: boolean;
};

type FollowButtonSize = "sm" | "md";

const sizeClasses: Record<FollowButtonSize, string> = {
  sm: "h-9 px-3",
  md: "h-10 px-4"
};

export function FollowButton({
  followState,
  onClick,
  size = "md"
}: {
  followState: FollowButtonState;
  onClick: () => void;
  size?: FollowButtonSize;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={followState.isUpdating}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        sizeClasses[size],
        followState.isFollowing
          ? "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
          : "bg-emerald-700 text-white hover:bg-emerald-800"
      ].join(" ")}
    >
      {getFollowButtonLabel(followState)}
    </button>
  );
}

function getFollowButtonLabel(followState: FollowButtonState): string {
  if (followState.isUpdating) {
    return "Saving";
  }

  return followState.isFollowing ? "Unfollow" : "Follow";
}
