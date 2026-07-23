import { QueryClient } from "@tanstack/react-query";
import { QUERY_CACHE_TIME_MS, QUERY_RETRY_COUNT, QUERY_STALE_TIME_MS } from "@/constants/appConstants";

// Defaults tuned for a field crew that regularly loses signal (yards, rural job sites):
//  - staleTime/gcTime are generous, so a screen already has something to show immediately from
//    cache while a background refetch (if online) runs, rather than a blank loading state.
//  - `networkMode: "offlineFirst"` (the default for queries) lets a query resolve from cache
//    even with no connection, instead of just hanging in a perpetual loading state.
//  - Mutations default to `networkMode: "online"`, which is what gives the "pause while offline,
//    auto-resume when back online" behavior — a mutation fired with no connection goes into a
//    paused state instead of failing outright, and React Query resumes it automatically once
//    setupOnlineManager reports connectivity is back.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: QUERY_RETRY_COUNT,
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: QUERY_CACHE_TIME_MS,
      },
      mutations: {
        retry: QUERY_RETRY_COUNT,
      },
    },
  });
}
