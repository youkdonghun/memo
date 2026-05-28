const STORAGE_KEY = "memo-bom-state-v2";
const LEGACY_STORAGE_KEY = "memo-bom-state-v1";
const STATE_VERSION = 9;
const MAX_FLOATING = 5;
const HOVER_DELAY_MS = 200;
const HANDLE_CLICK_DELAY_MS = 220;
const DEFAULT_CYCLE_SHORTCUT = "CommandOrControl+Shift+D";
const DEFAULT_HIDE_SHORTCUT = "CommandOrControl+Shift+F";
const DEFAULT_FIND_SHORTCUT = "CommandOrControl+F";
const DEFAULT_FONT_SIZE = 15;
const DEFAULT_COMMON_FONT_SIZE = 12;
const DEFAULT_FONT_FAMILY = "Gulim";
const DEFAULT_LINE_SPACING = 1.5;
const DEFAULT_PANEL_WIDTH = 480;
const DEFAULT_PANEL_HEIGHT = 520;
const SETTINGS_MIN_PANEL_WIDTH = DEFAULT_PANEL_WIDTH;
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 1200;
const MIN_PANEL_HEIGHT = 180;
const MAX_PANEL_HEIGHT = 1400;
const MAX_TITLE_LENGTH = 80;
const DETACH_DRAG_THRESHOLD = 78;
const CHECK_TEXT_PLACEHOLDER = "\u200b";
const HANDLE_TITLE_PREFIX_LENGTH = 5;
const MAX_PASTED_TABLE_ROWS = 80;
const MAX_PASTED_TABLE_COLS = 40;
const SAVE_DEBOUNCE_MS = 450;
const HISTORY_DEBOUNCE_MS = 650;
const MAX_EDITOR_HISTORY_ENTRIES = 35;
const MAX_EDITOR_HISTORY_BYTES = 1800000;
const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 40, 48, 64, 72, 96];
const LINE_SPACING_OPTIONS = [0.8, 1, 1.15, 1.5, 2, 2.5, 3, 3.5, 4];
const HANDLE_REORDER_THRESHOLD = 8;
const MAX_RECENT_TEXT_COLORS = 6;
const CARRIED_TYPING_STYLE_PROPERTIES = ["fontFamily", "fontSize", "color"];
const CARRIED_LIST_BLOCK_STYLE_PROPERTIES = ["fontFamily", "fontSize", "color", "lineHeight"];
const PERF_WARN_MS = 16;
const PERF_SLOW_WARN_MS = 50;
const TEXT_COLOR_PRESETS = [
  "#283044",
  "#111827",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff"
];

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
  findShortcut: DEFAULT_FIND_SHORTCUT,
  anchor: "middle",
  manualYOffset: 0,
  followCursorDisplay: false,
  targetDisplayId: null
};

const defaultMemoDefaults = {
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY,
  lineSpacing: DEFAULT_LINE_SPACING
};

const defaultAppPrefs = {
  showLaunchGuideOnStartup: false,
  toolbarCollapsed: false,
  commonFontFamily: DEFAULT_FONT_FAMILY,
  commonFontSize: DEFAULT_COMMON_FONT_SIZE,
  startupDefaultApplied: false,
  startupUserChoiceSet: false,
  welcomeMemoApplied: true,
  initialSingleMemoApplied: true,
  recentTextColors: []
};

function createId() {
  return `memo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function measureInteraction(label, fn, threshold = PERF_WARN_MS) {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const elapsed = performance.now() - start;
    if (elapsed > threshold) {
      console.warn(`[perf] ${label}: ${Math.round(elapsed * 10) / 10}ms`);
    }
  }
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
    backgroundImage: "",
    backgroundSourceImage: "",
    backgroundCrop: null,
    backgroundOpacity: 0,
    backgroundTop: 0,
    backgroundCoverage: 1,
    backgroundPositionX: 0.5,
    backgroundPositionY: 0.5,
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
let historyTimer = null;
let lastSavedStateJson = "";
let draggingHandle = false;
let systemFonts = [DEFAULT_FONT_FAMILY, "GulimChe", "Malgun Gothic", "Arial", "Calibri", "Consolas"];
let customFonts = [];
let editorHistory = [];
let editorHistoryIndex = -1;
let applyingHistory = false;
let pendingEditorHistorySnapshot = null;
let pendingEditorHistoryNeedsSnapshot = false;
let editorDirty = false;
let toolbarRefreshFrame = null;
let tableToolsRefreshFrame = null;
let panelResizeState = null;
let pendingResizeSize = null;
let resizeFrame = null;
let temporarySettingsPanelWidth = null;
let savedEditorRange = null;
let handleDragState = null;
let handleClickTimer = null;
let sideTitleEditor = null;
let lastTableCell = null;
let tableSelectionState = null;
let tableDragSelectState = null;
let lastRenderedTableSelection = { table: null, cells: new Set(), activeCell: null };
let detachedMemoPlacements = new Map();
let pendingNudgeDelta = 0;
let nudgeFrame = null;
let railPositionDragState = null;
let backgroundCropperState = null;

const appShell = document.getElementById("appShell");
const handleRail = document.getElementById("handleRail");
const activeTitleButton = document.getElementById("activeTitleButton");
const activeTitleInput = document.getElementById("activeTitleInput");
const activeLabel = document.getElementById("activeLabel");
const activeSubtitle = document.getElementById("activeSubtitle");
const allMemosButton = document.getElementById("allMemosButton");
const activePopupButton = document.getElementById("activePopupButton");
const memoListPanel = document.getElementById("memoListPanel");
const closeMemoListButton = document.getElementById("closeMemoListButton");
const allMemoList = document.getElementById("allMemoList");
const allMemoListStatus = document.getElementById("allMemoListStatus");
const memoSearchPanel = document.getElementById("memoSearchPanel");
const closeMemoSearchButton = document.getElementById("closeMemoSearchButton");
const memoSearchInput = document.getElementById("memoSearchInput");
const memoSearchSummary = document.getElementById("memoSearchSummary");
const memoSearchResults = document.getElementById("memoSearchResults");
const editor = document.getElementById("editor");
const panelResizeGrip = document.getElementById("panelResizeGrip");
const saveStatus = document.getElementById("saveStatus");
const collapseButton = document.getElementById("collapseButton");
const toolbarToggleButton = document.getElementById("toolbarToggleButton");
const settingsButton = document.getElementById("settingsButton");
const deleteActiveMemoButton = document.getElementById("deleteActiveMemoButton");
const closeSettingsButton = document.getElementById("closeSettingsButton");
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
const tableCellColorButtons = document.querySelectorAll("[data-table-cell-color]");
const clearTableCellColorButton = document.getElementById("clearTableCellColorButton");
const deleteTableButton = document.getElementById("deleteTableButton");
const textColorInput = document.getElementById("textColorInput");
const textColorPalette = document.getElementById("textColorPalette");
const backgroundButton = document.getElementById("backgroundButton");
const backgroundCropper = document.getElementById("backgroundCropper");
const cropperTitle = document.getElementById("cropperTitle");
const cropperStage = document.getElementById("cropperStage");
const cropperImage = document.getElementById("cropperImage");
const cropperBox = document.getElementById("cropperBox");
const coveragePreview = document.getElementById("coveragePreview");
const coverageBox = document.getElementById("coverageBox");
const coverageImage = document.getElementById("coverageImage");
const cropperApplyButton = document.getElementById("cropperApplyButton");
const cropperCancelButton = document.getElementById("cropperCancelButton");
const cropperResetButton = document.getElementById("cropperResetButton");
const cropperClearBackgroundButton = document.getElementById("cropperClearBackgroundButton");
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
const commonFontFamilySelect = document.getElementById("commonFontFamilySelect");
const commonFontSizeSelect = document.getElementById("commonFontSizeSelect");
const defaultFontSizeSelect = document.getElementById("defaultFontSizeSelect");
const defaultLineSpacingSelect = document.getElementById("defaultLineSpacingSelect");
const importFontButton = document.getElementById("importFontButton");
const cycleShortcutInput = document.getElementById("cycleShortcutInput");
const hideShortcutInput = document.getElementById("hideShortcutInput");
const findShortcutInput = document.getElementById("findShortcutInput");
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
const footerOpacityInput = document.getElementById("footerOpacityInput");
const footerOpacityValue = document.getElementById("footerOpacityValue");
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
        backgroundImage: normalizeAssetUrl(item.backgroundImage),
        backgroundSourceImage: normalizeAssetUrl(item.backgroundSourceImage || item.backgroundImage),
        backgroundCrop: normalizeBackgroundCrop(item.backgroundCrop),
        backgroundOpacity: normalizeOpacity(item.backgroundOpacity),
        backgroundTop: normalizeBackgroundTop(
          item.backgroundTop,
          item.backgroundCoverage,
          item.backgroundTop === undefined ? 1 - normalizeBackgroundCoverage(item.backgroundCoverage) : 0
        ),
        backgroundCoverage: normalizeBackgroundCoverage(item.backgroundCoverage),
        backgroundPositionX: normalizeBackgroundPosition(item.backgroundPositionX),
        backgroundPositionY: normalizeBackgroundPosition(item.backgroundPositionY),
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
        backgroundImage: normalizeAssetUrl(item.backgroundImage),
        backgroundSourceImage: normalizeAssetUrl(item.backgroundSourceImage || item.backgroundImage),
        backgroundCrop: normalizeBackgroundCrop(item.backgroundCrop),
        backgroundOpacity: normalizeOpacity(item.backgroundOpacity),
        backgroundTop: normalizeBackgroundTop(
          item.backgroundTop,
          item.backgroundCoverage,
          item.backgroundTop === undefined ? 1 - normalizeBackgroundCoverage(item.backgroundCoverage) : 0
        ),
        backgroundCoverage: normalizeBackgroundCoverage(item.backgroundCoverage),
        backgroundPositionX: normalizeBackgroundPosition(item.backgroundPositionX),
        backgroundPositionY: normalizeBackgroundPosition(item.backgroundPositionY),
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
  return Number.isFinite(numeric) ? clamp(Math.round(numeric), 8, 96) : DEFAULT_FONT_SIZE;
}

function normalizeLineSpacing(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LINE_SPACING;
  return Math.round(clamp(numeric, 0.8, 4) * 100) / 100;
}

function normalizeCommonFontSize(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(Math.round(numeric), 9, 24) : DEFAULT_COMMON_FONT_SIZE;
}

function normalizeOpacity(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(clamp(numeric, 0, 1) * 100) / 100 : 0;
}

function normalizeBackgroundCoverage(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(clamp(numeric, 0.1, 1) * 10000) / 10000 : 1;
}

function normalizeBackgroundTop(value, coverage = 1, fallback = 0) {
  const normalizedCoverage = normalizeBackgroundCoverage(coverage);
  const numeric = Number(value);
  const base = Number.isFinite(numeric) ? numeric : fallback;
  return Math.round(clamp(base, 0, 1 - normalizedCoverage) * 10000) / 10000;
}

function normalizeBackgroundPosition(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(clamp(numeric, 0, 1) * 10000) / 10000 : 0.5;
}

function normalizeAssetUrl(value) {
  return typeof value === "string" && /^(file|https?|data):/i.test(value.trim()) ? value.trim() : "";
}

function normalizeBackgroundCrop(value) {
  if (!value || typeof value !== "object") return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const width = Number(value.width);
  const height = Number(value.height);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  const normalizedX = clamp(x, 0, 0.99);
  const normalizedY = clamp(y, 0, 0.99);
  const normalizedWidth = clamp(width, 0.01, 1 - normalizedX);
  const normalizedHeight = clamp(height, 0.01, 1 - normalizedY);
  return {
    x: Math.round(normalizedX * 10000) / 10000,
    y: Math.round(normalizedY * 10000) / 10000,
    width: Math.round(normalizedWidth * 10000) / 10000,
    height: Math.round(normalizedHeight * 10000) / 10000
  };
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
    lengthMode: ["normal", "long", "custom"].includes(value.lengthMode)
      ? value.lengthMode
      : value.lengthMode === "short"
        ? "normal"
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
    findShortcut:
      typeof value.findShortcut === "string" && value.findShortcut.trim()
        ? value.findShortcut.trim()
        : DEFAULT_FIND_SHORTCUT,
    followCursorDisplay: value.followCursorDisplay === true,
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

function normalizeTextColorList(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((color) => normalizeHexColor(color, ""))
        .filter(Boolean)
    )
  ].slice(0, MAX_RECENT_TEXT_COLORS);
}

function normalizeAppPrefs(value = {}) {
  return {
    ...defaultAppPrefs,
    ...value,
    showLaunchGuideOnStartup: false,
    toolbarCollapsed: Boolean(value.toolbarCollapsed),
    commonFontFamily: normalizeFontFamily(value.commonFontFamily),
    commonFontSize: normalizeCommonFontSize(value.commonFontSize),
    startupDefaultApplied: Boolean(value.startupDefaultApplied),
    startupUserChoiceSet: Boolean(value.startupUserChoiceSet),
    welcomeMemoApplied: true,
    initialSingleMemoApplied: true,
    recentTextColors: normalizeTextColorList(value.recentTextColors)
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

function fontFaceCssString(value) {
  return JSON.stringify(String(value || "").replace(/["\\]/g, ""));
}

function registerCustomFonts(fonts = customFonts) {
  customFonts = Array.isArray(fonts)
    ? fonts
        .filter((font) => font && typeof font.family === "string" && typeof font.url === "string")
        .map((font) => ({ family: normalizeFontFamily(font.family), url: font.url }))
    : [];

  let style = document.getElementById("customFontFaces");
  if (!style) {
    style = document.createElement("style");
    style.id = "customFontFaces";
    document.head.appendChild(style);
  }
  style.textContent = customFonts
    .map((font) => `@font-face{font-family:${fontFaceCssString(font.family)};src:url("${font.url.replace(/"/g, "%22")}");font-display:swap;}`)
    .join("\n");
}

function applyCommonTypography() {
  const family = fontFamilyCss(state.prefs?.commonFontFamily || DEFAULT_FONT_FAMILY);
  document.documentElement.style.setProperty("--common-font-family", family);
  document.documentElement.style.setProperty("--common-font-size", `${normalizeCommonFontSize(state.prefs?.commonFontSize)}px`);
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
  appShell.classList.toggle("position-custom", shell.edgeAnchor === "custom");
  appShell.dataset.dockEdge = shell.dockEdge;
  appShell.dataset.visibilityMode = shell.visibilityMode;
  if (handleRail) {
    handleRail.classList.toggle("position-draggable", shell.edgeAnchor === "custom");
    handleRail.title = shell.edgeAnchor === "custom" ? "빈 영역을 드래그해서 위치를 이동" : "";
  }
  const panelWidth =
    appShell?.classList.contains("settings-open") && temporarySettingsPanelWidth
      ? Math.max(normalizePanelWidth(shell.panelWidth), temporarySettingsPanelWidth)
      : normalizePanelWidth(shell.panelWidth);
  document.documentElement.style.setProperty("--panel-width", `${panelWidth}px`);
  syncToolbarVisibility();
}

