import * as Battery from "expo-battery";
import { Result, ok, fail } from "@/types/Result";
import { BatteryReader } from "../../core/ports/BatteryReader.port";

const BATTERY_LEVEL_TO_PERCENT = 100;

export class ExpoBatteryAdapter implements BatteryReader {
  async getLevelPercent(): Promise<Result<number, { type: "READ_FAILED" }>> {
    const level = await Battery.getBatteryLevelAsync();
    // expo-battery returns -1 when the level genuinely can't be read (e.g. simulator).
    if (level < 0) return fail({ type: "READ_FAILED" });
    return ok(Math.round(level * BATTERY_LEVEL_TO_PERCENT));
  }

  subscribe(onChange: (percent: number) => void): () => void {
    const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      onChange(Math.round(batteryLevel * BATTERY_LEVEL_TO_PERCENT));
    });
    return () => subscription.remove();
  }
}
