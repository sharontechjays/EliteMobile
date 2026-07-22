import { useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { Translations } from "@app/react/language/translations/Translations.type";
import { GetProfileSummaryUseCase } from "../../core/usecases/GetProfileSummary.usecase";
import { GetDeviceRegistrationUseCase } from "@modules/deviceRegistration/core/usecases/GetDeviceRegistration.usecase";
import { ProfileSummary } from "../../core/entities/ProfileSummary.entity";

// A language's own name doesn't change depending on which language the rest of the UI is
// currently in (English is always "English", Spanish is always "Español") — so this is a fixed
// lookup, not part of the translation dictionary.
const LANGUAGE_DISPLAY_NAME = { EN: "English", ES: "Español" } as const;

// The mock adapter's notifications (see InMemoryProfile.adapter.ts's own comment) are keyed by
// a fixed id — the real translated title/body is derived here from that id.
const NOTIFICATION_TEXT: Record<string, (mock: Translations["mockData"]) => { title: string; body: string }> = {
  "1": (mock) => ({ title: mock.profileMealReminderTitle, body: mock.profileMealReminderBody }),
  "2": (mock) => ({ title: mock.profileSecondJobsiteTitle, body: mock.profileSecondJobsiteBody("Cornerstone Mall") }),
};

export const useProfileViewModel = () => {
  const { profileReader, deviceRegistrar } = useDependencies();
  const { language, strings } = useLanguage();
  const mock = strings.mockData;
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      new GetProfileSummaryUseCase(profileReader).execute(),
      new GetDeviceRegistrationUseCase(deviceRegistrar).execute(),
    ]).then(([profileResult, registrationResult]) => {
      if (cancelled || !profileResult.success) return;
      const registration = registrationResult.success ? registrationResult.data : null;
      setProfile(registration ? { ...profileResult.data, device: registration.deviceName } : profileResult.data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translatedProfile = profile
    ? {
        ...profile,
        language: LANGUAGE_DISPLAY_NAME[language],
        notifications: profile.notifications.map((notif) => ({
          ...notif,
          ...(NOTIFICATION_TEXT[notif.id]?.(mock) ?? { title: notif.title, body: notif.body }),
        })),
      }
    : null;

  return { state: { profile: translatedProfile } };
};