function syncToolbarVisibility() {
  const collapsed = Boolean(state.prefs?.toolbarCollapsed);
  appShell.classList.toggle("toolbar-collapsed", collapsed);
  if (toolbarToggleButton) {
    toolbarToggleButton.classList.toggle("active", !collapsed);
    toolbarToggleButton.title = collapsed ? "서식 도구 보이기" : "서식 도구 숨기기";
    toolbarToggleButton.setAttribute("aria-pressed", String(!collapsed));
  }
}

function isHorizontalDock() {
  const edge = normalizeDockEdge(state.shell?.dockEdge);
  return edge === "top" || edge === "bottom";
}

function fontOptionsWithCurrent(currentFont) {
  return [
    ...new Set(
      [
        DEFAULT_FONT_FAMILY,
        normalizeFontFamily(currentFont),
        ...customFonts.map((font) => normalizeFontFamily(font.family)),
        ...systemFonts.map(normalizeFontFamily)
      ]
        .filter((font) => font && !isBrokenFontName(font))
    )
  ];
}

function populateFontFamilySelect(select, currentFont) {
  if (!select) return;
  const current = normalizeFontFamily(currentFont);
  select.innerHTML = "";
  fontOptionsWithCurrent(current).forEach((font) => {
    const option = document.createElement("option");
    option.value = font;
    option.textContent = FONT_LABELS[font] || font;
    option.style.fontFamily = fontFamilyCss(font);
    select.appendChild(option);
  });
  select.value = current;
  select.style.fontFamily = fontFamilyCss(current);
}

function populateFontSizeSelect(select, currentSize) {
  if (!select) return;
  const current = normalizeFontSize(currentSize);
  if (select.tagName === "INPUT") {
    select.value = String(current);
    return;
  }
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
  if (!select) return;
  const current = normalizeLineSpacing(currentSpacing);
  if (select.tagName === "INPUT") {
    select.value = String(current);
    return;
  }
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
    edge: event.currentTarget?.dataset.resizeEdge || "",
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
  const pointerDeltaX = event.screenX - panelResizeState.startX;
  const pointerDeltaY = event.screenY - panelResizeState.startY;
  const edge = panelResizeState.edge;
  const deltaY = edge.includes("top") ? -pointerDeltaY : pointerDeltaY;
  const deltaX = edge.includes("left") ? -pointerDeltaX : pointerDeltaX;
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

function rgbaString(hex, alpha = 1) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}

function formatOpacityPercent(value) {
  return `${Math.round(normalizeOpacity(value) * 100)}%`;
}

function backgroundTransparencyState(memo) {
  const color = normalizeHexColor(memo?.color, "#fff4b8");
  const backgroundImage = normalizeAssetUrl(memo?.backgroundImage);
  const transparency = normalizeOpacity(memo?.backgroundOpacity);
  const coverage = backgroundImage ? normalizeBackgroundCoverage(memo?.backgroundCoverage) : 1;
  return {
    color,
    backgroundImage,
    top: backgroundImage ? normalizeBackgroundTop(memo?.backgroundTop, coverage) : 0,
    coverage,
    positionX: normalizeBackgroundPosition(memo?.backgroundPositionX),
    positionY: normalizeBackgroundPosition(memo?.backgroundPositionY),
    imageOpacity: backgroundImage ? 1 - transparency : 0,
    outsideColorAlpha: backgroundImage ? 1 - transparency : 0,
    panelColorAlpha: backgroundImage ? 0 : 1 - transparency
  };
}

function syncFooterOpacity(value) {
  const opacity = normalizeOpacity(value);
  if (footerOpacityInput) footerOpacityInput.value = String(opacity);
  if (footerOpacityValue) footerOpacityValue.textContent = `투명도 ${formatOpacityPercent(opacity)}`;
}

function hasMemoBackground(memo) {
  return Boolean(normalizeAssetUrl(memo?.backgroundImage || memo?.backgroundSourceImage));
}

function syncBackgroundControls(memo) {
  syncFooterOpacity(memo?.backgroundOpacity);
}

function saveState(options = {}) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (options.flushEditor !== false) flushEditorToMemo({ scheduleSave: false });
  const nextStateJson = measureInteraction("saveState.stringify", () => JSON.stringify(state), PERF_SLOW_WARN_MS);
  if (nextStateJson !== lastSavedStateJson) {
    localStorage.setItem(STORAGE_KEY, nextStateJson);
    lastSavedStateJson = nextStateJson;
  }
  saveStatus.textContent = "저장됨";
}

function scheduleSave() {
  saveStatus.textContent = "저장 중";
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, SAVE_DEBOUNCE_MS);
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
  state.prefs.initialSingleMemoApplied = true;
  state.prefs.welcomeMemoApplied = true;
  return false;
}

async function applyWelcomeMemoIfNeeded() {
  state.prefs = normalizeAppPrefs(state.prefs);
  await applyInitialSingleMemoIfNeeded();
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
  editorDirty = false;
  saveState({ flushEditor: false });
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

function markEditorDirty() {
  const memo = activeMemo();
  if (!memo || applyingHistory) return;
  editorDirty = true;
  memo.updatedAt = Date.now();
  scheduleEditorFlush();
}

function scheduleEditorFlush() {
  scheduleSave();
}

function flushEditorToMemo(options = {}) {
  const { force = false, scheduleSave: shouldScheduleSave = true } = options;
  const memo = activeMemo();
  if (!memo) return "";
  if (!force && !editorDirty) return memo.html || "";
  const snapshot = serializedEditorHtml();
  memo.html = snapshot;
  memo.updatedAt = Date.now();
  editorDirty = false;
  if (pendingEditorHistoryNeedsSnapshot && pendingEditorHistorySnapshot === null) {
    pendingEditorHistorySnapshot = snapshot;
    pendingEditorHistoryNeedsSnapshot = false;
  }
  if (shouldScheduleSave) scheduleSave();
  return snapshot;
}

function persistEditor() {
  return flushEditorToMemo({ force: true });
}

function serializedEditorHtml() {
  return measureInteraction("serializedEditorHtml", () => {
    const clone = editor.cloneNode(true);
    stripTransientTableSelection(clone);
    prepareChecklistItems(clone);
    clone.querySelectorAll(".check-text").forEach((text) => {
      text.textContent = text.textContent.replaceAll(CHECK_TEXT_PLACEHOLDER, "");
    });
    clone.querySelectorAll(".typing-style-anchor").forEach((anchor) => {
      anchor.textContent = anchor.textContent.replaceAll(CHECK_TEXT_PLACEHOLDER, "");
      if (!anchor.textContent.trim() && !anchor.querySelector("br, img, table")) anchor.remove();
    });
    return clone.innerHTML;
  }, PERF_WARN_MS);
}

function clearPendingEditorHistory() {
  if (historyTimer) clearTimeout(historyTimer);
  historyTimer = null;
  pendingEditorHistorySnapshot = null;
  pendingEditorHistoryNeedsSnapshot = false;
}

function flushPendingEditorHistory() {
  if (!historyTimer && pendingEditorHistorySnapshot === null && !pendingEditorHistoryNeedsSnapshot) return;
  const snapshot = pendingEditorHistorySnapshot ?? serializedEditorHtml();
  if (historyTimer) clearTimeout(historyTimer);
  historyTimer = null;
  pendingEditorHistorySnapshot = null;
  pendingEditorHistoryNeedsSnapshot = false;
  pushEditorHistory(snapshot);
}

function trimEditorHistory() {
  while (editorHistory.length > MAX_EDITOR_HISTORY_ENTRIES) {
    editorHistory.shift();
    editorHistoryIndex -= 1;
  }

  let totalBytes = editorHistory.reduce((sum, snapshot) => sum + snapshot.length * 2, 0);
  while (editorHistory.length > 1 && totalBytes > MAX_EDITOR_HISTORY_BYTES) {
    const removed = editorHistory.shift() || "";
    totalBytes -= removed.length * 2;
    editorHistoryIndex -= 1;
  }

  if (!editorHistory.length) {
    editorHistoryIndex = -1;
    return;
  }
  editorHistoryIndex = Math.max(0, Math.min(editorHistoryIndex, editorHistory.length - 1));
}

function pushEditorHistory(snapshot = serializedEditorHtml()) {
  if (applyingHistory) return;
  clearPendingEditorHistory();
  if (editorHistory[editorHistoryIndex] === snapshot) return;

  editorHistory = editorHistory.slice(0, editorHistoryIndex + 1);
  editorHistory.push(snapshot);
  editorHistoryIndex = editorHistory.length - 1;
  trimEditorHistory();
}

function queueEditorHistory(snapshot = null) {
  if (applyingHistory) return;
  if (historyTimer) clearTimeout(historyTimer);
  if (snapshot === null) {
    pendingEditorHistorySnapshot = null;
    pendingEditorHistoryNeedsSnapshot = true;
  } else {
    pendingEditorHistorySnapshot = snapshot;
    pendingEditorHistoryNeedsSnapshot = false;
  }
  historyTimer = setTimeout(() => {
    const nextSnapshot = pendingEditorHistorySnapshot ?? serializedEditorHtml();
    historyTimer = null;
    pendingEditorHistorySnapshot = null;
    pendingEditorHistoryNeedsSnapshot = false;
    pushEditorHistory(nextSnapshot);
  }, HISTORY_DEBOUNCE_MS);
}

function resetEditorHistory() {
  clearPendingEditorHistory();
  editorHistory = [serializedEditorHtml()];
  editorHistoryIndex = 0;
}

function applyEditorHistorySnapshot(snapshot) {
  clearPendingEditorHistory();
  applyingHistory = true;
  editor.innerHTML = snapshot || "";
  prepareChecklistItems();
  applyingHistory = false;
  editorDirty = true;
  flushEditorToMemo();
}

function undoEditor() {
  flushPendingEditorHistory();
  if (editorHistoryIndex <= 0) return;
  editorHistoryIndex -= 1;
  applyEditorHistorySnapshot(editorHistory[editorHistoryIndex]);
}

function redoEditor() {
  flushPendingEditorHistory();
  if (editorHistoryIndex >= editorHistory.length - 1) return;
  editorHistoryIndex += 1;
  applyEditorHistorySnapshot(editorHistory[editorHistoryIndex]);
}

function applyMemoTheme(memo) {
  const { color, backgroundImage, top, coverage, positionX, positionY, imageOpacity, outsideColorAlpha, panelColorAlpha } =
    backgroundTransparencyState(memo);
  const text = readableTextColor(color);
  document.documentElement.style.setProperty("--note-bg", color);
  document.documentElement.style.setProperty("--note-text", text);
  document.documentElement.style.setProperty("--accent", accentColor(color));
  document.documentElement.style.setProperty("--memo-bg-image", backgroundImage ? `url("${backgroundImage.replace(/"/g, "%22")}")` : "none");
  document.documentElement.style.setProperty("--memo-bg-opacity", String(imageOpacity));
  document.documentElement.style.setProperty("--memo-bg-top", `${Math.round(top * 10000) / 100}%`);
  document.documentElement.style.setProperty("--memo-bg-coverage", `${Math.round(coverage * 10000) / 100}%`);
  document.documentElement.style.setProperty("--memo-bg-position-x", `${Math.round(positionX * 10000) / 100}%`);
  document.documentElement.style.setProperty("--memo-bg-position-y", `${Math.round(positionY * 10000) / 100}%`);
  document.documentElement.style.setProperty("--memo-outside-bg", rgbaString(color, outsideColorAlpha));
  document.documentElement.style.setProperty("--memo-panel-bg", rgbaString(color, panelColorAlpha));
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
  const chars = Array.from(text);
  button.classList.toggle("handle-label-long", chars.length > 4);
  chars.forEach((char) => {
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

function clearHandleClickTimer() {
  if (!handleClickTimer) return;
  clearTimeout(handleClickTimer);
  handleClickTimer = null;
}

function positionSideTitleEditor(input, button) {
  const rect = button.getBoundingClientRect();
  const edge = normalizeDockEdge(state.shell.dockEdge);
  const gap = 12;
  const sideSpace =
    edge === "left"
      ? rect.left - gap - 8
      : edge === "right"
        ? window.innerWidth - rect.right - gap - 8
        : window.innerWidth - 16;
  const width = Math.max(132, Math.min(240, sideSpace));
  const height = 34;
  let left = rect.right + gap;
  let top = rect.top + rect.height / 2 - height / 2;

  if (edge === "left") {
    left = rect.left - width - gap;
  } else if (edge === "top") {
    left = rect.left + rect.width / 2 - width / 2;
    top = rect.bottom + gap;
  } else if (edge === "bottom") {
    left = rect.left + rect.width / 2 - width / 2;
    top = rect.top - height - gap;
  }

  input.style.width = `${width}px`;
  input.style.left = `${clamp(left, 8, window.innerWidth - width - 8)}px`;
  input.style.top = `${clamp(top, 8, window.innerHeight - height - 8)}px`;
}

function handleButtonForMemo(id) {
  return Array.from(handleRail.querySelectorAll(".edge-handle")).find((button) => button.dataset.id === id) || null;
}

function finishSideTitleEdit(commit = true) {
  if (!sideTitleEditor) return;
  const { input, button, memoId, fallbackTitle, openedSideSpace } = sideTitleEditor;
  sideTitleEditor = null;
  button?.classList.remove("side-title-editing");
  input.remove();
  if (openedSideSpace) window.memoEdge.setSideTitleEditOpen?.(false);

  if (!commit) return;
  const memo = state.indexes.find((item) => item.id === memoId);
  if (!memo) return;
  memo.title = normalizeMemoTitle(input.value, fallbackTitle);
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

async function startSideTitleEdit(id, fallbackIndex = 0, button = null) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo || !button) return;
  finishSideTitleEdit(false);
  clearHandleClickTimer();
  draggingHandle = false;
  handleDragState = null;

  let targetButton = button;
  let openedSideSpace = false;
  if (!expanded) {
    await window.memoEdge.setSideTitleEditOpen?.(true);
    openedSideSpace = true;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    targetButton = handleButtonForMemo(id) || button;
  }

  const fallbackTitle = `메모 ${fallbackIndex + 1}`;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "side-title-editor";
  input.value = memo.title || fallbackTitle;
  input.maxLength = MAX_TITLE_LENGTH;
  input.setAttribute("aria-label", "메모 이름 변경");
  document.body.appendChild(input);
  targetButton.classList.add("side-title-editing");
  sideTitleEditor = { input, button: targetButton, memoId: id, fallbackTitle, openedSideSpace };
  positionSideTitleEditor(input, targetButton);

  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      finishSideTitleEdit(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finishSideTitleEdit(false);
    }
  });
  input.addEventListener("pointerdown", (event) => event.stopPropagation());
  input.addEventListener("blur", () => finishSideTitleEdit(true));
  input.focus({ preventScroll: true });
  input.select();
}

function renderHandles() {
  clearHandleClickTimer();
  finishSideTitleEdit(false);
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

    const fallbackTitle = `메모 ${index + 1}`;
    const memoTitle = memo.title || fallbackTitle;
    button.title = `${memoTitle} - 클릭해서 열기`;
    button.setAttribute("aria-label", `${memoTitle}, 클릭해서 열기`);

    const bg = normalizeHexColor(memo.color, COLOR_PRESETS[index % COLOR_PRESETS.length]);
    button.style.setProperty("--handle-bg", bg);
    button.style.setProperty("--handle-text", readableTextColor(bg));

    button.addEventListener("click", () => {
      if (draggingHandle) return;
      clearHandleClickTimer();
      handleClickTimer = setTimeout(() => {
        handleClickTimer = null;
        selectMemo(memo.id);
        setExpanded(true);
      }, HANDLE_CLICK_DELAY_MS);
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
  const addIcon = document.createElement("span");
  addIcon.className = "add-handle-plus";
  addIcon.textContent = "+";
  addButton.appendChild(addIcon);
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
    backgroundImage: memo.backgroundImage || "",
    backgroundSourceImage: memo.backgroundSourceImage || "",
    backgroundCrop: normalizeBackgroundCrop(memo.backgroundCrop),
    backgroundOpacity: normalizeOpacity(memo.backgroundOpacity),
    backgroundTop: normalizeBackgroundTop(memo.backgroundTop, memo.backgroundCoverage),
    backgroundCoverage: normalizeBackgroundCoverage(memo.backgroundCoverage),
    backgroundPositionX: normalizeBackgroundPosition(memo.backgroundPositionX),
    backgroundPositionY: normalizeBackgroundPosition(memo.backgroundPositionY),
    html: memo.html || ""
  };
}

async function nudgeShellPosition(delta) {
  pendingNudgeDelta += delta;
  if (nudgeFrame) return;

  nudgeFrame = requestAnimationFrame(async () => {
    nudgeFrame = null;
    const nextDelta = pendingNudgeDelta;
    pendingNudgeDelta = 0;
    const result = await window.memoEdge.nudgeEdge(nextDelta);
    if (!result?.settings) return;
    state.shell = normalizeShellSettings({ ...state.shell, ...result.settings });
    syncShellLayoutClasses();
    if (panelPositionInput) panelPositionInput.value = String(state.shell.edgeOffset);
    if (anchorSelect) anchorSelect.value = state.shell.edgeAnchor;
    saveState();
  });
}

function beginRailPositionDrag(event) {
  if (event.button !== 0) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("button, input, select, .handle-slot")) return;

  const startAlong = isHorizontalDock() ? event.clientX : event.clientY;
  railPositionDragState = {
    pointerId: event.pointerId,
    lastAlong: startAlong,
    moved: false
  };
  handleRail.setPointerCapture?.(event.pointerId);
  handleRail.classList.add("position-dragging");
  event.preventDefault();
}

function moveRailPositionDrag(event) {
  if (!railPositionDragState || event.buttons !== 1) return;
  const currentAlong = isHorizontalDock() ? event.clientX : event.clientY;
  const delta = currentAlong - railPositionDragState.lastAlong;
  if (Math.abs(delta) < 2) return;
  railPositionDragState.lastAlong = currentAlong;
  railPositionDragState.moved = true;
  nudgeShellPosition(delta);
}

function endRailPositionDrag(event) {
  if (!railPositionDragState) return;
  try {
    handleRail.releasePointerCapture?.(railPositionDragState.pointerId ?? event.pointerId);
  } catch {
    // Pointer capture may already be gone if the window moved under the pointer.
  }
  railPositionDragState = null;
  handleRail.classList.remove("position-dragging");
}

async function detachMemoToWindow(id) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo || !window.memoEdge.detachMemo) return;
  if (memo.id === state.activeId) flushEditorToMemo();

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

