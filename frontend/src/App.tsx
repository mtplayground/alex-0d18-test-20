import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/useAuth";
import type { ApiUser } from "./lib/api";
import { CreatePostPage } from "./pages/CreatePostPage";
import { FeedPageView } from "./pages/FeedPage";

const navItems = [
  { label: "Home", to: "/", end: true },
  { label: "Explore", to: "/explore" },
  { label: "Create", to: "/posts/new" },
  { label: "Profile", to: "/profile" }
];

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <nav aria-label="Primary navigation" className="flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <AuthControls />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<FeedPageView />} />
          <Route path="/explore" element={<ExploreRoute />} />
          <Route path="/posts/new" element={<CreatePostPage />} />
          <Route path="/profile" element={<ProfileRoute />} />
          <Route path="/auth/callback" element={<AuthCallbackRoute />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
      </main>
    </div>
  );
}

function AuthControls() {
  const { signIn, signOut, status, user } = useAuth();
  const isAuthenticated = status === "authenticated";

  if (isAuthenticated && user) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <UserSummary user={user} />
        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={status === "loading"}
      className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      Sign in
    </button>
  );
}

function UserSummary({ user }: { user: ApiUser }) {
  const displayName = user.name?.trim() || user.email;
  const avatarLabel = `${displayName}'s profile image`;

  return (
    <div
      className="flex min-w-0 items-center gap-2"
      aria-label={`Signed in as ${displayName}`}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={avatarLabel}
          className="size-10 shrink-0 rounded-full border border-zinc-200 object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800"
        >
          {getUserInitial(displayName)}
        </div>
      )}
      <div className="hidden min-w-0 flex-col sm:flex">
        <span className="max-w-40 truncate text-sm font-semibold leading-5 text-zinc-950">
          {displayName}
        </span>
        <span className="max-w-40 truncate text-xs leading-4 text-zinc-500">
          Signed in
        </span>
      </div>
    </div>
  );
}

function getUserInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function PageFrame({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
          {title}
        </h1>
      </div>
      {children}
    </section>
  );
}

function ExploreRoute() {
  return (
    <PageFrame eyebrow="Explore" title="Discover people">
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-600">
        No people to show yet.
      </div>
    </PageFrame>
  );
}

function ProfileRoute() {
  return (
    <PageFrame eyebrow="Profile" title="Your profile">
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-600">
        Sign in to view profile details.
      </div>
    </PageFrame>
  );
}

function NotFoundRoute() {
  return (
    <PageFrame eyebrow="Not found" title="Page not found">
      <NavLink
        to="/"
        className="inline-flex h-10 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
      >
        Go home
      </NavLink>
    </PageFrame>
  );
}

function AuthCallbackRoute() {
  const { completeSignIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const hasCompleted = useRef(false);

  useEffect(() => {
    if (hasCompleted.current) {
      return;
    }

    hasCompleted.current = true;

    void completeSignIn()
      .then(() => {
        navigate("/", { replace: true });
      })
      .catch(() => {
        setError("Sign in failed. Try again.");
      });
  }, [completeSignIn, navigate]);

  return (
    <PageFrame eyebrow="Sign in" title="Completing sign in">
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-600">
        {error ?? "One moment."}
      </div>
    </PageFrame>
  );
}
