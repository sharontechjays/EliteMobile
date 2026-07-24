import * as Location from "expo-location";
import { Result, ok, fail } from "@/types/Result";
import { GPS_AVAILABILITY_POLL_INTERVAL_MS } from "@/constants/appConstants";
import { GpsAvailabilityReader } from "../../core/ports/GpsAvailabilityReader.port";

// "Available" means both: permission granted (requested lazily on first check, matching
// NotificationsProvider's own fire-and-forget permission request) and the OS location service
// itself is turned on.
async function checkAvailability(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  const granted =
    current.status === Location.PermissionStatus.GRANTED
      ? true
      : (await Location.requestForegroundPermissionsAsync()).status === Location.PermissionStatus.GRANTED;
  if (!granted) return false;
  return Location.hasServicesEnabledAsync();
}

export class ExpoGpsAvailabilityAdapter implements GpsAvailabilityReader {
  async isAvailable(): Promise<Result<boolean, { type: "READ_FAILED" }>> {
    try {
      return ok(await checkAvailability());
    } catch {
      return fail({ type: "READ_FAILED" });
    }
  }

  // expo-location has no "services enabled changed" event, so availability is polled rather
  // than pushed — still reads as real-time at GPS_AVAILABILITY_POLL_INTERVAL_MS, just not
  // event-driven.
  subscribe(onChange: (available: boolean) => void): () => void {
    const interval = setInterval(() => {
      checkAvailability().then(onChange);
    }, GPS_AVAILABILITY_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }
}