function popupActiveMemo() {
  const memo = activeMemo();
  if (memo) detachMemoToWindow(memo.id);
}

function applyDetachedMemoUpdate(payload) {
  const memo = state.indexes.find((item) => item.id === payload?.id);
  if (!memo) return;
  memo.title = normalizeMemoTitle(payload.title, memo.title || "메모");
  memo.color = normalizeHexColor(payload.color, memo.color);
  memo.fontSize = normalizeFontSize(payload.fontSize);
  memo.fontFamily = normalizeFontFamily(payload.fontFamily);
  memo.lineSpacing = normalizeLineSpacing(payload.lineSpacing);
  memo.backgroundImage = normalizeAssetUrl(payload.backgroundImage);
  memo.backgroundSourceImage = normalizeAssetUrl(payload.backgroundSourceImage || payload.backgroundImage);
  memo.backgroundCrop = normalizeBackgroundCrop(payload.backgroundCrop);
  memo.backgroundOpacity = normalizeOpacity(payload.backgroundOpacity);
  memo.backgroundCoverage = normalizeBackgroundCoverage(payload.backgroundCoverage);
  memo.backgroundTop = normalizeBackgroundTop(payload.backgroundTop, memo.backgroundCoverage);
  memo.backgroundPositionX = normalizeBackgroundPosition(payload.backgroundPositionX);
  memo.backgroundPositionY = normalizeBackgroundPosition(payload.backgroundPositionY);
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
  activeSubtitle.textContent = "";
  syncBackgroundControls(memo);
  setTablePickerOpen(false);
  setTableToolsOpen(false);
  clearTableSelection();
  editor.innerHTML = memo.html || "";
  editorDirty = false;
  lastRenderedTableSelection = { table: null, cells: new Set(), activeCell: null };
  prepareChecklistItems();
  resetEditorHistory();
  updateToolbarCommandState();
  renderHandles();
  renderAllMemoList();
  renderIndexManager();
}

function selectMemo(id, options = {}) {
  if (!state.indexes.some((memo) => memo.id === id)) return;
  if (state.activeId !== id) persistEditor();
  state.activeId = id;
  renderActiveMemo();
  saveState();
  if (options.focusAtEnd) scheduleEditorFocusAtEnd();
}

function setMemoListOpen(open) {
  if (!memoListPanel || !allMemosButton) return;
  memoListPanel.classList.toggle("hidden", !open);
  allMemosButton.classList.toggle("active", open);
  allMemosButton.setAttribute("aria-expanded", String(Boolean(open)));
  if (open) {
    closeMemoSearch();
    renderAllMemoList();
  }
}

function setAllMemoListStatus(message, timeout = 2500) {
  if (!allMemoListStatus) return;
  allMemoListStatus.textContent = message || "";
  if (message && timeout) {
    setTimeout(() => {
      if (allMemoListStatus.textContent === message) allMemoListStatus.textContent = "";
    }, timeout);
  }
}

function renderAllMemoList() {
  if (!allMemoList) return;
  allMemoList.innerHTML = "";

  state.indexes.forEach((memo, index) => {
    const item = document.createElement("div");
    item.className = "all-memo-item";
    if (memo.id === state.activeId) item.classList.add("active");
    item.dataset.id = memo.id;

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "all-memo-open";

    const swatch = document.createElement("span");
    swatch.className = "all-memo-color";
    swatch.style.background = normalizeHexColor(memo.color, COLOR_PRESETS[index % COLOR_PRESETS.length]);

    const title = document.createElement("span");
    title.className = "all-memo-title";
    title.textContent = memo.title || `메모 ${index + 1}`;

    const isFloating = state.floatingIds.includes(memo.id);
    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "all-memo-floating-toggle";
    toggleButton.classList.toggle("floating", isFloating);
    toggleButton.textContent = isFloating ? "플로팅" : "일반";
    const isLastFloatingMemo = isFloating && state.floatingIds.length <= 1;
    toggleButton.disabled = isLastFloatingMemo;
    toggleButton.title = isLastFloatingMemo ? "플로팅 메모는 최소 1개 필요" : isFloating ? "일반 메모로 변경" : "플로팅 메모로 변경";
    toggleButton.setAttribute("aria-pressed", String(isFloating));

    openButton.append(swatch, title);
    openButton.addEventListener("click", () => {
      selectMemo(memo.id);
      setMemoListOpen(false);
      setExpanded(true);
    });
    toggleButton.addEventListener("click", () => {
      setFloatingMemo(memo.id, !isFloating, { showLimitMessage: true });
    });

    item.append(openButton, toggleButton);
    allMemoList.appendChild(item);
  });
}

function setMemoSearchOpen(open) {
  if (!memoSearchPanel) return;
  memoSearchPanel.classList.toggle("hidden", !open);
  if (open) renderMemoSearchResults();
}

function closeMemoSearch() {
  setMemoSearchOpen(false);
}

function selectedTextForSearch() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return "";
  const range = selection.getRangeAt(0);
  if (!selectionBelongsToEditor(range)) return "";
  return selection.toString().replace(/\s+/g, " ").trim().slice(0, 80);
}

async function openMemoSearch(initialQuery = "") {
  await setExpanded(true);
  closeSettings();
  setMemoListOpen(false);
  setTextColorPaletteOpen(false);
  setTablePickerOpen(false);
  setTableToolsOpen(false);
  const query = initialQuery || memoSearchInput?.value || "";
  if (memoSearchInput) memoSearchInput.value = query;
  setMemoSearchOpen(true);
  requestAnimationFrame(() => {
    memoSearchInput?.focus({ preventScroll: true });
    memoSearchInput?.select();
  });
}

function memoPlainText(memo) {
  const probe = document.createElement("div");
  probe.innerHTML = typeof memo?.html === "string" ? memo.html : "";
  const bodyText = probe.textContent.replaceAll(CHECK_TEXT_PLACEHOLDER, " ").replace(/\s+/g, " ").trim();
  return `${memo?.title || ""} ${bodyText}`.trim();
}

function countTextMatches(text, query) {
  const needle = query.toLocaleLowerCase();
  const haystack = text.toLocaleLowerCase();
  if (!needle || !haystack) return 0;
  let count = 0;
  let index = 0;
  while (index < haystack.length) {
    const found = haystack.indexOf(needle, index);
    if (found < 0) break;
    count += 1;
    index = found + needle.length;
  }
  return count;
}

function searchSnippet(text, query) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const found = normalized.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (found < 0) return normalized.slice(0, 96);
  const start = Math.max(0, found - 32);
  const end = Math.min(normalized.length, found + query.length + 54);
  return `${start > 0 ? "..." : ""}${normalized.slice(start, end)}${end < normalized.length ? "..." : ""}`;
}

function appendHighlightedText(container, text, query) {
  const lowerText = text.toLocaleLowerCase();
  const lowerQuery = query.toLocaleLowerCase();
  const found = lowerText.indexOf(lowerQuery);
  if (found < 0) {
    container.textContent = text;
    return;
  }
  container.append(document.createTextNode(text.slice(0, found)));
  const mark = document.createElement("mark");
  mark.textContent = text.slice(found, found + query.length);
  container.append(mark, document.createTextNode(text.slice(found + query.length)));
}

function renderMemoSearchResults() {
  if (!memoSearchResults || !memoSearchSummary || !memoSearchInput) return;
  const query = memoSearchInput.value.trim();
  memoSearchResults.innerHTML = "";

  if (!query) {
    memoSearchSummary.textContent = "검색어를 입력하세요.";
    const empty = document.createElement("p");
    empty.className = "memo-search-empty";
    empty.textContent = "전체 메모 제목과 본문에서 검색합니다.";
    memoSearchResults.appendChild(empty);
    return;
  }

  const results = state.indexes
    .map((memo, index) => {
      const text = memoPlainText(memo);
      return {
        memo,
        index,
        text,
        count: countTextMatches(text, query)
      };
    })
    .filter((item) => item.count > 0);

  const totalMatches = results.reduce((sum, item) => sum + item.count, 0);
  memoSearchSummary.textContent = results.length
    ? `${results.length}개 메모에서 ${totalMatches}건`
    : "검색 결과가 없습니다.";

  if (!results.length) {
    const empty = document.createElement("p");
    empty.className = "memo-search-empty";
    empty.textContent = "다른 단어로 다시 검색해보세요.";
    memoSearchResults.appendChild(empty);
    return;
  }

  results.forEach(({ memo, index, text, count }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memo-search-result";
    if (memo.id === state.activeId) button.classList.add("active");

    const title = document.createElement("span");
    title.className = "memo-search-result-title";
    title.textContent = memo.title || `메모 ${index + 1}`;

    const matchCount = document.createElement("span");
    matchCount.className = "memo-search-result-count";
    matchCount.textContent = `${count}건`;

    const snippet = document.createElement("span");
    snippet.className = "memo-search-snippet";
    appendHighlightedText(snippet, searchSnippet(text, query), query);

    button.append(title, matchCount, snippet);
    button.addEventListener("click", () => {
      selectMemo(memo.id);
      closeMemoSearch();
      setExpanded(true);
    });
    memoSearchResults.appendChild(button);
  });
}

async function setExpanded(nextExpanded) {
  finishSideTitleEdit(false);
  expanded = Boolean(nextExpanded);
  syncShellLayoutClasses();
  appShell.classList.toggle("expanded", expanded);
  if (!expanded) {
    appShell.classList.remove("settings-open");
    temporarySettingsPanelWidth = null;
    syncShellLayoutClasses();
    window.memoEdge.setTemporaryPanelWidth?.(null);
    setMemoListOpen(false);
    closeMemoSearch();
  }
  await window.memoEdge.setExpanded(expanded);
  if (!expanded) {
    await window.memoEdge.setSettingsOpen(false);
  }
}

