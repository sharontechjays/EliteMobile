import { AttestationWorker } from "@modules/clock/core/entities/AttestationWorker.entity";

// Router params are URL-safe strings; the attestation queue is a same-session, one-shot object
// hand-off between Roster and Attestation, not deep-linkable state, so a module-scoped variable
// is simpler and safer than serializing a worker array through the URL.
let queue: AttestationWorker[] = [];

export function setAttestationQueue(next: AttestationWorker[]) {
  queue = next;
}

export function getAttestationQueue(): AttestationWorker[] {
  return queue;
}
