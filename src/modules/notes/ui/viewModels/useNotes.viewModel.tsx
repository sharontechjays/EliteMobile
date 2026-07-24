import { useCallback, useState } from "react";
import { ActionSheetIOS, Linking } from "react-native";
import * as Crypto from "expo-crypto";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { NOTES_MAX_PHOTOS } from "@/constants/appConstants";
import { SaveNoteUseCase } from "../../core/usecases/SaveNote.usecase";

interface PhotoTile {
  id: string;
  kind: "photo" | "video";
  uri: string;
  width: number;
  height: number;
  thumbnailUri: string;
}

interface UseNotesViewModelArgs {
  ticketName: string;
  onSaved: () => void;
}

export const useNotesViewModel = ({ ticketName, onSaved }: UseNotesViewModelArgs) => {
  const { noteSaver, mediaCapture } = useDependencies();
  const { strings } = useLanguage();
  const t = strings.notes;
  // Seeded once with the current language's mock draft text — like any other draft, the crew
  // leader is expected to edit or replace it, so it doesn't need to stay reactive to a language
  // toggle afterward (unlike the rest of this app's UI chrome).
  const [text, setText] = useState(() => strings.mockData.notesSeedText);
  const [photos, setPhotos] = useState<PhotoTile[]>([]);
  const [extraWorkFlag, setExtraWorkFlag] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<PhotoTile | null>(null);
  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState<string | null>(null);
  const [attachmentErrorIsPermission, setAttachmentErrorIsPermission] = useState(false);

  const onCaptureMedia = useCallback(
    async (kind: "photo" | "video") => {
      const result = await mediaCapture.captureMedia(kind);
      if (result.success) {
        setPhotos((prev) => [
          ...prev,
          {
            id: Crypto.randomUUID(),
            kind: result.data.kind,
            uri: result.data.uri,
            width: result.data.width,
            height: result.data.height,
            thumbnailUri: result.data.thumbnailUri,
          },
        ]);
        return;
      }
      if (result.error.type === "CANCELLED") return;

      setAttachmentErrorIsPermission(result.error.type === "PERMISSION_DENIED");
      setAttachmentErrorMessage(
        result.error.type === "PERMISSION_DENIED" ? t.attachmentErrorPermissionDenied : t.attachmentErrorGeneric,
      );
    },
    [mediaCapture, t],
  );

  const onAddPhoto = useCallback(() => {
    if (photos.length >= NOTES_MAX_PHOTOS) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t.addMediaTitle,
        options: [t.takePhotoOption, t.recordVideoOption, strings.common.cancel],
        cancelButtonIndex: 2,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) onCaptureMedia("photo");
        else if (buttonIndex === 1) onCaptureMedia("video");
      },
    );
  }, [photos.length, t, strings.common.cancel, onCaptureMedia]);

  const onRemovePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  }, []);

  const onPreviewPhoto = useCallback((photo: PhotoTile) => setPreviewMedia(photo), []);
  const onClosePreview = useCallback(() => setPreviewMedia(null), []);
  const onDismissAttachmentError = useCallback(() => setAttachmentErrorMessage(null), []);
  const onOpenSettingsForPermission = useCallback(() => {
    Linking.openSettings();
    setAttachmentErrorMessage(null);
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
    state: {
      text,
      photos,
      maxPhotos: NOTES_MAX_PHOTOS,
      extraWorkFlag,
      saving,
      previewMedia,
      attachmentErrorMessage,
      attachmentErrorIsPermission,
    },
    handlers: {
      onChangeText: setText,
      onAddPhoto,
      onRemovePhoto,
      onPreviewPhoto,
      onClosePreview,
      onDismissAttachmentError,
      onOpenSettingsForPermission,
      onToggleExtraWork,
      onSave,
    },
  };
};
