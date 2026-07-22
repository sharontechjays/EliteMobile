import { useQuery } from "@tanstack/react-query";
import { HttpExampleNotesAdapter } from "../../infrastructure/adapters/HttpExampleNotes.adapter";

const api = new HttpExampleNotesAdapter();

export const exampleNotesQueryKey = ["apiIntegrationExample", "notes"] as const;

// A read, offline-cache-first: on first load with a connection, this fetches and caches the
// list. With no connection, React Query serves the persisted cache immediately (see
// app/_layout.tsx's PersistQueryClientProvider) instead of hanging in a loading state or
// erroring — exactly what a field crew losing signal mid-shift needs.
export function useExampleNotesQuery() {
  return useQuery({
    queryKey: exampleNotesQueryKey,
    queryFn: async () => {
      const result = await api.list();
      if (!result.success) throw new Error(result.error.type);
      return result.data;
    },
  });
}
