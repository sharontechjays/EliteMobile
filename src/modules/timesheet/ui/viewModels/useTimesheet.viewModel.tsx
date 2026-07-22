import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { useLanguage } from "@app/react/language/useLanguage";
import { colors } from "@/ui/theme/colors";
import { GetDailyTimesheetUseCase } from "../../core/usecases/GetDailyTimesheet.usecase";
import { CrewMemberTimesheet, DailyTimesheet, TimesheetEntry } from "../../core/entities/TimesheetEntry.entity";

const STATUS_KIND_COLOR: Record<TimesheetEntry["statusKind"], string> = {
  job: colors.job,
  travel: colors.travel,
  idle: colors.idle,
  off: colors.off,
  neutral: colors.faint,
};

interface UseTimesheetViewModelArgs {
  onSubmitted: () => void;
}

export const useTimesheetViewModel = ({ onSubmitted }: UseTimesheetViewModelArgs) => {
  const { timesheetReader } = useDependencies();
  const { push } = useNotifications();
  const { strings } = useLanguage();
  const t = strings.timesheet;
  const mock = strings.mockData;
  const [timesheet, setTimesheet] = useState<DailyTimesheet | null>(null);
  const [idx, setIdx] = useState(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await new GetDailyTimesheetUseCase(timesheetReader).execute();
    if (result.success) setTimesheet(result.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const crew = timesheet?.crew ?? [];
  const pending = idx < crew.length;
  const allDone = !pending;
  const current: CrewMemberTimesheet | null = crew[Math.min(idx, crew.length - 1)] ?? null;

  // entry.label is mock English content (see InMemoryTimesheet.adapter.ts's own comment) for
  // the "neutral"/"idle"/"travel" entries — "job" entries are real ticket names (proper nouns)
  // and pass through unchanged. Clock-in vs. clock-out share the "neutral" statusKind in the
  // mock data, so position (first vs. last entry) is what actually distinguishes them here —
  // true for every worker in the current fixed mock dataset.
  const entries = current?.entries ?? [];
  const rows = entries.map((entry, index) => {
    let label = entry.label;
    if (entry.statusKind === "neutral") label = index === 0 ? mock.timesheetClockIn : mock.timesheetClockOut;
    else if (entry.statusKind === "idle") label = mock.timesheetLunch;
    else if (entry.statusKind === "travel") label = mock.timesheetTravel;
    return {
      id: `${entry.time}-${index}`,
      time: entry.time,
      label,
      dotColor: STATUS_KIND_COLOR[entry.statusKind],
    };
  });

  const advance = (worker: CrewMemberTimesheet, nextIdx: number) => {
    setIdx(nextIdx);
    setReason("");
    const nextWorker = crew[nextIdx];
    push({
      icon: "✓",
      title: t.ackedTitle(worker.name),
      body: nextWorker ? t.ackedNextBody(nextWorker.name) : t.ackedAllDoneBody,
    });
  };

  const onAck = useCallback(() => {
    if (!pending || !current) return;
    advance(current, idx + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, current, idx, crew]);

  const onDispute = useCallback(() => {
    if (!pending || !current || !reason.trim()) return;
    setIdx(idx + 1);
    setReason("");
    push({ icon: "!", title: t.disputeRecordedTitle, body: t.disputeRecordedBody(current.name, reason.trim()) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, current, idx, reason, t]);

  const onSubmit = async () => {
    if (submitting) return;
    if (pending) {
      push({ icon: "!", title: t.incompleteTitle, body: t.incompleteBody(crew.length - idx) });
      return;
    }
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setSubmitting(false);
    onSubmitted();
  };

  return {
    state: {
      workerName: current?.name ?? "",
      progressLabel: t.progressLabel(Math.min(idx, crew.length), crew.length),
      pending,
      allDone,
      reason,
      rows,
      totalHoursLabel: current?.totalHoursLabel ?? "",
      submitting,
      refreshing,
    },
    handlers: { onAck, onDispute, onChangeReason: setReason, onSubmit, onRefresh },
  };
};
