import { useCallback, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { SaveNoteUseCase } from "../../core/usecases/SaveNote.usecase";

const MAX_PHOTOS = 4;

interface PhotoTile {
  id: string;
  kind: "photo" | "video";
}

const SEEDED_PHOTOS: PhotoTile[] = [
  { id: "seed-1", kind: "photo" },
  { id: "seed-2", kind: "video" },
];

// Module-level mutable counter (not component state): guarantees unique ids
// across multiple onAddPhoto calls within one mounted screen without relying
// on Date.now()/Math.random(), which aren't available in every context this
// codebase runs in.
let nextPhotoId = 0;

interface UseNotesViewModelArgs {
  ticketName: string;
  onSaved: () => void;
}

export const useNotesViewModel = ({ ticketName, onSaved }: UseNotesViewModelArgs) => {
  const { noteSaver } = useDependencies();
  const { strings } = useLanguage();
  // Seeded once with the current language's mock draft text — like any other draft, the crew
  // leader is expected to edit or replace it, so it doesn't need to stay reactive to a language
  // toggle afterward (unlike the rest of this app's UI chrome).
  const [text, setText] = useState(() => strings.mockData.notesSeedText);
  const [photos, setPhotos] = useState<PhotoTile[]>(SEEDED_PHOTOS);
  const [extraWorkFlag, setExtraWorkFlag] = useState(true);
  const [saving, setSaving] = useState(false);

  const onAddPhoto = useCallback(() => {
    setPhotos((prev) => {
      if (prev.length >= MAX_PHOTOS) return prev;
      nextPhotoId += 1;
      return [...prev, { id: `added-${nextPhotoId}`, kind: "photo" }];
    });
  }, []);

  const onRemovePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  }, []);

  const onToggleExtraWork = useCallback(() => {
    setExtraWorkFlag((prev) => !prev);
  }, []);

  const onSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    const usecase = new SaveNoteUseCase(noteSaver);
    await usecase.execute({ ticketName, text, photoCount: photos.length, extraWorkFlag });

    setSaving(false);
    onSaved();
  }, [saving, noteSaver, ticketName, text, photos, extraWorkFlag, onSaved]);

  return {
    state: { text, photos, maxPhotos: MAX_PHOTOS, extraWorkFlag, saving },
    handlers: { onChangeText: setText, onAddPhoto, onRemovePhoto, onToggleExtraWork, onSave },
  };
};
