import { Translations } from "./Translations.type";

// Terminology glossary — kept consistent across every namespace below so the same concept
// always reads the same way no matter which screen it appears on:
//   Clock in / Clock out  → Marcar entrada / Marcar salida (verb); Entrada / Salida (as a bare direction word)
//   Job                   → Trabajo
//   Job ticket            → Orden de trabajo
//   Travel time           → Tiempo de viaje
//   Crew / Roster         → Cuadrilla
//   Timesheet             → Hoja de horas
//   Meal break            → Descanso para comer
//   Sync Queue            → Cola de sincronización
//   Device                → Dispositivo
//   Employee code         → Código de empleado
//   Sign in / Sign out    → Iniciar sesión / Cerrar sesión
//   Notify office         → Avisar a la oficina
//   Attestation           → Confirmación
export const es: Translations = {
  common: {
    cancel: "Cancelar",
    save: "Guardar",
    continue: "Continuar",
    jobTimeLabel: "Tiempo de trabajo",
    jobTimeLabelOverEstimate: "Tiempo de trabajo · supera lo estimado",
    directionIn: "ENTRADA",
    directionOut: "SALIDA",
  },

  topBar: {
    synced: "● Sincronizado",
    pending: (count) => `▲ ${count} pendiente(s)`,
    notificationsA11yLabel: "Notificaciones",
  },

  notifyOfficePanel: {
    title: "Avisar a la oficina",
    otherButton: "✎ Otro…",
    placeholder: "Mensaje para la oficina…",
    cancelButton: "Cancelar",
    sendButton: "Enviar a la oficina",
    quickRunningLate: "Vamos con retraso",
    quickEquipmentIssue: "Problema con el equipo",
    quickNeedMaterials: "Necesitamos materiales",
    quickWeatherDelay: "Retraso por el clima",
  },

  mapPreview: {
    openInMaps: "Abrir en Maps →",
    badge: "vista previa del mapa",
  },

  splash: {
    tagline: "Registro de tiempo y trabajos en campo",
    loading: "Cargando el trabajo de hoy…",
    lastSync: (label) => `Última sincronización: ${label} · Idioma definido por el perfil del empleado`,
    checkingSync: "Comprobando última sincronización…",
    notYetSynced: "Aún no sincronizado",
    continueButton: "Continuar",
  },

  deviceRegistration: {
    title: "Configuración del dispositivo",
    subtitle:
      "Primer inicio en este dispositivo — debe registrarse y ser aprobado antes de que alguien pueda iniciar sesión o marcar horas.",
    deviceInfoLabel: "Este dispositivo",
    nicknameLabel: "Apodo",
    modelLabel: "Modelo",
    appVersionLabel: "Versión de la app",
    nicknamePlaceholder: "p. ej. Sucursal 3 – Dispositivo 2",
    registerButton: "Registrar este dispositivo",
    securingButton: "Protegiendo dispositivo…",
    retryButton: "Reintentar protección del dispositivo",
    stepSecuredTitle: "Dispositivo protegido",
    stepSecuringBody: "Generando una clave de hardware para este dispositivo…",
    stepSecureFailedBody: "No se pudo proteger este dispositivo — desliza para reintentar",
    stepSecureHardwareBody: "Identificado de forma única con una clave del Secure Enclave",
    stepSecureSoftwareBody: "Identificado de forma única con una clave por software",
    stepRegisteredTitle: "Registro enviado",
    stepRegisteredBody: "Datos del dispositivo enviados para aprobación",
    stepApprovalTitle: "Aprobación del gerente de cuenta",
    stepApprovalBody: "Aprobado desde la oficina",
    pendingTitle: "Esperando la aprobación del gerente de cuenta",
    pendingSubtitle: "El inicio de sesión se habilita cuando la oficina apruebe este dispositivo.",
    demoApproveButton: "Demo: el gerente de cuenta aprueba",
    approvedText: "Dispositivo aprobado — listo para iniciar sesión",
    continueButton: "Continuar a iniciar sesión",
    unknownDevice: "Dispositivo desconocido",
    unknownVersion: "Desconocida",
  },

  signIn: {
    title: "Iniciar sesión",
    deviceVerified: "Dispositivo verificado",
    employeeCodeLabel: "Código de empleado",
  },

  home: {
    daySectionLabel: "Horario del día — patio y capacitación",
    clockSectionLabel: "Marcar entrada / salida",
    clockButtonLabel: "Marcar entrada / salida",
    jobSectionLabel: "Orden de trabajo",
    batteryTitle: (percent) => `Batería baja — ${percent}%`,
    batteryBody: "Conecta el dispositivo para mantener el GPS y la geolocalización activos.",
    gpsTitle: "GPS no disponible",
    gpsBody:
      "La ubicación está apagada o sin señal. El viaje y la llegada por geocerca no se registrarán — las marcaciones se guardarán sin GPS.",
    travellingButton: "→ Viajando…",
    startTravelButton: "→ Iniciar viaje",
    stopButton: "■ Detener",
    pausedButton: "❚❚ Pausado",
    startButton: "▶ Iniciar",
    travelChipTitle: (timerValue) => `Tiempo de viaje — ${timerValue}`,
    travelChipHint: "La llegada te marcará la entrada al trabajo automáticamente",
    bannerOutTitle: "Buenos días — listos para empezar",
    bannerOutBody: "Marca la entrada de la cuadrilla y luego inicia el viaje al salir del patio",
    bannerInTitle: "Cuadrilla con la entrada marcada",
    bannerInBody: "Inicia el tiempo de viaje al salir del patio",
    bannerTravelTitle: "Cuadrilla en tiempo de viaje",
    bannerTravelBody:
      "La llegada termina el viaje y marca la entrada de la cuadrilla a la orden de trabajo — sin espacios",
    bannerJobTitle: "Cuadrilla en el trabajo",
    bannerJobBody: "El tiempo de trabajo está corriendo — deténlo cuando la cuadrilla salga del sitio",
    bannerLunchTitle: "Cuadrilla en el almuerzo",
    bannerLunchBody: "Los tiempos de trabajo y viaje están en pausa hasta que termine el descanso",
    locationLabel: "Ubicación",
    startTimeLabel: "Hora de inicio",
    endTimeLabel: "Hora de fin",
  },

  roster: {
    headerLabel: "Cuadrilla",
    title: "¿Quién está marcando?",
    subtitle:
      "Selecciona miembros de la cuadrilla, o marca a todos a la vez. Cada trabajador confirma con su propia atestación.",
    addWorkerButton: "+ Agregar trabajador",
    cancelRequestButton: "Cancelar",
    searchPlaceholder: "Buscar por nombre…",
    noMatches: "Sin resultados.",
    busyWith: (assignedTo) => `Con ${assignedTo} — no se puede agregar`,
    addLink: "Agregar",
    pendingApproval: "Aprobación pendiente",
    selectedLabelIn: (count) => `Marcar entrada de seleccionados (${count})`,
    selectedLabelOut: (count) => `Marcar salida de seleccionados (${count})`,
    bulkLabelIn: "Marcar entrada de todos",
    bulkLabelOut: "Marcar salida de todos",
    workerAddedTitle: (name) => `${name} agregado`,
    workerAddedBody: "Pendiente de aprobación del supervisor.",
  },

  attestation: {
    headerLabel: "Confirmación individual",
    workerOf: (position, total, name) => `Trabajador ${position} de ${total} — entrega el dispositivo a ${name}`,
    confirmClockingPrefix: "Confirmo que estoy marcando",
    gpsCaptured: "GPS capturado ✓",
    deviceVerified: "Dispositivo verificado ✓",
    deviceLine: "Dispositivo de cuadrilla #CL-0482 · registrado a esta cuadrilla",
    codeSectionLabel: "Ingresa tu código de empleado",
    codeMismatch: (name) => `El código no coincide con ${name} — intenta de nuevo`,
    codeHelper: (name) =>
      `Solo ${name} conoce este código — comprueba que la persona correcta esté confirmando esta marcación.`,
    clockInButton: "✓ Marcar entrada",
    clockOutButton: "■ Marcar salida",
    doneKey: "Listo",
  },

  ticketDetail: {
    headerLabel: "Detalle de la orden",
    crewLabel: "Cuadrilla en este trabajo",
    startJobButton: "▶ Iniciar trabajo",
    stopJobButton: "■ Detener trabajo",
    pauseForMealButton: "❚❚ Pausar para el descanso",
    mealComingUpTitle: "◔ Se acerca el descanso para comer",
    mealComingUpBody: "La cuadrilla lleva más de 4h trabajando — inicia el descanso ahora.",
    startMealButton: "◔ Iniciar descanso",
    mealActiveTitle: "◔ Descanso para comer — cronómetros en pausa",
    endMealButton: "■ Terminar descanso",
    mealDoneTitle: (value) => `✓ Descanso registrado — ${value}`,
    mealDoneBody: "El tiempo de trabajo sigue en pausa. Continúa cuando la cuadrilla regrese al trabajo.",
    continueJobButton: "▶ Continuar trabajo",
    notesButton: "Notas / Foto",
    notNowButton: "Ahora no",
    jobCompleteSameSiteTitle: "Trabajo terminado — el próximo está aquí",
    jobCompleteSameSiteBody: "El próximo trabajo está en el mismo sitio — no se necesita viaje. Inícialo directamente.",
    continueNextJobButton: "Continuar con el próximo trabajo",
    jobCompleteTravelTitle: "Trabajo terminado — ¿iniciar viaje?",
    jobCompleteTravelBody: "El próximo trabajo está en otro sitio. Inicia el tiempo de viaje al salir la cuadrilla.",
    startTravelButton: "Iniciar viaje",
    mealBreakStartedTitle: "Descanso para comer iniciado",
    mealBreakStartedBody: "El tiempo de trabajo está en pausa hasta que termine el descanso.",
    mealBreakLoggedTitle: "Descanso registrado",
    mealBreakLoggedBody: (value) => `${value} registrado.`,
    attachmentsLabel: "Fotos y videos",
    attachPhotoButton: "Foto",
    attachVideoButton: "Video",
    attachmentErrorNoActiveTicket: "Abre un trabajo antes de adjuntar contenido multimedia.",
    attachmentErrorPermissionDenied:
      "El acceso a la cámara está desactivado para Elite Mobile — actívalo en Ajustes para adjuntar contenido multimedia.",
    attachmentErrorGeneric: "No se pudo adjuntar ese contenido. Inténtalo de nuevo.",
    attachmentErrorOpenSettingsButton: "Abrir Ajustes",
    mediaPreviewCloseButton: "Cerrar",
  },

  ticketsList: {
    title: "Órdenes de hoy",
  },

  travel: {
    headerLabel: "Tiempo de viaje",
    title: "Tiempo de viaje",
    running: "En curso",
    travelDone: (value) => `✓ Viaje terminado — ${value}`,
    travelLogged: "Tiempo de viaje registrado",
    startJobButton: "▶ Iniciar trabajo",
    startTravelButton: "▶ Iniciar viaje",
    stopTravelButton: "■ Detener viaje",
    endTravelArrivedButton: "■ Terminar viaje — Llegué",
    fromTo: (from, to) => `de: ${from} · a: ${to}`,
    footerBody:
      "El viaje comienza después de marcar la entrada por la mañana, al salir la cuadrilla del patio. Confirmar la llegada termina el viaje y marca la entrada de la cuadrilla directamente a la orden de trabajo — un registro de horas continuo, sin espacios.",
    travelDoneNotifTitle: "Viaje terminado",
    travelDoneNotifBody: (value) => `${value} registrado.`,
  },

  timesheet: {
    title: "Hoja de horas diaria",
    progressLabel: (done, total) => `${done} de ${total} completado(s)`,
    totalLabel: "Total · sin espacios ✓",
    ackLabel: "Confirmo que estas horas son correctas",
    disputeLabel: "No confirmo — dinos por qué",
    disputePlaceholder: "p. ej. Falta tiempo de viaje después del almuerzo…",
    disputeSubmit: "Enviar motivo y continuar",
    allDoneBanner: "Toda la cuadrilla ha respondido. Envía para la aprobación del supervisor.",
    submitButton: "Enviar",
    submittingButton: "Enviando…",
    ackedTitle: (name) => `${name} confirmó`,
    ackedNextBody: (name) => `Siguiente: ${name}`,
    ackedAllDoneBody: "Toda la cuadrilla respondió — listo para enviar",
    disputeRecordedTitle: "Desacuerdo registrado",
    disputeRecordedBody: (name, reason) => `${name}: ${reason}`,
    incompleteTitle: "Confirmaciones incompletas",
    incompleteBody: (count) => `${count} miembro(s) de la cuadrilla aún deben responder`,
  },

  notes: {
    headerLabel: "Notas y fotos",
    ticketLabel: (ticketName) => `Orden: ${ticketName}`,
    extraWorkLabel: "Marcar como trabajo EXTRA",
    extraWorkHint: "Se envía al supervisor para revisión de la orden de trabajo",
    notesPlaceholder: "Agregar una nota…",
    savingButton: "Guardando…",
    saveQueuedButton: "Guardar (en cola)",
    addMediaTitle: "Agregar contenido multimedia",
    takePhotoOption: "Tomar foto",
    recordVideoOption: "Grabar video",
    attachmentErrorPermissionDenied:
      "El acceso a la cámara está desactivado para Elite Mobile — actívalo en Ajustes para adjuntar contenido multimedia.",
    attachmentErrorGeneric: "No se pudo adjuntar ese contenido. Inténtalo de nuevo.",
    attachmentErrorOpenSettingsButton: "Abrir Ajustes",
    mediaPreviewCloseButton: "Cerrar",
  },

  syncQueue: {
    headerLabel: "Cola de sincronización",
    title: "Pendiente de sincronizar",
    queuedLabel: "en cola",
    cachedNote: "En caché: horario, cuadrilla ✓",
    syncNowButton: "Sincronizar ahora",
    syncingButton: "Sincronizando…",
    fixButton: "Corregir",
  },

  profile: {
    settingsSectionLabel: "Perfil y ajustes",
    employeeCodeLabel: "Código de empleado",
    deviceLabel: "Dispositivo",
    languageLabel: "Idioma",
    lastSyncLabel: "Última sincronización",
    notificationsSectionLabel: "Notificaciones recientes",
    noNotifications: "Aún no hay notificaciones.",
    signOutButton: "Entregar turno / Cerrar sesión",
    signOutConfirmTitle: "¿Entregar turno / Cerrar sesión?",
    signOutConfirmBody: "Deberás volver a iniciar sesión con tu código de empleado para continuar.",
    signOutConfirmCancel: "Cancelar",
    signOutConfirmDestructive: "Cerrar sesión",
  },

  notifications: {
    clockInFirstTitle: "Marca tu entrada primero",
    clockInFirstJobBody:
      "Cada trabajador debe marcar su propia entrada antes de iniciar el viaje o el trabajo (ley de CA).",
    clockInFirstTravelBody: "Cada trabajador debe marcar su propia entrada antes de iniciar el viaje (ley de CA)",
    officeNotifiedTitle: "Oficina avisada",
    officeNotifiedBody: (message) => `"${message}" enviado a la oficina con tu ubicación y cuadrilla.`,
  },

  mockData: {
    homeDateLabel: "mar. 23 jun.",
    homeNotStarted: "No iniciado",
    homeStartButton: "▶ Iniciar",
    yardEntryName: "Preparación de patio",
    trainingEntryName: "Capacitación de seguridad",
    shopEntryName: "Tiempo de taller",
    yardLocation: "Patio",
    shopLocation: "Taller",
    rosterWorkerStatusJob: "Entrada marcada — Trabajo 1",
    rosterWorkerStatusTravel: "En viaje",
    rosterWorkerStatusIdle: "Sin marcar entrada",
    rosterWorkerStatusOff: "Libre hoy",
    syncClockIn: (name) => `Entrada — ${name}`,
    syncPhoto: (count, place) => `Foto ×${count} — ${place}`,
    syncNote: "Nota (trabajo extra)",
    syncRejectedOverlap: (name) => `✗ Rechazado — marcaciones superpuestas, ${name}`,
    ticketJobSiteEstimate: (hours) => `Sitio de trabajo · aprox. ${hours}h`,
    ticketYardEstimate: (hours) => `Patio · aprox. ${hours}h`,
    ticketStatusInProgress: "En curso",
    ticketStatusNotStarted: "No iniciado",
    timesheetClockIn: "Entrada",
    timesheetClockOut: "Salida",
    timesheetLunch: "Almuerzo",
    timesheetTravel: "Viaje",
    profileMealReminderTitle: "Recordatorio de descanso para comer",
    profileMealReminderBody: "4 horas trabajadas — recuerda a la cuadrilla tomar su almuerzo.",
    profileSecondJobsiteTitle: "Segundo sitio de trabajo",
    profileSecondJobsiteBody: (place) => `Llegó a ${place} — confirma la entrada.`,
    notesSeedText: "Cabezal de aspersor roto cerca de la entrada oeste",
  },
};
