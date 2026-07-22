const { withEntitlementsPlist } = require("@expo/config-plugins");

// expo-notifications autolinks its own config plugin (not listed in app.config.ts's `plugins`
// array at all) which unconditionally adds `aps-environment` to the entitlements — but this app
// only uses expo-notifications for local, on-device notifications (see
// NotificationsProvider.tsx's scheduleNotificationAsync), never real APNs push, and doesn't
// need the entitlement. Worse, the free/automatic personal-team provisioning profile used for
// device builds doesn't support the Push Notifications capability at all, so leaving the
// entitlement in place fails every device build with a provisioning-profile mismatch. This
// plugin runs after autolinking (it's listed last in `plugins`) and strips it back out.
function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    return config;
  });
}

module.exports = withoutPushEntitlement;
