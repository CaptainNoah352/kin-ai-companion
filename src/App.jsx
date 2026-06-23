import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Home,
  Leaf,
  LifeBuoy,
  Lock,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Plus,
  Router,
  Shield,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MetricRing } from "./components/MetricRing.jsx";
import { appendAuditEvent } from "./lib/auditLog.js";
import { listStoredKinData, readStorage, storageKeys, writeStorage } from "./lib/storage.js";
import { AiCoachChat } from "./features/aiCoach/AiCoachChat.jsx";
import {
  appSpaceIds,
  appSpaceMeta,
  buildAppBridgeContext,
  createDefaultAppSpaceTabs,
  normalizeAppSpace,
} from "./features/appSpaces/appSpaceService.js";
import { DailyCheckIn } from "./features/checkins/DailyCheckIn.jsx";
import { getCheckInRecommendation, getLatestCheckIn } from "./features/checkins/checkInService.js";
import { GoalsCenter } from "./features/goals/GoalsCenter.jsx";
import { InterventionRunner } from "./features/interventions/InterventionRunner.jsx";
import { getInterventionById } from "./features/interventions/interventionService.js";
import { JournalCenter } from "./features/journal/JournalCenter.jsx";
import { MemoryCenter } from "./features/memory/MemoryCenter.jsx";
import { addMemorySummary, createDefaultMemory } from "./features/memory/memoryService.js";
import {
  createAppLock,
  createDefaultAppLock,
  isInCooldown,
  recordFailedUnlock,
  recordSuccessfulUnlock,
  verifyAppLockPasscode,
} from "./features/privacy/appLockService.js";
import { deleteAllKinData, deleteJournalOnly, deleteMentalHealthContent } from "./features/privacy/dataDeletion.js";
import { PrivacyCenter } from "./features/privacy/PrivacyCenter.jsx";
import { PrivacyLockScreen } from "./features/privacy/PrivacyLockScreen.jsx";
import { buildTrendSummary } from "./features/progress/trendUtils.js";
import { ProgressDashboard } from "./features/progress/ProgressDashboard.jsx";
import { WeeklyReview } from "./features/review/WeeklyReview.jsx";
import { SafetyFlow } from "./features/safety/SafetyFlow.jsx";
import { classifyAndStoreSafety } from "./features/safety/safetyLogger.js";
import { SafetyPlan } from "./features/safety/SafetyPlan.jsx";
import { SOSButton } from "./features/safety/SOSButton.jsx";
import { ProductionReadinessChecklist } from "./features/setup/ProductionReadinessChecklist.jsx";
import { SetupChecklist } from "./features/setup/SetupChecklist.jsx";
import { GoogleLoginGate } from "./features/sync/GoogleLoginGate.jsx";
import { StartCenter } from "./features/start/StartCenter.jsx";
import { deleteDriveVault, downloadDriveVault, findDriveVault, uploadDriveVault } from "./features/sync/driveVaultService.js";
import { requestDriveAccessToken } from "./features/sync/googleAuthService.js";
import { SyncCenter } from "./features/sync/SyncCenter.jsx";
import {
  createDefaultTrustedVaultUnlock,
  forgetTrustedVaultUnlock,
  getTrustedVaultUnlockStatus,
  readTrustedVaultPasscode,
  rememberTrustedVaultUnlock,
} from "./features/sync/trustedVaultUnlockService.js";
import { createEncryptedVault, openEncryptedVault } from "./features/sync/vaultCryptoService.js";
import {
  buildVaultPayload,
  createVaultContentSignature,
  createDefaultDriveSync,
  createDefaultUserOpenRouter,
  detectVaultConflict,
  readLocalEncryptedVault,
  redactUserOpenRouter,
  restoreKinDataFromVault,
  writeLocalEncryptedVault,
} from "./features/sync/vaultDataService.js";
import { downloadJson } from "./features/privacy/dataExport.js";
import "./styles.css";

const appLockSessionKey = "kin.v2.appLock.unlockedAt";
const googleDriveTokenSessionKey = "kin.v2.googleDrive.accessToken";
const autoSyncDebounceMs = 5000;

const wellnessNavItems = [
  { id: "Home", label: "Home", icon: Home },
  { id: "Chat", label: "Chat", icon: MessageCircle },
  { id: "Journal", label: "Journal", icon: PenLine },
  { id: "Tools", label: "Tools", icon: Wrench },
  { id: "Progress", label: "Progress", icon: BarChart3 },
];

const adhdNavItems = [
  { id: "Home", label: "Home", icon: Home },
  { id: "Chat", label: "Coach", icon: Brain },
  { id: "Goals", label: "Goals", icon: CheckCircle2 },
  { id: "Start", label: "Start", icon: Plus },
  { id: "Review", label: "Review", icon: BarChart3 },
];

const utilityNavItems = [
  { id: "Check In", label: "Check In", icon: Activity },
  { id: "Memory", label: "Memory", icon: UserRound },
  { id: "Safety", label: "Safety", icon: Shield },
  { id: "Privacy", label: "Privacy / Sync", icon: Lock },
];

const phoneUtilityNavItems = [
  ...utilityNavItems,
  { id: "Privacy", label: "Remote", icon: Router, navKey: "Remote" },
];

const appSpaceNavItems = {
  [appSpaceIds.wellness]: wellnessNavItems,
  [appSpaceIds.adhd]: adhdNavItems,
};

const defaultConsent = {
  userId: "local-user",
  acceptedTerms: true,
  acceptedPrivacyPolicy: true,
  aiDisclosureAccepted: true,
  allowPersonalization: true,
  allowAnalytics: false,
  allowModelTraining: false,
  allowCrisisContactUse: false,
  createdAt: "",
  updatedAt: "",
};

