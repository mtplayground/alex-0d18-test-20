export type ApiUser = {
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
};

export type ApiPost = {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiFeedPost = ApiPost & {
  author: ApiUser;
  likesCount: number;
  commentsCount: number;
  viewerHasLiked: boolean;
};

export type ApiProfilePost = ApiPost & {
  likesCount: number;
  commentsCount: number;
  viewerHasLiked: boolean;
};

export type FeedPage = {
  posts: ApiFeedPost[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
};

export type ApiProfile = {
  user: ApiUser;
  stats: {
    postsCount: number;
    followingCount: number;
    followersCount: number;
    viewerIsFollowing: boolean;
  };
  posts: ApiProfilePost[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
};

export type LikeState = {
  liked: boolean;
  postId: string;
  likesCount: number;
};

export type ApiComment = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: ApiUser;
};

export type CommentsPage = {
  comments: ApiComment[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
};

export type PresignedUpload = {
  uploadUrl: string;
  method: "PUT";
  key: string;
  publicUrl: string;
  expiresIn: number;
  headers: {
    "Content-Type": string;
    "Content-Length": string;
  };
};
