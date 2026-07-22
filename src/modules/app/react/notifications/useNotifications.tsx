import { useContext } from "react";
import { NotificationsContext } from "./NotificationsProvider";

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
};
