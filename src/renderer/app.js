const STORAGE_KEY = "memo-bom-state-v2";
const LEGACY_STORAGE_KEY = "memo-bom-state-v1";
const STATE_VERSION = 8;
const MAX_FLOATING = 5;
const HOVER_DELAY_MS = 200;
const DEFAULT_CYCLE_SHORTCUT = "CommandOrControl+Shift+D";
const DEFAULT_HIDE_SHORTCUT = "CommandOrControl+Shift+F";
const DEFAULT_FONT_SIZE = 15;
const DEFAULT_FONT_FAMILY = "Gulim";
const DEFAULT_LINE_SPACING = 1.5;
const DEFAULT_PANEL_WIDTH = 480;
const DEFAULT_PANEL_HEIGHT = 520;
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 1200;
const MIN_PANEL_HEIGHT = 180;
const MAX_PANEL_HEIGHT = 1400;
const MAX_TITLE_LENGTH = 80;
const DETACH_DRAG_THRESHOLD = 78;
const CHECK_TEXT_PLACEHOLDER = "\u200b";
const HANDLE_TITLE_PREFIX_LENGTH = 5;
const FONT_SIZE_OPTIONS = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32];
const LINE_SPACING_OPTIONS = [1, 1.15, 1.5, 2, 2.5, 3];
const HANDLE_REORDER_THRESHOLD = 8;

const FONT_LABELS = {
  Gulim: "굴림체",
  GulimChe: "굴림체 고정폭",
  Dotum: "돋움",
  DotumChe: "돋움체",
  Batang: "바탕",
  BatangChe: "바탕체",
  Gungsuh: "궁서",
  GungsuhChe: "궁서체",
  "Malgun Gothic": "맑은 고딕",
  "Segoe UI": "Segoe UI"
};

const COLOR_PRESETS = [
  "#fff4b8",
  "#ffd9e8",
  "#ddeaff",
  "#dcf5de",
  "#ffe3c2",
  "#d7f4f0",
  "#e6e9ff",
  "#f7d6c8",
  "#e8f0c9",
  "#f2d9ff",
  "#d9eefc"
];

const defaultShellSettings = {
  dockEdge: "right",
  visibilityMode: "peek",
  edgeAnchor: "middle",
  edgeOffset: 0,
  lengthMode: "long",
  panelWidth: DEFAULT_PANEL_WIDTH,
  panelHeight: DEFAULT_PANEL_HEIGHT,
  cycleShortcut: DEFAULT_CYCLE_SHORTCUT,
  hideShortcut: DEFAULT_HIDE_SHORTCUT,
  anchor: "middle",
  manualYOffset: 0,
  followCursorDisplay: true,
  targetDisplayId: null
};

const defaultMemoDefaults = {
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY,
  lineSpacing: DEFAULT_LINE_SPACING
};

const defaultAppPrefs = {
  showLaunchGuideOnStartup: true,
  startupDefaultApplied: false,
  startupUserChoiceSet: false,
  welcomeMemoApplied: false,
  initialSingleMemoApplied: false
};

