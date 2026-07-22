import { Result } from "@/types/Result";
import { TicketAttachmentKind } from "../entities/TicketAttachment.entity";

export interface CapturedMedia {
  kind: TicketAttachmentKind;
  uri: string;
  // The captured media's own pixel dimensions (portrait or landscape) — used so the preview
  // shows media in the orientation it was actually shot in, not a fixed box.
  width: number;
  height: number;
  // A static image usable in a thumbnail grid: the photo itself for a photo, or a generated
  // still frame for a video (a video file's own `uri` isn't renderable by <Image>).
  thumbnailUri: string;
}

export type MediaCaptureError = { type: "PERMISSION_DENIED" } | { type: "CANCELLED" } | { type: "CAPTURE_FAILED" };

export interface MediaCapture {
  captureMedia(kind: TicketAttachmentKind): Promise<Result<CapturedMedia, MediaCaptureError>>;
}
