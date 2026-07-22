import { Result, ok, fail } from "@/types/Result";
import { TicketAttachment, TicketAttachmentKind } from "../entities/TicketAttachment.entity";
import { MediaCapture } from "../ports/MediaCapture.port";
import { TicketAttachmentsStore } from "../ports/TicketAttachmentsStore.port";

export interface CaptureTicketAttachmentArgs {
  ticketId: string;
  kind: TicketAttachmentKind;
  isTicketActive: boolean;
}

export type CaptureTicketAttachmentError =
  | { type: "NO_ACTIVE_TICKET" }
  | { type: "PERMISSION_DENIED" }
  | { type: "CANCELLED" }
  | { type: "CAPTURE_FAILED" }
  | { type: "SAVE_FAILED" };

export class CaptureTicketAttachmentUseCase {
  constructor(
    private readonly mediaCapture: MediaCapture,
    private readonly store: TicketAttachmentsStore,
    private readonly generateId: () => string,
    private readonly now: () => number,
  ) {}

  async execute(args: CaptureTicketAttachmentArgs): Promise<Result<TicketAttachment, CaptureTicketAttachmentError>> {
    if (!args.isTicketActive) return fail({ type: "NO_ACTIVE_TICKET" });

    const captured = await this.mediaCapture.captureMedia(args.kind);
    if (!captured.success) return fail(captured.error);

    const attachment: TicketAttachment = {
      id: this.generateId(),
      ticketId: args.ticketId,
      kind: captured.data.kind,
      uri: captured.data.uri,
      width: captured.data.width,
      height: captured.data.height,
      thumbnailUri: captured.data.thumbnailUri,
      createdAt: this.now(),
    };

    const saved = await this.store.add(attachment);
    if (!saved.success) return fail(saved.error);

    return ok(attachment);
  }
}
