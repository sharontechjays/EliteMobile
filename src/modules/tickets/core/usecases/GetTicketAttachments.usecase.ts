import { Result } from "@/types/Result";
import { TicketAttachment } from "../entities/TicketAttachment.entity";
import { TicketAttachmentsStore } from "../ports/TicketAttachmentsStore.port";

export class GetTicketAttachmentsUseCase {
  constructor(private readonly store: TicketAttachmentsStore) {}

  async execute(ticketId: string): Promise<Result<TicketAttachment[], { type: "READ_FAILED" }>> {
    return this.store.list(ticketId);
  }
}
