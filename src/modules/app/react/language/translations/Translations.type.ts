// The canonical shape every language dictionary must satisfy — one namespace per screen/module,
// mirroring this app's module boundaries (src/modules/<name>), plus a few cross-cutting
// namespaces (`common`, `topBar`, `notifyOfficePanel`) for copy shared across more than one
// screen. Functions are used wherever the original copy interpolates a value (a name, a count,
// a formatted timer) — the function's non-translatable arguments (proper nouns, numbers,
// already-formatted values) are passed in by the caller, never translated themselves.
export interface Translations {
  common: {
    cancel: string;
    save: string;
    continue: string;
    // Shared identically by Home and Ticket Detail's job timer label.
    jobTimeLabel: string;
    jobTimeLabelOverEstimate: string;
    directionIn: string;
    directionOut: string;
  };

  topBar: {
    synced: string;
    pending: (count: number) => string;
    notificationsA11yLabel: string;
  };

  notifyOfficePanel: {
    title: string;
    otherButton: string;
    placeholder: string;
    cancelButton: string;
    sendButton: string;
    quickRunningLate: string;
    quickEquipmentIssue: string;
    quickNeedMaterials: string;
    quickWeatherDelay: string;
  };

  mapPreview: {
    openInMaps: string;
    badge: string;
  };

  splash: {
    tagline: string;
    loading: string;
    lastSync: (label: string) => string;
    checkingSync: string;
    notYetSynced: string;
    continueButton: string;
  };

  deviceRegistration: {
    title: string;
    subtitle: string;
    deviceInfoLabel: string;
    nicknameLabel: string;
    modelLabel: string;
    appVersionLabel: string;
    nicknamePlaceholder: string;
    registerButton: string;
    securingButton: string;
    retryButton: string;
    stepSecuredTitle: string;
    stepSecuringBody: string;
    stepSecureFailedBody: string;
    stepSecureHardwareBody: string;
    stepSecureSoftwareBody: string;
    stepRegisteredTitle: string;
    stepRegisteredBody: string;
    stepApprovalTitle: string;
    stepApprovalBody: string;
    pendingTitle: string;
    pendingSubtitle: string;
    demoApproveButton: string;
    approvedText: string;
    continueButton: string;
    unknownDevice: string;
    unknownVersion: string;
  };

  signIn: {
    title: string;
    deviceVerified: string;
    employeeCodeLabel: string;
  };

  home: {
    daySectionLabel: string;
    clockSectionLabel: string;
    clockButtonLabel: string;
    jobSectionLabel: string;
    batteryTitle: (percent: number) => string;
    batteryBody: string;
    gpsTitle: string;
    gpsBody: string;
    travellingButton: string;
    startTravelButton: string;
    stopButton: string;
    pausedButton: string;
    startButton: string;
    travelChipTitle: (timerValue: string) => string;
    travelChipHint: string;
    bannerOutTitle: string;
    bannerOutBody: string;
    bannerInTitle: string;
    bannerInBody: string;
    bannerTravelTitle: string;
    bannerTravelBody: string;
    bannerJobTitle: string;
    bannerJobBody: string;
    bannerLunchTitle: string;
    bannerLunchBody: string;
    locationLabel: string;
    startTimeLabel: string;
    endTimeLabel: string;
  };

  roster: {
    headerLabel: string;
    title: string;
    subtitle: string;
    addWorkerButton: string;
    cancelRequestButton: string;
    searchPlaceholder: string;
    noMatches: string;
    busyWith: (assignedTo: string) => string;
    addLink: string;
    pendingApproval: string;
    selectedLabelIn: (count: number) => string;
    selectedLabelOut: (count: number) => string;
    bulkLabelIn: string;
    bulkLabelOut: string;
    workerAddedTitle: (name: string) => string;
    workerAddedBody: string;
  };

  attestation: {
    headerLabel: string;
    workerOf: (position: number, total: number, name: string) => string;
    confirmClockingPrefix: string;
    gpsCaptured: string;
    deviceVerified: string;
    deviceLine: string;
    codeSectionLabel: string;
    codeMismatch: (name: string) => string;
    codeHelper: (name: string) => string;
    clockInButton: string;
    clockOutButton: string;
    doneKey: string;
  };

