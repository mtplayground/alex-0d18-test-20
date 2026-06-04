import { z } from "zod";

export type Pagination = {
  limit: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
};

export type OkServiceResult<TData> = {
  status: "ok";
  data: TData;
};

export function okServiceResult<TData>(data: TData): OkServiceResult<TData> {
  return {
    status: "ok",
    data
  };
}

export function createPaginationQuerySchema({
  defaultLimit,
  maxLimit
}: {
  defaultLimit: number;
  maxLimit: number;
}) {
  return z.object({
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
    offset: z.coerce.number().int().min(0).default(0)
  });
}

export function buildPagination({
  itemCount,
  pageItemCount,
  limit,
  offset
}: {
  itemCount: number;
  pageItemCount: number;
  limit: number;
  offset: number;
}): Pagination {
  const hasMore = itemCount > limit;

  return {
    limit,
    offset,
    nextOffset: hasMore ? offset + pageItemCount : null,
    hasMore
  };
}

export function buildPaginatedItems<TItem>({
  items,
  limit,
  offset
}: {
  items: TItem[];
  limit: number;
  offset: number;
}): {
  pageItems: TItem[];
  pagination: Pagination;
} {
  const pageItems = items.slice(0, limit);

  return {
    pageItems,
    pagination: buildPagination({
      itemCount: items.length,
      pageItemCount: pageItems.length,
      limit,
      offset
    })
  };
}
