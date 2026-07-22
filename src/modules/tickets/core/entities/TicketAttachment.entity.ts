export type TicketAttachmentKind = "photo" | "video";

export interface TicketAttachment {
  id: string;
  ticketId: string;
  kind: TicketAttachmentKind;
  uri: string;
  width: number;
  height: number;
  thumbnailUri: string;
  createdAt: number;
}
