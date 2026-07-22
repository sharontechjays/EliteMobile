import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";
import { AppReadinessReader } from "@modules/splash/core/ports/AppReadinessReader.port";
import { DeviceRegistrar } from "@modules/deviceRegistration/core/ports/DeviceRegistrar.port";
import { DeviceIdentityKeyStore } from "@modules/deviceRegistration/core/ports/DeviceIdentityKeyStore.port";
import { HomeSummaryReader } from "@modules/home/core/ports/HomeSummaryReader.port";
import { SessionAuthenticator } from "@modules/auth/core/ports/SessionAuthenticator.port";
import { RosterReader } from "@modules/roster/core/ports/RosterReader.port";
import { PunchRecorder } from "@modules/clock/core/ports/PunchRecorder.port";
import { NoteSaver } from "@modules/notes/core/ports/NoteSaver.port";
import { TicketsReader } from "@modules/tickets/core/ports/TicketsReader.port";
import { MediaCapture } from "@modules/tickets/core/ports/MediaCapture.port";
import { TicketAttachmentsStore } from "@modules/tickets/core/ports/TicketAttachmentsStore.port";
import { TimesheetReader } from "@modules/timesheet/core/ports/TimesheetReader.port";
import { SyncQueueReader } from "@modules/sync/core/ports/SyncQueueReader.port";
import { ProfileReader } from "@modules/profile/core/ports/ProfileReader.port";

export interface Dependencies {
  keyValueStore: KeyValueStore;
  appReadinessReader: AppReadinessReader;
  deviceRegistrar: DeviceRegistrar;
  deviceIdentityKeyStore: DeviceIdentityKeyStore;
  homeSummaryReader: HomeSummaryReader;
  sessionAuthenticator: SessionAuthenticator;
  rosterReader: RosterReader;
  punchRecorder: PunchRecorder;
  noteSaver: NoteSaver;
  ticketsReader: TicketsReader;
  mediaCapture: MediaCapture;
  ticketAttachmentsStore: TicketAttachmentsStore;
  timesheetReader: TimesheetReader;
  syncQueueReader: SyncQueueReader;
  profileReader: ProfileReader;
}
