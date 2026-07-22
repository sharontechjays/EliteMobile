import { Result, ok } from "@/types/Result";
import { TicketAttachment } from "../../core/entities/TicketAttachment.entity";
import { TicketAttachmentsStore } from "../../core/ports/TicketAttachmentsStore.port";

export class InMemoryTicketAttachmentsStoreAdapter implements TicketAttachmentsStore {
  private readonly attachmentsByTicketId = new Map<string, TicketAttachment[]>();

  async add(attachment: TicketAttachment): Promise<Result<void, { type: "SAVE_FAILED" }>> {
    const existing = this.attachmentsByTicketId.get(attachment.ticketId) ?? [];
    this.attachmentsByTicketId.set(attachment.ticketId, [...existing, attachment]);
    return ok(undefined);
  }

  async list(ticketId: string): Promise<Result<TicketAttachment[], { type: "READ_FAILED" }>> {
    return ok(this.attachmentsByTicketId.get(ticketId) ?? []);
  }
}