async function cycleFloatingMemo() {
  if (!expanded) {
    const memo = activeMemo();
    if (!memo) return;
    if (state.activeId !== memo.id) selectMemo(memo.id, { focusAtEnd: true });
    await setExpanded(true);
    scheduleEditorFocusAtEnd();
    return;
  }

  const memos = floatingMemos();
  if (!memos.length) return;

  const currentIndex = memos.findIndex((memo) => memo.id === state.activeId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % memos.length : 0;
  selectMemo(memos[nextIndex].id, { focusAtEnd: true });
  await setExpanded(true);
  scheduleEditorFocusAtEnd();
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
  flushPendingEditorHistory();
  editor.focus();
  document.execCommand(command, false, value);
  updateToolbarCommandState();
  persistEditor();
  pushEditorHistory();
}

function updateToolbarCommandState() {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const inEditor = selectionBelongsToEditor(range);
  document.querySelectorAll("[data-command]").forEach((button) => {
    const command = button.dataset.command;
    let active = false;
    if (inEditor && command) {
      try {
        active = document.queryCommandState(command);
      } catch {
        active = false;
      }
    }
    button.classList.toggle("active", active);
  });
  if (inEditor) syncToolbarSelectionValues(range);
}

function scheduleToolbarRefresh() {
  if (toolbarRefreshFrame) return;
  toolbarRefreshFrame = requestAnimationFrame(() => {
    toolbarRefreshFrame = null;
    measureInteraction("updateToolbarCommandState", updateToolbarCommandState);
  });
}

function scheduleTableToolsRefresh() {
  if (tableToolsRefreshFrame) return;
  tableToolsRefreshFrame = requestAnimationFrame(() => {
    tableToolsRefreshFrame = null;
    updateTableTools();
  });
}

function focusEditorAtEnd() {
  if (!editor) return;
  editor.focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedEditorRange = range.cloneRange();
  editor.scrollTop = editor.scrollHeight;
  updateToolbarCommandState();
}

function scheduleEditorFocusAtEnd() {
  requestAnimationFrame(() => {
    requestAnimationFrame(focusEditorAtEnd);
  });
}

function currentEditorRange() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return selectionBelongsToEditor(range) ? range : null;
}

function restoreFormattingControlFocus(element) {
  if (element instanceof HTMLElement && element !== editor && !editor.contains(element)) {
    element.focus({ preventScroll: true });
  }
}

function isEditableTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE || !node.nodeValue) return false;
  const parent = node.parentElement;
  if (!parent) return false;
  return !parent.closest("[contenteditable='false'], .check-box");
}

function selectWrappedTextNodes(operations) {
  const firstOperation = operations.find((operation) => operation.span);
  const lastOperation = operations.findLast((operation) => operation.span);
  if (!firstOperation?.span || !lastOperation?.span) return false;
  const range = document.createRange();
  range.setStartBefore(firstOperation.span);
  range.setEndAfter(lastOperation.span);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedEditorRange = range.cloneRange();
  return true;
}

function createTypingStyleAnchor(styles = {}) {
  const span = document.createElement("span");
  span.className = "typing-style-anchor";
  Object.entries(styles).forEach(([property, value]) => {
    if (value) span.style[property] = value;
  });
  const textNode = document.createTextNode(CHECK_TEXT_PLACEHOLDER);
  span.appendChild(textNode);
  return { span, textNode };
}

function insertTypingStyleAnchor(range, property, value) {
  const { span, textNode } = createTypingStyleAnchor({ [property]: value });
  range.insertNode(span);

  const nextRange = document.createRange();
  nextRange.setStart(textNode, textNode.nodeValue.length);
  nextRange.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(nextRange);
  savedEditorRange = nextRange.cloneRange();
}

function wrapTextNodeSegment(node, startOffset, endOffset, property, value) {
  if (!node.parentNode || startOffset >= endOffset) return null;
  let selected = node;
  if (endOffset < selected.nodeValue.length) selected.splitText(endOffset);
  if (startOffset > 0) selected = selected.splitText(startOffset);

  const span = document.createElement("span");
  span.style[property] = value;
  selected.parentNode.insertBefore(span, selected);
  span.appendChild(selected);
  return span;
}

function wrapRangeTextNodes(range, property, value) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const operations = [];
  let node = walker.nextNode();
  while (node) {
    if (isEditableTextNode(node)) {
      let intersects = false;
      try {
        intersects = range.intersectsNode(node);
      } catch {
        intersects = false;
      }
      if (intersects) {
        const startOffset = node === range.startContainer ? range.startOffset : 0;
        const endOffset = node === range.endContainer ? range.endOffset : node.nodeValue.length;
        if (startOffset < endOffset) operations.push({ node, startOffset, endOffset });
      }
    }
    node = walker.nextNode();
  }

  for (let index = operations.length - 1; index >= 0; index -= 1) {
    const operation = operations[index];
    operation.span = wrapTextNodeSegment(
      operation.node,
      operation.startOffset,
      operation.endOffset,
      property,
      value
    );
  }

  return selectWrappedTextNodes(operations);
}

function applyInlineTextStyle(property, value) {
  const returnFocusElement = document.activeElement;
  restoreEditorSelection();
  const range = currentEditorRange();
  if (!range) return;
  if (range.collapsed) {
    insertTypingStyleAnchor(range, property, value);
  } else {
    wrapRangeTextNodes(range.cloneRange(), property, value);
  }
  persistEditor();
  pushEditorHistory();
  updateToolbarCommandState();
  restoreFormattingControlFocus(returnFocusElement);
}

function closestLineBlock(node) {
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  if (!element) return editor;
  const block = element.closest("p, div, li, h1, h2, h3, h4, h5, h6, blockquote, td, th");
  return block && editor.contains(block) ? block : editor;
}

function selectedLineBlocks(range) {
  if (!range) return [];
  if (range.collapsed) return [closestLineBlock(range.startContainer)];
  const blocks = Array.from(
    editor.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6, blockquote, td, th")
  ).filter((block) => {
    if (block.closest("[contenteditable='false'], .check-box")) return false;
    try {
      return range.intersectsNode(block);
    } catch {
      return false;
    }
  });
  if (!blocks.length) return [closestLineBlock(range.startContainer)];
  return blocks.filter((block) => !blocks.some((other) => other !== block && block.contains(other)));
}

function applyLineSpacingToSelection(value) {
  const lineHeight = String(normalizeLineSpacing(value));
  const returnFocusElement = document.activeElement;
  restoreEditorSelection();
  const range = currentEditorRange();
  if (!range) return;
  selectedLineBlocks(range).forEach((block) => {
    block.style.lineHeight = lineHeight;
  });
  persistEditor();
  pushEditorHistory();
  updateToolbarCommandState();
  restoreFormattingControlFocus(returnFocusElement);
}

function firstFontFamilyName(value) {
  return String(value || "")
    .split(",")[0]
    .trim()
    .replace(/^["']|["']$/g, "");
}

function effectiveLineSpacing(element) {
  const block = closestLineBlock(element);
  const computed = window.getComputedStyle(block);
  const lineHeight = block.style.lineHeight || computed.lineHeight;
  if (/^\d+(\.\d+)?$/.test(lineHeight)) return normalizeLineSpacing(lineHeight);
  if (lineHeight.endsWith("px")) {
    const fontSize = Number.parseFloat(computed.fontSize) || DEFAULT_FONT_SIZE;
    return normalizeLineSpacing(Number.parseFloat(lineHeight) / fontSize);
  }
  return DEFAULT_LINE_SPACING;
}

function syncToolbarSelectionValues(range = currentEditorRange()) {
  if (!range) return;
  const node = range.startContainer;
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!element || !editor.contains(element)) return;
  const computed = window.getComputedStyle(element);

  if (fontFamilyToolbarSelect && document.activeElement !== fontFamilyToolbarSelect) {
    const family = normalizeFontFamily(firstFontFamilyName(computed.fontFamily));
    if (!Array.from(fontFamilyToolbarSelect.options).some((option) => option.value === family)) {
      populateFontFamilySelect(fontFamilyToolbarSelect, family);
    } else {
      fontFamilyToolbarSelect.value = family;
      fontFamilyToolbarSelect.style.fontFamily = fontFamilyCss(family);
    }
  }
  if (fontSizeToolbarSelect && document.activeElement !== fontSizeToolbarSelect) {
    fontSizeToolbarSelect.value = String(normalizeFontSize(Number.parseFloat(computed.fontSize)));
  }
  if (lineSpacingToolbarSelect && document.activeElement !== lineSpacingToolbarSelect) {
    lineSpacingToolbarSelect.value = String(effectiveLineSpacing(element));
  }
}

function rememberTextColor(color) {
  const nextColor = normalizeHexColor(color, "#283044");
  state.prefs = normalizeAppPrefs({
    ...state.prefs,
    recentTextColors: [nextColor, ...(state.prefs?.recentTextColors || [])]
  });
  if (textColorInput) textColorInput.value = nextColor;
  renderTextColorPalette();
}

function applyTextColor(color) {
  const nextColor = normalizeHexColor(color, "#283044");
  rememberTextColor(nextColor);
  applyInlineTextStyle("color", nextColor);
}

function setTextColorPaletteOpen(open) {
  if (!textColorPalette) return;
  if (open) renderTextColorPalette();
  textColorPalette.classList.toggle("hidden", !open);
}

function toggleTextColorPalette() {
  setTextColorPaletteOpen(textColorPalette?.classList.contains("hidden"));
}

function renderTextColorPalette() {
  if (!textColorPalette) return;
  const recent = normalizeTextColorList(state.prefs?.recentTextColors);
  const colors = [
    ...TEXT_COLOR_PRESETS,
    ...recent.filter((color) => !TEXT_COLOR_PRESETS.includes(color))
  ];
  textColorPalette.innerHTML = "";
  colors.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "text-color-swatch";
    button.style.setProperty("--swatch-color", color);
    button.title = color;
    button.setAttribute("aria-label", color);
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      rememberEditorSelection();
    });
    button.addEventListener("click", () => {
      applyTextColor(color);
      setTextColorPaletteOpen(false);
    });
    textColorPalette.appendChild(button);
  });

  const customLabel = document.createElement("label");
  customLabel.className = "text-color-custom";
  customLabel.title = "Custom color";
  const customText = document.createElement("span");
  customText.textContent = "A";
  const customInput = document.createElement("input");
  customInput.type = "color";
  customInput.value = textColorInput?.value || recent[0] || "#283044";
  customInput.addEventListener("mousedown", rememberEditorSelection);
  customInput.addEventListener("input", () => applyTextColor(customInput.value));
  customLabel.append(customText, customInput);
  textColorPalette.appendChild(customLabel);
}

function toggleToolbarVisibility() {
  state.prefs = normalizeAppPrefs({
    ...state.prefs,
    toolbarCollapsed: !state.prefs?.toolbarCollapsed
  });
  syncToolbarVisibility();
  saveState();
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

function checklistItemIsChecked(item) {
  if (!item) return false;
  if (item.dataset.checked === "true") return true;
  if (item.dataset.checked === "false") return false;
  const box = item.querySelector(".check-box");
  return (
    item.classList.contains("checked") ||
    box?.getAttribute("aria-checked") === "true" ||
    box?.textContent?.trim() === "\u2611"
  );
}

function syncChecklistItemState(item, checked = checklistItemIsChecked(item)) {
  if (!item) return { box: null, text: null, checked: false };
  let box = item.querySelector(".check-box");
  let text = item.querySelector(".check-text");

  if (!box) {
    box = document.createElement("span");
    box.className = "check-box";
    item.prepend(box);
  }
  if (!text) {
    text = document.createElement("span");
    text.className = "check-text";
    item.appendChild(text);
  }

  item.dataset.checked = checked ? "true" : "false";
  item.classList.toggle("checked", checked);
  box.contentEditable = "false";
  box.setAttribute("role", "checkbox");
  box.setAttribute("aria-checked", checked ? "true" : "false");
  box.textContent = checked ? "\u2611" : "\u2610";
  ensureChecklistTextNode(text);

  return { box, text, checked };
}

function setChecklistText(text, value) {
  if (!text) return null;
  text.textContent = value || CHECK_TEXT_PLACEHOLDER;
  return ensureChecklistTextNode(text);
}

function checklistTextValue(text) {
  const value = text?.textContent ?? text?.toString?.() ?? "";
  return String(value).replaceAll(CHECK_TEXT_PLACEHOLDER, "");
}

function splitChecklistTextAtSelection(text) {
  ensureChecklistTextNode(text);
  const range = currentEditorRange();
  if (
    !range ||
    !text?.contains(range.startContainer) ||
    !text.contains(range.endContainer)
  ) {
    return "";
  }

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(text);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  const afterRange = document.createRange();
  afterRange.selectNodeContents(text);
  afterRange.setStart(range.endContainer, range.endOffset);

  const before = checklistTextValue(beforeRange);
  const after = checklistTextValue(afterRange);
  setChecklistText(text, before);
  return after;
}

function placeCaretInCheckText(text, offset = null) {
  const textNode = ensureChecklistTextNode(text);
  if (!textNode) return;
  editor.focus();
  const range = document.createRange();
  const caretOffset =
    Number.isInteger(offset) ? Math.max(0, Math.min(offset, textNode.nodeValue.length)) : textNode.nodeValue.length;
  range.setStart(textNode, caretOffset);
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
    syncChecklistItemState(item);
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
  flushPendingEditorHistory();
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
      row.appendChild(createTableCell());
    }
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  return table;
}

function createTableCell() {
  const cell = document.createElement("td");
  cell.style.backgroundColor = "#ffffff";
  cell.appendChild(document.createElement("br"));
  return cell;
}

function fillTableCellText(cell, text) {
  cell.textContent = "";
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const meaningfulLines = lines.length ? lines : [""];
  meaningfulLines.forEach((line, index) => {
    if (index > 0) cell.appendChild(document.createElement("br"));
    if (line) cell.appendChild(document.createTextNode(line));
  });
  if (!cell.childNodes.length) cell.appendChild(document.createElement("br"));
}

function textFromClipboardHtmlCell(sourceCell) {
  const html = String(sourceCell?.innerHTML || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|tr)>/gi, "\n");
  const probe = document.createElement("div");
  probe.innerHTML = html;
  return probe.textContent.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function pastedTableFromHtml(html) {
  if (!html || !/<table[\s>]/i.test(html)) return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const sourceTable = doc.querySelector("table");
  if (!sourceTable) return null;

  const table = document.createElement("table");
  table.className = "memo-table";
  const tbody = document.createElement("tbody");
  let hasCells = false;

  Array.from(sourceTable.querySelectorAll("tr"))
    .slice(0, MAX_PASTED_TABLE_ROWS)
    .forEach((sourceRow) => {
      const cells = Array.from(sourceRow.querySelectorAll(":scope > th, :scope > td")).slice(0, MAX_PASTED_TABLE_COLS);
      if (!cells.length) return;
      const row = document.createElement("tr");
      cells.forEach((sourceCell) => {
        const cell = createTableCell();
        cell.colSpan = clampTableDimension(sourceCell.getAttribute("colspan") || 1, 1, MAX_PASTED_TABLE_COLS, 1);
        cell.rowSpan = clampTableDimension(sourceCell.getAttribute("rowspan") || 1, 1, MAX_PASTED_TABLE_ROWS, 1);
        if (sourceCell.style?.backgroundColor) cell.style.backgroundColor = sourceCell.style.backgroundColor;
        fillTableCellText(cell, textFromClipboardHtmlCell(sourceCell));
        row.appendChild(cell);
        hasCells = true;
      });
      tbody.appendChild(row);
    });

  if (!hasCells) return null;
  table.appendChild(tbody);
  return table;
}