const defaultProfile = {
  id: "local-user",
  ageRange: "",
  region: "US",
  language: "English",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  accessibilityPreferences: {
    reduceMotion: false,
    largeText: false,
    highContrast: false,
    screenReaderOptimized: false,
    simpleLanguage: false,
  },
  createdAt: "",
  updatedAt: "",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Home");
  const [phoneDefaultApplied, setPhoneDefaultApplied] = useState(false);
  const [phoneMoreOpen, setPhoneMoreOpen] = useState(false);
  const [activeAppSpace, setActiveAppSpaceState] = useStoredState(storageKeys.activeAppSpace, appSpaceIds.wellness);
  const [appSpaceTabs, setAppSpaceTabs] = useStoredState(storageKeys.appSpaceTabs, createDefaultAppSpaceTabs());
  const [chatMode, setChatMode] = useState("Support");
  const [startSuggestedTask, setStartSuggestedTask] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("grounding-54321");
  const [safetySignal, setSafetySignal] = useState(null);
  const [apiMode, setApiMode] = useState("checking");
  const [consent, setConsent] = useStoredState(storageKeys.consent, defaultConsent);
  const [profile, setProfile] = useStoredState(storageKeys.profile, defaultProfile);
  const legacyMessages = readStorage(storageKeys.messages, []);
  const [wellnessMessages, setWellnessMessages] = useStoredState(storageKeys.wellnessMessages, legacyMessages);
  const [adhdMessages, setAdhdMessages] = useStoredState(storageKeys.adhdMessages, []);
  const [goals, setGoals] = useStoredState(storageKeys.goals, []);
  const [startSessions, setStartSessions] = useStoredState(storageKeys.startSessions, []);
  const [weeklyReviews, setWeeklyReviews] = useStoredState(storageKeys.weeklyReviews, []);
  const [checkIns, setCheckIns] = useStoredState(storageKeys.checkIns, []);
  const [journalEntries, setJournalEntries] = useStoredState(storageKeys.journal, []);
  const [completedModules, setCompletedModules] = useStoredState(storageKeys.completedModules, []);
  const [moduleDrafts, setModuleDrafts] = useStoredState(storageKeys.moduleDrafts, {});
  const [carePlan, setCarePlan] = useStoredState(storageKeys.carePlan, null);
  const [safetySignals, setSafetySignals] = useStoredState(storageKeys.safetySignals, []);
  const [safetyPlan, setSafetyPlan] = useStoredState(storageKeys.safetyPlan, null);
  const [memory, setMemory] = useStoredState(storageKeys.memory, createDefaultMemory());
  const [appLock, setAppLock] = useStoredState(storageKeys.appLock, createDefaultAppLock());
  const [auditEvents, setAuditEvents] = useStoredState(storageKeys.auditEvents, []);
  const [installHintDismissed, setInstallHintDismissed] = useStoredState(storageKeys.installHintDismissed, false);
  const [googleSession, setGoogleSession] = useStoredState(storageKeys.googleSession, null);
  const [driveSync, setDriveSync] = useStoredState(storageKeys.driveSync, createDefaultDriveSync());
  const [vaultPasscode, setVaultPasscode] = useState("");
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [trustedVaultUnlock, setTrustedVaultUnlock] = useState(createDefaultTrustedVaultUnlock());
  const [userOpenRouter, setUserOpenRouter] = useState(createDefaultUserOpenRouter());
  const [driveAccessToken, setDriveAccessTokenState] = useState(() => readSessionValue(googleDriveTokenSessionKey, ""));
  const [pendingRemoteVault, setPendingRemoteVault] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const installPromptRef = useRef(null);
  const autoSyncTimerRef = useRef(null);
  const autoSyncInFlightRef = useRef(false);
  const lastVaultContentSignatureRef = useRef("");
  const skipNextAutoSyncRef = useRef(false);
  const syncAfterUnlockRef = useRef(false);
  const [canUseNativeInstallPrompt, setCanUseNativeInstallPrompt] = useState(false);
  const [isPrivacyLocked, setIsPrivacyLocked] = useState(() =>
    createDefaultAppLock(readStorage(storageKeys.appLock, createDefaultAppLock())).enabled,
  );

  const latestCheckIn = useMemo(() => getLatestCheckIn(checkIns), [checkIns]);
  const trendSummary = useMemo(() => buildTrendSummary(checkIns, 7), [checkIns]);
  const recommendation = useMemo(() => getCheckInRecommendation(latestCheckIn), [latestCheckIn]);
  const region = profile?.region || "US";
  const normalizedAppLock = useMemo(() => createDefaultAppLock(appLock), [appLock]);
  const isPhoneShell = useMediaQuery("(max-width: 700px)");
  const normalizedAppSpace = normalizeAppSpace(activeAppSpace);
  const activeAppMeta = appSpaceMeta[normalizedAppSpace];
  const navItems = appSpaceNavItems[normalizedAppSpace];
  const messages = normalizedAppSpace === appSpaceIds.adhd ? adhdMessages : wellnessMessages;
  const setMessages = normalizedAppSpace === appSpaceIds.adhd ? setAdhdMessages : setWellnessMessages;
  const combinedMessages = useMemo(
    () => [...(Array.isArray(wellnessMessages) ? wellnessMessages : []), ...(Array.isArray(adhdMessages) ? adhdMessages : [])],
    [wellnessMessages, adhdMessages],
  );
  const bridgeContext = useMemo(
    () =>
      buildAppBridgeContext({
        activeAppSpace: normalizedAppSpace,
        wellnessMessages,
        adhdMessages,
        goals,
        startSessions,
        weeklyReviews,
        checkIns,
        memory,
      }),
    [normalizedAppSpace, wellnessMessages, adhdMessages, goals, startSessions, weeklyReviews, checkIns, memory],
  );

  useEffect(() => {
    if (!isPhoneShell || phoneDefaultApplied) return;
    setActiveAppSpaceState(appSpaceIds.adhd);
    setActiveTab("Chat");
    setPhoneDefaultApplied(true);
  }, [isPhoneShell, phoneDefaultApplied, setActiveAppSpaceState]);

  useEffect(() => {
    let cancelled = false;
    getTrustedVaultUnlockStatus().then((status) => {
      if (!cancelled) setTrustedVaultUnlock(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (userOpenRouter.apiKey) {
      setApiMode("openrouter-user");
      return;
    }
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => setApiMode(data.ai || "demo"))
      .catch(() => setApiMode("offline"));
  }, [userOpenRouter.apiKey]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      installPromptRef.current = event;
      setCanUseNativeInstallPrompt(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (consent.acceptedTerms && consent.acceptedPrivacyPolicy && consent.aiDisclosureAccepted) return;
    setConsent((current) => ({
      ...defaultConsent,
      ...current,
      acceptedTerms: true,
      acceptedPrivacyPolicy: true,
      aiDisclosureAccepted: true,
      updatedAt: new Date().toISOString(),
    }));
  }, [consent.acceptedPrivacyPolicy, consent.acceptedTerms, consent.aiDisclosureAccepted, setConsent]);

  useEffect(() => {
    if (!normalizedAppLock.enabled) {
      setIsPrivacyLocked(false);
      sessionStorage.removeItem(appLockSessionKey);
      return;
    }
    if (!sessionStorage.getItem(appLockSessionKey)) {
      setIsPrivacyLocked(true);
    }
  }, [normalizedAppLock.enabled]);

  useEffect(() => {
    function clearUnlockSession() {
      sessionStorage.removeItem(appLockSessionKey);
    }
    window.addEventListener("beforeunload", clearUnlockSession);
    return () => window.removeEventListener("beforeunload", clearUnlockSession);
  }, []);

  useEffect(() => {
    if (!normalizedAppLock.enabled || isPrivacyLocked || normalizedAppLock.timeoutMinutes === "session") return undefined;

    const timeoutMs = normalizedAppLock.timeoutMinutes * 60 * 1000;
    let idleTimer = null;
    let hiddenTimer = null;

    function lockForIdle() {
      sessionStorage.removeItem(appLockSessionKey);
      setIsPrivacyLocked(true);
    }

    function resetIdleTimer() {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(lockForIdle, timeoutMs);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenTimer = window.setTimeout(lockForIdle, timeoutMs);
        return;
      }
      window.clearTimeout(hiddenTimer);
      resetIdleTimer();
    }

    const activityEvents = ["mousemove", "keydown", "pointerdown", "touchstart", "scroll"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    resetIdleTimer();

    return () => {
      window.clearTimeout(idleTimer);
      window.clearTimeout(hiddenTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [normalizedAppLock, isPrivacyLocked]);

  useEffect(() => {
    if (!googleSession?.email || !vaultUnlocked || !vaultPasscode || pendingRemoteVault) return undefined;
    const normalizedSync = createDefaultDriveSync(driveSync);
    if (!normalizedSync.enabled || !normalizedSync.autoSyncEnabled) return undefined;

    const signature = getVaultContentSignature();
    if (!lastVaultContentSignatureRef.current) {
      lastVaultContentSignatureRef.current = signature;
      return undefined;
    }
    if (skipNextAutoSyncRef.current) {
      skipNextAutoSyncRef.current = false;
      lastVaultContentSignatureRef.current = signature;
      return undefined;
    }
    if (signature === lastVaultContentSignatureRef.current) return undefined;

    window.clearTimeout(autoSyncTimerRef.current);
    setDriveSync((current) => ({
      ...createDefaultDriveSync(current),
      status: "pending-auto-sync",
      error: "",
    }));
    autoSyncTimerRef.current = window.setTimeout(() => {
      void syncVaultWithDrive({ reason: "auto-local-change", localChanged: true, allowTokenPrompt: false });
    }, autoSyncDebounceMs);

    return () => window.clearTimeout(autoSyncTimerRef.current);
  }, [
    consent,
    profile,
    activeAppSpace,
    appSpaceTabs,
    wellnessMessages,
    adhdMessages,
    goals,
    startSessions,
    weeklyReviews,
    checkIns,
    journalEntries,
    completedModules,
    moduleDrafts,
    carePlan,
    safetySignals,
    safetyPlan,
    memory,
    appLock,
    auditEvents,
    installHintDismissed,
    userOpenRouter,
    googleSession?.email,
    vaultUnlocked,
    vaultPasscode,
    driveSync.enabled,
    driveSync.autoSyncEnabled,
    driveAccessToken,
    pendingRemoteVault,
  ]);

  useEffect(() => {
    if (!syncAfterUnlockRef.current || !googleSession?.email || !vaultUnlocked || !vaultPasscode || !driveAccessToken) {
      return undefined;
    }
    syncAfterUnlockRef.current = false;
    const timer = window.setTimeout(() => {
      void syncVaultWithDrive({ reason: "auto-unlock", localChanged: false, allowTokenPrompt: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [googleSession?.email, vaultUnlocked, vaultPasscode, driveAccessToken]);

  useEffect(() => {
    if (!googleSession?.email || vaultUnlocked || isPrivacyLocked || !trustedVaultUnlock.enabled) return undefined;
    const localEnvelope = readLocalEncryptedVault();
    if (!localEnvelope) return undefined;

    let cancelled = false;
    async function autoUnlockTrustedVault() {
      try {
        const passcode = await readTrustedVaultPasscode(googleSession);
        if (!passcode || cancelled) return;
        const payload = await importVaultEnvelope(localEnvelope, passcode);
        if (cancelled) return;
        syncAfterUnlockRef.current = true;
        setVaultPasscode(passcode);
        setVaultUnlocked(true);
        setTrustedVaultUnlock(await getTrustedVaultUnlockStatus());
        setSyncMessage(`Vault unlocked on this trusted device. Last saved ${formatSyncTimestamp(payload.updatedAt)}.`);
        void getDriveAccessToken({ allowTokenPrompt: false, prompt: "" }).catch((tokenError) => {
          setDriveSync((current) => ({
            ...createDefaultDriveSync(current),
            enabled: true,
            status: "needs-google-session",
            error: normalizeDriveSyncError(tokenError),
          }));
          setSyncError("Drive token refresh needed. Tap Sync now.");
        });
      } catch (error) {
        await forgetTrustedVaultUnlock().catch(() => {});
        if (cancelled) return;
        setTrustedVaultUnlock(createDefaultTrustedVaultUnlock());
        setSyncError(error.message || "Remembered vault unlock failed. Enter the vault passcode once.");
      }
    }

    void autoUnlockTrustedVault();
    return () => {
      cancelled = true;
    };
  }, [googleSession?.email, vaultUnlocked, isPrivacyLocked, trustedVaultUnlock.enabled]);

  useEffect(() => {
    if (!googleSession?.email || !vaultUnlocked || !vaultPasscode || pendingRemoteVault) return undefined;
    const normalizedSync = createDefaultDriveSync(driveSync);
    if (!normalizedSync.enabled || !normalizedSync.autoSyncEnabled) return undefined;

    function checkRemote(reason) {
      void syncVaultWithDrive({ reason, localChanged: false, allowTokenPrompt: false });
    }

    function handleVisibilityChange() {
      if (!document.hidden) checkRemote("auto-focus");
    }

    function handleOnline() {
      checkRemote("auto-online");
    }

    const initialTimer = window.setTimeout(() => checkRemote("auto-open"), 2500);
    const interval = window.setInterval(
      () => checkRemote("auto-poll"),
      normalizedSync.autoSyncIntervalSeconds * 1000,
    );
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    googleSession?.email,
    vaultUnlocked,
    vaultPasscode,
    driveSync.enabled,
    driveSync.autoSyncEnabled,
    driveSync.autoSyncIntervalSeconds,
    driveAccessToken,
    pendingRemoteVault,
  ]);

  function openModule(moduleId) {
    if (moduleId === "safety-plan") {
      selectTab("Safety");
      return;
    }
    setSelectedModuleId(moduleId);
    openTabInAppSpace(appSpaceIds.wellness, "Tools");
  }

  function selectTab(tabId) {
    setActiveTab(tabId);
    setAppSpaceTabs((current) => ({
      ...createDefaultAppSpaceTabs(current),
      [normalizedAppSpace]: tabId,
    }));
    setPhoneMoreOpen(false);
  }

  function openTabInAppSpace(spaceId, tabId) {
    const nextSpace = normalizeAppSpace(spaceId);
    setAppSpaceTabs((current) => ({
      ...createDefaultAppSpaceTabs(current),
      [normalizedAppSpace]: activeTab,
      [nextSpace]: tabId,
    }));
    setActiveAppSpaceState(nextSpace);
    setActiveTab(tabId);
    setPhoneMoreOpen(false);
  }

  function switchAppSpace(spaceId) {
    const nextSpace = normalizeAppSpace(spaceId);
    setAppSpaceTabs((current) => ({
      ...createDefaultAppSpaceTabs(current),
      [normalizedAppSpace]: activeTab,
    }));
    setActiveAppSpaceState(nextSpace);
    setActiveTab(createDefaultAppSpaceTabs(appSpaceTabs)[nextSpace] || "Home");
    setPhoneMoreOpen(false);
  }

  function openChatMode(mode = "Support") {
    const nextSpace = ["Focus", "Goals", "Unblock"].includes(mode) ? appSpaceIds.adhd : appSpaceIds.wellness;
    setChatMode(mode);
    openTabInAppSpace(nextSpace, "Chat");
  }

  function openStart(task = "") {
    setStartSuggestedTask(typeof task === "string" ? task : "");
    openTabInAppSpace(appSpaceIds.adhd, "Start");
  }

  function openGoals() {
    openTabInAppSpace(appSpaceIds.adhd, "Goals");
  }

  function openReview() {
    openTabInAppSpace(appSpaceIds.adhd, "Review");
  }

  function handleSafety(input, source = "ai_chat") {
    const { signal, signals } = classifyAndStoreSafety(input, { source, userId: "local-user" }, safetySignals);
    if (signal.level !== "none") {
      setSafetySignals(signals);
      setSafetySignal(signal);
      setAuditEvents((events) =>
        appendAuditEvent(events, "safety_flow_triggered", {
          source,
          category: signal.category,
          level: signal.level,
        }),
      );
    }
    return signal;
  }

  function handleCheckInComplete(checkIn) {
    setCheckIns((current) => [checkIn, ...current]);
    setAuditEvents((events) => appendAuditEvent(events, "check_in_completed", { safetyFlag: checkIn.safetyFlag }));
  }

  function handleModuleComplete(module) {
    setCompletedModules((current) => [module, ...current]);
    setAuditEvents((events) => appendAuditEvent(events, "module_completed", { moduleId: module.moduleId }));
    openTabInAppSpace(appSpaceIds.wellness, "Progress");
  }

  function saveSafetyPlan(plan) {
    setSafetyPlan(plan);
    setAuditEvents((events) =>
      appendAuditEvent(events, "safety_plan_updated", { contactCount: plan.trustedContacts.length }),
    );
  }

  function saveMemorySummary(text) {
    const current = createDefaultMemory(memory);
    const next = addMemorySummary(current, text);
    const saved = next.summaries[0]?.id !== current.summaries[0]?.id;
    if (!saved) return false;

    setMemory(next);
    if (saved) {
      setAuditEvents((events) => appendAuditEvent(events, "memory_summary_saved"));
    }
    return saved;
  }

  const handleGoogleSignIn = useCallback((profile) => {
    const { accessToken, ...session } = profile || {};
    if (accessToken) saveDriveAccessToken(accessToken);
    setGoogleSession(session);
    setAuditEvents((events) => appendAuditEvent(events, "google_sign_in", { email: session.email || "" }));
  }, [setAuditEvents, setGoogleSession]);

  function getCurrentKinDataSnapshot() {
    return {
      consent,
      profile,
      activeAppSpace: normalizedAppSpace,
      appSpaceTabs: createDefaultAppSpaceTabs(appSpaceTabs),
      wellnessMessages,
      adhdMessages,
      goals,
      startSessions,
      weeklyReviews,
      checkIns,
      journal: journalEntries,
      completedModules,
      moduleDrafts,
      carePlan,
      safetySignals,
      safetyPlan,
      memory,
      appLock,
      auditEvents,
      installHintDismissed,
    };
  }

  function getVaultContentSignature(kinData = getCurrentKinDataSnapshot(), nextUserOpenRouter = userOpenRouter) {
    return createVaultContentSignature({
      kinData,
      userOpenRouter: nextUserOpenRouter,
    });
  }

  async function getDriveAccessToken({ allowTokenPrompt = false, prompt = "" } = {}) {
    if (driveAccessToken) return driveAccessToken;
    const sessionToken = readSessionValue(googleDriveTokenSessionKey, "");
    if (sessionToken) {
      setDriveAccessTokenState(sessionToken);
      return sessionToken;
    }
    if (!allowTokenPrompt) {
      throw new Error("Auto sync needs a fresh Google Drive session. Tap Sync now once to refresh access.");
    }
    const accessToken = await requestDriveAccessToken({ prompt });
    saveDriveAccessToken(accessToken);
    return accessToken;
  }

  function saveDriveAccessToken(accessToken) {
    const token = typeof accessToken === "string" ? accessToken : "";
    setDriveAccessTokenState(token);
    writeSessionValue(googleDriveTokenSessionKey, token);
  }

  function rememberVaultSignature(kinData = getCurrentKinDataSnapshot(), nextUserOpenRouter = userOpenRouter) {
    lastVaultContentSignatureRef.current = getVaultContentSignature(kinData, nextUserOpenRouter);
  }

  function applyKinDataFromVault(kinData = {}) {
    restoreKinDataFromVault(kinData);
    setConsent(kinData.consent ?? defaultConsent);
    setProfile(kinData.profile ?? defaultProfile);
    setActiveAppSpaceState(normalizeAppSpace(kinData.activeAppSpace));
    setAppSpaceTabs(createDefaultAppSpaceTabs(kinData.appSpaceTabs));
    setWellnessMessages(kinData.wellnessMessages ?? kinData.messages ?? []);
    setAdhdMessages(kinData.adhdMessages ?? []);
    setGoals(kinData.goals ?? []);
    setStartSessions(kinData.startSessions ?? []);
    setWeeklyReviews(kinData.weeklyReviews ?? []);
    setCheckIns(kinData.checkIns ?? []);
    setJournalEntries(kinData.journal ?? []);
    setCompletedModules(kinData.completedModules ?? []);
    setModuleDrafts(kinData.moduleDrafts ?? {});
    setCarePlan(kinData.carePlan ?? null);
    setSafetySignals(kinData.safetySignals ?? []);
    setSafetyPlan(kinData.safetyPlan ?? null);
    setMemory(createDefaultMemory(kinData.memory));
    setAppLock(kinData.appLock ?? createDefaultAppLock());
    setAuditEvents(kinData.auditEvents ?? []);
    setInstallHintDismissed(Boolean(kinData.installHintDismissed));
  }

  async function persistVault(passcode = vaultPasscode, nextUserOpenRouter = userOpenRouter, kinData = getCurrentKinDataSnapshot()) {
    const syncForPayload = createDefaultDriveSync(driveSync);
    const payload = buildVaultPayload({
      kinData,
      userOpenRouter: nextUserOpenRouter,
      driveSync: syncForPayload,
    });
    const envelope = await createEncryptedVault(payload, passcode);
    writeLocalEncryptedVault(envelope);
    setDriveSync((current) => ({
      ...createDefaultDriveSync({ ...current, deviceId: current?.deviceId || syncForPayload.deviceId }),
      enabled: true,
      lastLocalSnapshotAt: payload.updatedAt,
      status: "local-ready",
      error: "",
    }));
    return { payload, envelope };
  }

  async function importVaultEnvelope(envelope, passcode, remoteMetadata = {}) {
    const payload = await openEncryptedVault(envelope, passcode);
    applyKinDataFromVault(payload.kinData || {});
    setUserOpenRouter(createDefaultUserOpenRouter(payload.userOpenRouter));
    writeLocalEncryptedVault(envelope);
    rememberVaultSignature(payload.kinData || {}, payload.userOpenRouter);
    skipNextAutoSyncRef.current = true;
    const hasRemoteMetadata = Boolean(remoteMetadata.id);
    setDriveSync((current) => ({
      ...createDefaultDriveSync(current),
      enabled: true,
      fileId: remoteMetadata.id || current.fileId || "",
      lastSyncedAt: remoteMetadata.modifiedTime || current.lastSyncedAt || "",
      lastLocalSnapshotAt: payload.updatedAt || current.lastLocalSnapshotAt || "",
      lastRemoteModifiedAt: remoteMetadata.modifiedTime || current.lastRemoteModifiedAt || "",
      status: hasRemoteMetadata ? "synced" : "local-ready",
      error: "",
    }));
    return payload;
  }

  async function syncVaultWithDrive({
    reason = "manual",
    localChanged = false,
    allowTokenPrompt = false,
    showMessages = false,
  } = {}) {
    const autoReason = isAutoSyncReason(reason);
    if (!vaultUnlocked || !vaultPasscode) {
      const message = "Unlock your encrypted vault before syncing.";
      if (!autoReason || showMessages) setSyncError(message);
      return { ok: false, message };
    }
    if (autoSyncInFlightRef.current) {
      return { ok: false, message: "Sync already running." };
    }

    autoSyncInFlightRef.current = true;
    const syncStartedAt = new Date().toISOString();
    const normalizedSync = createDefaultDriveSync(driveSync);
    const currentSignature = getVaultContentSignature();
    const lastKnownSignature = lastVaultContentSignatureRef.current;
    const hasLocalChanges = Boolean(localChanged || (lastKnownSignature && currentSignature !== lastKnownSignature));
    const lastSyncedAt = normalizedSync.lastSyncedAt || normalizedSync.lastRemoteModifiedAt || "";
    const localUpdatedAt = hasLocalChanges
      ? syncStartedAt
      : normalizedSync.lastLocalSnapshotAt || normalizedSync.lastSyncedAt || "";

    setDriveSync((current) => ({
      ...createDefaultDriveSync(current),
      enabled: true,
      status: "syncing",
      error: "",
      lastSyncReason: reason,
    }));
    if (!autoReason || showMessages) {
      setSyncMessage("");
      setSyncError("");
    }

    try {
      const accessToken = await getDriveAccessToken({
        allowTokenPrompt,
        prompt: normalizedSync.fileId ? "" : "consent",
      });
      const remoteVault = await findDriveVault(accessToken);

      if (remoteVault?.id && !lastSyncedAt && !hasLocalChanges) {
        const remoteEnvelope = await downloadDriveVault(accessToken, remoteVault.id);
        const payload = await importVaultEnvelope(remoteEnvelope, vaultPasscode, remoteVault);
        rememberVaultSignature(payload.kinData || {}, payload.userOpenRouter);
        setDriveSync((current) => ({
          ...createDefaultDriveSync(current),
          enabled: true,
          fileId: remoteVault.id,
          lastSyncedAt: remoteVault.modifiedTime || syncStartedAt,
          lastLocalSnapshotAt: payload.updatedAt || current.lastLocalSnapshotAt || "",
          lastRemoteModifiedAt: remoteVault.modifiedTime || syncStartedAt,
          lastAutoSyncAt: syncStartedAt,
          lastAutoPullAt: syncStartedAt,
          lastSyncReason: reason,
          status: "synced",
          error: "",
        }));
        if (!autoReason || showMessages) {
          setSyncMessage(`Drive vault restored. Last saved ${formatSyncTimestamp(payload.updatedAt)}.`);
        }
        return { ok: true, action: "pulled" };
      }

      const remoteState = remoteVault?.id
        ? detectVaultConflict({
            localUpdatedAt,
            lastSyncedAt,
            remoteModifiedAt: remoteVault.modifiedTime || "",
          })
        : normalizedSync.fileId && lastSyncedAt && !hasLocalChanges
          ? "in-sync"
          : "local-newer";

      if (remoteVault?.id && remoteState === "conflict") {
        const remoteEnvelope = await downloadDriveVault(accessToken, remoteVault.id);
        setPendingRemoteVault({ envelope: remoteEnvelope, metadata: remoteVault });
        setDriveSync((current) => ({
          ...createDefaultDriveSync(current),
          enabled: true,
          fileId: remoteVault.id,
          status: "conflict",
          error: "Drive has newer data and this device has local changes. Choose which copy to keep.",
          lastSyncReason: reason,
        }));
        setSyncError("Drive has newer data and this device also changed. Choose Drive copy or this device copy.");
        return { ok: false, action: "conflict" };
      }

      if (remoteVault?.id && remoteState === "remote-newer") {
        const remoteEnvelope = await downloadDriveVault(accessToken, remoteVault.id);
        const payload = await importVaultEnvelope(remoteEnvelope, vaultPasscode, remoteVault);
        rememberVaultSignature(payload.kinData || {}, payload.userOpenRouter);
        setDriveSync((current) => ({
          ...createDefaultDriveSync(current),
          enabled: true,
          fileId: remoteVault.id,
          lastSyncedAt: remoteVault.modifiedTime || syncStartedAt,
          lastLocalSnapshotAt: payload.updatedAt || current.lastLocalSnapshotAt || "",
          lastRemoteModifiedAt: remoteVault.modifiedTime || syncStartedAt,
          lastAutoSyncAt: syncStartedAt,
          lastAutoPullAt: syncStartedAt,
          lastSyncReason: reason,
          status: "synced",
          error: "",
        }));
        if (!autoReason || showMessages) {
          setSyncMessage(`Drive vault restored. Last saved ${formatSyncTimestamp(payload.updatedAt)}.`);
        }
        return { ok: true, action: "pulled" };
      }

      if (remoteState === "local-newer" || !remoteVault?.id) {
        const { envelope } = await persistVault();
        const uploaded = await uploadDriveVault(accessToken, envelope, remoteVault?.id || "");
        rememberVaultSignature();
        setDriveSync((current) => ({
          ...createDefaultDriveSync(current),
          enabled: true,
          fileId: uploaded?.id || remoteVault?.id || current.fileId || "",
          lastSyncedAt: uploaded?.modifiedTime || syncStartedAt,
          lastRemoteModifiedAt: uploaded?.modifiedTime || remoteVault?.modifiedTime || syncStartedAt,
          lastAutoSyncAt: syncStartedAt,
          lastAutoPushAt: syncStartedAt,
          lastSyncReason: reason,
          status: "synced",
          error: "",
        }));
        if (!autoReason || showMessages) {
          setSyncMessage("Encrypted vault synced to your Google Drive app data folder.");
        }
        return { ok: true, action: "pushed" };
      }

      rememberVaultSignature();
      setDriveSync((current) => ({
        ...createDefaultDriveSync(current),
        enabled: true,
        fileId: remoteVault?.id || current.fileId || "",
        lastRemoteModifiedAt: remoteVault?.modifiedTime || current.lastRemoteModifiedAt || "",
        lastAutoSyncAt: syncStartedAt,
        lastSyncReason: reason,
        status: "synced",
        error: "",
      }));
      if (!autoReason || showMessages) {
        setSyncMessage("Encrypted Drive vault is already up to date.");
      }
      return { ok: true, action: "in-sync" };
    } catch (error) {
      const message = normalizeDriveSyncError(error);
      if (isExpiredGoogleTokenError(error)) saveDriveAccessToken("");
      setDriveSync((current) => ({
        ...createDefaultDriveSync(current),
        enabled: true,
        status: message.includes("fresh Google Drive session") ? "needs-google-session" : "error",
        error: message,
        lastSyncReason: reason,
      }));
      if (!autoReason || showMessages) setSyncError(message);
      return { ok: false, message };
    } finally {
      autoSyncInFlightRef.current = false;
    }
  }

  async function handleCreateOrUnlockVault(passcode) {
    setSyncMessage("");
    setSyncError("");
    setPendingRemoteVault(null);
    try {
      const localEnvelope = readLocalEncryptedVault();
      if (localEnvelope) {
        const payload = await importVaultEnvelope(localEnvelope, passcode);
        syncAfterUnlockRef.current = true;
        setVaultPasscode(passcode);
        setVaultUnlocked(true);
        setSyncMessage(`Vault unlocked. Last saved ${formatSyncTimestamp(payload.updatedAt)}.`);
        void getDriveAccessToken({ allowTokenPrompt: true, prompt: "" }).catch((tokenError) => {
          setDriveSync((current) => ({
            ...createDefaultDriveSync(current),
            enabled: true,
            status: "needs-google-session",
            error: normalizeDriveSyncError(tokenError),
          }));
        });
        return { ok: true };
      }

      const accessToken = await getDriveAccessToken({ allowTokenPrompt: true, prompt: "consent" });
      const remoteVault = await findDriveVault(accessToken);
      if (remoteVault?.id) {
        const remoteEnvelope = await downloadDriveVault(accessToken, remoteVault.id);
        const payload = await importVaultEnvelope(remoteEnvelope, passcode, remoteVault);
        setVaultPasscode(passcode);
        setVaultUnlocked(true);
        setSyncMessage(`Drive vault restored. Last saved ${formatSyncTimestamp(payload.updatedAt)}.`);
        return { ok: true };
      }

      const { payload, envelope } = await persistVault(passcode);
      const uploaded = await uploadDriveVault(accessToken, envelope, "");
      setDriveSync((current) => ({
        ...createDefaultDriveSync(current),
        enabled: true,
        fileId: uploaded?.id || current.fileId || "",
        lastSyncedAt: uploaded?.modifiedTime || payload.updatedAt,
        lastLocalSnapshotAt: payload.updatedAt,
        lastRemoteModifiedAt: uploaded?.modifiedTime || payload.updatedAt,
        lastAutoSyncAt: payload.updatedAt,
        lastAutoPushAt: payload.updatedAt,
        lastSyncReason: "vault-created",
        status: "synced",
        error: "",
      }));
      rememberVaultSignature(payload.kinData || {}, payload.userOpenRouter);
      setVaultPasscode(passcode);
      setVaultUnlocked(true);
      setSyncMessage(`New encrypted Drive vault created ${formatSyncTimestamp(payload.updatedAt)}.`);
      return { ok: true };
    } catch (error) {
      const message = error.message || "Vault could not be opened.";
      setSyncError(message);
      return { ok: false, message };
    }
  }

  async function handleRememberTrustedVault() {
    setSyncMessage("");
    setSyncError("");
    if (!vaultUnlocked || !vaultPasscode) {
      setSyncError("Unlock the encrypted vault before remembering this device.");
      return { ok: false, message: "Unlock the encrypted vault before remembering this device." };
    }
    try {
      const status = await rememberTrustedVaultUnlock(vaultPasscode, googleSession);
      setTrustedVaultUnlock(status);
      setSyncMessage("Vault will unlock automatically on this trusted device.");
      return { ok: true };
    } catch (error) {
      const message = error.message || "This device could not remember the vault.";
      setSyncError(message);
      return { ok: false, message };
    }
  }

  async function handleForgetTrustedVault() {
    setSyncMessage("");
    setSyncError("");
    try {
      const status = await forgetTrustedVaultUnlock();
      setTrustedVaultUnlock(status);
      setSyncMessage("Remembered vault unlock removed from this device.");
      return { ok: true };
    } catch (error) {
      const message = error.message || "Remembered vault unlock could not be removed.";
      setSyncError(message);
      return { ok: false, message };
    }
  }

  async function handleSaveOpenRouter(settings) {
    setSyncMessage("");
    setSyncError("");
    const next = createDefaultUserOpenRouter(settings);
    setUserOpenRouter(next);
    try {
      if (vaultUnlocked && vaultPasscode) {
        await persistVault(vaultPasscode, next);
        setSyncMessage("OpenRouter settings were encrypted into this device vault.");
      } else {
        setSyncMessage("Unlock the vault to save OpenRouter settings.");
      }
      return { ok: true };
    } catch (error) {
      const message = error.message || "OpenRouter settings could not be saved.";
      setSyncError(message);
      return { ok: false, message };
    }
  }

  async function handleSyncNow() {
    return syncVaultWithDrive({
      reason: "manual",
      localChanged: false,
      allowTokenPrompt: true,
      showMessages: true,
    });
  }

  async function handleUseDriveCopy() {
    if (!pendingRemoteVault || !vaultPasscode) return;
    setSyncMessage("");
    setSyncError("");
    try {
      const syncedAt = new Date().toISOString();
      const payload = await importVaultEnvelope(pendingRemoteVault.envelope, vaultPasscode, pendingRemoteVault.metadata);
      setDriveSync((current) => ({
        ...createDefaultDriveSync(current),
        lastAutoSyncAt: syncedAt,
        lastAutoPullAt: syncedAt,
        lastSyncReason: "resolve-conflict-use-drive-copy",
        status: "synced",
        error: "",
      }));
      setPendingRemoteVault(null);
      setSyncMessage(`Drive copy restored. Last saved ${formatSyncTimestamp(payload.updatedAt)}.`);
    } catch (error) {
      setSyncError(error.message || "Drive copy could not be opened.");
    }
  }

  async function handleUseThisDevice() {
    if (!pendingRemoteVault || !vaultPasscode) return;
    setSyncMessage("");
    setSyncError("");
    try {
      const accessToken = await getDriveAccessToken({ allowTokenPrompt: true, prompt: "" });
      const { envelope } = await persistVault();
      const uploaded = await uploadDriveVault(accessToken, envelope, pendingRemoteVault.metadata.id);
      rememberVaultSignature();
      setDriveSync((current) => ({
        ...createDefaultDriveSync(current),
        enabled: true,
        fileId: uploaded?.id || pendingRemoteVault.metadata.id,
        lastSyncedAt: uploaded?.modifiedTime || new Date().toISOString(),
        lastRemoteModifiedAt: uploaded?.modifiedTime || new Date().toISOString(),
        lastAutoSyncAt: new Date().toISOString(),
        lastAutoPushAt: new Date().toISOString(),
        lastSyncReason: "resolve-conflict-use-this-device",
        status: "synced",
        error: "",
      }));
      setPendingRemoteVault(null);
      setSyncMessage("This device copy replaced the Drive vault.");
    } catch (error) {
      setSyncError(error.message || "This device copy could not be uploaded.");
    }
  }

  async function handleExportEncryptedBackup() {
    setSyncMessage("");
    setSyncError("");
    if (!vaultUnlocked || !vaultPasscode) {
      setSyncError("Unlock your encrypted vault before exporting a backup.");
      return;
    }
    try {
      const { envelope } = await persistVault();
      downloadJson(`kin-vault-${new Date().toISOString().slice(0, 10)}.enc.json`, envelope);
      setSyncMessage("Encrypted backup downloaded.");
    } catch (error) {
      setSyncError(error.message || "Encrypted backup could not be exported.");
    }
  }

  async function handleImportEncryptedBackup(file) {
    setSyncMessage("");
    setSyncError("");
    if (!file) return;
    if (!vaultUnlocked || !vaultPasscode) {
      setSyncError("Unlock your encrypted vault before importing a backup.");
      return;
    }
    try {
      const envelope = JSON.parse(await file.text());
      const payload = await importVaultEnvelope(envelope, vaultPasscode);
      setPendingRemoteVault(null);
      setSyncMessage(`Encrypted backup imported. Last saved ${formatSyncTimestamp(payload.updatedAt)}.`);
    } catch (error) {
      setSyncError(error.message || "Encrypted backup could not be imported.");
    }
  }

  async function handleDeleteDriveVault() {
    setSyncMessage("");
    setSyncError("");
    if (!driveSync?.fileId) return;
    if (!window.confirm("Delete the encrypted Kin vault from your Google Drive app data folder? Local browser data stays on this device.")) {
      return;
    }
    try {
      const accessToken = await getDriveAccessToken({ allowTokenPrompt: true, prompt: "" });
      await deleteDriveVault(accessToken, driveSync.fileId);
      setDriveSync((current) => ({
        ...createDefaultDriveSync(current),
        enabled: false,
        autoSyncEnabled: false,
        fileId: "",
        lastSyncedAt: "",
        lastRemoteModifiedAt: "",
        lastAutoSyncAt: "",
        lastAutoPushAt: "",
        lastAutoPullAt: "",
        lastSyncReason: "drive-vault-deleted",
        status: "drive-vault-deleted",
        error: "",
      }));
      setPendingRemoteVault(null);
      setSyncMessage("Drive vault deleted. Local data remains on this device.");
    } catch (error) {
      setSyncError(error.message || "Drive vault could not be deleted.");
    }
  }

  function handleDisconnectGoogle() {
    setGoogleSession(null);
    saveDriveAccessToken("");
    setVaultPasscode("");
    setVaultUnlocked(false);
    void forgetTrustedVaultUnlock().then(setTrustedVaultUnlock).catch(() => setTrustedVaultUnlock(createDefaultTrustedVaultUnlock()));
    setPendingRemoteVault(null);
    setUserOpenRouter(createDefaultUserOpenRouter());
    setSyncMessage("");
    setSyncError("");
    window.clearTimeout(autoSyncTimerRef.current);
    lastVaultContentSignatureRef.current = "";
    skipNextAutoSyncRef.current = false;
    syncAfterUnlockRef.current = false;
  }

  function exportData() {
    return {
      ...listStoredKinData(),
      appLock,
      sync: {
        googleSession: googleSession
          ? {
              email: googleSession.email || "",
              name: googleSession.name || "",
              signedInAt: googleSession.signedInAt || "",
            }
          : null,
        driveSync: createDefaultDriveSync(driveSync),
        vaultUnlocked,
        trustedVaultUnlock,
        userOpenRouter: redactUserOpenRouter(userOpenRouter),
      },
      runtime: {
        apiMode,
        currentTab: activeTab,
        activeAppSpace: normalizedAppSpace,
      },
    };
  }

  function deleteJournalAndState() {
    deleteJournalOnly();
    setJournalEntries([]);
    setAuditEvents((events) => appendAuditEvent(events, "data_deleted", { scope: "journal" }));
  }

  function deleteMentalHealthAndState() {
    deleteMentalHealthContent();
    setWellnessMessages([]);
    setAdhdMessages([]);
    setAppSpaceTabs(createDefaultAppSpaceTabs());
    setGoals([]);
    setStartSessions([]);
    setWeeklyReviews([]);
    setCheckIns([]);
    setJournalEntries([]);
    setCompletedModules([]);
    setModuleDrafts({});
    setCarePlan(null);
    setSafetySignals([]);
    setSafetyPlan(null);
    setMemory(createDefaultMemory());
    setVaultPasscode("");
    setVaultUnlocked(false);
    void forgetTrustedVaultUnlock().then(setTrustedVaultUnlock).catch(() => setTrustedVaultUnlock(createDefaultTrustedVaultUnlock()));
    setPendingRemoteVault(null);
    saveDriveAccessToken("");
    lastVaultContentSignatureRef.current = "";
    skipNextAutoSyncRef.current = false;
    syncAfterUnlockRef.current = false;
    window.clearTimeout(autoSyncTimerRef.current);
    setAuditEvents((events) => appendAuditEvent(events, "data_deleted", { scope: "mental_health_content" }));
  }

  function deleteAllAndState() {
    deleteAllKinData();
    setConsent(defaultConsent);
    setProfile(null);
    setActiveAppSpaceState(appSpaceIds.wellness);
    setActiveTab("Home");
    setWellnessMessages([]);
    setAdhdMessages([]);
    setAppSpaceTabs(createDefaultAppSpaceTabs());
    setGoals([]);
    setStartSessions([]);
    setWeeklyReviews([]);
    setCheckIns([]);
    setJournalEntries([]);
    setCompletedModules([]);
    setModuleDrafts({});
    setCarePlan(null);
    setSafetySignals([]);
    setSafetyPlan(null);
    setMemory(createDefaultMemory());
    setAppLock(undefined);
    setInstallHintDismissed(false);
    setGoogleSession(null);
    setDriveSync(createDefaultDriveSync());
    setVaultPasscode("");
    setVaultUnlocked(false);
    void forgetTrustedVaultUnlock().then(setTrustedVaultUnlock).catch(() => setTrustedVaultUnlock(createDefaultTrustedVaultUnlock()));
    setPendingRemoteVault(null);
    setUserOpenRouter(createDefaultUserOpenRouter());
    saveDriveAccessToken("");
    lastVaultContentSignatureRef.current = "";
    skipNextAutoSyncRef.current = false;
    syncAfterUnlockRef.current = false;
    window.clearTimeout(autoSyncTimerRef.current);
    setSyncMessage("");
    setSyncError("");
    setIsPrivacyLocked(false);
    sessionStorage.removeItem(appLockSessionKey);
    setAuditEvents([]);
  }

  async function enableAppLock(passcode) {
    try {
      const nextLock = await createAppLock(passcode, { timeoutMinutes: normalizedAppLock.timeoutMinutes });
      setAppLock(nextLock);
      sessionStorage.setItem(appLockSessionKey, new Date().toISOString());
      setIsPrivacyLocked(false);
      setAuditEvents((events) => appendAuditEvent(events, "app_lock_enabled"));
      return { ok: true, message: "App lock enabled." };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function changeAppLockPasscode(currentPasscode, newPasscode) {
    if (!(await verifyAppLockPasscode(currentPasscode, appLock))) {
      return { ok: false, message: "Current passcode did not match." };
    }
    try {
      const nextLock = await createAppLock(newPasscode, { timeoutMinutes: normalizedAppLock.timeoutMinutes });
      setAppLock({
        ...nextLock,
        createdAt: normalizedAppLock.createdAt || nextLock.createdAt,
      });
      setAuditEvents((events) => appendAuditEvent(events, "app_lock_passcode_changed"));
      return { ok: true, message: "Passcode changed." };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function disableAppLock(passcode) {
    if (!(await verifyAppLockPasscode(passcode, appLock))) {
      return { ok: false, message: "Passcode did not match." };
    }
    setAppLock(createDefaultAppLock());
    setIsPrivacyLocked(false);
    sessionStorage.removeItem(appLockSessionKey);
    setAuditEvents((events) => appendAuditEvent(events, "app_lock_disabled"));
    return { ok: true, message: "App lock disabled." };
  }

  function updateAppLockTimeout(timeoutMinutes) {
    setAppLock((current) => ({
      ...createDefaultAppLock(current),
      timeoutMinutes,
      updatedAt: new Date().toISOString(),
    }));
  }

  function toggleDriveAutoSync(enabled) {
    const now = new Date().toISOString();
    setDriveSync((current) => ({
      ...createDefaultDriveSync(current),
      autoSyncEnabled: Boolean(enabled),
      status: enabled ? "auto-sync-enabled" : "auto-sync-paused",
      error: "",
      lastSyncReason: enabled ? "auto-sync-enabled" : "auto-sync-paused",
      lastAutoSyncAt: enabled ? current?.lastAutoSyncAt || "" : current?.lastAutoSyncAt || "",
      updatedAt: now,
    }));
    setSyncMessage(enabled ? "Auto sync is on." : "Auto sync is paused on this device.");
    setSyncError("");
    if (!enabled) window.clearTimeout(autoSyncTimerRef.current);
  }

  function updateDriveAutoSyncInterval(seconds) {
    setDriveSync((current) => ({
      ...createDefaultDriveSync({
        ...current,
        autoSyncIntervalSeconds: seconds,
      }),
      status: "auto-sync-interval-updated",
      error: "",
      lastSyncReason: "auto-sync-interval-updated",
    }));
    setSyncMessage("Auto sync interval updated.");
    setSyncError("");
  }

  function lockNow() {
    sessionStorage.removeItem(appLockSessionKey);
    setIsPrivacyLocked(true);
  }

  async function installKinOnPhone() {
    const promptEvent = installPromptRef.current;
    if (!promptEvent) return;

    await promptEvent.prompt();
    installPromptRef.current = null;
    setCanUseNativeInstallPrompt(false);
  }

  async function unlockPrivacyLock(passcode) {
    if (isInCooldown(appLock)) {
      return { ok: false, message: "Too many attempts. Try again in a minute." };
    }
    if (await verifyAppLockPasscode(passcode, appLock)) {
      setAppLock((current) => recordSuccessfulUnlock(current));
      sessionStorage.setItem(appLockSessionKey, new Date().toISOString());
      setIsPrivacyLocked(false);
      return { ok: true };
    }
    setAppLock((current) => recordFailedUnlock(current));
    return { ok: false, message: "That passcode did not unlock Kin." };
  }

  if (!googleSession?.email) {
    return <GoogleLoginGate onSignIn={handleGoogleSignIn} />;
  }

  if (normalizedAppLock.enabled && isPrivacyLocked) {
    return (
      <PrivacyLockScreen
        appLock={appLock}
        region={region}
        onUnlock={unlockPrivacyLock}
        onDeleteAll={deleteAllAndState}
      />
    );
  }

  const activeComponent = {
    Home: (
      <HomeView
        latestCheckIn={latestCheckIn}
        trendSummary={trendSummary}
        recommendation={recommendation}
        carePlan={carePlan}
        goals={goals}
        activeAppSpace={normalizedAppSpace}
        onStartCheckIn={() => selectTab("Check In")}
        onOpenChatMode={openChatMode}
        onOpenGoals={openGoals}
        onOpenStart={openStart}
        onOpenReview={openReview}
        onOpenJournal={() => selectTab("Journal")}
        onOpenMemory={() => selectTab("Memory")}
        onOpenTools={() => selectTab("Tools")}
        onOpenProgress={() => selectTab("Progress")}
        onOpenPrivacy={() => selectTab("Privacy")}
        onOpenSafety={() => selectTab("Safety")}
        onOpenModule={openModule}
      />
    ),
    "Check In": (
      <DailyCheckIn latestCheckIn={latestCheckIn} onComplete={handleCheckInComplete} onSafety={handleSafety} />
    ),
    Chat: (
      <AiCoachChat
        messages={messages}
        setMessages={setMessages}
        mood={latestCheckIn?.primaryEmotion || ""}
        latestCheckIn={latestCheckIn}
        memory={memory}
        region={region}
        consent={consent}
        onSafety={handleSafety}
        onOpenModule={openModule}
        onOpenMemory={() => selectTab("Memory")}
        onSaveMemorySummary={saveMemorySummary}
        userOpenRouter={userOpenRouter}
        chatMode={chatMode}
        onChatModeChange={setChatMode}
        activeAppSpace={normalizedAppSpace}
        appTitle={activeAppMeta.chatTitle}
        bridgeContext={bridgeContext}
      />
    ),
    Goals: <GoalsCenter goals={goals} setGoals={setGoals} onOpenChatMode={openChatMode} onOpenStart={openStart} />,
    Start: (
      <StartCenter
        sessions={startSessions}
        setSessions={setStartSessions}
        suggestedTask={startSuggestedTask}
        onOpenChatMode={openChatMode}
      />
    ),
    Review: (
      <WeeklyReview
        goals={goals}
        checkIns={checkIns}
        startSessions={startSessions}
        weeklyReviews={weeklyReviews}
        setWeeklyReviews={setWeeklyReviews}
        onOpenChatMode={openChatMode}
        onOpenGoals={openGoals}
      />
    ),
    Journal: <JournalCenter entries={journalEntries} setEntries={setJournalEntries} />,
    Memory: <MemoryCenter memory={memory} setMemory={setMemory} messages={combinedMessages} />,
    Tools: (
      <InterventionRunner
        selectedModuleId={selectedModuleId}
        onSelectModule={setSelectedModuleId}
        drafts={moduleDrafts}
        setDrafts={setModuleDrafts}
        onComplete={handleModuleComplete}
      />
    ),
    Progress: (
      <ProgressDashboard
        checkIns={checkIns}
        completedModules={completedModules}
        carePlan={carePlan}
        safetySignals={safetySignals}
      />
    ),
    Safety: (
      <SafetyView
        safetySignal={safetySignal}
        region={region}
        safetyPlan={safetyPlan}
        onSavePlan={saveSafetyPlan}
        onClearFlow={() => setSafetySignal(null)}
      />
    ),
    Privacy: (
      <PrivacyCenter
        consent={consent}
        setConsent={setConsent}
        exportData={exportData}
        appLock={appLock}
        onEnableAppLock={enableAppLock}
        onChangeAppLockPasscode={changeAppLockPasscode}
        onDisableAppLock={disableAppLock}
        onLockNow={lockNow}
        onUpdateAppLockTimeout={updateAppLockTimeout}
        onDeleteJournal={deleteJournalAndState}
        onDeleteMentalHealthContent={deleteMentalHealthAndState}
        onDeleteAll={deleteAllAndState}
        setupChecklist={
          <>
            <SetupChecklist
              googleSession={googleSession}
              vaultUnlocked={vaultUnlocked}
              driveSync={driveSync}
              apiMode={apiMode}
              appLock={appLock}
              hasDriveAccessToken={Boolean(driveAccessToken)}
            />
            <ProductionReadinessChecklist
              googleSession={googleSession}
              vaultUnlocked={vaultUnlocked}
              driveSync={driveSync}
              appLock={appLock}
              trustedVaultUnlock={trustedVaultUnlock}
              apiMode={apiMode}
              hasDriveAccessToken={Boolean(driveAccessToken)}
            />
          </>
        }
        syncCenter={
          <SyncCenter
            googleSession={googleSession}
            driveSync={driveSync}
            vaultUnlocked={vaultUnlocked}
            userOpenRouter={userOpenRouter}
            hasDriveAccessToken={Boolean(driveAccessToken)}
            onCreateOrUnlockVault={handleCreateOrUnlockVault}
            onSaveOpenRouter={handleSaveOpenRouter}
            onSyncNow={handleSyncNow}
            onToggleAutoSync={toggleDriveAutoSync}
            onUpdateAutoSyncInterval={updateDriveAutoSyncInterval}
            onExportEncryptedBackup={handleExportEncryptedBackup}
            onImportEncryptedBackup={handleImportEncryptedBackup}
            onDeleteDriveVault={handleDeleteDriveVault}
            onDisconnectGoogle={handleDisconnectGoogle}
            hasConflict={Boolean(pendingRemoteVault)}
            onUseDriveCopy={handleUseDriveCopy}
            onUseThisDevice={handleUseThisDevice}
            trustedVaultUnlock={trustedVaultUnlock}
            onRememberTrustedVault={handleRememberTrustedVault}
            onForgetTrustedVault={handleForgetTrustedVault}
            message={syncMessage}
            error={syncError || driveSync?.error || ""}
          />
        }
      />
    ),
  }[activeTab];

  const visibleComponent = safetySignal && activeTab !== "Safety" ? (
    <SafetyFlow
      signal={safetySignal}
      region={region}
      onClose={() => setSafetySignal(null)}
      onOpenPlan={() => selectTab("Safety")}
    />
  ) : (
    activeComponent
  );

  if (isPhoneShell) {
    const showInstallHint = shouldShowPhoneInstallHint({ dismissed: installHintDismissed });
    return (
      <main className={`phone-shell phone-shell--${slugify(activeTab)}`}>
        <header className="phone-header">
          <div className="phone-brand">
            <Leaf size={23} />
            <span>
              <strong>Kin {activeAppMeta.shortLabel}</strong>
              <small>{activeTab}</small>
            </span>
          </div>
          <div className="phone-header-actions">
            <AppSpaceSwitcher activeAppSpace={normalizedAppSpace} onSwitch={switchAppSpace} compact />
            <ApiStatusBadge mode={apiMode} />
            <button
              className={phoneMoreOpen ? "phone-wellness-button active" : "phone-wellness-button"}
              type="button"
              onClick={() => setPhoneMoreOpen((open) => !open)}
            >
              <MoreHorizontal size={17} />
              <span>More</span>
            </button>
            <SOSButton compact onClick={() => selectTab("Safety")} />
          </div>
        </header>

        <section className="phone-content">
          {showInstallHint && (
            <PhoneInstallHint
              canUseNativeInstallPrompt={canUseNativeInstallPrompt}
              onInstall={installKinOnPhone}
              onDismiss={() => setInstallHintDismissed(true)}
            />
          )}
          {visibleComponent}
        </section>

        {phoneMoreOpen && (
          <section className="phone-more-panel" aria-label="Shared tools">
            <div className="phone-more-heading">
              <strong>Shared tools</strong>
              <button type="button" onClick={() => setPhoneMoreOpen(false)} aria-label="Close shared tools">
                <X size={16} />
              </button>
            </div>
            <div className="phone-more-grid">
              {phoneUtilityNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={activeTab === item.id && !item.navKey ? "phone-more-item active" : "phone-more-item"}
                    type="button"
                    key={item.navKey || item.id}
                    onClick={() => selectTab(item.id)}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <nav className="phone-bottom-nav" aria-label="Phone navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeTab === item.id ? "phone-nav-item active" : "phone-nav-item"}
                type="button"
                key={item.id}
                onClick={() => selectTab(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </main>
    );
  }

  return (
    <main className={activeTab === "Home" ? "app-shell" : "app-shell app-shell--focused"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={28} />
          </div>
          <div>
            <h1>Kin</h1>
            <p>{activeAppMeta.label}</p>
          </div>
        </div>

        <AppSpaceSwitcher activeAppSpace={normalizedAppSpace} onSwitch={switchAppSpace} />

        <nav className="nav-list" aria-label={`${activeAppMeta.label} navigation`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeTab === item.id ? "nav-item active" : "nav-item"}
                type="button"
                key={item.id}
                onClick={() => selectTab(item.id)}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="nav-section-label">Shared tools</div>
        <nav className="nav-list nav-list--utility" aria-label="Shared tools">
          {utilityNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeTab === item.id ? "nav-item active" : "nav-item"}
                type="button"
                key={item.navKey || item.id}
                onClick={() => selectTab(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <SOSButton onClick={() => selectTab("Safety")} />

        <section className="mode-card">
          <Sparkles size={18} />
          <div>
            <strong>{apiStatusLabel(apiMode)}</strong>
            <p>{apiStatusCopy(apiMode)}</p>
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{activeTab === "Chat" ? activeAppMeta.chatTitle : activeTab}</h1>
            <p>{formatToday()} - This app does not diagnose or replace professional care.</p>
          </div>
          <div className="topbar-actions">
            <button className="global-start-button" type="button" onClick={() => openStart()}>
              <Plus size={16} />
              Start
            </button>
            <ApiStatusBadge mode={apiMode} />
            <SOSButton compact onClick={() => selectTab("Safety")} />
          </div>
        </header>

        {safetySignal && activeTab !== "Safety" ? (
          <SafetyFlow
            signal={safetySignal}
            region={region}
            onClose={() => setSafetySignal(null)}
            onOpenPlan={() => selectTab("Safety")}
          />
        ) : (
          activeComponent
        )}
      </section>

      {activeTab === "Home" && (
        <RightRail
          latestCheckIn={latestCheckIn}
          consent={consent}
          recommendation={recommendation}
          onOpenModule={openModule}
          onOpenPrivacy={() => selectTab("Privacy")}
          onOpenSafety={() => selectTab("Safety")}
        />
      )}
    </main>
  );
}

function AppSpaceSwitcher({ activeAppSpace, onSwitch, compact = false }) {
  const spaces = [
    { id: appSpaceIds.wellness, label: compact ? "Well" : "Wellness", icon: Leaf },
    { id: appSpaceIds.adhd, label: compact ? "ADHD" : "ADHD / Focus", icon: Brain },
  ];

  return (
    <div className={compact ? "app-space-switcher app-space-switcher--compact" : "app-space-switcher"} role="tablist" aria-label="Kin app space">
      {spaces.map((space) => {
        const Icon = space.icon;
        return (
          <button
            type="button"
            role="tab"
            aria-selected={activeAppSpace === space.id}
            className={activeAppSpace === space.id ? "app-space-tab active" : "app-space-tab"}
            key={space.id}
            onClick={() => onSwitch(space.id)}
          >
            <Icon size={15} />
            <span>{space.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HomeView({
  latestCheckIn,
  trendSummary,
  recommendation,
  carePlan,
  goals,
  activeAppSpace = appSpaceIds.wellness,
  onStartCheckIn,
  onOpenChatMode,
  onOpenGoals,
  onOpenStart,
  onOpenReview,
  onOpenJournal,
  onOpenMemory,
  onOpenTools,
  onOpenProgress,
  onOpenPrivacy,
  onOpenSafety,
  onOpenModule,
}) {
  const suggested = getInterventionById(recommendation.moduleIds[0]) || getInterventionById("grounding-54321");
  const activeGoalCount = (Array.isArray(goals) ? goals : []).filter(
    (goal) => goal?.status !== "done" && goal?.status !== "archived",
  ).length;
  const isAdhd = activeAppSpace === appSpaceIds.adhd;

  return (
    <section className="home-grid home-grid--unified">
      <article className="hero-card hero-card--compact">
        <div>
          <h2>{isAdhd ? "What needs a start?" : "How are you feeling?"}</h2>
          <p>
            {isAdhd
              ? "Use ADHD / Focus for tiny starts, no-shame recovery, body doubling, goals, and planning."
              : "Use Wellness for emotions, grounding, journaling, and coping tools."}
          </p>
          <div className="button-row">
            <button className="primary-button primary-button--auto" type="button" onClick={() => onOpenChatMode(isAdhd ? "Focus" : "Support")}>
              {isAdhd ? <Brain size={16} /> : <MessageCircle size={16} />}
              {isAdhd ? "Open Coach" : "Open Chat"}
            </button>
            <button className="secondary-button secondary-button--auto" type="button" onClick={isAdhd ? () => onOpenStart("") : onStartCheckIn}>
              {isAdhd ? <Plus size={16} /> : <Activity size={16} />}
              {isAdhd ? "Start now" : "Check in"}
            </button>
          </div>
        </div>
        {isAdhd ? <Brain className="hero-leaf" size={92} aria-hidden="true" /> : <Leaf className="hero-leaf" size={92} aria-hidden="true" />}
      </article>

      <section className="home-action-grid" aria-label="Home actions">
        {isAdhd ? (
          <HomeAction
            icon={Brain}
            title="Focus coach"
            copy="Name the task, lower the friction, and pick one visible action."
            action="Coach"
            onClick={() => onOpenChatMode("Focus")}
          />
        ) : (
          <HomeAction
            icon={MessageCircle}
            title="How are you feeling?"
            copy={latestCheckIn ? `Last check-in: ${latestCheckIn.primaryEmotion || "logged"}` : "Talk, check in, or get support."}
            action="Support"
            onClick={() => onOpenChatMode("Support")}
          />
        )}
        <HomeAction
          icon={RotateHomeIcon}
          title="What are you avoiding?"
          copy={isAdhd ? "Treat procrastination as a signal, not a character flaw." : "Blend emotional support with an executive-function unblock."}
          action="Unblock"
          onClick={() => onOpenChatMode("Unblock")}
        />
        <HomeAction
          icon={Plus}
          title="Start a 5-minute task"
          copy="Pick the smallest visible action and begin."
          action="Start"
          onClick={() => onOpenStart("")}
        />
        <HomeAction
          icon={CheckCircle2}
          title="Today's tiny steps"
          copy={`${activeGoalCount} active goal${activeGoalCount === 1 ? "" : "s"}. Missed steps get recovery, not shame.`}
          action="Goals"
          onClick={onOpenGoals}
        />
        <HomeAction
          icon={Leaf}
          title="Calm/reset"
          copy="Lower the intensity before solving the whole problem."
          action="Calm"
          onClick={() => onOpenModule("grounding-54321")}
        />
        <HomeAction
          icon={BarChart3}
          title="Weekly review"
          copy="Find patterns and choose one next-week tiny step."
          action="Review"
          onClick={onOpenReview}
        />
      </section>

      <section className="wellness-shortcuts" aria-label="Wellness shortcuts">
        <div className="wellness-shortcuts__heading">
          <h3>{isAdhd ? "Connected Wellness tools" : "Wellness tools"}</h3>
          <p>
            {isAdhd
              ? "ADHD support can use mood, journal, and grounding context when pressure or shame is part of the block."
              : "Check in, journal, track patterns, and manage privacy without leaving Kin."}
          </p>
        </div>
        <div className="wellness-shortcuts__grid">
          <HomeAction
            icon={Activity}
            title="Check in"
            copy="Log mood, stress, sleep, and safety signals."
            action="Open"
            onClick={onStartCheckIn}
          />
          <HomeAction
            icon={PenLine}
            title="Journal"
            copy="Write private reflections that can sync through your encrypted vault."
            action="Open"
            onClick={onOpenJournal}
          />
          <HomeAction
            icon={Wrench}
            title="Grounding tools"
            copy="Use structured coping tools like breathing and 5-4-3-2-1."
            action="Open"
            onClick={onOpenTools}
          />
          <HomeAction
            icon={BarChart3}
            title="Progress"
            copy="Review check-in trends and completed support tools."
            action="Open"
            onClick={onOpenProgress}
          />
          <HomeAction
            icon={UserRound}
            title="Memory"
            copy="Edit what Kin can remember for personalized support."
            action="Open"
            onClick={onOpenMemory}
          />
          <HomeAction
            icon={Lock}
            title="Privacy / Sync"
            copy="Manage Google Drive vault sync, app lock, export, and delete."
            action="Open"
            onClick={onOpenPrivacy}
          />
        </div>
      </section>

      <article className="coach-preview">
        <Brain size={22} />
        <div>
          <h3>{isAdhd ? "Connected to Wellness" : "Connected to ADHD / Focus"}</h3>
          <p>
            {isAdhd
              ? "If a task is carrying shame, anxiety, or overwhelm, the Coach can bring in Wellness context and still choose one tiny action."
              : "If you are stuck, distracted, or unable to start, Wellness can hand the problem to ADHD / Focus without losing the emotional context."}
          </p>
          <div className="button-row">
            <button className="secondary-button secondary-button--auto" type="button" onClick={() => onOpenChatMode("Focus")}>
              Focus support
            </button>
            <button className="ghost-button" type="button" onClick={() => onOpenStart("")}>
              Start button
            </button>
          </div>
        </div>
      </article>

      <article className="module-card">
        <Wrench size={21} />
        <h3>Suggested tool</h3>
        <p>{recommendation.reason}</p>
        <button type="button" onClick={() => onOpenModule(suggested.id)}>
          Start {suggested.title}
        </button>
      </article>

      <article className="module-card">
        <BookOpen size={21} />
        <h3>Care focus</h3>
        <p>{carePlan?.focusAreas?.map((area) => area.label.replaceAll("_", " ")).join(", ") || "Not set yet"}</p>
        <button type="button" onClick={() => onOpenModule(carePlan?.recommendedModuleIds?.[0] || "grounding-54321")}>
          Update care focus
        </button>
      </article>

      <article className="module-card">
        <BarChart3 size={21} />
        <h3>Progress insight</h3>
        <p>{trendSummary.insight}</p>
        <div className="mini-progress">
          <span>{trendSummary.count} / 7</span>
          <div>
            <i style={{ width: `${Math.min(100, (trendSummary.count / 7) * 100)}%` }} />
          </div>
        </div>
      </article>

      <article className="module-card">
        <Lock size={21} />
        <h3>Privacy and sync</h3>
        <p>Manage Google Drive vault sync, app lock, export, and delete controls.</p>
        <button type="button" onClick={onOpenPrivacy}>
          Open Privacy
        </button>
      </article>

      <article className="module-card">
        <Shield size={21} />
        <h3>Safety support</h3>
        <p>Open crisis resources, safety planning, and SOS support.</p>
        <button type="button" onClick={onOpenSafety}>
          Open Safety
        </button>
      </article>
    </section>
  );
}

function HomeAction({ icon: Icon, title, copy, action, onClick }) {
  return (
    <button className="home-action-row" type="button" onClick={onClick}>
      <span className="home-action-row__icon">
        <Icon size={18} />
      </span>
      <span className="home-action-row__copy">
        <strong>{title}</strong>
        <small>{copy}</small>
      </span>
      <span className="home-action-row__action">{action}</span>
    </button>
  );
}

function RotateHomeIcon(props) {
  return <Wrench {...props} />;
}

function ApiStatusBadge({ mode }) {
  return <span className={`api-status api-status--${mode}`}>{apiStatusLabel(mode)}</span>;
}

function PhoneInstallHint({ canUseNativeInstallPrompt, onInstall, onDismiss }) {
  const guide = getPhoneInstallGuide();

  return (
    <aside className="phone-install-hint" aria-label="Install Kin">
      <div className="phone-install-hint__icon">
        <Leaf size={20} />
      </div>
      <div className="phone-install-hint__copy">
        <strong>Add Kin to your Home Screen</strong>
        <p>{guide}</p>
      </div>
      {canUseNativeInstallPrompt && (
        <button className="phone-install-hint__install" type="button" onClick={onInstall}>
          <Plus size={16} />
          Install
        </button>
      )}
      <button className="phone-install-hint__close" type="button" onClick={onDismiss} aria-label="Dismiss install hint">
        <X size={17} />
      </button>
    </aside>
  );
}

function shouldShowPhoneInstallHint({ dismissed }) {
  if (dismissed) return false;
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return false;
  if (window.navigator?.standalone) return false;
  return true;
}

function getPhoneInstallGuide() {
  if (typeof navigator === "undefined") return "Use your browser menu to add Kin to your Home Screen.";
  const userAgent = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "iPhone: tap Share, then Add to Home Screen.";
  }
  return "Android: tap Install app when offered, or use your browser menu.";
}

function apiStatusLabel(mode) {
  const labels = {
    openrouter: "OpenRouter",
    "openrouter-user": "OpenRouter",
    openai: "OpenAI",
    demo: "Demo",
    offline: "Offline",
    checking: "Checking",
  };
  return labels[mode] || "Demo";
}

function apiStatusCopy(mode) {
  const copy = {
    openrouter: "Real AI is connected through OpenRouter.",
    "openrouter-user": "Real AI uses your encrypted OpenRouter key in this browser.",
    openai: "Real AI is connected through OpenAI.",
    demo: "Local constrained fallback is available.",
    offline: "API is offline; local fallback may be limited.",
    checking: "Checking local API status.",
  };
  return copy[mode] || copy.demo;
}

function RightRail({ latestCheckIn, consent, recommendation, onOpenModule, onOpenPrivacy, onOpenSafety }) {
  return (
    <aside className="right-rail">
      <section className="rail-panel">
        <div className="rail-heading">
          <Brain size={20} />
          <h2>About AI support</h2>
        </div>
        <p>AI support, not therapy. This app does not diagnose or replace professional care.</p>
        <strong>Not for emergencies.</strong>
      </section>

      <section className="rail-panel">
        <div className="rail-heading">
          <LifeBuoy size={20} />
          <h2>Crisis resources</h2>
        </div>
        <button className="crisis-call" type="button" onClick={onOpenSafety}>
          988
          <span>Call or text 988 in the U.S.</span>
        </button>
      </section>

      <section className="rail-panel">
        <div className="rail-heading">
          <Lock size={20} />
          <h2>Privacy at a glance</h2>
        </div>
        <p>Model training: {consent.allowModelTraining ? "On" : "Off"}</p>
        <p>Analytics: {consent.allowAnalytics ? "On" : "Off"}</p>
        <button className="ghost-button ghost-button--inline" type="button" onClick={onOpenPrivacy}>
          Manage privacy
        </button>
      </section>

      <section className="rail-panel">
        <div className="rail-heading">
          <SlidersHorizontal size={20} />
          <h2>Latest check-in</h2>
        </div>
        {latestCheckIn ? (
          <div className="ring-grid">
            <MetricRing value={latestCheckIn.moodScore} label="Mood" />
            <MetricRing value={latestCheckIn.stressScore} label="Stress" tone="amber" />
          </div>
        ) : (
          <p>No check-in yet.</p>
        )}
        <button className="ghost-button ghost-button--inline" type="button" onClick={() => onOpenModule(recommendation.moduleIds[0])}>
          Open suggested tool
        </button>
      </section>
    </aside>
  );
}

function SafetyView({ safetySignal, region, safetyPlan, onSavePlan, onClearFlow }) {
  return (
    <div className="safety-view">
      <SafetyFlow signal={safetySignal || { level: "low", category: "none" }} region={region} onClose={onClearFlow} onOpenPlan={() => {}} />
      <SafetyPlan plan={safetyPlan} onSave={onSavePlan} />
    </div>
  );
}

function useStoredState(key, fallback) {
  const [state, setState] = useState(() => readStorage(key, fallback));
  useEffect(() => {
    writeStorage(key, state);
  }, [key, state]);
  return [state, setState];
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    function handleChange() {
      setMatches(media.matches);
    }
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function slugify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatToday() {
  return new Intl.DateTimeFormat([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function formatSyncTimestamp(value) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function isAutoSyncReason(reason) {
  return String(reason || "").startsWith("auto-");
}

function isExpiredGoogleTokenError(error) {
  const message = String(error?.message || error || "");
  return /\b401\b|invalid_token|unauthorized/i.test(message);
}

function normalizeDriveSyncError(error) {
  if (isExpiredGoogleTokenError(error)) {
    return "Google Drive session expired. Tap Sync now once to refresh access.";
  }
  return error?.message || "Google Drive sync did not complete.";
}

function readSessionValue(key, fallback = "") {
  if (typeof sessionStorage === "undefined") return fallback;
  try {
    return sessionStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeSessionValue(key, value) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (value) {
      sessionStorage.setItem(key, value);
      return;
    }
    sessionStorage.removeItem(key);
  } catch {
    // Session storage can be blocked in hardened browser modes; sync still works after a manual token refresh.
  }
}