  ticketDetail: {
    headerLabel: string;
    crewLabel: string;
    startJobButton: string;
    stopJobButton: string;
    pauseForMealButton: string;
    mealComingUpTitle: string;
    mealComingUpBody: string;
    startMealButton: string;
    mealActiveTitle: string;
    endMealButton: string;
    mealDoneTitle: (value: string) => string;
    mealDoneBody: string;
    continueJobButton: string;
    notesButton: string;
    notNowButton: string;
    jobCompleteSameSiteTitle: string;
    jobCompleteSameSiteBody: string;
    continueNextJobButton: string;
    jobCompleteTravelTitle: string;
    jobCompleteTravelBody: string;
    startTravelButton: string;
    mealBreakStartedTitle: string;
    mealBreakStartedBody: string;
    mealBreakLoggedTitle: string;
    mealBreakLoggedBody: (value: string) => string;
    attachmentsLabel: string;
    attachPhotoButton: string;
    attachVideoButton: string;
    attachmentErrorNoActiveTicket: string;
    attachmentErrorPermissionDenied: string;
    attachmentErrorGeneric: string;
    attachmentErrorOpenSettingsButton: string;
    mediaPreviewCloseButton: string;
  };

  ticketsList: {
    title: string;
  };

  travel: {
    headerLabel: string;
    title: string;
    running: string;
    travelDone: (value: string) => string;
    travelLogged: string;
    startJobButton: string;
    startTravelButton: string;
    stopTravelButton: string;
    endTravelArrivedButton: string;
    fromTo: (from: string, to: string) => string;
    footerBody: string;
    travelDoneNotifTitle: string;
    travelDoneNotifBody: (value: string) => string;
  };

  timesheet: {
    title: string;
    progressLabel: (done: number, total: number) => string;
    totalLabel: string;
    ackLabel: string;
    disputeLabel: string;
    disputePlaceholder: string;
    disputeSubmit: string;
    allDoneBanner: string;
    submitButton: string;
    submittingButton: string;
    ackedTitle: (name: string) => string;
    ackedNextBody: (name: string) => string;
    ackedAllDoneBody: string;
    disputeRecordedTitle: string;
    disputeRecordedBody: (name: string, reason: string) => string;
    incompleteTitle: string;
    incompleteBody: (count: number) => string;
  };

  notes: {
    headerLabel: string;
    ticketLabel: (ticketName: string) => string;
    extraWorkLabel: string;
    extraWorkHint: string;
    notesPlaceholder: string;
    savingButton: string;
    saveQueuedButton: string;
    addMediaTitle: string;
    takePhotoOption: string;
    recordVideoOption: string;
    attachmentErrorPermissionDenied: string;
    attachmentErrorGeneric: string;
    attachmentErrorOpenSettingsButton: string;
    mediaPreviewCloseButton: string;
  };

  syncQueue: {
    headerLabel: string;
    title: string;
    queuedLabel: string;
    cachedNote: string;
    syncNowButton: string;
    syncingButton: string;
    fixButton: string;
  };

  profile: {
    settingsSectionLabel: string;
    employeeCodeLabel: string;
    deviceLabel: string;
    languageLabel: string;
    lastSyncLabel: string;
    notificationsSectionLabel: string;
    noNotifications: string;
    signOutButton: string;
    signOutConfirmTitle: string;
    signOutConfirmBody: string;
    signOutConfirmCancel: string;
    signOutConfirmDestructive: string;
  };

  notifications: {
    clockInFirstTitle: string;
    clockInFirstJobBody: string;
    clockInFirstTravelBody: string;
    officeNotifiedTitle: string;
    officeNotifiedBody: (message: string) => string;
  };

  // Descriptive mock-data fragments consumed by the InMemory* adapters (not screens/viewModels
  // directly) — status phrases, button labels, and other language-bearing content that stands
  // in for what a real backend would already return in the user's language. Proper nouns (worker
  // names, job-site names, street addresses, employee/device codes) are intentionally NOT part of
  // this dictionary — they aren't linguistic content, so nothing here attempts to "translate"
  // them.
  mockData: {
    homeDateLabel: string;
    homeNotStarted: string;
    homeStartButton: string;
    yardEntryName: string;
    trainingEntryName: string;
    shopEntryName: string;
    yardLocation: string;
    shopLocation: string;
    rosterWorkerStatusJob: string;
    rosterWorkerStatusTravel: string;
    rosterWorkerStatusIdle: string;
    rosterWorkerStatusOff: string;
    syncClockIn: (name: string) => string;
    syncPhoto: (count: number, place: string) => string;
    syncNote: string;
    syncRejectedOverlap: (name: string) => string;
    ticketJobSiteEstimate: (hours: string) => string;
    ticketYardEstimate: (hours: string) => string;
    ticketStatusInProgress: string;
    ticketStatusNotStarted: string;
    timesheetClockIn: string;
    timesheetClockOut: string;
    timesheetLunch: string;
    timesheetTravel: string;
    profileMealReminderTitle: string;
    profileMealReminderBody: string;
    profileSecondJobsiteTitle: string;
    profileSecondJobsiteBody: (place: string) => string;
    notesSeedText: string;
  };
}
