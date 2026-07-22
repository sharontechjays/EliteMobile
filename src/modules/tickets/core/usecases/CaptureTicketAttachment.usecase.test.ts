import { ok, fail } from "@/types/Result";
import { CaptureTicketAttachmentUseCase } from "./CaptureTicketAttachment.usecase";
import { MediaCapture } from "../ports/MediaCapture.port";
import { TicketAttachmentsStore } from "../ports/TicketAttachmentsStore.port";

const GENERATED_ID = "attachment-1";
const NOW = 1_700_000_000_000;

function buildUseCase(overrides?: { mediaCapture?: Partial<MediaCapture>; store?: Partial<TicketAttachmentsStore> }) {
  const mediaCapture: MediaCapture = {
    captureMedia: async () =>
      ok({ kind: "photo", uri: "file://captured.jpg", width: 1080, height: 1920, thumbnailUri: "file://captured.jpg" }),
    ...overrides?.mediaCapture,
  };
  const store: TicketAttachmentsStore = {
    add: async () => ok(undefined),
    list: async () => ok([]),
    ...overrides?.store,
  };
  return new CaptureTicketAttachmentUseCase(
    mediaCapture,
    store,
    () => GENERATED_ID,
    () => NOW,
  );
}

describe("CaptureTicketAttachmentUseCase", () => {
  it("fails with NO_ACTIVE_TICKET and never touches capture/store when the ticket isn't active", async () => {
    const captureMedia = jest.fn(async () =>
      ok({ kind: "photo" as const, uri: "file://x.jpg", width: 1080, height: 1920, thumbnailUri: "file://x.jpg" }),
    );
    const add = jest.fn(async () => ok(undefined));
    const useCase = buildUseCase({ mediaCapture: { captureMedia }, store: { add } });

    const result = await useCase.execute({ ticketId: "t1", kind: "photo", isTicketActive: false });

    expect(result).toEqual(fail({ type: "NO_ACTIVE_TICKET" }));
    expect(captureMedia).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it("captures, builds an attachment, saves it, and returns it on success", async () => {
    const useCase = buildUseCase();

    const result = await useCase.execute({ ticketId: "t1", kind: "photo", isTicketActive: true });

    expect(result).toEqual(
      ok({
        id: GENERATED_ID,
        ticketId: "t1",
        kind: "photo",
        uri: "file://captured.jpg",
        width: 1080,
        height: 1920,
        thumbnailUri: "file://captured.jpg",
        createdAt: NOW,
      }),
    );
  });

  it("propagates a permission-denied capture failure without saving anything", async () => {
    const add = jest.fn(async () => ok(undefined));
    const useCase = buildUseCase({
      mediaCapture: { captureMedia: async () => fail({ type: "PERMISSION_DENIED" }) },
      store: { add },
    });

    const result = await useCase.execute({ ticketId: "t1", kind: "video", isTicketActive: true });

    expect(result).toEqual(fail({ type: "PERMISSION_DENIED" }));
    expect(add).not.toHaveBeenCalled();
  });

  it("propagates a cancelled capture without saving anything", async () => {
    const add = jest.fn(async () => ok(undefined));
    const useCase = buildUseCase({
      mediaCapture: { captureMedia: async () => fail({ type: "CANCELLED" }) },
      store: { add },
    });

    const result = await useCase.execute({ ticketId: "t1", kind: "photo", isTicketActive: true });

    expect(result).toEqual(fail({ type: "CANCELLED" }));
    expect(add).not.toHaveBeenCalled();
  });

  it("fails with SAVE_FAILED when the store rejects the write, after a successful capture", async () => {
    const useCase = buildUseCase({ store: { add: async () => fail({ type: "SAVE_FAILED" }) } });

    const result = await useCase.execute({ ticketId: "t1", kind: "photo", isTicketActive: true });

    expect(result).toEqual(fail({ type: "SAVE_FAILED" }));
  });
});
