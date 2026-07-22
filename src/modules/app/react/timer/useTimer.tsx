import { useContext } from "react";
import { TimerContext } from "./TimerProvider";

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within a TimerProvider");
  return ctx;
};