function createId() {
  return `memo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createMemo(index = 0, defaults = defaultMemoDefaults) {
  const memoDefaults = normalizeMemoDefaults(defaults);
  return {
    id: createId(),
    title: `메모 ${index + 1}`,
    color: COLOR_PRESETS[index % COLOR_PRESETS.length],
    fontSize: memoDefaults.fontSize,
    fontFamily: memoDefaults.fontFamily,
    lineSpacing: memoDefaults.lineSpacing,
    html: "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createWelcomeMemoHtml(userName) {
  const safeName = escapeHtml(userName || "사용자");
  return `<p>안녕하세요. ${safeName} 님 !</p><p>MEMO BOM에서 간편한 메모생활 되세요 !</p>`;
}

function createDefaultState() {
  const firstMemo = createMemo(0);
  return {
    version: STATE_VERSION,
    activeId: firstMemo.id,
    indexes: [firstMemo],
    floatingIds: [firstMemo.id],
    memoDefaults: { ...defaultMemoDefaults },
    prefs: { ...defaultAppPrefs },
    shell: { ...defaultShellSettings }
  };
}

let state = loadState();
let expanded = false;
let saveTimer = null;
let draggingHandle = false;
let systemFonts = [DEFAULT_FONT_FAMILY, "GulimChe", "Malgun Gothic", "Arial", "Calibri", "Consolas"];
let editorHistory = [];
let editorHistoryIndex = -1;
let applyingHistory = false;
let panelResizeState = null;
let pendingResizeSize = null;
let resizeFrame = null;
let savedEditorRange = null;
let handleDragState = null;
let lastTableCell = null;
let detachedMemoPlacements = new Map();

const appShell = document.getElementById("appShell");
const handleRail = document.getElementById("handleRail");
const activeTitleButton = document.getElementById("activeTitleButton");
const activeTitleInput = document.getElementById("activeTitleInput");
const activeLabel = document.getElementById("activeLabel");
const activeSubtitle = document.getElementById("activeSubtitle");
const allMemosButton = document.getElementById("allMemosButton");
const memoListPanel = document.getElementById("memoListPanel");
const closeMemoListButton = document.getElementById("closeMemoListButton");
const allMemoList = document.getElementById("allMemoList");
const editor = document.getElementById("editor");
const panelResizeGrip = document.getElementById("panelResizeGrip");
const saveStatus = document.getElementById("saveStatus");
const collapseButton = document.getElementById("collapseButton");
const settingsButton = document.getElementById("settingsButton");
const deleteActiveMemoButton = document.getElementById("deleteActiveMemoButton");
const closeSettingsButton = document.getElementById("closeSettingsButton");
const addIndexButton = document.getElementById("addIndexButton");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const clearButton = document.getElementById("clearButton");
const bulletButton = document.getElementById("bulletButton");
const checkButton = document.getElementById("checkButton");
const tableButton = document.getElementById("tableButton");
const tablePicker = document.getElementById("tablePicker");
const tableRowsInput = document.getElementById("tableRowsInput");
const tableColsInput = document.getElementById("tableColsInput");
const insertTableButton = document.getElementById("insertTableButton");
const cancelTableButton = document.getElementById("cancelTableButton");
const tableTools = document.getElementById("tableTools");
const addTableRowButton = document.getElementById("addTableRowButton");
const addTableColButton = document.getElementById("addTableColButton");
const deleteTableRowButton = document.getElementById("deleteTableRowButton");
const deleteTableColButton = document.getElementById("deleteTableColButton");
const mergeTableCellsButton = document.getElementById("mergeTableCellsButton");
const mergeTableDownButton = document.getElementById("mergeTableDownButton");
const splitTableCellButton = document.getElementById("splitTableCellButton");
const tableBorderColorInput = document.getElementById("tableBorderColorInput");
const tableBorderWidthInput = document.getElementById("tableBorderWidthInput");
const tableCellColorInput = document.getElementById("tableCellColorInput");
const tableFillColorInput = document.getElementById("tableFillColorInput");
const clearTableCellColorButton = document.getElementById("clearTableCellColorButton");
const deleteTableButton = document.getElementById("deleteTableButton");
const fontSizeToolbarSelect = document.getElementById("fontSizeToolbarSelect");
const fontFamilyToolbarSelect = document.getElementById("fontFamilyToolbarSelect");
const lineSpacingToolbarSelect = document.getElementById("lineSpacingToolbarSelect");
const displaySelect = document.getElementById("displaySelect");
const dockEdgeSelect = document.getElementById("dockEdgeSelect");
const visibilityModeSelect = document.getElementById("visibilityModeSelect");
const anchorSelect = document.getElementById("anchorSelect");
const lengthSelect = document.getElementById("lengthSelect");
const panelWidthInput = document.getElementById("panelWidthInput");
const panelHeightInput = document.getElementById("panelHeightInput");
const panelPositionInput = document.getElementById("panelPositionInput");
const defaultFontFamilySelect = document.getElementById("defaultFontFamilySelect");
const defaultFontSizeSelect = document.getElementById("defaultFontSizeSelect");
const defaultLineSpacingSelect = document.getElementById("defaultLineSpacingSelect");
const cycleShortcutInput = document.getElementById("cycleShortcutInput");
const hideShortcutInput = document.getElementById("hideShortcutInput");
const startupInput = document.getElementById("startupInput");
const startupGuideInput = document.getElementById("startupGuideInput");
const applySettingsButton = document.getElementById("applySettingsButton");
const settingsStatus = document.getElementById("settingsStatus");
const addSettingsIndexButton = document.getElementById("addSettingsIndexButton");
const indexManagerList = document.getElementById("indexManagerList");
const floatingLimitText = document.getElementById("floatingLimitText");
const exportDataButton = document.getElementById("exportDataButton");
const importDataButton = document.getElementById("importDataButton");
const resetSettingsButton = document.getElementById("resetSettingsButton");
const launchGuide = document.getElementById("launchGuide");
const launchGuideMessage = document.getElementById("launchGuideMessage");
const launchGuideCycle = document.getElementById("launchGuideCycle");
const launchGuideHide = document.getElementById("launchGuideHide");
const hideLaunchGuideInput = document.getElementById("hideLaunchGuideInput");
const launchGuideOpenButton = document.getElementById("launchGuideOpenButton");
const launchGuideSettingsButton = document.getElementById("launchGuideSettingsButton");
const launchGuideBlogButton = document.getElementById("launchGuideBlogButton");
const closeLaunchGuideButton = document.getElementById("closeLaunchGuideButton");
const panel = document.getElementById("panel");
const panelResizeWidthGrip = document.getElementById("panelResizeWidthGrip");
const panelResizeCornerGrip = document.getElementById("panelResizeCornerGrip");

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) return migrateLegacyState(JSON.parse(legacyRaw));
  } catch {
    return createDefaultState();
  }
  return createDefaultState();
}

function migrateLegacyState(raw) {
  if (!raw || !Array.isArray(raw.indexes)) return createDefaultState();

  const indexes = raw.indexes.map((item, index) => ({
    id: createId(),
    title: normalizeMemoTitle(item.title, `메모 ${index + 1}`),
    color: normalizeHexColor(item.color || presetColorFromTheme(item.theme), COLOR_PRESETS[index % COLOR_PRESETS.length]),
    fontSize: normalizeFontSize(item.fontSize),
    fontFamily: normalizeFontFamily(item.fontFamily),
    lineSpacing: normalizeLineSpacing(item.lineSpacing),
    html: typeof item.html === "string" ? item.html : "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  }));

  if (!indexes.length) return createDefaultState();

  const floatingIds = indexes.slice(0, MAX_FLOATING).map((memo) => memo.id);
  const activeIndex = Math.max(0, Math.min(Number(raw.activeIndex) || 0, indexes.length - 1));

  return normalizeState({
    version: STATE_VERSION,
    activeId: indexes[activeIndex]?.id || indexes[0].id,
    indexes,
    floatingIds,
    shell: raw.shell || {}
  });
}

function normalizeState(raw) {
  const fallback = createDefaultState();
  const sourceVersion = Number(raw.version) || 1;
  const indexes = Array.isArray(raw.indexes)
    ? raw.indexes.map((item, index) => ({
        id: typeof item.id === "string" && item.id ? item.id : createId(),
        title: normalizeMemoTitle(item.title, `메모 ${index + 1}`),
        color: normalizeHexColor(item.color, COLOR_PRESETS[index % COLOR_PRESETS.length]),
        fontSize: normalizeFontSize(item.fontSize),
        fontFamily: normalizeStoredFontFamily(item.fontFamily, sourceVersion),
        lineSpacing: normalizeLineSpacing(item.lineSpacing),
        html: typeof item.html === "string" ? item.html : "",
        createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now()
      }))
    : [];

  if (!indexes.length) return fallback;

  const validIds = new Set(indexes.map((memo) => memo.id));
  const floatingIds = Array.isArray(raw.floatingIds)
    ? raw.floatingIds.filter((id, index, arr) => validIds.has(id) && arr.indexOf(id) === index).slice(0, MAX_FLOATING)
    : [];

  if (!floatingIds.length) floatingIds.push(indexes[0].id);

  const shell = normalizeShellSettings(raw.shell || {});

  return {
    version: STATE_VERSION,
    activeId: validIds.has(raw.activeId) ? raw.activeId : floatingIds[0],
    indexes,
    floatingIds,
    memoDefaults: normalizeMemoDefaults(raw.memoDefaults),
    prefs: normalizeAppPrefs(raw.prefs),
    shell
  };
}

function presetColorFromTheme(theme) {
  const legacy = {
    yellow: "#fff4b8",
    pink: "#ffd9e8",
    blue: "#ddeaff",
    green: "#dcf5de"
  };
  return legacy[theme] || "#fff4b8";
}

function normalizeMemoTitle(value, fallback) {
  return typeof value === "string" && value.trim() ? value.slice(0, MAX_TITLE_LENGTH) : fallback;
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  return fallback;
}

function normalizeFontSize(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(Math.round(numeric), 10, 32) : DEFAULT_FONT_SIZE;
}

function normalizeLineSpacing(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LINE_SPACING;
  return Math.round(clamp(numeric, 1, 3) * 100) / 100;
}

function isBrokenFontName(value) {
  return typeof value !== "string" || !value.trim() || /[\uFFFD?]/.test(value);
}

function normalizeFontFamily(value) {
  if (isBrokenFontName(value)) return DEFAULT_FONT_FAMILY;
  return value.trim();
}

function normalizePanelHeight(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(Math.round(numeric), MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT) : DEFAULT_PANEL_HEIGHT;
}

function normalizePanelWidth(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(Math.round(numeric), MIN_PANEL_WIDTH, MAX_PANEL_WIDTH) : DEFAULT_PANEL_WIDTH;
}

function normalizeDockEdge(value) {
  return ["right", "left", "top", "bottom"].includes(value) ? value : defaultShellSettings.dockEdge;
}

function normalizeVisibilityMode(value) {
  return ["peek", "shortcutOnly"].includes(value) ? value : defaultShellSettings.visibilityMode;
}

function normalizeEdgeAnchor(value, legacyAnchor) {
  const legacyMap = { top: "start", middle: "middle", bottom: "end", custom: "custom" };
  const candidate = value || legacyMap[legacyAnchor];
  return ["start", "middle", "end", "custom"].includes(candidate) ? candidate : defaultShellSettings.edgeAnchor;
}

function normalizeEdgeOffset(value, legacyOffset) {
  const numeric = Number(value ?? legacyOffset);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

function normalizeShellSettings(value = {}) {
  const edgeAnchor = normalizeEdgeAnchor(value.edgeAnchor, value.anchor);
  const edgeOffset = normalizeEdgeOffset(value.edgeOffset, value.manualYOffset);
  const anchorAlias = { start: "top", middle: "middle", end: "bottom", custom: "custom" }[edgeAnchor];
  return {
    ...defaultShellSettings,
    ...value,
    dockEdge: normalizeDockEdge(value.dockEdge),
    visibilityMode: normalizeVisibilityMode(value.visibilityMode),
    edgeAnchor,
    edgeOffset,
    anchor: anchorAlias,
    manualYOffset: edgeOffset,
    lengthMode: ["short", "normal", "long", "custom"].includes(value.lengthMode)
      ? value.lengthMode
      : defaultShellSettings.lengthMode,
    panelWidth: normalizePanelWidth(value.panelWidth),
    panelHeight: normalizePanelHeight(value.panelHeight),
    cycleShortcut:
      typeof value.cycleShortcut === "string" && value.cycleShortcut.trim()
        ? value.cycleShortcut.trim()
        : DEFAULT_CYCLE_SHORTCUT,
    hideShortcut:
      typeof value.hideShortcut === "string" && value.hideShortcut.trim()
        ? value.hideShortcut.trim()
        : DEFAULT_HIDE_SHORTCUT,
    followCursorDisplay: value.followCursorDisplay !== false,
    targetDisplayId: typeof value.targetDisplayId === "number" ? value.targetDisplayId : null
  };
}

function normalizeMemoDefaults(value) {
  return {
    fontSize: normalizeFontSize(value?.fontSize),
    fontFamily: normalizeFontFamily(value?.fontFamily),
    lineSpacing: normalizeLineSpacing(value?.lineSpacing)
  };
}

function normalizeAppPrefs(value = {}) {
  return {
    ...defaultAppPrefs,
    ...value,
    showLaunchGuideOnStartup: value.showLaunchGuideOnStartup !== false,
    startupDefaultApplied: Boolean(value.startupDefaultApplied),
    startupUserChoiceSet: Boolean(value.startupUserChoiceSet),
    welcomeMemoApplied: Boolean(value.welcomeMemoApplied),
    initialSingleMemoApplied: Boolean(value.initialSingleMemoApplied)
  };
}

function normalizeStoredFontFamily(value, sourceVersion) {
  const normalized = normalizeFontFamily(value);
  if (sourceVersion < 4) {
    return DEFAULT_FONT_FAMILY;
  }
  return normalized;
}

function fontFamilyCss(value) {
  const family = normalizeFontFamily(value).replace(/["\\]/g, "");
  return [...new Set([family, "Gulim", "Malgun Gothic", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"])]
    .map((font) => (font === "sans-serif" ? font : `"${font}"`))
    .join(", ");
}

function applyCommonTypography() {
  const family = fontFamilyCss(state.memoDefaults?.fontFamily || DEFAULT_FONT_FAMILY);
  document.documentElement.style.setProperty("--common-font-family", family);
}

function syncShellLayoutClasses() {
  const shell = normalizeShellSettings(state.shell);
  state.shell = shell;
  appShell.classList.remove(
    "dock-right",
    "dock-left",
    "dock-top",
    "dock-bottom",
    "visibility-peek",
    "visibility-shortcutOnly"
  );
  appShell.classList.add(`dock-${shell.dockEdge}`, `visibility-${shell.visibilityMode}`);
  appShell.dataset.dockEdge = shell.dockEdge;
  appShell.dataset.visibilityMode = shell.visibilityMode;
  document.documentElement.style.setProperty("--panel-width", `${normalizePanelWidth(shell.panelWidth)}px`);
}

function isHorizontalDock() {
  const edge = normalizeDockEdge(state.shell?.dockEdge);
  return edge === "top" || edge === "bottom";
}

function fontOptionsWithCurrent(currentFont) {
  return [
    ...new Set(
      [DEFAULT_FONT_FAMILY, normalizeFontFamily(currentFont), ...systemFonts.map(normalizeFontFamily)]
        .filter((font) => font && !isBrokenFontName(font))
    )
  ];
}

function populateFontFamilySelect(select, currentFont) {
  const current = normalizeFontFamily(currentFont);
  select.innerHTML = "";
  fontOptionsWithCurrent(current).forEach((font) => {
    const option = document.createElement("option");
    option.value = font;
    option.textContent = FONT_LABELS[font] || font;
    select.appendChild(option);
  });
  select.value = current;
  select.style.fontFamily = "var(--common-font-family)";
}

function populateFontSizeSelect(select, currentSize) {
  const current = normalizeFontSize(currentSize);
  const options = FONT_SIZE_OPTIONS.includes(current)
    ? FONT_SIZE_OPTIONS
    : [...FONT_SIZE_OPTIONS, current].sort((a, b) => a - b);

  select.innerHTML = "";
  options.forEach((size) => {
    const option = document.createElement("option");
    option.value = String(size);
    option.textContent = `${size}px`;
    select.appendChild(option);
  });
  select.value = String(current);
}

function populateLineSpacingSelect(select, currentSpacing) {
  const current = normalizeLineSpacing(currentSpacing);
  const options = LINE_SPACING_OPTIONS.includes(current)
    ? LINE_SPACING_OPTIONS
    : [...LINE_SPACING_OPTIONS, current].sort((a, b) => a - b);

  select.innerHTML = "";
  options.forEach((spacing) => {
    const option = document.createElement("option");
    option.value = String(spacing);
    option.textContent = formatLineSpacing(spacing);
    select.appendChild(option);
  });
  select.value = String(current);
}

function formatLineSpacing(value) {
  const spacing = normalizeLineSpacing(value);
  return Number.isInteger(spacing) ? spacing.toFixed(1) : String(spacing);
}

function displayShortcut(accelerator) {
  const value = typeof accelerator === "string" && accelerator.trim() ? accelerator.trim() : DEFAULT_CYCLE_SHORTCUT;
  return value
    .replaceAll("CommandOrControl", "Ctrl")
    .replaceAll("+", " + ");
}

function syncPanelSizeFields() {
  const isCustom = lengthSelect.value === "custom";
  panelHeightInput.disabled = !isCustom;
  panelHeightInput.value = String(normalizePanelHeight(panelHeightInput.value || state.shell.panelHeight));
  if (panelWidthInput) {
    panelWidthInput.value = String(normalizePanelWidth(panelWidthInput.value || state.shell.panelWidth));
  }
  if (panelPositionInput) {
    const customPosition = anchorSelect.value === "custom";
    panelPositionInput.disabled = !customPosition;
    panelPositionInput.value = String(normalizeEdgeOffset(panelPositionInput.value || state.shell.edgeOffset, 0));
  }
}

async function resizePanelTo(nextSize) {
  const target = typeof nextSize === "object" && nextSize !== null ? nextSize : { height: nextSize };
  const width = normalizePanelWidth(target.width ?? state.shell.panelWidth);
  const height = normalizePanelHeight(target.height ?? state.shell.panelHeight);
  const result = await window.memoEdge.setPanelSize({ width, height });
  state.shell = normalizeShellSettings({
    ...state.shell,
    ...(result.settings || {}),
    lengthMode: result.settings?.lengthMode || "custom",
    panelWidth: normalizePanelWidth(result.settings?.panelWidth || width),
    panelHeight: normalizePanelHeight(result.settings?.panelHeight || height)
  });
  syncShellLayoutClasses();

  lengthSelect.value = state.shell.lengthMode;
  if (panelWidthInput) panelWidthInput.value = String(state.shell.panelWidth);
  panelHeightInput.value = String(state.shell.panelHeight);
  syncPanelSizeFields();
  saveState();
  return state.shell;
}

function queuePanelResize(nextSize) {
  pendingResizeSize = {
    width: normalizePanelWidth(nextSize.width ?? state.shell.panelWidth),
    height: normalizePanelHeight(nextSize.height ?? state.shell.panelHeight)
  };
  if (resizeFrame) return;

  resizeFrame = requestAnimationFrame(async () => {
    resizeFrame = null;
    const targetSize = pendingResizeSize;
    pendingResizeSize = null;
    await resizePanelTo(targetSize);
    if (pendingResizeSize !== null) queuePanelResize(pendingResizeSize);
  });
}

function beginPanelResize(event) {
  if (event.button !== 0 || appShell.classList.contains("settings-open")) return;
  event.preventDefault();
  event.stopPropagation();
  const axis = event.currentTarget?.dataset.resizeAxis || "height";
  const panelRect = panel?.getBoundingClientRect();

  panelResizeState = {
    axis,
    startY: event.screenY,
    startX: event.screenX,
    startWidth: panelRect?.width || normalizePanelWidth(state.shell.panelWidth),
    startHeight:
      panelRect?.height ||
      (isHorizontalDock()
        ? normalizePanelHeight(state.shell.panelHeight)
        : window.outerHeight || appShell.getBoundingClientRect().height)
  };
  event.currentTarget?.classList.add("resizing");

  try {
    event.currentTarget?.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic tests and some pointer streams do not create an active capture target.
  }

  document.addEventListener("pointermove", handlePanelResizeMove);
  document.addEventListener("pointerup", endPanelResize);
  document.addEventListener("pointercancel", endPanelResize);
}

function handlePanelResizeMove(event) {
  if (!panelResizeState) return;
  event.preventDefault();
  const edge = normalizeDockEdge(state.shell.dockEdge);
  const deltaY = edge === "bottom" ? panelResizeState.startY - event.screenY : event.screenY - panelResizeState.startY;
  const deltaX =
    edge === "right"
      ? panelResizeState.startX - event.screenX
      : event.screenX - panelResizeState.startX;
  const nextSize = {
    width: panelResizeState.startWidth,
    height: panelResizeState.startHeight
  };
  if (panelResizeState.axis === "width" || panelResizeState.axis === "both") {
    nextSize.width = panelResizeState.startWidth + deltaX;
  }
  if (panelResizeState.axis === "height" || panelResizeState.axis === "both") {
    nextSize.height = panelResizeState.startHeight + deltaY;
  }
  queuePanelResize(nextSize);
}

function endPanelResize() {
  panelResizeState = null;
  document.querySelectorAll("[data-resize-axis]").forEach((grip) => grip.classList.remove("resizing"));
  document.removeEventListener("pointermove", handlePanelResizeMove);
  document.removeEventListener("pointerup", endPanelResize);
  document.removeEventListener("pointercancel", endPanelResize);
}

function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex, "#fff4b8").slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function relativeLuminance({ r, g, b }) {
  const values = [r, g, b].map((component) => {
    const channel = component / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function readableTextColor(hex) {
  return relativeLuminance(hexToRgb(hex)) > 0.62 ? "#283044" : "#ffffff";
}

function accentColor(hex) {
  const rgb = hexToRgb(hex);
  const darken = relativeLuminance(rgb) > 0.62 ? 0.65 : 1.25;
  return rgbToHex({
    r: rgb.r * darken,
    g: rgb.g * darken,
    b: rgb.b * darken
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveStatus.textContent = "저장됨";
}

function scheduleSave() {
  saveStatus.textContent = "저장 중";
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 180);
}

function setSettingsStatus(message, timeout = 2500) {
  if (!settingsStatus) return;
  settingsStatus.textContent = message;
  if (timeout > 0) {
    setTimeout(() => {
      if (settingsStatus.textContent === message) settingsStatus.textContent = "";
    }, timeout);
  }
}

async function ensureStartupEnabled() {
  if (startupInput) startupInput.checked = true;
  state.prefs = normalizeAppPrefs({
    ...state.prefs,
    startupDefaultApplied: true,
    startupUserChoiceSet: false
  });
  saveState();

  try {
    const startup = await window.memoEdge.getStartup();
    if (!startup?.openAtLogin) {
      const result = await window.memoEdge.setStartup(true);
      if (startupInput) startupInput.checked = true;
      return result;
    }
  } catch {
    if (startupInput) startupInput.checked = true;
  }

  return { ok: true };
}

function backupPayload() {
  persistEditor();
  return {
    app: "MEMO BOM",
    version: STATE_VERSION,
    exportedAt: new Date().toISOString(),
    state: normalizeState(state)
  };
}

function isEmptyMemoHtml(html) {
  if (typeof html !== "string" || !html.trim()) return true;
  const probe = document.createElement("div");
  probe.innerHTML = html;
  const text = probe.textContent.replaceAll(CHECK_TEXT_PLACEHOLDER, "").trim();
  return !text && !probe.querySelector("img, table, input, .check-item");
}

async function getCurrentUserName() {
  let userName = "사용자";
  try {
    const payload = await window.memoEdge.getUserName();
    if (payload?.ok && typeof payload.name === "string" && payload.name.trim()) {
      userName = payload.name.trim();
    }
  } catch {
    userName = "사용자";
  }
  return userName;
}

async function applyInitialSingleMemoIfNeeded() {
  state.prefs = normalizeAppPrefs(state.prefs);
  if (state.prefs.initialSingleMemoApplied) return false;

  const memo = createMemo(0, state.memoDefaults);
  memo.title = "메모 1";
  memo.html = createWelcomeMemoHtml(await getCurrentUserName());
  memo.createdAt = Date.now();
  memo.updatedAt = Date.now();

  state.indexes = [memo];
  state.activeId = memo.id;
  state.floatingIds = [memo.id];
  state.prefs.initialSingleMemoApplied = true;
  state.prefs.welcomeMemoApplied = true;
  return true;
}

async function applyWelcomeMemoIfNeeded() {
  state.prefs = normalizeAppPrefs(state.prefs);
  if (await applyInitialSingleMemoIfNeeded()) return;
  if (state.prefs.welcomeMemoApplied) return;

  const firstMemo = state.indexes[0];
  if (!firstMemo) {
    state.prefs.welcomeMemoApplied = true;
    return;
  }

  if (!isEmptyMemoHtml(firstMemo.html)) {
    state.prefs.welcomeMemoApplied = true;
    return;
  }

  firstMemo.html = createWelcomeMemoHtml(await getCurrentUserName());
  firstMemo.updatedAt = Date.now();
  state.prefs.welcomeMemoApplied = true;
}

async function applyImportedState(imported) {
  const source = imported?.state || imported;
  const nextState = normalizeState(source);
  nextState.prefs = normalizeAppPrefs({
    ...nextState.prefs,
    initialSingleMemoApplied: true,
    welcomeMemoApplied: true
  });
  state = nextState;
  detachedMemoPlacements = new Map();
  saveState();
  renderActiveMemo();
  applyCommonTypography();
  syncShellLayoutClasses();
  const result = await window.memoEdge.updateSettings(state.shell);
  state.shell = normalizeShellSettings({ ...state.shell, ...(result.settings || {}) });
  renderActiveMemo();
  if (appShell.classList.contains("settings-open")) await fillSettingsForm();
}

function activeMemo() {
  return state.indexes.find((memo) => memo.id === state.activeId) || state.indexes[0];
}

function floatingMemos() {
  const byId = new Map(state.indexes.map((memo) => [memo.id, memo]));
  return state.floatingIds.map((id) => byId.get(id)).filter(Boolean);
}

function persistEditor() {
  const memo = activeMemo();
  if (!memo) return;
  memo.html = serializedEditorHtml();
  memo.updatedAt = Date.now();
  scheduleSave();
}

function serializedEditorHtml() {
  const clone = editor.cloneNode(true);
  clone.querySelectorAll(".check-text").forEach((text) => {
    text.textContent = text.textContent.replaceAll(CHECK_TEXT_PLACEHOLDER, "");
  });
  return clone.innerHTML;
}

function pushEditorHistory() {
  if (applyingHistory) return;
  const snapshot = serializedEditorHtml();
  if (editorHistory[editorHistoryIndex] === snapshot) return;

  editorHistory = editorHistory.slice(0, editorHistoryIndex + 1);
  editorHistory.push(snapshot);
  if (editorHistory.length > 80) editorHistory.shift();
  editorHistoryIndex = editorHistory.length - 1;
}

function resetEditorHistory() {
  editorHistory = [serializedEditorHtml()];
  editorHistoryIndex = 0;
}

function applyEditorHistorySnapshot(snapshot) {
  applyingHistory = true;
  editor.innerHTML = snapshot || "";
  prepareChecklistItems();
  applyingHistory = false;
  persistEditor();
}

function undoEditor() {
  if (editorHistoryIndex <= 0) return;
  editorHistoryIndex -= 1;
  applyEditorHistorySnapshot(editorHistory[editorHistoryIndex]);
}

function redoEditor() {
  if (editorHistoryIndex >= editorHistory.length - 1) return;
  editorHistoryIndex += 1;
  applyEditorHistorySnapshot(editorHistory[editorHistoryIndex]);
}

function applyMemoTheme(memo) {
  const color = normalizeHexColor(memo.color, "#fff4b8");
  const text = readableTextColor(color);
  document.documentElement.style.setProperty("--note-bg", color);
  document.documentElement.style.setProperty("--note-text", text);
  document.documentElement.style.setProperty("--accent", accentColor(color));
}

function applyMemoTypography(memo) {
  const fontSize = `${normalizeFontSize(memo.fontSize)}px`;
  const fontFamily = fontFamilyCss(memo.fontFamily);
  const lineHeight = String(normalizeLineSpacing(memo.lineSpacing));
  editor.style.setProperty("--memo-font-size", fontSize);
  editor.style.setProperty("--memo-font-family", fontFamily);
  editor.style.setProperty("--memo-line-height", lineHeight);
  editor.style.fontSize = fontSize;
  editor.style.fontFamily = fontFamily;
  editor.style.lineHeight = lineHeight;
}

function syncToolbarTypography() {
  const memo = activeMemo();
  if (!memo) return;
  if (fontFamilyToolbarSelect) populateFontFamilySelect(fontFamilyToolbarSelect, memo.fontFamily);
  if (fontSizeToolbarSelect) populateFontSizeSelect(fontSizeToolbarSelect, memo.fontSize);
  if (lineSpacingToolbarSelect) populateLineSpacingSelect(lineSpacingToolbarSelect, memo.lineSpacing);
}

function handleTitle(memo, fallbackIndex) {
  const raw = memo.title || `메모 ${fallbackIndex + 1}`;
  const chars = Array.from(raw);
  return chars.length > HANDLE_TITLE_PREFIX_LENGTH
    ? `${chars.slice(0, HANDLE_TITLE_PREFIX_LENGTH).join("").trimEnd()}..`
    : raw;
}

function renderHandleLabel(button, text) {
  button.innerHTML = "";
  Array.from(text).forEach((char) => {
    const span = document.createElement("span");
    span.className = "handle-char";
    span.textContent = char;
    button.appendChild(span);
  });
}

function clearHandleDropPreview() {
  handleRail.querySelectorAll(".handle-slot").forEach((slot) => {
    slot.classList.remove("dragging", "drop-before", "drop-after");
    slot.style.transform = "";
  });
}

function handleDropIndexFromPointer(pointerAlong) {
  const slots = Array.from(handleRail.querySelectorAll(".handle-slot")).filter((slot) => slot !== handleDragState?.slot);
  if (!slots.length) return handleDragState?.originalIndex ?? -1;

  const centers = slots.map((slot) => {
    const rect = slot.getBoundingClientRect();
    return isHorizontalDock() ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
  });

  return centers.filter((center) => pointerAlong > center).length;
}

function updateHandleDropPreview(targetIndex) {
  const slots = Array.from(handleRail.querySelectorAll(".handle-slot"));
  const otherSlots = slots.filter((slot) => slot !== handleDragState?.slot);
  slots.forEach((slot) => slot.classList.remove("drop-before", "drop-after"));
  if (!otherSlots.length || targetIndex < 0 || targetIndex === handleDragState?.originalIndex) return;

  const clampedIndex = clamp(targetIndex, 0, slots.length - 1);
  if (clampedIndex > handleDragState.originalIndex) {
    const previousSlot = otherSlots[Math.min(clampedIndex - 1, otherSlots.length - 1)];
    previousSlot?.classList.add("drop-after");
    return;
  }

  const nextSlot = otherSlots[Math.min(clampedIndex, otherSlots.length - 1)];
  nextSlot?.classList.add("drop-before");
}

function moveFloatingMemoToIndex(id, nextIndex) {
  const currentIndex = state.floatingIds.indexOf(id);
  if (currentIndex < 0) return false;
  const clampedIndex = clamp(Math.round(nextIndex), 0, state.floatingIds.length - 1);
  if (currentIndex === clampedIndex) return false;

  const nextIds = [...state.floatingIds];
  const [moved] = nextIds.splice(currentIndex, 1);
  nextIds.splice(clampedIndex, 0, moved);
  state.floatingIds = nextIds;
  renderHandles();
  renderAllMemoList();
  renderIndexManager();
  saveState();
  return true;
}

function endHandleDrag() {
  if (!handleDragState && !draggingHandle) return;
  const pendingState = handleDragState;
  handleDragState = null;
  clearHandleDropPreview();
  if (
    pendingState?.reorderIndex >= 0 &&
    pendingState.reorderIndex !== pendingState.originalIndex &&
    !pendingState.detached
  ) {
    moveFloatingMemoToIndex(pendingState.id, pendingState.reorderIndex);
  }
  setTimeout(() => {
    draggingHandle = false;
  }, 0);
}

function renderHandles() {
  handleRail.innerHTML = "";

  floatingMemos().forEach((memo, index) => {
    const slot = document.createElement("div");
    slot.className = "handle-slot";
    if (memo.id === state.activeId) slot.classList.add("active");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "edge-handle";
    if (memo.id === state.activeId) button.classList.add("active");
    button.dataset.id = memo.id;
    renderHandleLabel(button, handleTitle(memo, index));
    button.title = memo.title || `메모 ${index + 1}`;

    const bg = normalizeHexColor(memo.color, COLOR_PRESETS[index % COLOR_PRESETS.length]);
    button.style.setProperty("--handle-bg", bg);
    button.style.setProperty("--handle-text", readableTextColor(bg));

    button.addEventListener("click", (event) => {
      if (draggingHandle) return;
      if (event.detail >= 2) {
        event.preventDefault();
        event.stopPropagation();
        renameMemo(memo.id, index);
        return;
      }
      selectMemo(memo.id);
      setExpanded(true);
    });

    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      draggingHandle = false;
      const startAlong = isHorizontalDock() ? event.clientX : event.clientY;
      handleDragState = {
        id: memo.id,
        slot,
        button,
        originalIndex: state.floatingIds.indexOf(memo.id),
        reorderIndex: state.floatingIds.indexOf(memo.id),
        startX: event.screenX,
        startY: event.screenY,
        startAlong,
        lastAlong: startAlong,
        moved: false,
        detached: false
      };
      button.setPointerCapture(event.pointerId);
    });

    button.addEventListener("pointermove", (event) => {
      if (event.buttons !== 1) return;
      if (!handleDragState) return;
      if (handleDragState?.detached) return;
      const edge = normalizeDockEdge(state.shell.dockEdge);
      const awayDistance =
        edge === "right"
          ? handleDragState.startX - event.screenX
          : edge === "left"
            ? event.screenX - handleDragState.startX
            : edge === "top"
              ? event.screenY - handleDragState.startY
              : handleDragState.startY - event.screenY;
      if (awayDistance > DETACH_DRAG_THRESHOLD) {
        draggingHandle = true;
        handleDragState.detached = true;
        clearHandleDropPreview();
        detachMemoToWindow(memo.id);
        return;
      }
      const currentPosition = isHorizontalDock() ? event.clientX : event.clientY;
      const totalDelta = currentPosition - handleDragState.startAlong;
      const delta = currentPosition - handleDragState.lastAlong;
      handleDragState.lastAlong = currentPosition;
      if (state.floatingIds.length > 1) {
        if (Math.abs(totalDelta) < HANDLE_REORDER_THRESHOLD && !handleDragState.moved) return;
        draggingHandle = true;
        handleDragState.moved = true;
        handleDragState.slot.classList.add("dragging");
        handleDragState.slot.style.transform = isHorizontalDock()
          ? `translateX(${totalDelta}px)`
          : `translateY(${totalDelta}px)`;
        handleDragState.reorderIndex = handleDropIndexFromPointer(currentPosition);
        updateHandleDropPreview(handleDragState.reorderIndex);
        return;
      }
      if (Math.abs(delta) < 4) return;
      draggingHandle = true;
      nudgeShellPosition(delta);
    });

    button.addEventListener("pointerup", endHandleDrag);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "handle-delete-button";
    deleteButton.title = `${memo.title || `메모 ${index + 1}`} 삭제`;
    deleteButton.setAttribute("aria-label", `${memo.title || `메모 ${index + 1}`} 삭제`);
    deleteButton.textContent = "×";
    deleteButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      draggingHandle = false;
      handleDragState = null;
      deleteIndex(memo.id);
    });

    slot.append(button, deleteButton);
    handleRail.appendChild(slot);
  });

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "add-handle-button";
  addButton.title = "새 메모";
  addButton.setAttribute("aria-label", "새 메모");
  addButton.textContent = "+";
  addButton.addEventListener("click", addIndex);
  handleRail.appendChild(addButton);
}

function memoPayload(memo) {
  return {
    id: memo.id,
    title: memo.title,
    color: memo.color,
    fontSize: memo.fontSize,
    fontFamily: memo.fontFamily,
    lineSpacing: memo.lineSpacing,
    html: memo.html || ""
  };
}

async function nudgeShellPosition(delta) {
  const result = await window.memoEdge.nudgeEdge(delta);
  if (!result?.settings) return;
  state.shell = normalizeShellSettings({ ...state.shell, ...result.settings });
  syncShellLayoutClasses();
  if (panelPositionInput) panelPositionInput.value = String(state.shell.edgeOffset);
  if (anchorSelect) anchorSelect.value = state.shell.edgeAnchor;
  saveState();
}

async function detachMemoToWindow(id) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo || !window.memoEdge.detachMemo) return;
  if (memo.id === state.activeId) persistEditor();

  const floatingIndex = state.floatingIds.indexOf(id);
  const wasFloating = floatingIndex >= 0;
  detachedMemoPlacements.set(id, {
    wasFloating,
    floatingIndex: wasFloating ? floatingIndex : -1,
    wasActive: state.activeId === id,
    memoIndex: state.indexes.findIndex((item) => item.id === id)
  });

  const result = await window.memoEdge.detachMemo(memoPayload(memo));
  if (!result?.ok) {
    detachedMemoPlacements.delete(id);
    return;
  }

  if (wasFloating) {
    state.floatingIds = state.floatingIds.filter((floatingId) => floatingId !== id);
    if (state.activeId === id) state.activeId = state.floatingIds[0];
  }

  if (state.activeId === id && state.indexes.length > 1) {
    const replacementMemo =
      state.floatingIds.map((floatingId) => state.indexes.find((item) => item.id === floatingId)).find(Boolean) ||
      state.indexes.find((item) => item.id !== id);
    if (replacementMemo) state.activeId = replacementMemo.id;
  }

  renderActiveMemo();
  saveState();
}

function applyDetachedMemoUpdate(payload) {
  const memo = state.indexes.find((item) => item.id === payload?.id);
  if (!memo) return;
  memo.title = normalizeMemoTitle(payload.title, memo.title || "메모");
  memo.color = normalizeHexColor(payload.color, memo.color);
  memo.fontSize = normalizeFontSize(payload.fontSize);
  memo.fontFamily = normalizeFontFamily(payload.fontFamily);
  memo.lineSpacing = normalizeLineSpacing(payload.lineSpacing);
  memo.html = typeof payload.html === "string" ? payload.html : memo.html;
  memo.updatedAt = Date.now();

  if (memo.id === state.activeId && document.activeElement !== editor) {
    renderActiveMemo();
  } else {
    renderHandles();
    renderAllMemoList();
    renderIndexManager();
    if (memo.id === state.activeId) {
      activeLabel.textContent = memo.title;
      applyMemoTheme(memo);
      applyMemoTypography(memo);
    }
  }
  saveState();
}

function reattachDetachedMemo(id) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo) return;
  const placement = detachedMemoPlacements.get(id);
  detachedMemoPlacements.delete(id);

  if (placement?.wasFloating) {
    state.floatingIds = state.floatingIds.filter((floatingId) => floatingId !== id);
    if (state.floatingIds.length >= MAX_FLOATING) {
      state.floatingIds = state.floatingIds.slice(0, MAX_FLOATING - 1);
    }
    const insertIndex = clamp(placement.floatingIndex, 0, state.floatingIds.length);
    state.floatingIds.splice(insertIndex, 0, id);
  } else if (placement) {
    state.floatingIds = state.floatingIds.filter((floatingId) => floatingId !== id);
  } else if (!state.floatingIds.includes(id) && state.floatingIds.length < MAX_FLOATING) {
    state.floatingIds.push(id);
  }

  if (placement?.wasActive || !state.floatingIds.length || state.activeId === id) {
    state.activeId = id;
  }
  renderActiveMemo();
  saveState();
  if (placement?.wasFloating || placement?.wasActive || !placement) setExpanded(true);
}

function renderActiveMemo() {
  const memo = activeMemo();
  if (!memo) return;
  applyMemoTheme(memo);
  applyMemoTypography(memo);
  syncToolbarTypography();
  activeLabel.textContent = memo.title || "메모";
  activeTitleButton.classList.remove("hidden");
  activeTitleInput.classList.add("hidden");
  activeTitleInput.value = memo.title || "메모";
  activeSubtitle.textContent = `${displayShortcut(state.shell.cycleShortcut || DEFAULT_CYCLE_SHORTCUT)}로 다음 플로팅 메모 열기`;
  setTablePickerOpen(false);
  setTableToolsOpen(false);
  lastTableCell = null;
  editor.innerHTML = memo.html || "";
  prepareChecklistItems();
  resetEditorHistory();
  renderHandles();
  renderAllMemoList();
  renderIndexManager();
}

function selectMemo(id) {
  if (!state.indexes.some((memo) => memo.id === id)) return;
  if (state.activeId !== id) persistEditor();
  state.activeId = id;
  renderActiveMemo();
  saveState();
}

function setMemoListOpen(open) {
  if (!memoListPanel || !allMemosButton) return;
  memoListPanel.classList.toggle("hidden", !open);
  allMemosButton.classList.toggle("active", open);
  allMemosButton.setAttribute("aria-expanded", String(Boolean(open)));
  if (open) renderAllMemoList();
}

function renderAllMemoList() {
  if (!allMemoList) return;
  allMemoList.innerHTML = "";

  state.indexes.forEach((memo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "all-memo-item";
    if (memo.id === state.activeId) button.classList.add("active");
    button.dataset.id = memo.id;

    const swatch = document.createElement("span");
    swatch.className = "all-memo-color";
    swatch.style.background = normalizeHexColor(memo.color, COLOR_PRESETS[index % COLOR_PRESETS.length]);

    const title = document.createElement("span");
    title.className = "all-memo-title";
    title.textContent = memo.title || `메모 ${index + 1}`;

    const status = document.createElement("span");
    status.className = "all-memo-status";
    status.textContent = state.floatingIds.includes(memo.id) ? "플로팅" : "일반";

    button.append(swatch, title, status);
    button.addEventListener("click", () => {
      selectMemo(memo.id);
      setMemoListOpen(false);
      setExpanded(true);
    });
    allMemoList.appendChild(button);
  });
}

async function setExpanded(nextExpanded) {
  expanded = Boolean(nextExpanded);
  syncShellLayoutClasses();
  appShell.classList.toggle("expanded", expanded);
  if (!expanded) {
    appShell.classList.remove("settings-open");
    setMemoListOpen(false);
  }
  await window.memoEdge.setExpanded(expanded);
  if (!expanded) {
    await window.memoEdge.setSettingsOpen(false);
  }
}

function cycleFloatingMemo() {
  const memos = floatingMemos();
  if (!memos.length) return;

  const currentIndex = memos.findIndex((memo) => memo.id === state.activeId);
  const nextIndex = expanded && currentIndex >= 0 ? (currentIndex + 1) % memos.length : 0;
  selectMemo(memos[nextIndex].id);
  setExpanded(true);
}

function refreshLaunchGuideText() {
  if (!launchGuideMessage) return;
  launchGuideMessage.textContent =
    "앱은 작업표시줄 대신 시스템 트레이에 머물러요. 현재 단축키로 메모를 열고 숨길 수 있습니다.";
  launchGuideCycle.textContent = `${displayShortcut(state.shell.cycleShortcut)}: 다음 플로팅 메모 열기`;
  launchGuideHide.textContent = `${displayShortcut(state.shell.hideShortcut)}: 메모 숨기기`;
  hideLaunchGuideInput.checked = false;
}

async function showLaunchGuide() {
  if (!state.prefs?.showLaunchGuideOnStartup || !launchGuide) return;
  refreshLaunchGuideText();
  await setExpanded(true);
  launchGuide.classList.remove("hidden");
}

function closeLaunchGuide() {
  if (!launchGuide) return;
  if (hideLaunchGuideInput?.checked) {
    state.prefs = normalizeAppPrefs({
      ...state.prefs,
      showLaunchGuideOnStartup: false
    });
    if (startupGuideInput) startupGuideInput.checked = false;
    saveState();
  }
  launchGuide.classList.add("hidden");
}

function execCommand(command, value = null) {
  editor.focus();
  document.execCommand(command, false, value);
  persistEditor();
  pushEditorHistory();
}

function clearEditorPreservingUndo() {
  editor.focus();
  pushEditorHistory();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("delete", false, null);
  persistEditor();
  pushEditorHistory();
}

function isBlankEditorText(value) {
  return String(value || "")
    .replaceAll(CHECK_TEXT_PLACEHOLDER, "")
    .replace(/\u00a0/g, " ")
    .trim() === "";
}

function getSelectionElement() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const node = selection.anchorNode;
  const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return element instanceof Element ? element : null;
}

function createBlankLine() {
  const line = document.createElement("div");
  line.appendChild(document.createElement("br"));
  return line;
}

function placeCaretInBlock(block) {
  if (!block) return;
  editor.focus();
  const range = document.createRange();
  range.setStart(block, 0);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function selectionBelongsToEditor(range) {
  if (!range) return false;
  const node = range.commonAncestorContainer;
  return node === editor || editor.contains(node);
}

function rememberEditorSelection() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (selectionBelongsToEditor(range)) savedEditorRange = range.cloneRange();
}

function restoreEditorSelection() {
  editor.focus();
  if (!selectionBelongsToEditor(savedEditorRange)) return false;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedEditorRange);
  return true;
}

function ensureChecklistTextNode(text) {
  if (!text) return null;
  text.removeAttribute("contenteditable");
  text.spellcheck = false;

  const existingTextNode = Array.from(text.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (existingTextNode) {
    if (!existingTextNode.nodeValue) existingTextNode.nodeValue = CHECK_TEXT_PLACEHOLDER;
    return existingTextNode;
  }

  const textNode = document.createTextNode(text.textContent || CHECK_TEXT_PLACEHOLDER);
  text.textContent = "";
  text.appendChild(textNode);
  return textNode;
}

function placeCaretInCheckText(text) {
  const textNode = ensureChecklistTextNode(text);
  if (!textNode) return;
  editor.focus();
  const range = document.createRange();
  range.setStart(textNode, textNode.nodeValue.length);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function createChecklistItem(checked = false) {
  const item = document.createElement("div");
  item.className = "check-item";
  item.dataset.checked = checked ? "true" : "false";

  const box = document.createElement("span");
  box.className = "check-box";
  box.contentEditable = "false";
  box.setAttribute("role", "checkbox");
  box.setAttribute("aria-checked", checked ? "true" : "false");
  box.textContent = checked ? "\u2611" : "\u2610";

  const text = document.createElement("span");
  text.className = "check-text";
  text.appendChild(document.createTextNode(CHECK_TEXT_PLACEHOLDER));

  item.append(box, text);
  return { item, text };
}

function prepareChecklistItems(root = editor) {
  root.querySelectorAll(".check-item").forEach((item) => {
    const checked = item.dataset.checked === "true";
    let box = item.querySelector(".check-box");
    let text = item.querySelector(".check-text");

    if (!box) {
      box = document.createElement("span");
      box.className = "check-box";
      item.prepend(box);
    }
    box.contentEditable = "false";
    box.setAttribute("role", "checkbox");
    box.setAttribute("aria-checked", checked ? "true" : "false");
    box.textContent = checked ? "\u2611" : "\u2610";

    if (!text) {
      text = document.createElement("span");
      text.className = "check-text";
      item.appendChild(text);
    }
    ensureChecklistTextNode(text);
  });
}

function insertNodeAtSelection(node) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    editor.appendChild(node);
    return;
  }

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) {
    editor.appendChild(node);
    return;
  }

  range.deleteContents();
  range.insertNode(node);
}

function insertChecklist() {
  editor.focus();
  const { item, text } = createChecklistItem(false);
  insertNodeAtSelection(item);
  placeCaretInCheckText(text);
  persistEditor();
  pushEditorHistory();
}

function clampTableDimension(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function setTablePickerOpen(open) {
  if (!tablePicker) return;
  tablePicker.classList.toggle("hidden", !open);
  tableButton?.classList.toggle("active", Boolean(open));
  if (open) {
    tableRowsInput.value = tableRowsInput.value || "3";
    tableColsInput.value = tableColsInput.value || "3";
    tableRowsInput.focus();
    tableRowsInput.select();
  }
}

function createMemoTable(rows, cols) {
  const table = document.createElement("table");
  table.className = "memo-table";
  const tbody = document.createElement("tbody");

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = document.createElement("tr");
    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      const cell = document.createElement("td");
      cell.appendChild(document.createElement("br"));
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  return table;
}

function createTableCell() {
  const cell = document.createElement("td");
  cell.appendChild(document.createElement("br"));
  return cell;
}

function placeCaretInTable(table) {
  const firstCell = table?.querySelector("td");
  if (!firstCell) return;
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(firstCell);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  rememberEditorSelection();
}

function insertTable() {
  const rows = clampTableDimension(tableRowsInput?.value, 1, 12, 3);
  const cols = clampTableDimension(tableColsInput?.value, 1, 8, 3);
  const table = createMemoTable(rows, cols);
  const afterLine = createBlankLine();
  const fragment = document.createDocumentFragment();
  fragment.append(table, afterLine);

  restoreEditorSelection();
  insertNodeAtSelection(fragment);
  placeCaretInTable(table);
  setTablePickerOpen(false);
  persistEditor();
  pushEditorHistory();
}

function selectedTableCell() {
  const selectedCell = getSelectionElement()?.closest(".memo-table td") || null;
  return selectedCell && editor.contains(selectedCell) ? selectedCell : null;
}

function currentTableCell() {
  const selectedCell = selectedTableCell();
  if (selectedCell && editor.contains(selectedCell)) {
    lastTableCell = selectedCell;
    return selectedCell;
  }
  return lastTableCell && editor.contains(lastTableCell) ? lastTableCell : null;
}

function currentMemoTable() {
  return currentTableCell()?.closest(".memo-table") || null;
}

function setTableToolsOpen(open) {
  tableTools?.classList.toggle("hidden", !open);
}

function updateTableTools() {
  const cell = selectedTableCell();
  if (cell) lastTableCell = cell;
  setTableToolsOpen(Boolean(cell));
}

function tableCells(table) {
  return Array.from(table?.querySelectorAll("td") || []);
}

function selectedTableCells() {
  const table = currentMemoTable();
  const selection = window.getSelection();
  if (!table || !selection || !selection.rangeCount) return [];
  const range = selection.getRangeAt(0);
  return tableCells(table).filter((cell) => {
    try {
      return range.intersectsNode(cell);
    } catch {
      return cell === currentTableCell();
    }
  });
}

function targetTableCells() {
  const selected = selectedTableCells();
  if (selected.length) return selected;
  const cell = currentTableCell();
  return cell ? [cell] : [];
}

function currentCellPosition(cell) {
  const row = cell?.parentElement;
  const table = cell?.closest(".memo-table");
  if (!row || !table) return null;
  const rows = Array.from(table.querySelectorAll("tr"));
  return {
    rowIndex: rows.indexOf(row),
    colIndex: Array.from(row.children).indexOf(cell),
    row,
    rows
  };
}

function buildTableGrid(table) {
  const rows = Array.from(table?.querySelectorAll("tr") || []);
  const grid = [];
  const meta = new Map();

  rows.forEach((row, rowIndex) => {
    if (!grid[rowIndex]) grid[rowIndex] = [];
    let colIndex = 0;

    Array.from(row.children).forEach((cell) => {
      while (grid[rowIndex][colIndex]) colIndex += 1;

      const rowSpan = Math.max(1, cell.rowSpan || 1);
      const colSpan = Math.max(1, cell.colSpan || 1);
      meta.set(cell, { cell, row, rowIndex, colIndex, rowSpan, colSpan });

      for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
        if (!grid[r]) grid[r] = [];
        for (let c = colIndex; c < colIndex + colSpan; c += 1) {
          grid[r][c] = cell;
        }
      }

      colIndex += colSpan;
    });
  });

  return { rows, grid, meta };
}

function uniqueCells(cells) {
  return [...new Set(cells.filter(Boolean))];
}

function isEffectivelyBlankCell(cell) {
  return !String(cell?.textContent || "").trim() && !cell?.querySelector("img, table, input, .check-item");
}

function moveCellContents(target, source) {
  if (!target || !source || target === source) return;
  if (isEffectivelyBlankCell(target)) target.textContent = "";
  else target.appendChild(document.createElement("br"));
  if (isEffectivelyBlankCell(source)) return;
  Array.from(source.childNodes).forEach((node) => target.appendChild(node));
}

function mergeTableCellsInGroup(cells) {
  const targets = uniqueCells(cells);
  if (targets.length < 2) return false;

  const table = targets[0]?.closest(".memo-table");
  if (!table) return false;

  const { grid, meta } = buildTableGrid(table);
  const positions = targets.map((cell) => meta.get(cell)).filter(Boolean);
  if (positions.length < 2) return false;

  const firstRow = Math.min(...positions.map((position) => position.rowIndex));
  const firstCol = Math.min(...positions.map((position) => position.colIndex));
  const lastRow = Math.max(...positions.map((position) => position.rowIndex + position.rowSpan - 1));
  const lastCol = Math.max(...positions.map((position) => position.colIndex + position.colSpan - 1));
  const cellsInRect = [];

  for (let r = firstRow; r <= lastRow; r += 1) {
    for (let c = firstCol; c <= lastCol; c += 1) {
      if (!grid[r]?.[c]) return false;
      cellsInRect.push(grid[r][c]);
    }
  }

  const mergedCells = uniqueCells(cellsInRect);
  const primary = grid[firstRow]?.[firstCol] || targets[0];
  mergedCells.forEach((candidate) => {
    if (candidate !== primary) moveCellContents(primary, candidate);
  });

  primary.rowSpan = lastRow - firstRow + 1;
  primary.colSpan = lastCol - firstCol + 1;
  mergedCells.forEach((candidate) => {
    if (candidate !== primary) candidate.remove();
  });

  placeCaretInCell(primary);
  persistEditor();
  pushEditorHistory();
  return true;
}

function adjacentCellsForMerge(cell, direction) {
  const table = cell?.closest(".memo-table");
  if (!table) return [];

  const { grid, meta } = buildTableGrid(table);
  const position = meta.get(cell);
  if (!position) return [];

  const cells = [cell];
  if (direction === "right") {
    const targetCol = position.colIndex + position.colSpan;
    for (let rowIndex = position.rowIndex; rowIndex < position.rowIndex + position.rowSpan; rowIndex += 1) {
      cells.push(grid[rowIndex]?.[targetCol]);
    }
  }

  if (direction === "down") {
    const targetRow = position.rowIndex + position.rowSpan;
    for (let colIndex = position.colIndex; colIndex < position.colIndex + position.colSpan; colIndex += 1) {
      cells.push(grid[targetRow]?.[colIndex]);
    }
  }

  return uniqueCells(cells);
}

function mergeTableCells() {
  const selected = selectedTableCells();
  if (selected.length >= 2 && mergeTableCellsInGroup(selected)) return;

  const cell = currentTableCell();
  if (!cell) return;
  mergeTableCellsInGroup(adjacentCellsForMerge(cell, "right"));
}

function mergeTableCellsDown() {
  const cell = currentTableCell();
  if (!cell) return;
  mergeTableCellsInGroup(adjacentCellsForMerge(cell, "down"));
}

function splitTableCell() {
  const cell = currentTableCell();
  const position = currentCellPosition(cell);
  if (!cell || !position) return;
  const rowSpan = Math.max(1, cell.rowSpan || 1);
  const colSpan = Math.max(1, cell.colSpan || 1);
  if (rowSpan === 1 && colSpan === 1) return;

  cell.rowSpan = 1;
  cell.colSpan = 1;
  let insertAfter = cell;
  for (let index = 1; index < colSpan; index += 1) {
    const newCell = createTableCell();
    insertAfter.after(newCell);
    insertAfter = newCell;
  }

  for (let rowOffset = 1; rowOffset < rowSpan; rowOffset += 1) {
    const targetRow = position.rows[position.rowIndex + rowOffset];
    if (!targetRow) continue;
    const beforeCell = targetRow.children[position.colIndex] || null;
    for (let index = 0; index < colSpan; index += 1) {
      targetRow.insertBefore(createTableCell(), beforeCell);
    }
  }

  placeCaretInCell(cell);
  persistEditor();
  pushEditorHistory();
}

function applyTableBorder() {
  const table = currentMemoTable();
  if (!table) return;
  const color = normalizeHexColor(tableBorderColorInput?.value, "#6b7280");
  const width = clampTableDimension(tableBorderWidthInput?.value, 0, 8, 1);
  tableCells(table).forEach((cell) => {
    cell.style.borderStyle = width === 0 ? "none" : "solid";
    cell.style.borderWidth = `${width}px`;
    cell.style.borderColor = color;
  });
  persistEditor();
  pushEditorHistory();
}

function applyTableCellColor() {
  const color = normalizeHexColor(tableCellColorInput?.value, "#ffffff");
  targetTableCells().forEach((cell) => {
    cell.style.backgroundColor = color;
  });
  persistEditor();
  pushEditorHistory();
}

function applyTableFillColor() {
  const table = currentMemoTable();
  const color = normalizeHexColor(tableFillColorInput?.value, "#ffffff");
  if (!table) return;
  tableCells(table).forEach((cell) => {
    cell.style.backgroundColor = color;
  });
  persistEditor();
  pushEditorHistory();
}

function clearTableCellColor() {
  targetTableCells().forEach((cell) => {
    cell.style.backgroundColor = "";
  });
  persistEditor();
  pushEditorHistory();
}

function placeCaretInCell(cell) {
  if (!cell) return;
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  rememberEditorSelection();
  updateTableTools();
}

function addTableRow() {
  const cell = currentTableCell();
  const table = cell?.closest(".memo-table");
  const currentRow = cell?.parentElement;
  if (!table || !currentRow) return;
  const colCount = Math.max(1, currentRow.children.length);
  const row = document.createElement("tr");
  for (let index = 0; index < colCount; index += 1) row.appendChild(createTableCell());
  currentRow.after(row);
  placeCaretInCell(row.querySelector("td"));
  persistEditor();
  pushEditorHistory();
}

function addTableColumn() {
  const cell = currentTableCell();
  const table = cell?.closest(".memo-table");
  const row = cell?.parentElement;
  if (!table || !row) return;
  const columnIndex = Array.from(row.children).indexOf(cell);
  table.querySelectorAll("tr").forEach((tableRow) => {
    const cells = Array.from(tableRow.children);
    const newCell = createTableCell();
    if (cells[columnIndex]) cells[columnIndex].after(newCell);
    else tableRow.appendChild(newCell);
  });
  placeCaretInCell(row.children[columnIndex + 1]);
  persistEditor();
  pushEditorHistory();
}

function deleteTableRow() {
  const cell = currentTableCell();
  const table = cell?.closest(".memo-table");
  const row = cell?.parentElement;
  if (!table || !row) return;
  const nextRow = row.nextElementSibling || row.previousElementSibling;
  if (table.querySelectorAll("tr").length <= 1) {
    deleteTable();
    return;
  }
  row.remove();
  placeCaretInCell(nextRow?.querySelector("td"));
  persistEditor();
  pushEditorHistory();
}

function deleteTableColumn() {
  const cell = currentTableCell();
  const table = cell?.closest(".memo-table");
  const row = cell?.parentElement;
  if (!table || !row) return;
  const columnIndex = Array.from(row.children).indexOf(cell);
  const firstRow = table.querySelector("tr");
  if (!firstRow || firstRow.children.length <= 1) {
    deleteTable();
    return;
  }
  let nextCell = null;
  table.querySelectorAll("tr").forEach((tableRow) => {
    const target = tableRow.children[columnIndex];
    const fallback = tableRow.children[columnIndex + 1] || tableRow.children[columnIndex - 1];
    if (tableRow === row) nextCell = fallback;
    target?.remove();
  });
  placeCaretInCell(nextCell);
  persistEditor();
  pushEditorHistory();
}

function deleteTable() {
  const table = currentMemoTable();
  if (!table) return;
  const blankLine = createBlankLine();
  table.replaceWith(blankLine);
  lastTableCell = null;
  setTableToolsOpen(false);
  placeCaretInBlock(blankLine);
  persistEditor();
  pushEditorHistory();
}

function handleTableKeydown(event) {
  if (event.key !== "Tab") return;
  const cell = currentTableCell();
  const table = cell?.closest(".memo-table");
  if (!cell || !table) return;

  event.preventDefault();
  const cells = tableCells(table);
  const currentIndex = cells.indexOf(cell);
  let nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;

  if (nextIndex >= cells.length) {
    addTableRow();
    return;
  }

  if (nextIndex < 0) nextIndex = cells.length - 1;
  placeCaretInCell(cells[nextIndex]);
}

function toggleChecklistItem(target) {
  const item = target.closest(".check-item");
  if (!item) return;
  const checked = item.dataset.checked === "true";
  item.dataset.checked = checked ? "false" : "true";
  const box = item.querySelector(".check-box");
  if (box) {
    box.textContent = checked ? "\u2610" : "\u2611";
    box.setAttribute("aria-checked", checked ? "false" : "true");
  }
  item.classList.toggle("checked", !checked);
  placeCaretInCheckText(item.querySelector(".check-text"));
  persistEditor();
  pushEditorHistory();
}

function currentChecklistItem() {
  return getSelectionElement()?.closest(".check-item") || null;
}

function handleChecklistKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey) return;
  const item = currentChecklistItem();
  if (!item) return;

  event.preventDefault();
  const currentText = item.querySelector(".check-text");
  if (isBlankEditorText(currentText?.textContent)) {
    const blankLine = createBlankLine();
    item.replaceWith(blankLine);
    placeCaretInBlock(blankLine);
    persistEditor();
    pushEditorHistory();
    return;
  }

  const { item: nextItem, text } = createChecklistItem(false);
  item.after(nextItem);
  placeCaretInCheckText(text);
  persistEditor();
  pushEditorHistory();
}

function currentListItem() {
  return getSelectionElement()?.closest("li") || null;
}

function handleListKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey) return;
  const item = currentListItem();
  if (!item || !editor.contains(item)) return;

  const list = item.parentElement;
  if (!list || !["UL", "OL"].includes(list.tagName)) return;

  event.preventDefault();
  if (!isBlankEditorText(item.textContent)) {
    const nextItem = document.createElement("li");
    nextItem.appendChild(document.createElement("br"));
    item.after(nextItem);
    placeCaretInBlock(nextItem);
    persistEditor();
    pushEditorHistory();
    return;
  }

  const blankLine = createBlankLine();
  if (list.children.length <= 1) {
    list.replaceWith(blankLine);
  } else {
    item.remove();
    list.after(blankLine);
  }
  placeCaretInBlock(blankLine);
  persistEditor();
  pushEditorHistory();
}

function handleEditorKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && !event.altKey) {
    const key = event.key.toLowerCase();
    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) redoEditor();
      else undoEditor();
      return;
    }
    if (key === "y") {
      event.preventDefault();
      redoEditor();
      return;
    }
  }

  handleTableKeydown(event);
  if (event.defaultPrevented) return;
  handleChecklistKeydown(event);
  if (!event.defaultPrevented) handleListKeydown(event);
}

function addIndex() {
  persistEditor();
  const memo = createMemo(state.indexes.length, state.memoDefaults);
  state.indexes.push(memo);
  if (state.floatingIds.length < MAX_FLOATING) {
    state.floatingIds.push(memo.id);
  }
  state.activeId = memo.id;
  renderActiveMemo();
  saveState();
  setExpanded(true);
}

async function openSettings() {
  await setExpanded(true);
  setMemoListOpen(false);
  appShell.classList.add("settings-open");
  await window.memoEdge.setSettingsOpen(true);
  await fillSettingsForm();
}

function closeSettings() {
  appShell.classList.remove("settings-open");
  window.memoEdge.setSettingsOpen(false);
}

function beginTitleEdit() {
  const memo = activeMemo();
  if (!memo) return;
  activeTitleInput.value = memo.title || "";
  activeTitleButton.classList.add("hidden");
  activeTitleInput.classList.remove("hidden");
  activeTitleInput.focus();
  activeTitleInput.select();
}

function commitTitleEdit() {
  const memo = activeMemo();
  if (!memo) return;
  memo.title = normalizeMemoTitle(activeTitleInput.value, "메모");
  memo.updatedAt = Date.now();
  activeLabel.textContent = memo.title;
  activeTitleInput.value = memo.title;
  activeTitleInput.classList.add("hidden");
  activeTitleButton.classList.remove("hidden");
  renderHandles();
  renderAllMemoList();
  renderIndexManager();
  saveState();
}

function renameMemo(id, fallbackIndex = 0) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo) return;
  const nextTitle = window.prompt("메모 이름을 바꿉니다.", memo.title || `메모 ${fallbackIndex + 1}`);
  if (nextTitle === null) return;
  memo.title = normalizeMemoTitle(nextTitle, `메모 ${fallbackIndex + 1}`);
  memo.updatedAt = Date.now();
  if (memo.id === state.activeId) {
    activeLabel.textContent = memo.title;
    activeTitleInput.value = memo.title;
  }
  renderHandles();
  renderAllMemoList();
  renderIndexManager();
  saveState();
}

function cancelTitleEdit() {
  const memo = activeMemo();
  activeTitleInput.value = memo?.title || "";
  activeTitleInput.classList.add("hidden");
  activeTitleButton.classList.remove("hidden");
}

function normalizeShortcutKey(key) {
  const keyMap = {
    " ": "Space",
    Spacebar: "Space",
    Esc: "Escape",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Delete: "Delete",
    Backspace: "Backspace",
    Enter: "Enter",
    Tab: "Tab",
    "+": "Plus",
    "-": "-",
    "=": "=",
    ",": ",",
    ".": ".",
    "/": "/",
    ";": ";",
    "'": "'",
    "[": "[",
    "]": "]",
    "\\": "\\"
  };
  if (keyMap[key]) return keyMap[key];
  if (/^F\d{1,2}$/i.test(key)) return key.toUpperCase();
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function acceleratorFromEvent(event) {
  const modifierKeys = ["Control", "Shift", "Alt", "Meta", "OS"];
  if (modifierKeys.includes(event.key)) return "";

  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push("CommandOrControl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  const key = normalizeShortcutKey(event.key);
  if (!key) return "";
  parts.push(key);
  return [...new Set(parts)].join("+");
}

function setupShortcutCapture(input, fallbackValue) {
  input.dataset.previousValue = input.value || fallbackValue;
  input.addEventListener("focus", () => {
    input.dataset.previousValue = input.value || fallbackValue;
    input.select();
  });
  input.addEventListener("keydown", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      input.value = input.dataset.previousValue || fallbackValue;
      input.blur();
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      input.value = "";
      return;
    }

    const accelerator = acceleratorFromEvent(event);
    if (!accelerator) return;
    input.value = accelerator;
    input.dataset.previousValue = accelerator;
  });
}

function displayLabel(display) {
  const width = display.bounds?.width || 0;
  const height = display.bounds?.height || 0;
  return `${display.label} · ${width}×${height}`;
}

async function fillSettingsForm() {
  const shellState = await window.memoEdge.getShellState();
  state.shell = normalizeShellSettings({ ...state.shell, ...(shellState.settings || {}) });
  state.shell.followCursorDisplay = shellState.settings?.followCursorDisplay !== false;
  syncShellLayoutClasses();

  displaySelect.innerHTML = "";
  const auto = document.createElement("option");
  auto.value = "auto";
  auto.textContent = "자동 (마우스가 있는 모니터)";
  displaySelect.appendChild(auto);

  for (const display of shellState.displays || []) {
    const option = document.createElement("option");
    option.value = String(display.id);
    option.textContent = displayLabel(display);
    displaySelect.appendChild(option);
  }

  displaySelect.value = state.shell.followCursorDisplay ? "auto" : String(state.shell.targetDisplayId);
  dockEdgeSelect.value = state.shell.dockEdge;
  visibilityModeSelect.value = state.shell.visibilityMode;
  anchorSelect.value = state.shell.edgeAnchor;
  lengthSelect.value = state.shell.lengthMode;
  state.memoDefaults = normalizeMemoDefaults(state.memoDefaults);
  state.shell.panelWidth = normalizePanelWidth(state.shell.panelWidth);
  state.shell.panelHeight = normalizePanelHeight(state.shell.panelHeight);
  if (panelWidthInput) panelWidthInput.value = String(state.shell.panelWidth);
  panelHeightInput.value = String(state.shell.panelHeight);
  if (panelPositionInput) panelPositionInput.value = String(state.shell.edgeOffset);
  syncPanelSizeFields();
  applyCommonTypography();
  populateFontFamilySelect(defaultFontFamilySelect, state.memoDefaults.fontFamily);
  populateFontSizeSelect(defaultFontSizeSelect, state.memoDefaults.fontSize);
  populateLineSpacingSelect(defaultLineSpacingSelect, state.memoDefaults.lineSpacing);
  cycleShortcutInput.value = state.shell.cycleShortcut || DEFAULT_CYCLE_SHORTCUT;
  hideShortcutInput.value = state.shell.hideShortcut || DEFAULT_HIDE_SHORTCUT;
  cycleShortcutInput.dataset.previousValue = cycleShortcutInput.value;
  hideShortcutInput.dataset.previousValue = hideShortcutInput.value;
  startupGuideInput.checked = state.prefs?.showLaunchGuideOnStartup !== false;
  await ensureStartupEnabled();

  renderIndexManager();
}

function renderIndexManager() {
  if (!indexManagerList) return;
  indexManagerList.innerHTML = "";
  floatingLimitText.textContent = `${state.floatingIds.length}/${MAX_FLOATING}개 플로팅 중`;

  state.indexes.forEach((memo, index) => {
    const row = document.createElement("article");
    row.className = "index-item";
    if (memo.id === state.activeId) row.classList.add("active");

    const main = document.createElement("div");
    main.className = "index-item-main";

    const titleInput = document.createElement("input");
    titleInput.className = "index-title-input";
    titleInput.type = "text";
    titleInput.maxLength = MAX_TITLE_LENGTH;
    titleInput.value = memo.title;
    titleInput.addEventListener("input", () => {
      memo.title = normalizeMemoTitle(titleInput.value, `메모 ${index + 1}`);
      memo.updatedAt = Date.now();
      renderHandles();
      renderAllMemoList();
      if (memo.id === state.activeId) activeLabel.textContent = memo.title;
      scheduleSave();
    });

    const floatingLabel = document.createElement("label");
    floatingLabel.className = "floating-toggle";
    const floatingInput = document.createElement("input");
    floatingInput.type = "checkbox";
    floatingInput.checked = state.floatingIds.includes(memo.id);
    floatingInput.disabled =
      (!floatingInput.checked && state.floatingIds.length >= MAX_FLOATING) ||
      (floatingInput.checked && state.floatingIds.length <= 1);
    floatingInput.addEventListener("change", () => {
      setFloatingMemo(memo.id, floatingInput.checked);
    });
    floatingLabel.append(floatingInput, document.createTextNode("플로팅"));

    const orderControls = document.createElement("div");
    orderControls.className = "order-controls";
    const floatingPosition = state.floatingIds.indexOf(memo.id);
    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.className = "order-button";
    upButton.textContent = "↑";
    upButton.title = "플로팅 순서 위로";
    upButton.disabled = floatingPosition <= 0;
    upButton.addEventListener("click", () => moveFloatingMemo(memo.id, -1));

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "order-button";
    downButton.textContent = "↓";
    downButton.title = "플로팅 순서 아래로";
    downButton.disabled = floatingPosition < 0 || floatingPosition >= state.floatingIds.length - 1;
    downButton.addEventListener("click", () => moveFloatingMemo(memo.id, 1));
    orderControls.append(upButton, downButton);

    const detachButton = document.createElement("button");
    detachButton.type = "button";
    detachButton.className = "detach-index-button";
    detachButton.textContent = "팝업";
    detachButton.title = "팝업으로 열기";
    detachButton.addEventListener("click", () => detachMemoToWindow(memo.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-index-button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", () => deleteIndex(memo.id));

    main.append(titleInput, floatingLabel, orderControls, detachButton, deleteButton);

    const colorRow = document.createElement("div");
    colorRow.className = "color-row";
    COLOR_PRESETS.forEach((color) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "color-swatch";
      if (memo.color.toLowerCase() === color.toLowerCase()) swatch.classList.add("selected");
      swatch.style.background = color;
      swatch.title = color;
      swatch.addEventListener("click", () => {
        updateMemoColor(memo.id, color);
      });
      colorRow.appendChild(swatch);
    });

    const customColor = document.createElement("input");
    customColor.className = "custom-color";
    customColor.type = "color";
    customColor.value = normalizeHexColor(memo.color, COLOR_PRESETS[index % COLOR_PRESETS.length]);
    customColor.title = "직접 색상 선택";
    customColor.addEventListener("input", () => {
      updateMemoColor(memo.id, customColor.value);
    });
    colorRow.appendChild(customColor);

    const typeRow = document.createElement("div");
    typeRow.className = "type-row";

    const fontSizeLabel = document.createElement("label");
    fontSizeLabel.className = "compact-field";
    fontSizeLabel.textContent = "크기";
    const fontSizeInput = document.createElement("input");
    fontSizeInput.type = "number";
    fontSizeInput.min = "10";
    fontSizeInput.max = "32";
    fontSizeInput.step = "1";
    fontSizeInput.value = String(normalizeFontSize(memo.fontSize));
    fontSizeInput.addEventListener("input", () => updateMemoTypography(memo.id, { fontSize: fontSizeInput.value }));
    fontSizeLabel.appendChild(fontSizeInput);

    const fontFamilyLabel = document.createElement("label");
    fontFamilyLabel.className = "compact-field wide";
    fontFamilyLabel.textContent = "글씨체";
    const fontFamilySelect = document.createElement("select");
    populateFontFamilySelect(fontFamilySelect, memo.fontFamily);
    fontFamilySelect.addEventListener("change", () => updateMemoTypography(memo.id, { fontFamily: fontFamilySelect.value }));
    fontFamilyLabel.appendChild(fontFamilySelect);

    const lineSpacingLabel = document.createElement("label");
    lineSpacingLabel.className = "compact-field";
    lineSpacingLabel.textContent = "줄간격";
    const lineSpacingSelect = document.createElement("select");
    populateLineSpacingSelect(lineSpacingSelect, memo.lineSpacing);
    lineSpacingSelect.addEventListener("change", () =>
      updateMemoTypography(memo.id, { lineSpacing: lineSpacingSelect.value })
    );
    lineSpacingLabel.appendChild(lineSpacingSelect);

    typeRow.append(fontSizeLabel, fontFamilyLabel, lineSpacingLabel);

    row.append(main, colorRow, typeRow);
    indexManagerList.appendChild(row);
  });
}

function moveFloatingMemo(id, delta) {
  const currentIndex = state.floatingIds.indexOf(id);
  if (currentIndex < 0) return false;
  const nextIndex = currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= state.floatingIds.length) return false;
  const nextIds = [...state.floatingIds];
  const [moved] = nextIds.splice(currentIndex, 1);
  nextIds.splice(nextIndex, 0, moved);
  state.floatingIds = nextIds;
  renderHandles();
  renderAllMemoList();
  renderIndexManager();
  saveState();
  return true;
}

function setFloatingMemo(id, shouldFloat) {
  const exists = state.indexes.some((memo) => memo.id === id);
  if (!exists) return;
  persistEditor();

  const alreadyFloating = state.floatingIds.includes(id);
  if (shouldFloat && !alreadyFloating && state.floatingIds.length < MAX_FLOATING) {
    state.floatingIds.push(id);
  }
  if (!shouldFloat && alreadyFloating && state.floatingIds.length > 1) {
    state.floatingIds = state.floatingIds.filter((floatingId) => floatingId !== id);
  }

  if (!state.floatingIds.includes(state.activeId)) {
    state.activeId = state.floatingIds[0];
    renderActiveMemo();
  } else {
    renderHandles();
    renderAllMemoList();
    renderIndexManager();
  }
  saveState();
}

function updateMemoColor(id, color) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo) return;
  memo.color = normalizeHexColor(color, memo.color);
  memo.updatedAt = Date.now();
  if (memo.id === state.activeId) applyMemoTheme(memo);
  renderHandles();
  renderAllMemoList();
  renderIndexManager();
  scheduleSave();
}

function updateMemoTypography(id, partial) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo) return;
  if (partial.fontSize !== undefined) memo.fontSize = normalizeFontSize(partial.fontSize);
  if (partial.fontFamily !== undefined) memo.fontFamily = normalizeFontFamily(partial.fontFamily);
  if (partial.lineSpacing !== undefined) memo.lineSpacing = normalizeLineSpacing(partial.lineSpacing);
  memo.updatedAt = Date.now();
  if (memo.id === state.activeId) {
    applyMemoTypography(memo);
    syncToolbarTypography();
  }
  if (appShell.classList.contains("settings-open")) renderIndexManager();
  scheduleSave();
}

function deleteIndex(id) {
  detachedMemoPlacements.delete(id);
  if (state.indexes.length <= 1) {
    const memo = state.indexes[0];
    memo.title = "메모 1";
    memo.html = "";
    memo.color = COLOR_PRESETS[0];
    memo.fontSize = normalizeFontSize(state.memoDefaults?.fontSize);
    memo.fontFamily = normalizeFontFamily(state.memoDefaults?.fontFamily);
    memo.lineSpacing = normalizeLineSpacing(state.memoDefaults?.lineSpacing);
    state.activeId = memo.id;
    state.floatingIds = [memo.id];
    renderActiveMemo();
    saveState();
    return;
  }

  const deleteTarget = state.indexes.find((memo) => memo.id === id);
  if (!deleteTarget) return;
  const confirmed = window.confirm(`"${deleteTarget.title}" 메모를 삭제할까요?`);
  if (!confirmed) return;

  state.indexes = state.indexes.filter((memo) => memo.id !== id);
  state.floatingIds = state.floatingIds.filter((floatingId) => floatingId !== id);
  if (!state.floatingIds.length) state.floatingIds = [state.indexes[0].id];
  if (state.activeId === id) state.activeId = state.floatingIds[0];
  renderActiveMemo();
  saveState();
}

async function applySettings() {
  const selectedDisplay = displaySelect.value;
  const cycleShortcut = cycleShortcutInput.value.trim() || DEFAULT_CYCLE_SHORTCUT;
  const hideShortcut = hideShortcutInput.value.trim() || DEFAULT_HIDE_SHORTCUT;
  state.memoDefaults = normalizeMemoDefaults({
    fontFamily: defaultFontFamilySelect.value,
    fontSize: defaultFontSizeSelect.value,
    lineSpacing: defaultLineSpacingSelect.value
  });
  state.prefs = normalizeAppPrefs({
    ...state.prefs,
    showLaunchGuideOnStartup: startupGuideInput.checked,
    startupDefaultApplied: true,
    startupUserChoiceSet: false
  });
  if (startupInput) startupInput.checked = true;

  if (cycleShortcut.toLowerCase() === hideShortcut.toLowerCase()) {
    setSettingsStatus("두 단축키는 서로 달라야 합니다.", 0);
    return;
  }

  const nextShell = {
    dockEdge: dockEdgeSelect.value,
    visibilityMode: visibilityModeSelect.value,
    edgeAnchor: anchorSelect.value,
    edgeOffset: anchorSelect.value === "custom" ? normalizeEdgeOffset(panelPositionInput?.value, state.shell.edgeOffset) : 0,
    lengthMode: lengthSelect.value,
    panelWidth: normalizePanelWidth(panelWidthInput?.value),
    panelHeight: normalizePanelHeight(panelHeightInput.value),
    cycleShortcut,
    hideShortcut,
    followCursorDisplay: selectedDisplay === "auto",
    targetDisplayId: selectedDisplay === "auto" ? null : Number(selectedDisplay)
  };

  const result = await window.memoEdge.updateSettings(nextShell);
  await ensureStartupEnabled();
  state.shell = normalizeShellSettings({ ...state.shell, ...(result.settings || nextShell) });
  state.shell.panelWidth = normalizePanelWidth(state.shell.panelWidth);
  state.shell.panelHeight = normalizePanelHeight(state.shell.panelHeight);
  syncShellLayoutClasses();
  applyCommonTypography();
  activeSubtitle.textContent = `${displayShortcut(state.shell.cycleShortcut || DEFAULT_CYCLE_SHORTCUT)}로 다음 플로팅 메모 열기`;
  saveState();

  const failures = [result.shortcutStatus?.cycle, result.shortcutStatus?.hide]
    .filter((item) => item && !item.ok)
    .map((item) => item.message);
  setSettingsStatus(failures.length ? failures.join(" / ") : "적용됨");
}

async function exportData() {
  const result = await window.memoEdge.exportData(backupPayload());
  if (result?.canceled) return;
  setSettingsStatus(result?.ok ? "백업 저장됨" : `백업 실패: ${result?.message || "알 수 없음"}`, result?.ok ? 2500 : 0);
}

async function importData() {
  const result = await window.memoEdge.importData();
  if (result?.canceled) return;
  if (!result?.ok) {
    setSettingsStatus(`복원 실패: ${result?.message || "알 수 없음"}`, 0);
    return;
  }
  const confirmed = window.confirm("현재 메모와 설정을 백업 파일 내용으로 교체할까요?");
  if (!confirmed) return;
  try {
    await applyImportedState(result.data);
    setSettingsStatus("백업 복원됨");
  } catch (error) {
    setSettingsStatus(`복원 실패: ${error?.message || error}`, 0);
  }
}

async function resetSettingsOnly() {
  const confirmed = window.confirm("메모 내용은 유지하고 위치, 단축키, 글씨 기본값, 안내 설정만 초기화할까요?");
  if (!confirmed) return;

  state.shell = normalizeShellSettings(defaultShellSettings);
  state.memoDefaults = normalizeMemoDefaults(defaultMemoDefaults);
  state.prefs = normalizeAppPrefs({
    ...defaultAppPrefs,
    startupDefaultApplied: true,
    startupUserChoiceSet: false,
    initialSingleMemoApplied: true,
    welcomeMemoApplied: true
  });
  const result = await window.memoEdge.updateSettings(state.shell);
  state.shell = normalizeShellSettings({ ...state.shell, ...(result.settings || {}) });
  await window.memoEdge.setStartup(true);
  saveState();
  renderActiveMemo();
  await fillSettingsForm();
  setSettingsStatus("설정 초기화됨");
}

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => execCommand(button.dataset.command));
});

editor.addEventListener("input", () => {
  persistEditor();
  pushEditorHistory();
  rememberEditorSelection();
  updateTableTools();
});
editor.addEventListener("keydown", handleEditorKeydown);
editor.addEventListener("keyup", () => {
  rememberEditorSelection();
  updateTableTools();
});
editor.addEventListener("mouseup", () => {
  rememberEditorSelection();
  updateTableTools();
});
editor.addEventListener("focus", () => {
  rememberEditorSelection();
  updateTableTools();
});
editor.addEventListener("click", (event) => {
  if (event.target.closest(".check-box")) {
    event.preventDefault();
    toggleChecklistItem(event.target);
  }
  updateTableTools();
});
document.addEventListener("selectionchange", () => {
  if (document.activeElement === editor || editor.contains(document.activeElement)) updateTableTools();
});
document.addEventListener("pointerup", endHandleDrag);
document.addEventListener("pointercancel", endHandleDrag);
document.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (
    editor.contains(target) ||
    tableTools?.contains(target) ||
    tablePicker?.contains(target) ||
    tableButton?.contains(target)
  ) {
    return;
  }
  lastTableCell = null;
  setTableToolsOpen(false);
});
collapseButton.addEventListener("click", () => setExpanded(false));
settingsButton.addEventListener("click", openSettings);
deleteActiveMemoButton?.addEventListener("click", () => {
  const memo = activeMemo();
  if (memo) deleteIndex(memo.id);
});
closeSettingsButton.addEventListener("click", closeSettings);
allMemosButton.addEventListener("click", () => setMemoListOpen(memoListPanel.classList.contains("hidden")));
closeMemoListButton.addEventListener("click", () => setMemoListOpen(false));
addIndexButton.addEventListener("click", addIndex);
addSettingsIndexButton.addEventListener("click", addIndex);
lengthSelect.addEventListener("change", syncPanelSizeFields);
anchorSelect.addEventListener("change", syncPanelSizeFields);
panelPositionInput?.addEventListener("input", () => {
  anchorSelect.value = "custom";
  syncPanelSizeFields();
});
[panelResizeGrip, panelResizeWidthGrip, panelResizeCornerGrip].filter(Boolean).forEach((grip) => {
  grip.addEventListener("pointerdown", beginPanelResize);
});
activeTitleButton.addEventListener("click", beginTitleEdit);
activeTitleInput.addEventListener("blur", commitTitleEdit);
activeTitleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    commitTitleEdit();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    cancelTitleEdit();
  }
});
undoButton.addEventListener("click", undoEditor);
redoButton.addEventListener("click", redoEditor);
bulletButton.addEventListener("click", () => execCommand("insertUnorderedList"));
checkButton.addEventListener("click", insertChecklist);
tableButton?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  rememberEditorSelection();
});
tableButton?.addEventListener("click", () => {
  rememberEditorSelection();
  setTablePickerOpen(tablePicker?.classList.contains("hidden"));
});
insertTableButton?.addEventListener("click", insertTable);
cancelTableButton?.addEventListener("click", () => {
  setTablePickerOpen(false);
  editor.focus();
});
tablePicker?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    insertTable();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    setTablePickerOpen(false);
    editor.focus();
  }
});
tableTools?.addEventListener("mousedown", (event) => {
  if (event.target.closest("input, label")) return;
  event.preventDefault();
});
addTableRowButton?.addEventListener("click", addTableRow);
addTableColButton?.addEventListener("click", addTableColumn);
deleteTableRowButton?.addEventListener("click", deleteTableRow);
deleteTableColButton?.addEventListener("click", deleteTableColumn);
mergeTableCellsButton?.addEventListener("click", mergeTableCells);
mergeTableDownButton?.addEventListener("click", mergeTableCellsDown);
splitTableCellButton?.addEventListener("click", splitTableCell);
tableBorderColorInput?.addEventListener("input", applyTableBorder);
tableBorderWidthInput?.addEventListener("input", applyTableBorder);
tableCellColorInput?.addEventListener("input", applyTableCellColor);
tableFillColorInput?.addEventListener("input", applyTableFillColor);
clearTableCellColorButton?.addEventListener("click", clearTableCellColor);
deleteTableButton?.addEventListener("click", deleteTable);
fontSizeToolbarSelect.addEventListener("change", () => {
  const memo = activeMemo();
  if (!memo) return;
  updateMemoTypography(memo.id, { fontSize: fontSizeToolbarSelect.value });
});
fontFamilyToolbarSelect.addEventListener("change", () => {
  const memo = activeMemo();
  if (!memo) return;
  updateMemoTypography(memo.id, { fontFamily: fontFamilyToolbarSelect.value });
});
lineSpacingToolbarSelect.addEventListener("change", () => {
  const memo = activeMemo();
  if (!memo) return;
  updateMemoTypography(memo.id, { lineSpacing: lineSpacingToolbarSelect.value });
});
clearButton.addEventListener("click", clearEditorPreservingUndo);
applySettingsButton.addEventListener("click", applySettings);
exportDataButton?.addEventListener("click", exportData);
importDataButton?.addEventListener("click", importData);
resetSettingsButton?.addEventListener("click", resetSettingsOnly);
launchGuideOpenButton?.addEventListener("click", () => {
  closeLaunchGuide();
  cycleFloatingMemo();
});
launchGuideSettingsButton?.addEventListener("click", () => {
  closeLaunchGuide();
  openSettings();
});
launchGuideBlogButton?.addEventListener("click", () => window.memoEdge.openExternal("https://blog.naver.com/sap_y"));
closeLaunchGuideButton?.addEventListener("click", closeLaunchGuide);
setupShortcutCapture(cycleShortcutInput, DEFAULT_CYCLE_SHORTCUT);
setupShortcutCapture(hideShortcutInput, DEFAULT_HIDE_SHORTCUT);

window.memoEdge.onExpandedChanged((nextExpanded) => {
  expanded = nextExpanded;
  syncShellLayoutClasses();
  appShell.classList.toggle("expanded", expanded);
  if (!expanded) closeSettings();
});

window.memoEdge.onCycleFloating(cycleFloatingMemo);
window.memoEdge.onOpenSettings(openSettings);
window.memoEdge.onDetachedMemoUpdated?.(applyDetachedMemoUpdate);
window.memoEdge.onDetachedMemoAttached?.((id) => reattachDetachedMemo(id));

async function initialize() {
  try {
    const payload = await window.memoEdge.listSystemFonts();
    if (payload?.ok && Array.isArray(payload.fonts) && payload.fonts.length) {
      systemFonts = [
        ...new Set(
          payload.fonts
            .map(normalizeFontFamily)
            .filter((font) => font && !isBrokenFontName(font))
        )
      ];
    }
  } catch {
    systemFonts = [DEFAULT_FONT_FAMILY, "GulimChe", "Malgun Gothic", "Arial", "Calibri", "Consolas"];
  }
  const shellState = await window.memoEdge.getShellState();
  state.shell = normalizeShellSettings({ ...state.shell, ...(shellState.settings || {}) });
  state.shell.panelWidth = normalizePanelWidth(state.shell.panelWidth);
  state.shell.panelHeight = normalizePanelHeight(state.shell.panelHeight);
  state.memoDefaults = normalizeMemoDefaults(state.memoDefaults);
  state.prefs = normalizeAppPrefs(state.prefs);
  await applyWelcomeMemoIfNeeded();

  await ensureStartupEnabled();

  if (startupGuideInput) startupGuideInput.checked = state.prefs.showLaunchGuideOnStartup;
  syncShellLayoutClasses();
  applyCommonTypography();
  expanded = Boolean(shellState.expanded);
  appShell.classList.toggle("expanded", expanded);
  renderActiveMemo();
  saveState();
  setTimeout(() => {
    showLaunchGuide();
  }, 350);
}

initialize();
