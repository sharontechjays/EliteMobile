import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Result, ok, fail } from "@/types/Result";
import { TicketAttachmentKind } from "../../core/entities/TicketAttachment.entity";
import { CapturedMedia, MediaCapture, MediaCaptureError } from "../../core/ports/MediaCapture.port";

const MEDIA_TYPES_BY_KIND: Record<TicketAttachmentKind, ImagePicker.MediaType[]> = {
  photo: ["images"],
  video: ["videos"],
};

export class ExpoMediaCaptureAdapter implements MediaCapture {
  async captureMedia(kind: TicketAttachmentKind): Promise<Result<CapturedMedia, MediaCaptureError>> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return fail({ type: "PERMISSION_DENIED" });

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: MEDIA_TYPES_BY_KIND[kind] });
    if (result.canceled) return fail({ type: "CANCELLED" });

    const asset = result.assets[0];
    if (!asset) return fail({ type: "CAPTURE_FAILED" });

    const thumbnailUri = kind === "video" ? await this.generateVideoThumbnail(asset.uri) : asset.uri;

    return ok({ kind, uri: asset.uri, width: asset.width, height: asset.height, thumbnailUri });
  }

  // A video file's own uri isn't renderable by <Image>, so a still frame is generated for
  // thumbnail/grid display. Falls back to the video uri itself if generation fails — the
  // thumbnail grid just won't render an image for that tile, which is better than failing the
  // whole capture over a thumbnail that's cosmetic.
  //
  // expo-video-thumbnails has no deprecation date yet, but expo-video's own generateThumbnailsAsync
  // is the SDK's forward-looking replacement — it needs an active VideoPlayer instance rather than
  // a standalone uri-in/uri-out call, so migrating isn't a drop-in swap. Revisit before Expo SDK 56.
  private async generateVideoThumbnail(videoUri: string): Promise<string> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri);
      return uri;
    } catch {
      return videoUri;
    }
  }
}
