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
        "inline-flex shrink-0 items-center justify-center rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-60",
        sizeClasses[size],
        followState.isFollowing
          ? "border border-app-border bg-app-surface text-app-text hover:bg-app-surfaceMuted"
          : "bg-app-accent text-app-surface hover:bg-app-accentHover"
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
