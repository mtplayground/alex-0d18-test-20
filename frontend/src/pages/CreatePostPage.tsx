import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode
} from "react";
import { useAuth } from "../contexts/useAuth";
import {
  createPost,
  requestPresignedUpload,
  uploadFileToStorage
} from "../lib/api/postsApi";
import type { ApiPost } from "../lib/api/types";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

type SubmitStatus = "idle" | "uploading" | "success" | "error";

export function CreatePostPage() {
  const { signIn, status, token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [createdPost, setCreatedPost] = useState<ApiPost | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function resetSelection() {
    setFile(null);
    setPreviewUrl(null);
    setCreatedPost(null);
    setSubmitStatus("idle");
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setCreatedPost(null);
    setSubmitStatus("idle");
    setError(null);

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.has(selectedFile.type)) {
      setFile(null);
      setPreviewUrl(null);
      setError("Choose a GIF, JPEG, PNG, or WebP image.");
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setPreviewUrl(null);
      setError("Choose an image smaller than 10 MB.");
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || !token) {
      return;
    }

    try {
      setSubmitStatus("uploading");
      setError(null);
      setCreatedPost(null);

      const upload = await requestPresignedUpload({ token, file });
      await uploadFileToStorage({ file, upload });
      const post = await createPost({
        token,
        imageUrl: upload.publicUrl,
        caption
      });

      setCreatedPost(post);
      setCaption("");
      setFile(null);
      setPreviewUrl(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSubmitStatus("success");
    } catch {
      setSubmitStatus("error");
      setError("Upload failed. Try again.");
    }
  }

  if (status === "loading") {
    return (
      <CreatePostShell>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface p-8 text-sm text-app-muted">
          Loading.
        </div>
      </CreatePostShell>
    );
  }

  if (status !== "authenticated") {
    return (
      <CreatePostShell>
        <div className="space-y-4 rounded-lg border border-dashed border-app-border bg-app-surface p-8">
          <p className="text-sm text-app-muted">Sign in to publish a post.</p>
          <button
            type="button"
            onClick={signIn}
            className="inline-flex h-10 items-center justify-center rounded-md bg-app-accent px-4 text-sm font-semibold text-app-surface transition-colors hover:bg-app-accentHover focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg"
          >
            Sign in
          </button>
        </div>
      </CreatePostShell>
    );
  }

  const isSubmitting = submitStatus === "uploading";

  return (
    <CreatePostShell>
      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <div className="space-y-4">
          <label
            htmlFor="post-image"
            className="block text-sm font-semibold text-app-text"
          >
            Image
          </label>
          <div className="rounded-lg border border-dashed border-app-border bg-app-surface p-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Selected post preview"
                className="aspect-square w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-md bg-app-surfaceMuted text-sm text-app-muted">
                No image selected.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              id="post-image"
              type="file"
              accept="image/gif,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isSubmitting}
              className="block w-full max-w-md text-sm text-app-muted file:mr-4 file:h-10 file:rounded-md file:border-0 file:bg-app-text file:px-4 file:text-sm file:font-semibold file:text-app-surface hover:file:bg-app-muted disabled:cursor-not-allowed disabled:opacity-60"
            />
            {file ? (
              <button
                type="button"
                onClick={resetSelection}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-md border border-app-border bg-app-surface px-4 text-sm font-semibold text-app-text transition-colors hover:bg-app-surfaceMuted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <label
            htmlFor="post-caption"
            className="block text-sm font-semibold text-app-text"
          >
            Caption
          </label>
          <textarea
            id="post-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={2200}
            rows={8}
            disabled={isSubmitting}
            className="w-full resize-none rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm outline-none transition-colors placeholder:text-app-muted focus:border-app-ring focus:ring-2 focus:ring-app-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Write a caption."
          />
          <div className="flex items-center justify-between gap-4 text-xs text-app-muted">
            <span>{caption.length}/2200</span>
            <span>{file ? formatBytes(file.size) : ""}</span>
          </div>
          <button
            type="submit"
            disabled={!file || !token || isSubmitting}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-app-accent px-4 text-sm font-semibold text-app-surface transition-colors hover:bg-app-accentHover focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Publishing" : "Publish"}
          </button>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {createdPost ? (
            <p className="text-sm text-app-accentText">
              Post published at{" "}
              {new Date(createdPost.createdAt).toLocaleString()}.
            </p>
          ) : null}
        </div>
      </form>
    </CreatePostShell>
  );
}

function CreatePostShell({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-app-accentText">Create</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-app-text sm:text-4xl">
          New post
        </h1>
      </div>
      {children}
    </section>
  );
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) {
    return `${Math.ceil(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
