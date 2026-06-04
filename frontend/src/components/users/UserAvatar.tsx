type UserAvatarSize = "sm" | "lg";

const avatarSizeClasses: Record<UserAvatarSize, string> = {
  sm: "size-11 text-sm",
  lg: "size-24 text-3xl sm:size-28"
};

export function UserAvatar({
  avatarUrl,
  displayName,
  size = "sm"
}: {
  avatarUrl: string | null;
  displayName: string;
  size?: UserAvatarSize;
}) {
  const sizeClassName = avatarSizeClasses[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${displayName}'s profile image`}
        className={`${sizeClassName} shrink-0 rounded-full border border-zinc-200 object-cover`}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 font-semibold text-emerald-800`}
    >
      {getUserInitial(displayName)}
    </div>
  );
}

function getUserInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}
