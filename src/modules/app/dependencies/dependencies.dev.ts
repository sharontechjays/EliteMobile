import { Dependencies } from "./Dependencies.type";
import { MmkvKeyValueStoreAdapter } from "@modules/shared/storage/MmkvKeyValueStore.adapter";
import { LocalAppReadinessAdapter } from "@modules/splash/infrastructure/adapters/LocalAppReadiness.adapter";
import { LocalDeviceRegistrarAdapter } from "@modules/deviceRegistration/infrastructure/adapters/LocalDeviceRegistrar.adapter";
import { NativeDeviceIdentityKeyStoreAdapter } from "@modules/deviceRegistration/infrastructure/adapters/NativeDeviceIdentityKeyStore.adapter";
import { InMemoryHomeSummaryAdapter } from "@modules/home/infrastructure/adapters/InMemoryHomeSummary.adapter";
import { ExpoBatteryAdapter } from "@modules/home/infrastructure/adapters/ExpoBattery.adapter";
import { ExpoGpsAvailabilityAdapter } from "@modules/home/infrastructure/adapters/ExpoGpsAvailability.adapter";
import { InMemorySessionAuthenticatorAdapter } from "@modules/auth/infrastructure/adapters/InMemorySessionAuthenticator.adapter";
import { InMemoryCrewRosterAdapter } from "@modules/roster/infrastructure/adapters/InMemoryCrewRoster.adapter";
import { InMemoryPunchRecorderAdapter } from "@modules/clock/infrastructure/adapters/InMemoryPunchRecorder.adapter";
import { InMemoryNoteSaverAdapter } from "@modules/notes/infrastructure/adapters/InMemoryNoteSaver.adapter";
import { InMemoryTicketsAdapter } from "@modules/tickets/infrastructure/adapters/InMemoryTickets.adapter";
import { ExpoMediaCaptureAdapter } from "@modules/tickets/infrastructure/adapters/ExpoMediaCapture.adapter";
import { InMemoryTicketAttachmentsStoreAdapter } from "@modules/tickets/infrastructure/adapters/InMemoryTicketAttachmentsStore.adapter";
import { InMemoryTimesheetAdapter } from "@modules/timesheet/infrastructure/adapters/InMemoryTimesheet.adapter";
import { InMemorySyncQueueAdapter } from "@modules/sync/infrastructure/adapters/InMemorySyncQueue.adapter";
import { InMemoryProfileAdapter } from "@modules/profile/infrastructure/adapters/InMemoryProfile.adapter";
import { HttpExampleNotesAdapter } from "@modules/apiIntegrationExample/infrastructure/adapters/HttpExampleNotes.adapter";

// Dev profile: local-only adapters, now backed by real MMKV persistence for the shared
// key-value store (device registration, app readiness, and timer state all survive
// app restarts through it). Swap the remaining in-memory adapters for SQLite-backed
// ones once the clock/sync local store lands.
export const buildDevDependencies = (): Dependencies => {
  const keyValueStore = new MmkvKeyValueStoreAdapter();
  // One shared instance bound to both rosterReader and workerStatusRecorder: a confirmed punch
  // (workerStatusRecorder.applyPunch) mutates the exact same in-memory roster this reads from,
  // so the roster screen reflects the punch on its next read — see ConfirmAttestation.usecase.ts.
  const crewRoster = new InMemoryCrewRosterAdapter();

  return {
    keyValueStore,
    appReadinessReader: new LocalAppReadinessAdapter(keyValueStore),
    deviceRegistrar: new LocalDeviceRegistrarAdapter(keyValueStore),
    deviceIdentityKeyStore: new NativeDeviceIdentityKeyStoreAdapter(),
    homeSummaryReader: new InMemoryHomeSummaryAdapter(),
    batteryReader: new ExpoBatteryAdapter(),
    gpsAvailabilityReader: new ExpoGpsAvailabilityAdapter(),
    sessionAuthenticator: new InMemorySessionAuthenticatorAdapter(),
    rosterReader: crewRoster,
    workerStatusRecorder: crewRoster,
    punchRecorder: new InMemoryPunchRecorderAdapter(),
    noteSaver: new InMemoryNoteSaverAdapter(),
    ticketsReader: new InMemoryTicketsAdapter(),
    mediaCapture: new ExpoMediaCaptureAdapter(),
    ticketAttachmentsStore: new InMemoryTicketAttachmentsStoreAdapter(),
    timesheetReader: new InMemoryTimesheetAdapter(),
    syncQueueReader: new InMemorySyncQueueAdapter(),
    profileReader: new InMemoryProfileAdapter(keyValueStore),
    exampleNotesApi: new HttpExampleNotesAdapter(),
  };
};
