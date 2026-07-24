import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDependencies } from "@app/react/useDependencies";
import { NewExampleNote } from "../../core/entities/ExampleNote.entity";
import { exampleNotesQueryKey } from "./useExampleNotesQuery";

// A write, offline-queued: React Query's mutation `networkMode` defaults to "online" (see
// queryClient.ts's own note), so calling `mutate()` with no connection doesn't fail — it goes
// into a *paused* state and waits. setupOnlineManager.ts reports the real connectivity
// transition, and once it flips back to online, this mutation automatically resumes and actually
// sends the request. If the app is killed while paused, PersistQueryClientProvider's onSuccess
// callback in app/_layout.tsx calls queryClient.resumePausedMutations() on the next launch so a
// queued note isn't silently lost.
export function useCreateExampleNoteMutation() {
  const { exampleNotesApi } = useDependencies();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: NewExampleNote) => {
      const result = await exampleNotesApi.create(note);
      if (!result.success) throw new Error(result.error.type);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleNotesQueryKey });
    },
  });
}
