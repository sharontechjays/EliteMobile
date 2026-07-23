import { useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { useLanguage } from "@app/react/language/useLanguage";
import { colors } from "@/ui/theme/colors";
import { GetCrewRosterUseCase } from "../../core/usecases/GetCrewRoster.usecase";
import { GetDirectoryUseCase } from "../../core/usecases/GetDirectory.usecase";
import { RosterWorker } from "../../core/entities/RosterWorker.entity";
import { DirectoryWorker } from "../../core/entities/DirectoryWorker.entity";

const STATUS_KIND_COLOR: Record<RosterWorker["statusKind"], string> = {
  job: colors.job,
  travel: colors.travel,
  idle: colors.idle,
  off: colors.off,
};

// Workers already on a job/travel are being clocked OUT; idle/off workers are clocked IN.
const DIRECTION_FOR_STATUS: Record<RosterWorker["statusKind"], "IN" | "OUT"> = {
  job: "OUT",
  travel: "OUT",
  idle: "IN",
  off: "IN",
};

interface ProvisionalWorker {
  id: string;
  name: string;
}

export const useRosterViewModel = () => {
  const { rosterReader } = useDependencies();
  const { push } = useNotifications();
  const { strings } = useLanguage();
  const t = strings.roster;
  const mock = strings.mockData;
  const [workers, setWorkers] = useState<RosterWorker[]>([]);
  const [directory, setDirectory] = useState<DirectoryWorker[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [provisional, setProvisional] = useState<ProvisionalWorker[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestQuery, setRequestQuery] = useState("");

  // The mock adapter's own statusText is language-neutral mock English content (see
  // InMemoryCrewRoster.adapter.ts) — the real translated status is derived here from
  // statusKind, which is the language-neutral field the adapter is meant to be read through.
  const STATUS_KIND_TEXT: Record<RosterWorker["statusKind"], string> = {
    job: mock.rosterWorkerStatusJob,
    travel: mock.rosterWorkerStatusTravel,
    idle: mock.rosterWorkerStatusIdle,
    off: mock.rosterWorkerStatusOff,
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      new GetCrewRosterUseCase(rosterReader).execute(),
      new GetDirectoryUseCase(rosterReader).execute(),
    ]).then(([rosterResult, directoryResult]) => {
      if (cancelled) return;
      if (rosterResult.success) setWorkers(rosterResult.data);
      if (directoryResult.success) setDirectory(directoryResult.data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reads whichever selected worker .find() happens to return first — safe only because
  // toggleWorker below refuses to let a worker of a different direction join the selection in the
  // first place, so every currently-selected worker is guaranteed to share one direction.
  const currentDirection: "IN" | "OUT" | null =
    selectedIds.size === 0
      ? null
      : DIRECTION_FOR_STATUS[workers.find((w) => selectedIds.has(w.id))?.statusKind ?? "idle"];

  const toggleWorker = (id: string) => {
    const worker = workers.find((w) => w.id === id);
    if (!worker) return;
    const direction = DIRECTION_FOR_STATUS[worker.statusKind];
    // Locks multi-select to one direction at a time: once any worker is selected, only workers
    // needing the same direction (or already-selected ones, so they can still be deselected) can
    // be added — you can't bulk clock-in and clock-out in the same batch.
    if (currentDirection !== null && direction !== currentDirection && !selectedIds.has(id)) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows = [
    ...workers.map((worker) => {
      const direction = DIRECTION_FOR_STATUS[worker.statusKind];
      // Mirrors toggleWorker's own guard above (same condition, read-only here) — drives row
      // dimming/disabling in the UI so an ineligible-direction row visibly can't be tapped,
      // rather than being tappable and then silently rejected.
      const eligible = currentDirection === null || direction === currentDirection || selectedIds.has(worker.id);
      return {
        id: worker.id,
        initials: worker.initials,
        name: worker.name,
        statusText: STATUS_KIND_TEXT[worker.statusKind],
        statusColor: STATUS_KIND_COLOR[worker.statusKind],
        selected: selectedIds.has(worker.id),
        eligible,
        pendingApproval: false,
      };
    }),
    ...provisional.map((p) => ({
      id: p.id,
      initials: p.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      name: p.name,
      statusText: t.pendingApproval,
      statusColor: colors.idle,
      selected: false,
      eligible: false,
      pendingApproval: true,
    })),
  ];

  const requestResults =
    requestOpen && requestQuery.trim().length > 0
      ? directory.filter((d) => d.name.toLowerCase().includes(requestQuery.trim().toLowerCase()))
      : [];

  const onAddFromDirectory = (id: string) => {
    const worker = directory.find((d) => d.id === id);
    // Silently refuses a worker already assigned to another crew (worker.assignedTo set) — no
    // error toast, since search results already exclude/gray these out; this guard exists for the
    // case a stale result gets tapped anyway (e.g. the underlying assignment changed mid-search).
    if (!worker || worker.assignedTo) return;
    setProvisional((prev) => [...prev, { id: worker.id, name: worker.name }]);
    setRequestOpen(false);
    setRequestQuery("");
    push({ icon: "＋", title: t.workerAddedTitle(worker.name), body: t.workerAddedBody });
  };

  const buildQueueFor = (ids: string[]) =>
    workers
      .filter((w) => ids.includes(w.id))
      .map((worker) => ({
        id: worker.id,
        name: worker.name,
        initials: worker.initials,
        direction: DIRECTION_FOR_STATUS[worker.statusKind],
        employeeCode: worker.employeeCode,
      }));

  const eligibleSelectedIds = workers.filter((w) => selectedIds.has(w.id)).map((w) => w.id);
  // For a mixed crew (some need IN, some need OUT), the bulk button always defaults to clocking
  // everyone IN rather than OUT — getting a crew clocked in and working is the more time-sensitive
  // action at the start of a shift than clocking a mixed group out.
  const bulkDirection: "IN" | "OUT" = workers.some((w) => DIRECTION_FOR_STATUS[w.statusKind] === "IN") ? "IN" : "OUT";
  const bulkIds = workers.filter((w) => DIRECTION_FOR_STATUS[w.statusKind] === bulkDirection).map((w) => w.id);

  return {
    state: {
      rows,
      selectedCount: selectedIds.size,
      currentDirection,
      eligibleSelectedCount: eligibleSelectedIds.length,
      canClockSelected: eligibleSelectedIds.length > 0,
      selectedLabel:
        currentDirection === "OUT"
          ? t.selectedLabelOut(eligibleSelectedIds.length)
          : t.selectedLabelIn(eligibleSelectedIds.length),
      bulkLabel: bulkDirection === "IN" ? t.bulkLabelIn : t.bulkLabelOut,
      requestOpen,
      requestQuery,
      requestResults,
    },
    handlers: {
      onToggleWorker: toggleWorker,
      onToggleRequest: () => setRequestOpen((prev) => !prev),
      onChangeRequestQuery: setRequestQuery,
      onAddFromDirectory,
      onClockSelected: () => buildQueueFor(eligibleSelectedIds),
      onClockBulk: () => buildQueueFor(bulkIds),
      buildSelectedAttestationQueue: () => buildQueueFor(eligibleSelectedIds),
      buildBulkAttestationQueue: () => buildQueueFor(bulkIds),
    },
  };
};