function pastedTableFromText(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n$/, "");
  if (!normalized.includes("\t")) return null;
  const rows = normalized
    .split("\n")
    .slice(0, MAX_PASTED_TABLE_ROWS)
    .map((row) => row.split("\t").slice(0, MAX_PASTED_TABLE_COLS));
  if (!rows.length || (rows.length === 1 && rows[0].length <= 1)) return null;

  const table = document.createElement("table");
  table.className = "memo-table";
  const tbody = document.createElement("tbody");
  rows.forEach((sourceRow) => {
    const row = document.createElement("tr");
    sourceRow.forEach((value) => {
      const cell = createTableCell();
      fillTableCellText(cell, value);
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  return table;
}

function pastedTableFromClipboard(clipboardData) {
  if (!clipboardData) return null;
  return pastedTableFromHtml(clipboardData.getData("text/html")) || pastedTableFromText(clipboardData.getData("text/plain"));
}

function insertPastedTable(table) {
  restoreEditorSelection();
  const afterLine = createBlankLine();
  const fragment = document.createDocumentFragment();
  fragment.append(table, afterLine);
  insertNodeAtSelection(fragment);
  placeCaretInTable(table);
  const firstCell = table.querySelector("td");
  if (firstCell) setTableSelection(firstCell, firstCell);
  updateTableTools();
  setTablePickerOpen(false);
  persistEditor();
  pushEditorHistory();
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

function activeTableSelectionCells() {
  if (!tableSelectionState?.table || !editor.contains(tableSelectionState.table)) {
    tableSelectionState = null;
    return [];
  }
  const cells = uniqueCells(tableSelectionState.cells).filter((cell) => editor.contains(cell));
  if (!cells.length) tableSelectionState = null;
  return cells;
}

function activeTableSelectionCell() {
  return tableSelectionState?.activeCell && editor.contains(tableSelectionState.activeCell)
    ? tableSelectionState.activeCell
    : null;
}

function currentTableCell() {
  const selectedCell = selectedTableCell();
  if (selectedCell && editor.contains(selectedCell)) {
    lastTableCell = selectedCell;
    return selectedCell;
  }
  const activeCell = activeTableSelectionCell();
  if (activeCell) {
    lastTableCell = activeCell;
    return activeCell;
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
  return measureInteraction("updateTableTools", () => {
    const cell = selectedTableCell();
    const existingCells = activeTableSelectionCells();

    if (cell) {
      lastTableCell = cell;
      const table = cell.closest(".memo-table");
      const keepRange =
        existingCells.length > 1 &&
        tableSelectionState?.table === table &&
        existingCells.includes(cell);
      if (!keepRange && !tableDragSelectState) {
        const nativeCells = nativeSelectedTableCells(table);
        if (nativeCells.length > 1) setTableSelection(nativeCells[0], nativeCells[nativeCells.length - 1], nativeCells);
        else setTableSelection(cell, cell);
      } else {
        renderTableSelection();
      }
      setTableToolsOpen(true);
      return;
    }

    if (existingCells.length) {
      renderTableSelection();
      setTableToolsOpen(true);
      return;
    }

    setTableToolsOpen(false);
  });
}

function tableCells(table) {
  return Array.from(table?.querySelectorAll("td") || []);
}

function stripTransientTableSelection(root) {
  root.querySelectorAll(".memo-table.table-selected").forEach((table) => {
    table.classList.remove("table-selected");
    if (!table.getAttribute("class")) table.removeAttribute("class");
  });
  root.querySelectorAll(".memo-table-cell-selected, .memo-table-cell-active").forEach((cell) => {
    cell.classList.remove("memo-table-cell-selected", "memo-table-cell-active");
    if (!cell.getAttribute("class")) cell.removeAttribute("class");
  });
}

function clearTableSelectionClasses() {
  const rendered = lastRenderedTableSelection;
  if (rendered.table?.isConnected) rendered.table.classList.remove("table-selected");
  rendered.cells.forEach((cell) => {
    if (cell?.isConnected) cell.classList.remove("memo-table-cell-selected", "memo-table-cell-active");
  });
  if (rendered.activeCell?.isConnected) rendered.activeCell.classList.remove("memo-table-cell-active");
  if (!rendered.table && !rendered.cells.size) {
    editor.querySelectorAll(".memo-table.table-selected").forEach((table) => {
      table.classList.remove("table-selected");
    });
    editor.querySelectorAll(".memo-table-cell-selected, .memo-table-cell-active").forEach((cell) => {
      cell.classList.remove("memo-table-cell-selected", "memo-table-cell-active");
    });
  }
  lastRenderedTableSelection = { table: null, cells: new Set(), activeCell: null };
}

function clearTableSelection(options = {}) {
  tableSelectionState = null;
  tableDragSelectState = null;
  clearTableSelectionClasses();
  editor.classList.remove("table-selecting");
  if (!options.keepLastCell) lastTableCell = null;
  if (!options.keepTools) setTableToolsOpen(false);
}

function nativeSelectedTableCells(table) {
  const selection = window.getSelection();
  if (!table || !selection || !selection.rangeCount) return [];
  const range = selection.getRangeAt(0);
  return tableCells(table).filter((cell) => {
    try {
      return range.intersectsNode(cell);
    } catch {
      return false;
    }
  });
}

function selectedTableCells() {
  const activeCells = activeTableSelectionCells();
  if (activeCells.length) return activeCells;

  const table = currentMemoTable();
  const nativeCells = nativeSelectedTableCells(table);
  if (nativeCells.length) return nativeCells;
  const cell = currentTableCell();
  return cell ? [cell] : [];
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

function tableCellsBetween(anchorCell, focusCell) {
  const table = anchorCell?.closest(".memo-table");
  if (!table || focusCell?.closest(".memo-table") !== table) return [];

  const { grid, meta } = buildTableGrid(table);
  const anchor = meta.get(anchorCell);
  const focus = meta.get(focusCell);
  if (!anchor || !focus) return [anchorCell];

  const firstRow = Math.min(anchor.rowIndex, focus.rowIndex);
  const firstCol = Math.min(anchor.colIndex, focus.colIndex);
  const lastRow = Math.max(anchor.rowIndex + anchor.rowSpan - 1, focus.rowIndex + focus.rowSpan - 1);
  const lastCol = Math.max(anchor.colIndex + anchor.colSpan - 1, focus.colIndex + focus.colSpan - 1);
  const cells = [];

  for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
    for (let colIndex = firstCol; colIndex <= lastCol; colIndex += 1) {
      if (grid[rowIndex]?.[colIndex]) cells.push(grid[rowIndex][colIndex]);
    }
  }

  return uniqueCells(cells);
}

function setTableSelection(anchorCell, focusCell, explicitCells = null) {
  const table = focusCell?.closest(".memo-table") || anchorCell?.closest(".memo-table");
  if (!table || !editor.contains(table)) return;
  const cells = uniqueCells(explicitCells || tableCellsBetween(anchorCell, focusCell));
  if (!cells.length) return;

  tableSelectionState = {
    table,
    anchorCell,
    focusCell,
    activeCell: focusCell || anchorCell,
    cells
  };
  lastTableCell = tableSelectionState.activeCell;
  renderTableSelection();
}

function renderTableSelection() {
  return measureInteraction("renderTableSelection", () => {
    const cells = activeTableSelectionCells();
    const table = tableSelectionState?.table;
    if (!table || !cells.length) {
      clearTableSelectionClasses();
      return;
    }

    const activeCell = activeTableSelectionCell() || cells[cells.length - 1];
    const nextCells = new Set(cells);
    const previous = lastRenderedTableSelection;

    if (previous.table && previous.table !== table && previous.table.isConnected) {
      previous.table.classList.remove("table-selected");
    }

    previous.cells.forEach((cell) => {
      if (!cell?.isConnected || !nextCells.has(cell)) {
        cell?.classList.remove("memo-table-cell-selected", "memo-table-cell-active");
      }
    });
    if (previous.activeCell && previous.activeCell !== activeCell && previous.activeCell.isConnected) {
      previous.activeCell.classList.remove("memo-table-cell-active");
    }

    cells.forEach((cell) => cell.classList.add("memo-table-cell-selected"));
    activeCell?.classList.add("memo-table-cell-active");

    const allSelected = cells.length === tableCells(table).length;
    table.classList.toggle("table-selected", allSelected);
    lastRenderedTableSelection = { table, cells: nextCells, activeCell };
  });
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

function applyTableCellColorValue(value) {
  const color = normalizeHexColor(value, "#ffffff");
  if (tableCellColorInput) tableCellColorInput.value = color;
  targetTableCells().forEach((cell) => {
    cell.style.backgroundColor = color;
  });
  persistEditor();
  pushEditorHistory();
}

function applyTableCellColor() {
  applyTableCellColorValue(tableCellColorInput?.value);
}

function clearTableCellColor() {
  targetTableCells().forEach((cell) => {
    cell.style.backgroundColor = "";
  });
  persistEditor();
  pushEditorHistory();
}

function placeCaretInCell(cell, options = {}) {
  if (!cell) return;
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  rememberEditorSelection();
  if (options.preserveTableSelection) renderTableSelection();
  else setTableSelection(cell, cell);
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
  clearTableSelection();
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

function tableCellFromEventTarget(target) {
  const cell = target instanceof Element ? target.closest(".memo-table td") : null;
  return cell && editor.contains(cell) ? cell : null;
}

function tableCellFromPoint(x, y) {
  return tableCellFromEventTarget(document.elementFromPoint(x, y));
}

function beginTableCellSelection(event) {
  if (event.button !== 0) return;
  const cell = tableCellFromEventTarget(event.target);
  if (!cell) return;

  tableDragSelectState = {
    pointerId: event.pointerId,
    anchorCell: cell,
    focusCell: cell,
    startX: event.clientX,
    startY: event.clientY,
    hasMoved: false
  };
  setTableSelection(cell, cell);
  setTableToolsOpen(true);
}

function moveTableCellSelection(event) {
  if (!tableDragSelectState) return;
  const distance = Math.hypot(event.clientX - tableDragSelectState.startX, event.clientY - tableDragSelectState.startY);
  if (distance > 4) {
    tableDragSelectState.hasMoved = true;
    editor.classList.add("table-selecting");
  }
  if (!tableDragSelectState.hasMoved) return;

  const cell = tableCellFromPoint(event.clientX, event.clientY);
  if (!cell || cell.closest(".memo-table") !== tableDragSelectState.anchorCell.closest(".memo-table")) return;
  tableDragSelectState.focusCell = cell;
  setTableSelection(tableDragSelectState.anchorCell, cell);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  event.preventDefault();
}

function endTableCellSelection(event) {
  if (!tableDragSelectState) return;
  const dragState = tableDragSelectState;
  tableDragSelectState = null;
  editor.classList.remove("table-selecting");
  if (dragState.hasMoved) {
    placeCaretInCell(dragState.focusCell, { preserveTableSelection: true });
    renderTableSelection();
    event?.preventDefault?.();
  } else {
    setTableSelection(dragState.anchorCell, dragState.anchorCell);
  }
}

function toggleChecklistItem(target) {
  const item = target.closest(".check-item");
  if (!item) return;
  flushPendingEditorHistory();
  const checked = checklistItemIsChecked(item);
  const { text } = syncChecklistItemState(item, !checked);
  placeCaretInCheckText(text);
  persistEditor();
  pushEditorHistory();
}

function currentChecklistItem() {
  return getSelectionElement()?.closest(".check-item") || null;
}

function handleChecklistKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey) return;
  const item = currentChecklistItem();
  if (!item || !editor.contains(item)) return;

  event.preventDefault();
  flushPendingEditorHistory();
  const currentText = item.querySelector(".check-text");
  if (isBlankEditorText(currentText?.textContent)) {
    const blankLine = createBlankLine();
    item.replaceWith(blankLine);
    placeCaretInBlock(blankLine);
    persistEditor();
    pushEditorHistory();
    return;
  }

  const nextTextValue = splitChecklistTextAtSelection(currentText);
  const { item: nextItem, text } = createChecklistItem(false);
  setChecklistText(text, nextTextValue);
  item.after(nextItem);
  placeCaretInCheckText(text, nextTextValue ? 0 : null);
  persistEditor();
  pushEditorHistory();
}

function currentListItem() {
  return getSelectionElement()?.closest("li") || null;
}

function selectionElementFromRange(range) {
  if (!range) return null;
  const node = range.startContainer;
  if (node.nodeType === Node.ELEMENT_NODE) {
    const child = node.childNodes[Math.max(0, range.startOffset - 1)] || node.childNodes[range.startOffset] || node;
    return child.nodeType === Node.ELEMENT_NODE ? child : child.parentElement;
  }
  return node.parentElement;
}

function carriedTypingStylesFromRange(range = currentEditorRange()) {
  const element = selectionElementFromRange(range);
  if (!element || !editor.contains(element)) return {};
  const block = closestLineBlock(element);
  const chain = [];
  let current = element;

  while (current && current !== editor && editor.contains(current)) {
    if (current instanceof HTMLElement) chain.push(current);
    if (current === block) break;
    current = current.parentElement;
  }

  return chain.reverse().reduce((styles, node) => {
    CARRIED_TYPING_STYLE_PROPERTIES.forEach((property) => {
      if (node.style[property]) styles[property] = node.style[property];
    });
    return styles;
  }, {});
}

function copyListItemBlockStyles(source, target) {
  if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) return;
  CARRIED_LIST_BLOCK_STYLE_PROPERTIES.forEach((property) => {
    if (source.style[property]) target.style[property] = source.style[property];
  });
}

function placeCaretInTextNode(textNode, offset = 0) {
  if (!textNode) return;
  editor.focus();
  const range = document.createRange();
  range.setStart(textNode, Math.max(0, Math.min(offset, textNode.nodeValue.length)));
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedEditorRange = range.cloneRange();
}

function insertListTypingAnchor(item, styles) {
  const { span, textNode } = createTypingStyleAnchor(styles);
  item.insertBefore(span, item.firstChild);
  return textNode;
}

function ensureListItemEditable(item) {
  if (!item.childNodes.length) item.appendChild(document.createElement("br"));
}

function splitListItemAtSelection(item) {
  const range = currentEditorRange();
  const typingStyles = carriedTypingStylesFromRange(range);
  const nextItem = document.createElement("li");
  copyListItemBlockStyles(item, nextItem);

  if (range && item.contains(range.startContainer) && item.contains(range.endContainer)) {
    range.deleteContents();
    const tailRange = document.createRange();
    tailRange.setStart(range.startContainer, range.startOffset);
    tailRange.setEnd(item, item.childNodes.length);
    const tail = tailRange.extractContents();
    if (tail.childNodes.length) nextItem.appendChild(tail);
  }

  ensureListItemEditable(item);
  const textNode = insertListTypingAnchor(nextItem, typingStyles);
  item.after(nextItem);
  placeCaretInTextNode(textNode, textNode.nodeValue.length);
}

function exitListAtItem(list, item) {
  const blankLine = createBlankLine();
  const trailingItems = [];
  let next = item.nextSibling;
  while (next) {
    trailingItems.push(next);
    next = next.nextSibling;
  }

  const trailingList = trailingItems.length ? list.cloneNode(false) : null;
  trailingItems.forEach((node) => trailingList.appendChild(node));
  item.remove();

  if (!list.children.length) {
    list.replaceWith(blankLine, ...(trailingList ? [trailingList] : []));
  } else {
    list.after(blankLine);
    if (trailingList) blankLine.after(trailingList);
  }

  placeCaretInBlock(blankLine);
}

function handleListKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey) return;
  const item = currentListItem();
  if (!item || !editor.contains(item)) return;

  const list = item.parentElement;
  if (!list || !["UL", "OL"].includes(list.tagName)) return;

  event.preventDefault();
  flushPendingEditorHistory();
  if (!isBlankEditorText(item.textContent)) {
    splitListItemAtSelection(item);
    persistEditor();
    pushEditorHistory();
    return;
  }

  exitListAtItem(list, item);
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

async function applyTemporarySettingsPanelWidth() {
  const savedWidth = normalizePanelWidth(state.shell?.panelWidth);
  const targetWidth = Math.max(savedWidth, SETTINGS_MIN_PANEL_WIDTH);
  temporarySettingsPanelWidth = targetWidth > savedWidth ? targetWidth : null;
  document.documentElement.style.setProperty("--panel-width", `${targetWidth}px`);
  if (temporarySettingsPanelWidth) {
    await window.memoEdge.setTemporaryPanelWidth?.(targetWidth);
  } else {
    await window.memoEdge.setTemporaryPanelWidth?.(null);
  }
}

function clearTemporarySettingsPanelWidth() {
  temporarySettingsPanelWidth = null;
  syncShellLayoutClasses();
  window.memoEdge.setTemporaryPanelWidth?.(null);
}

async function openSettings() {
  await setExpanded(true);
  setMemoListOpen(false);
  closeMemoSearch();
  await applyTemporarySettingsPanelWidth();
  appShell.classList.add("settings-open");
  syncShellLayoutClasses();
  await window.memoEdge.setSettingsOpen(true);
  await fillSettingsForm();
}

function closeSettings() {
  appShell.classList.remove("settings-open");
  clearTemporarySettingsPanelWidth();
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

function renameMemoFromSide(id, fallbackIndex = 0) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo) return;
  const fallbackTitle = `메모 ${fallbackIndex + 1}`;
  const nextTitle = window.prompt("메모 이름을 바꿉니다.", memo.title || fallbackTitle);
  if (nextTitle === null) return;
  memo.title = normalizeMemoTitle(nextTitle, fallbackTitle);
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

function shortcutMatchesEvent(event, shortcut) {
  const expected = typeof shortcut === "string" && shortcut.trim() ? shortcut.trim().toLowerCase() : "";
  if (!expected) return false;
  return acceleratorFromEvent(event).toLowerCase() === expected;
}

function shouldIgnoreFindShortcut(event) {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest(".shortcut-input"));
}

function handleFindShortcut(event) {
  if (event.defaultPrevented || shouldIgnoreFindShortcut(event)) return;
  if (!shortcutMatchesEvent(event, state.shell?.findShortcut || DEFAULT_FIND_SHORTCUT)) return;
  event.preventDefault();
  event.stopPropagation();
  openMemoSearch(selectedTextForSearch());
}

function displayLabel(display) {
  const width = display.bounds?.width || 0;
  const height = display.bounds?.height || 0;
  return `${display.label} · ${width}×${height}`;
}

async function fillSettingsForm() {
  const shellState = await window.memoEdge.getShellState();
  state.shell = normalizeShellSettings({ ...state.shell, ...(shellState.settings || {}) });
  state.shell.followCursorDisplay = shellState.settings?.followCursorDisplay === true;
  syncShellLayoutClasses();

  displaySelect.innerHTML = "";
  const auto = document.createElement("option");
  auto.value = "auto";
  auto.textContent = "자동 (마우스가 있는 모니터)";
  displaySelect.appendChild(auto);

  const displays = shellState.displays || [];
  for (const display of displays) {
    const option = document.createElement("option");
    option.value = String(display.id);
    option.textContent = displayLabel(display);
    displaySelect.appendChild(option);
  }

  const fixedDisplayId = state.shell.targetDisplayId ?? displays[0]?.id ?? shellState.activeDisplayId;
  displaySelect.value = state.shell.followCursorDisplay ? "auto" : String(fixedDisplayId ?? "auto");
  if (displaySelect.value === "") displaySelect.value = "auto";
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
  populateFontFamilySelect(commonFontFamilySelect, state.prefs?.commonFontFamily || DEFAULT_FONT_FAMILY);
  if (commonFontSizeSelect) commonFontSizeSelect.value = String(normalizeCommonFontSize(state.prefs?.commonFontSize));
  populateFontFamilySelect(defaultFontFamilySelect, state.memoDefaults.fontFamily);
  populateFontSizeSelect(defaultFontSizeSelect, state.memoDefaults.fontSize);
  populateLineSpacingSelect(defaultLineSpacingSelect, state.memoDefaults.lineSpacing);
  cycleShortcutInput.value = state.shell.cycleShortcut || DEFAULT_CYCLE_SHORTCUT;
  hideShortcutInput.value = state.shell.hideShortcut || DEFAULT_HIDE_SHORTCUT;
  if (findShortcutInput) findShortcutInput.value = state.shell.findShortcut || DEFAULT_FIND_SHORTCUT;
  cycleShortcutInput.dataset.previousValue = cycleShortcutInput.value;
  hideShortcutInput.dataset.previousValue = hideShortcutInput.value;
  if (findShortcutInput) findShortcutInput.dataset.previousValue = findShortcutInput.value;
  startupGuideInput.checked = state.prefs?.showLaunchGuideOnStartup !== false;
  await ensureStartupEnabled();

  renderIndexManager();
}

function renderIndexManager() {
  if (!indexManagerList) return;
  if (!appShell.classList.contains("settings-open")) return;
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
    fontFamilySelect.addEventListener("change", () => {
      fontFamilySelect.style.fontFamily = fontFamilyCss(fontFamilySelect.value);
      updateMemoTypography(memo.id, { fontFamily: fontFamilySelect.value });
    });
    fontFamilyLabel.appendChild(fontFamilySelect);

    const lineSpacingLabel = document.createElement("label");
    lineSpacingLabel.className = "compact-field";
    lineSpacingLabel.textContent = "줄간격";
    const lineSpacingSelect = document.createElement("input");
    lineSpacingSelect.type = "number";
    lineSpacingSelect.min = "0.8";
    lineSpacingSelect.max = "4";
    lineSpacingSelect.step = "0.05";
    lineSpacingSelect.value = String(normalizeLineSpacing(memo.lineSpacing));
    lineSpacingSelect.addEventListener("input", () =>
      updateMemoTypography(memo.id, { lineSpacing: lineSpacingSelect.value })
    );
    lineSpacingLabel.appendChild(lineSpacingSelect);

    typeRow.append(fontSizeLabel, fontFamilyLabel, lineSpacingLabel);

    const backgroundRow = document.createElement("div");
    backgroundRow.className = "background-row";

    const backgroundButton = document.createElement("button");
    backgroundButton.type = "button";
    backgroundButton.className = "small-button";
    backgroundButton.textContent = "배경";
    backgroundButton.title = "배경 이미지 선택";
    backgroundButton.addEventListener("click", () => editBackgroundForMemo(memo.id));

    const opacityLabel = document.createElement("label");
    opacityLabel.className = "compact-field background-opacity-field";
    opacityLabel.textContent = "투명도";
    const opacityInput = document.createElement("input");
    opacityInput.type = "range";
    opacityInput.min = "0";
    opacityInput.max = "1";
    opacityInput.step = "0.05";
    opacityInput.value = String(normalizeOpacity(memo.backgroundOpacity));
    opacityInput.addEventListener("input", () => updateMemoBackground(memo.id, { backgroundOpacity: opacityInput.value }));
    opacityLabel.appendChild(opacityInput);

    const clearBackgroundButton = document.createElement("button");
    clearBackgroundButton.type = "button";
    clearBackgroundButton.className = "small-button";
    clearBackgroundButton.textContent = "지움";
    clearBackgroundButton.disabled = !memo.backgroundImage && !memo.backgroundSourceImage;
    clearBackgroundButton.addEventListener("click", () =>
      updateMemoBackground(memo.id, {
        backgroundImage: "",
        backgroundSourceImage: "",
        backgroundCrop: null,
        backgroundTop: 0,
        backgroundCoverage: 1,
        backgroundPositionX: 0.5,
        backgroundPositionY: 0.5
      })
    );

    backgroundRow.append(backgroundButton, opacityLabel, clearBackgroundButton);

    row.append(main, colorRow, typeRow, backgroundRow);
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

function setFloatingMemo(id, shouldFloat, options = {}) {
  const exists = state.indexes.some((memo) => memo.id === id);
  if (!exists) return false;
  persistEditor();

  const alreadyFloating = state.floatingIds.includes(id);
  if (shouldFloat && !alreadyFloating) {
    if (state.floatingIds.length >= MAX_FLOATING) {
      if (options.showLimitMessage) setAllMemoListStatus("플로팅 개수는 최대 5개까지만 가능합니다.");
      return false;
    }
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
  return true;
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

function updateMemoBackground(id, partial) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo) return;
  if (partial.backgroundImage !== undefined) memo.backgroundImage = normalizeAssetUrl(partial.backgroundImage);
  if (partial.backgroundSourceImage !== undefined) {
    memo.backgroundSourceImage = normalizeAssetUrl(partial.backgroundSourceImage);
  }
  if (partial.backgroundCrop !== undefined) memo.backgroundCrop = normalizeBackgroundCrop(partial.backgroundCrop);
  if (partial.backgroundOpacity !== undefined) memo.backgroundOpacity = normalizeOpacity(partial.backgroundOpacity);
  if (partial.backgroundCoverage !== undefined) memo.backgroundCoverage = normalizeBackgroundCoverage(partial.backgroundCoverage);
  if (partial.backgroundTop !== undefined) {
    memo.backgroundTop = normalizeBackgroundTop(partial.backgroundTop, memo.backgroundCoverage);
  } else {
    memo.backgroundTop = normalizeBackgroundTop(memo.backgroundTop, memo.backgroundCoverage);
  }
  if (partial.backgroundPositionX !== undefined) {
    memo.backgroundPositionX = normalizeBackgroundPosition(partial.backgroundPositionX);
  }
  if (partial.backgroundPositionY !== undefined) {
    memo.backgroundPositionY = normalizeBackgroundPosition(partial.backgroundPositionY);
  }
  memo.updatedAt = Date.now();
  if (memo.id === state.activeId) {
    applyMemoTheme(memo);
    syncBackgroundControls(memo);
  }
  if (appShell.classList.contains("settings-open")) renderIndexManager();
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

function cropperImageRect() {
  if (!cropperStage || !cropperImage?.naturalWidth || !cropperImage?.naturalHeight) return null;
  const rect = cropperStage.getBoundingClientRect();
  const stageWidth = rect.width;
  const stageHeight = rect.height;
  if (!stageWidth || !stageHeight) return null;
  const imageRatio = cropperImage.naturalWidth / cropperImage.naturalHeight;
  const stageRatio = stageWidth / stageHeight;
  if (imageRatio > stageRatio) {
    const width = stageWidth;
    const height = width / imageRatio;
    return { left: 0, top: (stageHeight - height) / 2, width, height };
  }
  const height = stageHeight;
  const width = height * imageRatio;
  return { left: (stageWidth - width) / 2, top: 0, width, height };
}

function boxFromBackgroundCrop(crop, rect) {
  const normalizedCrop = normalizeBackgroundCrop(crop) || { x: 0, y: 0, width: 1, height: 1 };
  return {
    left: rect.left + normalizedCrop.x * rect.width,
    top: rect.top + normalizedCrop.y * rect.height,
    width: normalizedCrop.width * rect.width,
    height: normalizedCrop.height * rect.height
  };
}

function clampCropBox(box) {
  const rect = backgroundCropperState?.imageRect || cropperImageRect();
  if (!rect) return box;
  const minSize = Math.min(72, rect.width, rect.height);
  const width = clamp(box.width, minSize, rect.width);
  const height = clamp(box.height, minSize, rect.height);
  const left = clamp(box.left, rect.left, rect.left + rect.width - width);
  const top = clamp(box.top, rect.top, rect.top + rect.height - height);
  return { left, top, width, height };
}

function renderCropBox() {
  if (!cropperBox || !backgroundCropperState?.box) return;
  const box = backgroundCropperState.box;
  cropperBox.style.left = `${box.left}px`;
  cropperBox.style.top = `${box.top}px`;
  cropperBox.style.width = `${box.width}px`;
  cropperBox.style.height = `${box.height}px`;
}

function cropperCurrentCrop() {
  const rect = backgroundCropperState?.imageRect || cropperImageRect();
  const box = backgroundCropperState?.box;
  if (!rect || !box) return null;
  return normalizeBackgroundCrop({
    x: (box.left - rect.left) / rect.width,
    y: (box.top - rect.top) / rect.height,
    width: box.width / rect.width,
    height: box.height / rect.height
  });
}

function resetCropBox(forceFull = false) {
  const rect = cropperImageRect();
  if (!rect) return;
  const crop = forceFull ? { x: 0, y: 0, width: 1, height: 1 } : backgroundCropperState?.initialCrop;
  backgroundCropperState.imageRect = rect;
  backgroundCropperState.box = clampCropBox(boxFromBackgroundCrop(crop, rect));
  renderCropBox();
}

function cropperStageSize() {
  const target = backgroundCropperState?.mode === "coverage" ? coveragePreview : cropperStage;
  const rect = target?.getBoundingClientRect();
  if (!rect?.width || !rect?.height) return null;
  return { width: rect.width, height: rect.height };
}

function actualBackgroundSurfaceSize() {
  const rect = panel?.getBoundingClientRect();
  if (rect?.width && rect?.height) {
    return { width: rect.width, height: rect.height };
  }
  return {
    width: normalizePanelWidth(state.shell?.panelWidth),
    height: normalizePanelHeight(state.shell?.panelHeight)
  };
}

function fitCoveragePreviewToActualSurface() {
  if (!coveragePreview || !cropperStage) return;
  const surface = actualBackgroundSurfaceSize();
  const stageRect = cropperStage.getBoundingClientRect();
  if (!surface.width || !surface.height || !stageRect.width || !stageRect.height) return;

  const maxWidth = Math.max(1, stageRect.width - 24);
  const maxHeight = Math.max(1, stageRect.height - 24);
  const scale = Math.min(maxWidth / surface.width, maxHeight / surface.height);
  if (!Number.isFinite(scale) || scale <= 0) return;

  coveragePreview.style.width = `${Math.max(1, Math.round(surface.width * scale))}px`;
  coveragePreview.style.height = `${Math.max(1, Math.round(surface.height * scale))}px`;
}

function resetCoveragePreviewLayout(forceFull = false) {
  fitCoveragePreviewToActualSurface();
  resetCoverageBox(forceFull);
}

function backgroundPlacementFromMemo(memo) {
  const coverage = normalizeBackgroundCoverage(memo?.backgroundCoverage);
  return {
    top: normalizeBackgroundTop(memo?.backgroundTop, coverage),
    coverage,
    positionX: normalizeBackgroundPosition(memo?.backgroundPositionX),
    positionY: normalizeBackgroundPosition(memo?.backgroundPositionY)
  };
}

function boxFromBackgroundPlacement(placement, stage) {
  const coverage = normalizeBackgroundCoverage(placement?.coverage);
  return {
    top: normalizeBackgroundTop(placement?.top, coverage) * stage.height,
    height: coverage * stage.height
  };
}

function clampCoverageBox(box) {
  const stage = cropperStageSize();
  if (!stage) return box;
  const minHeight = Math.min(stage.height, Math.max(24, stage.height * 0.04));
  const height = clamp(box.height, minHeight, stage.height);
  const top = clamp(box.top, 0, stage.height - height);
  return { top, height };
}

function renderCoverageBox() {
  if (!coverageBox || !backgroundCropperState?.coverageBox) return;
  const box = backgroundCropperState.coverageBox;
  const imageX = `${Math.round(normalizeBackgroundPosition(backgroundCropperState.imagePositionX) * 10000) / 100}%`;
  const imageY = `${Math.round(normalizeBackgroundPosition(backgroundCropperState.imagePositionY) * 10000) / 100}%`;
  coverageBox.style.top = `${box.top}px`;
  coverageBox.style.height = `${box.height}px`;
  coveragePreview?.style.setProperty("--coverage-image-x", imageX);
  coveragePreview?.style.setProperty("--coverage-image-y", imageY);
  if (coverageImage) {
    coverageImage.style.top = `${box.top}px`;
    coverageImage.style.height = `${box.height}px`;
  }
  coverageBox.classList.toggle("image-move-mode", backgroundCropperState.imageMoveMode === true);
}

function updateCoverageModeTitle() {
  if (!cropperTitle || backgroundCropperState?.mode !== "coverage") return;
  cropperTitle.textContent = backgroundCropperState.imageMoveMode ? "사진 위치 조정" : "등록 범위 지정";
}

function coverageCurrentPlacement() {
  const stage = cropperStageSize();
  const box = backgroundCropperState?.coverageBox;
  if (!stage || !box) {
    return {
      top: 0,
      coverage: 1,
      positionX: normalizeBackgroundPosition(backgroundCropperState?.imagePositionX),
      positionY: normalizeBackgroundPosition(backgroundCropperState?.imagePositionY)
    };
  }
  const coverage = normalizeBackgroundCoverage(box.height / stage.height);
  return {
    top: normalizeBackgroundTop(box.top / stage.height, coverage),
    coverage,
    positionX: normalizeBackgroundPosition(backgroundCropperState.imagePositionX),
    positionY: normalizeBackgroundPosition(backgroundCropperState.imagePositionY)
  };
}

function resetCoverageBox(forceFull = false) {
  const stage = cropperStageSize();
  if (!stage || !backgroundCropperState) return;
  const placement = forceFull ? { top: 0, coverage: 1 } : backgroundCropperState.initialPlacement;
  backgroundCropperState.coverageBox = clampCoverageBox(boxFromBackgroundPlacement(placement, stage));
  renderCoverageBox();
}

function setCropperMode(mode) {
  if (!backgroundCropperState) return;
  backgroundCropperState.mode = mode;
  const coverageMode = mode === "coverage";
  cropperTitle && (cropperTitle.textContent = coverageMode ? "등록 범위 지정" : "배경 자르기");
  cropperStage?.classList.toggle("coverage-mode", coverageMode);
  cropperBox?.classList.toggle("hidden", coverageMode);
  coveragePreview?.classList.toggle("hidden", !coverageMode);
  coverageBox?.classList.toggle("hidden", !coverageMode);
  updateCoverageModeTitle();
}

function beginCoveragePlacement(dataUrl, crop) {
  if (!backgroundCropperState || !coverageImage) return;
  const memo = state.indexes.find((item) => item.id === backgroundCropperState.memoId);
  backgroundCropperState.pendingDataUrl = dataUrl;
  backgroundCropperState.pendingCrop = crop;
  backgroundCropperState.initialPlacement = backgroundPlacementFromMemo(memo);
  backgroundCropperState.imagePositionX = backgroundCropperState.initialPlacement.positionX;
  backgroundCropperState.imagePositionY = backgroundCropperState.initialPlacement.positionY;
  backgroundCropperState.imageMoveMode = false;
  backgroundCropperState.coverageBox = null;
  backgroundCropperState.drag = null;
  cropperStage?.style.setProperty("--coverage-preview-bg", normalizeHexColor(memo?.color, "#fff4b8"));
  coveragePreview?.querySelector(".coverage-preview-title") &&
    (coveragePreview.querySelector(".coverage-preview-title").textContent = memo?.title || "메모");
  setCropperMode("coverage");
  coverageImage.onload = () => requestAnimationFrame(() => resetCoveragePreviewLayout());
  coverageImage.removeAttribute("src");
  coverageImage.src = dataUrl;
  requestAnimationFrame(() => resetCoveragePreviewLayout());
}

function openBackgroundCropper(sourceUrl, memoId, crop = null, isExisting = false) {
  if (!sourceUrl || !memoId || !backgroundCropper || !cropperImage) return;
  const memo = state.indexes.find((item) => item.id === memoId);
  backgroundCropperState = {
    mode: "crop",
    memoId,
    sourceUrl,
    isExisting: Boolean(isExisting),
    initialCrop: normalizeBackgroundCrop(crop),
    initialPlacement: backgroundPlacementFromMemo(memo),
    pendingDataUrl: "",
    pendingCrop: null,
    imageRect: null,
    box: null,
    coverageBox: null,
    imagePositionX: normalizeBackgroundPosition(memo?.backgroundPositionX),
    imagePositionY: normalizeBackgroundPosition(memo?.backgroundPositionY),
    imageMoveMode: false,
    drag: null
  };
  setCropperMode("crop");
  cropperClearBackgroundButton?.classList.toggle("hidden", !backgroundCropperState.isExisting);
  cropperApplyButton.disabled = false;
  cropperImage.onload = () => requestAnimationFrame(() => resetCropBox());
  cropperImage.onerror = () => {
    setSettingsStatus("Background image could not be opened.", 0);
    cropperApplyButton.disabled = false;
  };
  cropperImage.removeAttribute("src");
  coverageImage?.removeAttribute("src");
  backgroundCropper.classList.remove("hidden");
  cropperImage.src = sourceUrl;
}

function closeBackgroundCropper() {
  if (backgroundCropperState?.objectUrl) URL.revokeObjectURL(backgroundCropperState.objectUrl);
  backgroundCropperState = null;
  if (backgroundCropper) backgroundCropper.classList.add("hidden");
  cropperStage?.classList.remove("coverage-mode");
  cropperStage?.style.removeProperty("--coverage-preview-bg");
  cropperBox?.classList.remove("hidden");
  coveragePreview?.classList.add("hidden");
  if (coveragePreview) {
    coveragePreview.style.width = "";
    coveragePreview.style.height = "";
  }
  coverageBox?.classList.add("hidden");
  coverageBox?.classList.remove("image-move-mode");
  cropperClearBackgroundButton?.classList.add("hidden");
  if (cropperImage) cropperImage.removeAttribute("src");
  if (coverageImage) coverageImage.removeAttribute("src");
}

function handleCropperWindowResize() {
  if (!backgroundCropperState) return;
  if (backgroundCropperState.mode === "coverage") {
    backgroundCropperState.initialPlacement = coverageCurrentPlacement();
    requestAnimationFrame(() => resetCoveragePreviewLayout());
    return;
  }
  backgroundCropperState.initialCrop = cropperCurrentCrop() || backgroundCropperState.initialCrop;
  requestAnimationFrame(() => resetCropBox());
}

function resizeCropBox(handle, startBox, deltaX, deltaY) {
  let { left, top, width, height } = startBox;
  if (handle.includes("w")) {
    left += deltaX;
    width -= deltaX;
  }
  if (handle.includes("e")) width += deltaX;
  if (handle.includes("n")) {
    top += deltaY;
    height -= deltaY;
  }
  if (handle.includes("s")) height += deltaY;
  return { left, top, width, height };
}

function resizeCoveragePlacement(handle, startBox, deltaY) {
  if (handle === "top") return { top: startBox.top + deltaY, height: startBox.height - deltaY };
  if (handle === "bottom") return { top: startBox.top, height: startBox.height + deltaY };
  return { top: startBox.top + deltaY, height: startBox.height };
}

function moveCoverageImagePosition(startX, startY, deltaX, deltaY) {
  const box = backgroundCropperState?.coverageBox;
  const imageRect = coverageImage?.getBoundingClientRect();
  const width = imageRect?.width || cropperStageSize()?.width;
  const height = imageRect?.height || box?.height;
  if (!width || !height) return;
  backgroundCropperState.imagePositionX = normalizeBackgroundPosition(startX - deltaX / width);
  backgroundCropperState.imagePositionY = normalizeBackgroundPosition(startY - deltaY / height);
  renderCoverageBox();
}

function toggleCoverageImageMoveMode(event) {
  if (backgroundCropperState?.mode !== "coverage") return;
  const target = event?.target;
  if (target instanceof Element && target.dataset.coverageHandle) return;
  event?.preventDefault();
  event?.stopPropagation();
  backgroundCropperState.imageMoveMode = !backgroundCropperState.imageMoveMode;
  updateCoverageModeTitle();
  renderCoverageBox();
}

function beginCoverageDrag(event) {
  if (!backgroundCropperState?.coverageBox) return;
  const target = event.target;
  if (!(target instanceof Element) || !target.closest("#coverageBox")) return;
  const handle = target.dataset.coverageHandle || "move";
  backgroundCropperState.drag = {
    handle: backgroundCropperState.imageMoveMode && handle === "move" ? "image" : handle,
    startX: event.clientX,
    startY: event.clientY,
    startPositionX: backgroundCropperState.imagePositionX,
    startPositionY: backgroundCropperState.imagePositionY,
    startBox: { ...backgroundCropperState.coverageBox }
  };
  cropperStage?.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function moveCoverageDrag(event) {
  if (!backgroundCropperState?.drag) return;
  const drag = backgroundCropperState.drag;
  const deltaX = event.clientX - drag.startX;
  const deltaY = event.clientY - drag.startY;
  if (drag.handle === "image") {
    moveCoverageImagePosition(drag.startPositionX, drag.startPositionY, deltaX, deltaY);
    return;
  }
  backgroundCropperState.coverageBox = clampCoverageBox(resizeCoveragePlacement(drag.handle, drag.startBox, deltaY));
  renderCoverageBox();
}

function beginCropDrag(event) {
  if (backgroundCropperState?.mode === "coverage") {
    beginCoverageDrag(event);
    return;
  }
  if (!backgroundCropperState?.box) return;
  const target = event.target;
  if (!(target instanceof Element) || !target.closest("#cropperBox")) return;
  const handle = target instanceof Element ? target.dataset.cropHandle || "move" : "move";
  backgroundCropperState.drag = {
    handle,
    startX: event.clientX,
    startY: event.clientY,
    startBox: { ...backgroundCropperState.box }
  };
  cropperStage?.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function moveCropDrag(event) {
  if (backgroundCropperState?.mode === "coverage") {
    moveCoverageDrag(event);
    return;
  }
  if (!backgroundCropperState?.drag) return;
  const drag = backgroundCropperState.drag;
  const deltaX = event.clientX - drag.startX;
  const deltaY = event.clientY - drag.startY;
  const nextBox =
    drag.handle === "move"
      ? {
          ...drag.startBox,
          left: drag.startBox.left + deltaX,
          top: drag.startBox.top + deltaY
        }
      : resizeCropBox(drag.handle, drag.startBox, deltaX, deltaY);
  backgroundCropperState.box = clampCropBox(nextBox);
  renderCropBox();
}

function endCropDrag(event) {
  if (!backgroundCropperState?.drag) return;
  backgroundCropperState.drag = null;
  try {
    cropperStage?.releasePointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture can disappear when the cropper is closed mid-drag.
  }
}

function croppedBackgroundDataUrl() {
  const crop = cropperCurrentCrop();
  if (!crop || !cropperImage?.naturalWidth || !cropperImage?.naturalHeight) return "";
  const naturalWidth = cropperImage.naturalWidth;
  const naturalHeight = cropperImage.naturalHeight;
  const sourceX = clamp(Math.round(crop.x * naturalWidth), 0, naturalWidth - 1);
  const sourceY = clamp(Math.round(crop.y * naturalHeight), 0, naturalHeight - 1);
  const sourceWidth = clamp(Math.round(crop.width * naturalWidth), 1, naturalWidth - sourceX);
  const sourceHeight = clamp(Math.round(crop.height * naturalHeight), 1, naturalHeight - sourceY);
  const scale = Math.min(1, 1800 / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  context.drawImage(cropperImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

async function applyBackgroundCrop() {
  if (!backgroundCropperState) return;
  if (backgroundCropperState.mode === "coverage") {
    await applyBackgroundPlacement();
    return;
  }
  cropperApplyButton.disabled = true;
  const crop = cropperCurrentCrop();
  const dataUrl = croppedBackgroundDataUrl();
  if (!dataUrl) {
    setSettingsStatus("배경 이미지를 자를 수 없습니다.", 0);
    cropperApplyButton.disabled = false;
    return;
  }
  beginCoveragePlacement(dataUrl, crop);
  cropperApplyButton.disabled = false;
}

async function applyBackgroundPlacement() {
  if (!backgroundCropperState) return;
  cropperApplyButton.disabled = true;
  const memoId = backgroundCropperState.memoId;
  const sourceUrl = backgroundCropperState.sourceUrl;
  const crop = backgroundCropperState.pendingCrop || cropperCurrentCrop();
  const dataUrl = backgroundCropperState.pendingDataUrl;
  const placement = coverageCurrentPlacement();
  const result = await window.memoEdge.saveBackgroundImage?.(dataUrl);
  if (!result?.ok || !result?.url) {
    setSettingsStatus(`배경 저장 실패: ${result?.message || "이미지 없음"}`, 0);
    cropperApplyButton.disabled = false;
    return;
  }
  const memo = state.indexes.find((item) => item.id === memoId);
  updateMemoBackground(memoId, {
    backgroundImage: result.url,
    backgroundSourceImage: sourceUrl,
    backgroundCrop: crop,
    backgroundOpacity: normalizeOpacity(memo?.backgroundOpacity),
    backgroundTop: placement.top,
    backgroundCoverage: placement.coverage,
    backgroundPositionX: placement.positionX,
    backgroundPositionY: placement.positionY
  });
  closeBackgroundCropper();
}

function imageFileFromPaste(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const item = items.find((entry) => entry.kind === "file" && entry.type.startsWith("image/"));
  if (item) return item.getAsFile();
  return Array.from(event.clipboardData?.files || []).find((file) => file.type.startsWith("image/")) || null;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

async function savePastedImageFile(file) {
  const dataUrl = await fileToDataUrl(file);
  const result = await window.memoEdge.saveBackgroundImage?.(dataUrl);
  if (!result?.ok || !result?.url) throw new Error(result?.message || "IMAGE_SAVE_FAILED");
  return result.url;
}

function shouldHandleEditorPaste(event) {
  if (appShell?.classList.contains("settings-open")) return false;
  if (backgroundCropper && !backgroundCropper.classList.contains("hidden")) return false;

  const target = event.target;
  if (target instanceof Element) {
    if (target.closest("input, textarea, select, button, .table-picker, .table-tools")) return false;
    const editable = target.closest("[contenteditable='true']");
    if (editable && editable !== editor && !editor.contains(editable)) return false;
  }

  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  return editor.contains(document.activeElement) || selectionBelongsToEditor(range) || selectionBelongsToEditor(savedEditorRange);
}

function insertInlineImage(url) {
  restoreEditorSelection();
  const imageLine = document.createElement("div");
  imageLine.className = "memo-image-line";
  const image = document.createElement("img");
  image.className = "memo-inline-image";
  image.src = url;
  image.alt = "";
  imageLine.appendChild(image);

  const afterLine = createBlankLine();
  const fragment = document.createDocumentFragment();
  fragment.append(imageLine, afterLine);
  insertNodeAtSelection(fragment);
  placeCaretInBlock(afterLine);
  persistEditor();
  pushEditorHistory();
}

async function handleEditorPaste(event) {
  const memo = activeMemo();
  if (!memo || !shouldHandleEditorPaste(event)) return;

  const table = pastedTableFromClipboard(event.clipboardData);
  if (table) {
    event.preventDefault();
    insertPastedTable(table);
    return;
  }

  const file = imageFileFromPaste(event);
  if (!file) return;
  event.preventDefault();
  try {
    const sourceUrl = await savePastedImageFile(file);
    insertInlineImage(sourceUrl);
  } catch (error) {
    setSettingsStatus(`이미지 붙여넣기 실패: ${error.message || error}`, 0);
  }
}

async function importFontForApp() {
  const result = await window.memoEdge.importFontFile?.();
  if (result?.canceled) return;
  if (!result?.ok) {
    setSettingsStatus(`글씨체 추가 실패: ${result?.message || "알 수 없음"}`, 0);
    return;
  }
  registerCustomFonts(result.fonts || (result.font ? [...customFonts, result.font] : customFonts));
  const nextFamily = result.font?.family;
  if (nextFamily) {
    state.memoDefaults = normalizeMemoDefaults({ ...state.memoDefaults, fontFamily: nextFamily });
    populateFontFamilySelect(commonFontFamilySelect, state.prefs?.commonFontFamily || DEFAULT_FONT_FAMILY);
    populateFontFamilySelect(defaultFontFamilySelect, nextFamily);
    syncToolbarTypography();
    renderIndexManager();
    saveState();
  }
  setSettingsStatus("글씨체 추가됨");
}

async function importBackgroundForMemo(id) {
  const result = await window.memoEdge.importBackgroundImage?.();
  if (result?.canceled) return;
  if (!result?.ok) {
    setSettingsStatus(`배경 추가 실패: ${result?.message || "알 수 없음"}`, 0);
    return;
  }
  openBackgroundCropper(result.url, id, null, false);
}

async function editBackgroundForMemo(id) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo) return;
  const sourceUrl = normalizeAssetUrl(memo.backgroundSourceImage || memo.backgroundImage);
  if (sourceUrl) {
    openBackgroundCropper(sourceUrl, id, memo.backgroundCrop, true);
    return;
  }
  await importBackgroundForMemo(id);
}

function clearBackgroundForMemo(id) {
  const memo = state.indexes.find((item) => item.id === id);
  if (!memo) return;
  updateMemoBackground(id, {
    backgroundImage: "",
    backgroundSourceImage: "",
    backgroundCrop: null,
    backgroundOpacity: normalizeOpacity(memo.backgroundOpacity),
    backgroundTop: 0,
    backgroundCoverage: 1,
    backgroundPositionX: 0.5,
    backgroundPositionY: 0.5
  });
  closeBackgroundCropper();
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
    memo.backgroundImage = "";
    memo.backgroundSourceImage = "";
    memo.backgroundCrop = null;
    memo.backgroundOpacity = 0;
    memo.backgroundTop = 0;
    memo.backgroundCoverage = 1;
    memo.backgroundPositionX = 0.5;
    memo.backgroundPositionY = 0.5;
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
  const selectedDisplay = displaySelect.value || "auto";
  const cycleShortcut = cycleShortcutInput.value.trim() || DEFAULT_CYCLE_SHORTCUT;
  const hideShortcut = hideShortcutInput.value.trim() || DEFAULT_HIDE_SHORTCUT;
  const findShortcut = findShortcutInput?.value.trim() || DEFAULT_FIND_SHORTCUT;
  state.memoDefaults = normalizeMemoDefaults({
    fontFamily: defaultFontFamilySelect.value,
    fontSize: defaultFontSizeSelect.value,
    lineSpacing: defaultLineSpacingSelect.value
  });
  state.prefs = normalizeAppPrefs({
    ...state.prefs,
    commonFontFamily: commonFontFamilySelect?.value || DEFAULT_FONT_FAMILY,
    commonFontSize: commonFontSizeSelect?.value || DEFAULT_COMMON_FONT_SIZE,
    showLaunchGuideOnStartup: startupGuideInput.checked,
    startupDefaultApplied: true,
    startupUserChoiceSet: false
  });
  if (startupInput) startupInput.checked = true;

  const shortcutKeys = [cycleShortcut, hideShortcut, findShortcut].map((shortcut) => shortcut.toLowerCase());
  if (new Set(shortcutKeys).size !== shortcutKeys.length) {
    setSettingsStatus("단축키는 서로 달라야 합니다.", 0);
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
    findShortcut,
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
  activeSubtitle.textContent = "";
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
    commonFontFamily: DEFAULT_FONT_FAMILY,
    commonFontSize: DEFAULT_COMMON_FONT_SIZE,
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

document.querySelectorAll(".tool-button").forEach((button) => {
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    rememberEditorSelection();
  });
});

editor.addEventListener("input", () => {
  markEditorDirty();
  queueEditorHistory();
  rememberEditorSelection();
  scheduleToolbarRefresh();
  scheduleTableToolsRefresh();
});
editor.addEventListener("keydown", handleEditorKeydown);
editor.addEventListener("pointerdown", beginTableCellSelection);
editor.addEventListener("keyup", () => {
  rememberEditorSelection();
  scheduleToolbarRefresh();
  scheduleTableToolsRefresh();
});
editor.addEventListener("mouseup", () => {
  rememberEditorSelection();
  scheduleToolbarRefresh();
  scheduleTableToolsRefresh();
});
editor.addEventListener("focus", () => {
  rememberEditorSelection();
  scheduleToolbarRefresh();
  scheduleTableToolsRefresh();
});
editor.addEventListener("click", (event) => {
  if (event.target.closest(".check-box")) {
    event.preventDefault();
    toggleChecklistItem(event.target);
  }
  scheduleTableToolsRefresh();
});
document.addEventListener("selectionchange", () => {
  scheduleToolbarRefresh();
  if (document.activeElement === editor || editor.contains(document.activeElement)) {
    scheduleTableToolsRefresh();
  }
});
document.addEventListener("pointermove", moveTableCellSelection);
document.addEventListener("pointerup", endTableCellSelection);
document.addEventListener("pointercancel", endTableCellSelection);
handleRail?.addEventListener("pointerdown", beginRailPositionDrag);
document.addEventListener("pointermove", moveRailPositionDrag);
document.addEventListener("pointerup", endRailPositionDrag);
document.addEventListener("pointercancel", endRailPositionDrag);
document.addEventListener("pointerup", endHandleDrag);
document.addEventListener("pointercancel", endHandleDrag);
document.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const textColorField = textColorInput?.closest(".toolbar-color-field");
  if (
    textColorPalette &&
    !textColorPalette.classList.contains("hidden") &&
    !textColorPalette.contains(target) &&
    !textColorField?.contains(target)
  ) {
    setTextColorPaletteOpen(false);
  }
  if (
    editor.contains(target) ||
    tableTools?.contains(target) ||
    tablePicker?.contains(target) ||
    tableButton?.contains(target)
  ) {
    return;
  }
  clearTableSelection();
});
collapseButton.addEventListener("click", () => setExpanded(false));
toolbarToggleButton?.addEventListener("click", toggleToolbarVisibility);
settingsButton.addEventListener("click", openSettings);
deleteActiveMemoButton?.addEventListener("click", () => {
  const memo = activeMemo();
  if (memo) deleteIndex(memo.id);
});
closeSettingsButton.addEventListener("click", closeSettings);
allMemosButton.addEventListener("click", () => setMemoListOpen(memoListPanel.classList.contains("hidden")));
activePopupButton?.addEventListener("click", popupActiveMemo);
closeMemoListButton.addEventListener("click", () => setMemoListOpen(false));
closeMemoSearchButton?.addEventListener("click", closeMemoSearch);
memoSearchInput?.addEventListener("input", renderMemoSearchResults);
memoSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeMemoSearch();
    editor.focus({ preventScroll: true });
    return;
  }
  if (event.key === "Enter") {
    const firstResult = memoSearchResults?.querySelector(".memo-search-result");
    if (firstResult instanceof HTMLButtonElement) {
      event.preventDefault();
      firstResult.click();
    }
  }
});
addSettingsIndexButton.addEventListener("click", addIndex);
importFontButton?.addEventListener("click", importFontForApp);
[commonFontFamilySelect, defaultFontFamilySelect].forEach((select) => {
  select?.addEventListener("change", () => {
    select.style.fontFamily = fontFamilyCss(select.value);
  });
});
backgroundButton?.addEventListener("click", () => {
  const memo = activeMemo();
  if (memo) editBackgroundForMemo(memo.id);
});
footerOpacityInput?.addEventListener("input", () => {
  const memo = activeMemo();
  if (memo) updateMemoBackground(memo.id, { backgroundOpacity: footerOpacityInput.value });
});
cropperStage?.addEventListener("pointerdown", beginCropDrag);
cropperStage?.addEventListener("pointermove", moveCropDrag);
cropperStage?.addEventListener("pointerup", endCropDrag);
cropperStage?.addEventListener("pointercancel", endCropDrag);
coverageBox?.addEventListener("dblclick", toggleCoverageImageMoveMode);
cropperCancelButton?.addEventListener("click", closeBackgroundCropper);
cropperResetButton?.addEventListener("click", () => {
  if (!backgroundCropperState) return;
  if (backgroundCropperState.mode === "coverage") {
    backgroundCropperState.initialPlacement = { top: 0, coverage: 1 };
    backgroundCropperState.imagePositionX = 0.5;
    backgroundCropperState.imagePositionY = 0.5;
    backgroundCropperState.imageMoveMode = false;
    updateCoverageModeTitle();
    resetCoveragePreviewLayout(true);
    return;
  }
  backgroundCropperState.initialCrop = { x: 0, y: 0, width: 1, height: 1 };
  resetCropBox(true);
});
cropperClearBackgroundButton?.addEventListener("click", () => {
  const memoId = backgroundCropperState?.memoId;
  if (memoId) clearBackgroundForMemo(memoId);
});
cropperApplyButton?.addEventListener("click", applyBackgroundCrop);
document.addEventListener("paste", handleEditorPaste);
window.addEventListener("resize", handleCropperWindowResize);
lengthSelect.addEventListener("change", syncPanelSizeFields);
anchorSelect.addEventListener("change", syncPanelSizeFields);
panelPositionInput?.addEventListener("input", () => {
  anchorSelect.value = "custom";
  syncPanelSizeFields();
});
document.querySelectorAll("[data-resize-axis]").forEach((grip) => {
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
tableCellColorButtons.forEach((button) => {
  button.addEventListener("click", () => applyTableCellColorValue(button.dataset.tableCellColor));
});
clearTableCellColorButton?.addEventListener("click", clearTableCellColor);
deleteTableButton?.addEventListener("click", deleteTable);
textColorInput?.closest(".toolbar-color-field")?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  rememberEditorSelection();
});
textColorInput?.closest(".toolbar-color-field")?.addEventListener("click", (event) => {
  event.preventDefault();
  toggleTextColorPalette();
});
textColorInput?.addEventListener("click", (event) => event.preventDefault());
textColorInput?.addEventListener("input", () => applyTextColor(textColorInput.value));
fontFamilyToolbarSelect?.addEventListener("mousedown", rememberEditorSelection);
fontSizeToolbarSelect?.addEventListener("mousedown", rememberEditorSelection);
lineSpacingToolbarSelect?.addEventListener("mousedown", rememberEditorSelection);
fontSizeToolbarSelect.addEventListener("change", () => {
  applyInlineTextStyle("fontSize", `${normalizeFontSize(fontSizeToolbarSelect.value)}px`);
});
fontFamilyToolbarSelect.addEventListener("change", () => {
  fontFamilyToolbarSelect.style.fontFamily = fontFamilyCss(fontFamilyToolbarSelect.value);
  applyInlineTextStyle("fontFamily", fontFamilyCss(fontFamilyToolbarSelect.value));
});
lineSpacingToolbarSelect.addEventListener("change", () => {
  applyLineSpacingToSelection(lineSpacingToolbarSelect.value);
});
clearButton?.addEventListener("click", clearEditorPreservingUndo);
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
if (findShortcutInput) setupShortcutCapture(findShortcutInput, DEFAULT_FIND_SHORTCUT);
document.addEventListener("keydown", handleFindShortcut, true);

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

window.addEventListener("beforeunload", () => {
  clearPendingEditorHistory();
  persistEditor();
  saveState();
});

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
    registerCustomFonts(payload?.customFonts || []);
  } catch {
    systemFonts = [DEFAULT_FONT_FAMILY, "GulimChe", "Malgun Gothic", "Arial", "Calibri", "Consolas"];
    registerCustomFonts([]);
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
}

initialize();
