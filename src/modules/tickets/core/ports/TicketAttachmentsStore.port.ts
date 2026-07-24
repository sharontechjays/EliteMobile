import { Result } from "@/types/Result";
import { TicketAttachment } from "../entities/TicketAttachment.entity";

export interface TicketAttachmentsStore {
  add(attachment: TicketAttachment): Promise<Result<void, { type: "SAVE_FAILED" }>>;
  list(ticketId: string): Promise<Result<TicketAttachment[], { type: "READ_FAILED" }>>;
}
