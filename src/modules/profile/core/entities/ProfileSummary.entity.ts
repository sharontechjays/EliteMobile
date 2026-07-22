export interface ProfileNotification {
  id: string;
  title: string;
  body: string;
}

export interface ProfileSummary {
  crewLeaderName: string;
  employeeCode: string;
  device: string;
  branch: string;
  language: string;
  lastSyncLabel: string;
  notifications: ProfileNotification[];
}
