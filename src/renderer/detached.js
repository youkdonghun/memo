const CHECK_TEXT_PLACEHOLDER = "\u200b";
const APP_STORAGE_KEY = "memo-bom-state-v2";
const DEFAULT_FONT_FAMILY = "Gulim";
const DEFAULT_FONT_SIZE = 15;
const DEFAULT_LINE_SPACING = 1.5;
const DEFAULT_EMOJI_SHORTCUT = "CommandOrControl+Shift+E";
const MAX_PASTED_TABLE_ROWS = 80;
const MAX_PASTED_TABLE_COLS = 40;
const SAVE_DEBOUNCE_MS = 450;
const HISTORY_DEBOUNCE_MS = 650;
const MAX_EDITOR_HISTORY_ENTRIES = 35;
const MAX_EDITOR_HISTORY_BYTES = 1800000;
const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 40, 48, 64, 72, 96];
const MIN_FONT_SIZE = FONT_SIZE_OPTIONS[0];
const MAX_FONT_SIZE = FONT_SIZE_OPTIONS[FONT_SIZE_OPTIONS.length - 1];
const LINE_SPACING_OPTIONS = [0.8, 1, 1.15, 1.5, 2, 2.5, 3, 3.5, 4];
const DETACHED_RECENT_TEXT_COLORS_KEY = "memo-bom-detached-recent-text-colors";
const MAX_RECENT_TEXT_COLORS = 6;
const MAX_CUSTOM_EMOJI_IMAGES = 24;
const CARRIED_TYPING_STYLE_PROPERTIES = ["fontFamily", "fontSize", "color"];
const PERF_WARN_MS = 16;
const PERF_SLOW_WARN_MS = 50;
const SOFT_BACKGROUND_OPACITY = 0.62;
const REMINDER_REPEAT_OPTIONS = ["none", "daily", "weekly", "monthly"];
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
const EMOJI_PRESETS = [
  "😀",
  "😄",
  "😊",
  "🙂",
  "😂",
  "🤣",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "😅",
  "😢",
  "😡",
  "😴",
  "😱",
  "🙄",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "👌",
  "🙌",
  "🤝",
  "✋",
  "🔥",
  "⭐",
  "🌟",
  "💯",
  "✅",
  "☑️",
  "❌",
  "⭕",
  "⚠️",
  "❗",
  "❓",
  "🔔",
  "💡",
  "📌",
  "📎",
  "📅",
  "⏰",
  "📝",
  "📋",
  "📊",
  "📈",
  "📉",
  "💼",
  "📁",
  "🔍",
  "🔒",
  "🎯",
  "🚀",
  "🏁",
  "🏆",
  "🔁",
  "⬆️",
  "⬇️",
  "➡️",
  "⬅️",
  "🎉",
  "❤️",
  "💙",
  "☕",
  "🍀"
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

const defaultToolbarButtons = {
  fontFamily: true,
  fontSize: true,
  lineSpacing: true,
  undo: true,
  redo: true,
  bold: true,
  italic: true,
  underline: true,
  strike: true,
  bullet: true,
  orderedList: true,
  checklist: true,
  table: true,
  textColor: true,
  background: true,
  link: true,
  emoji: true
};

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

let memo = null;
let saveTimer = null;
let historyTimer = null;
let savedEditorRange = null;
let lastTableCell = null;
let tableSelectionState = null;
let tableDragSelectState = null;
let systemFonts = [DEFAULT_FONT_FAMILY, "GulimChe", "Malgun Gothic", "Arial", "Calibri", "Consolas"];
let customFonts = [];
let editorHistory = [];
let editorHistoryIndex = -1;
let applyingHistory = false;
let pendingEditorHistorySnapshot = null;
let pendingEditorHistoryNeedsSnapshot = false;
let memoHtmlDirty = false;
let toolbarRefreshFrame = null;
let tableToolsRefreshFrame = null;
let lastRenderedTableSelection = { table: null, cells: new Set(), activeCell: null };
let recentTextColors = loadRecentTextColors();
let backgroundCropperState = null;
let attachingDetachedMemo = false;
let emojiShortcut = DEFAULT_EMOJI_SHORTCUT;
let editingReminderId = null;

const titleInput = document.getElementById("detachedTitleInput");
const editor = document.getElementById("detachedEditor");
const attachButton = document.getElementById("attachMemoButton");
const saveStatus = document.getElementById("detachedSaveStatus");
const fontFamilySelect = document.getElementById("fontFamilySelect");
const fontSizeSelect = document.getElementById("fontSizeSelect");
const lineSpacingSelect = document.getElementById("lineSpacingSelect");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const bulletButton = document.getElementById("bulletButton");
const orderedListButton = document.getElementById("orderedListButton");
const checkButton = document.getElementById("checkButton");
const tableButton = document.getElementById("tableButton");
const clearButton = document.getElementById("clearButton");
const textColorInput = document.getElementById("textColorInput");
const textColorPalette = document.getElementById("textColorPalette");
const linkButton = document.getElementById("linkButton");
const emojiButton = document.getElementById("emojiButton");
const emojiPalette = document.getElementById("emojiPalette");
const attachmentButton = document.getElementById("detachedAttachmentButton");
const attachmentCountBadge = document.getElementById("detachedAttachmentCount");
const attachmentPanel = document.getElementById("detachedAttachmentPanel");
const addAttachmentButton = document.getElementById("detachedAddAttachmentButton");
const attachmentList = document.getElementById("detachedAttachmentList");
const attachmentStatus = document.getElementById("detachedAttachmentStatus");
const reminderButton = document.getElementById("detachedReminderButton");
const reminderCountBadge = document.getElementById("detachedReminderCount");
const reminderPanel = document.getElementById("detachedReminderPanel");
const reminderTitleInput = document.getElementById("detachedReminderTitleInput");
const reminderBodyInput = document.getElementById("detachedReminderBodyInput");
const reminderDateTimeInput = document.getElementById("detachedReminderDateTimeInput");
const reminderRepeatSelect = document.getElementById("detachedReminderRepeatSelect");
const addReminderButton = document.getElementById("detachedAddReminderButton");
const reminderList = document.getElementById("detachedReminderList");
const reminderStatus = document.getElementById("detachedReminderStatus");
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
const softBackgroundInput = document.getElementById("softBackgroundInput");
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
const detachedShell = document.querySelector(".detached-shell");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : fallback;
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

function normalizeCustomEmojiImages(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((item) => {
      const url = normalizeAssetUrl(item?.url);
      if (!url || seen.has(url)) return null;
      seen.add(url);
      return {
        id: typeof item?.id === "string" && item.id ? item.id : url,
        name: typeof item?.name === "string" && item.name.trim() ? item.name.trim().slice(0, 40) : "이모티콘",
        url
      };
    })
    .filter(Boolean)
    .slice(0, MAX_CUSTOM_EMOJI_IMAGES);
}

function loadCustomEmojiImages() {
  try {
    const raw = JSON.parse(localStorage.getItem(APP_STORAGE_KEY) || "{}");
    return normalizeCustomEmojiImages(raw?.prefs?.customEmojiImages);
  } catch {
    return [];
  }
}

function loadRecentTextColors() {
  try {
    return normalizeTextColorList(JSON.parse(localStorage.getItem(DETACHED_RECENT_TEXT_COLORS_KEY) || "[]"));
  } catch {
    return [];
  }
}

function saveRecentTextColors() {
  localStorage.setItem(DETACHED_RECENT_TEXT_COLORS_KEY, JSON.stringify(recentTextColors));
}

function normalizeFontSize(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(Math.round(numeric), MIN_FONT_SIZE, MAX_FONT_SIZE) : DEFAULT_FONT_SIZE;
}

function normalizeLineSpacing(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LINE_SPACING;
  return Math.round(clamp(numeric, 0.8, 4) * 100) / 100;
}

function normalizeOpacity(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(clamp(numeric, 0, 1) * 100) / 100 : 0;
}

function normalizeBackgroundCoverage(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(clamp(numeric, 0.1, 1) * 10000) / 10000 : 1;
}

function normalizeBackgroundTop(value, coverage = 1) {
  const normalizedCoverage = normalizeBackgroundCoverage(coverage);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(clamp(numeric, 0, 1 - normalizedCoverage) * 10000) / 10000 : 0;
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

function normalizeAttachment(value) {
  if (!value || typeof value !== "object") return null;
  const storedPath = typeof value.storedPath === "string" ? value.storedPath : "";
  const id = typeof value.id === "string" && value.id ? value.id : storedPath;
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "첨부파일";
  if (!id || !storedPath) return null;
  const size = Number(value.size);
  const createdAt = Number(value.createdAt);
  return {
    id,
    name,
    ext: typeof value.ext === "string" ? value.ext : "",
    size: Number.isFinite(size) && size > 0 ? size : 0,
    storedPath,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now()
  };
}

function normalizeAttachments(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeAttachment).filter(Boolean);
}

function normalizeReminderRepeat(value) {
  return REMINDER_REPEAT_OPTIONS.includes(value) ? value : "none";
}

function normalizeReminderFireTimeValue(value) {
  const date = new Date(Number(value));
  if (!Number.isFinite(date.getTime())) return NaN;
  date.setSeconds(0, 0);
  return date.getTime();
}

function normalizeReminder(value) {
  if (!value || typeof value !== "object") return null;
  const id = typeof value.id === "string" && value.id ? value.id : `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim().slice(0, 80) : "메모 알림";
  const body = typeof value.body === "string" ? value.body.trim().slice(0, 240) : "";
  const scheduledAt = normalizeReminderFireTimeValue(value.scheduledAt);
  const nextFireAt = normalizeReminderFireTimeValue(value.nextFireAt);
  const fallbackTime = Date.now() + 10 * 60 * 1000;
  return {
    id,
    title,
    body,
    scheduledAt: Number.isFinite(scheduledAt) ? scheduledAt : fallbackTime,
    repeat: normalizeReminderRepeat(value.repeat),
    nextFireAt: Number.isFinite(nextFireAt) ? nextFireAt : Number.isFinite(scheduledAt) ? scheduledAt : fallbackTime,
    lastFiredAt: Number.isFinite(Number(value.lastFiredAt)) ? Number(value.lastFiredAt) : null,
    enabled: value.enabled !== false
  };
}

function normalizeReminders(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const seenActiveSlots = new Set();
  return value
    .map(normalizeReminder)
    .filter((reminder) => {
      if (!reminder || seen.has(reminder.id)) return false;
      seen.add(reminder.id);
      if (reminder.enabled) {
        const slotKey = String(reminder.nextFireAt);
        if (seenActiveSlots.has(slotKey)) return false;
        seenActiveSlots.add(slotKey);
      }
      return true;
    });
}

function reminderGroupKey(reminder) {
  if (reminder?.enabled) return "upcoming";
  const repeat = normalizeReminderRepeat(reminder?.repeat);
  const hasFired = Number.isFinite(Number(reminder?.lastFiredAt));
  const fireTime = Number(reminder?.nextFireAt);
  if (repeat === "none" && hasFired && Number.isFinite(fireTime) && fireTime <= Date.now()) return "expired";
  return "disabled";
}

function groupedReminders(reminders = []) {
  const groups = [
    { key: "upcoming", title: "울릴 알림", items: [] },
    { key: "expired", title: "만료된 알림", items: [] },
    { key: "disabled", title: "꺼진 알림", items: [] }
  ];
  const groupMap = new Map(groups.map((group) => [group.key, group]));
  reminders.forEach((reminder) => {
    groupMap.get(reminderGroupKey(reminder))?.items.push(reminder);
  });
  groups.forEach((group) => {
    group.items.sort((a, b) => {
      const aTime = group.key === "expired" ? Number(a.lastFiredAt) || Number(a.nextFireAt) : Number(a.nextFireAt);
      const bTime = group.key === "expired" ? Number(b.lastFiredAt) || Number(b.nextFireAt) : Number(b.nextFireAt);
      return aTime - bTime;
    });
  });
  return groups.filter((group) => group.items.length);
}

function normalizeToolbarButtons(value) {
  const source = value && typeof value === "object" ? value : defaultToolbarButtons;
  return Object.fromEntries(Object.keys(defaultToolbarButtons).map((key) => [key, source[key] !== false]));
}

function isBrokenFontName(value) {
  return typeof value !== "string" || !value.trim() || /[\uFFFD?]/.test(value);
}

function normalizeFontFamily(value) {
  return isBrokenFontName(value) ? DEFAULT_FONT_FAMILY : value.trim();
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

function rgbaString(hex, alpha = 1) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}

function opacityControlsEnabled(nextMemo = memo) {
  return nextMemo?.opacityControlsEnabled !== false;
}

function backgroundTransparencyState(nextMemo = memo) {
  const color = normalizeHexColor(nextMemo?.color, "#fff4b8");
  const backgroundImage = normalizeAssetUrl(nextMemo?.backgroundImage);
  const transparency = opacityControlsEnabled(nextMemo) ? normalizeOpacity(nextMemo?.backgroundOpacity) : 0;
  const coverage = backgroundImage ? normalizeBackgroundCoverage(nextMemo?.backgroundCoverage) : 1;
  return {
    color,
    backgroundImage,
    top: backgroundImage ? normalizeBackgroundTop(nextMemo?.backgroundTop, coverage) : 0,
    coverage,
    positionX: normalizeBackgroundPosition(nextMemo?.backgroundPositionX),
    positionY: normalizeBackgroundPosition(nextMemo?.backgroundPositionY),
    imageOpacity: backgroundImage ? 1 - transparency : 0,
    outsideColorAlpha: backgroundImage ? 1 - transparency : 0,
    panelColorAlpha: backgroundImage ? 0 : 1 - transparency
  };
}

function hasMemoBackground(nextMemo = memo) {
  return Boolean(normalizeAssetUrl(nextMemo?.backgroundImage || nextMemo?.backgroundSourceImage));
}

function syncBackgroundControls() {}

function accentColor(hex) {
  const rgb = hexToRgb(hex);
  const darken = relativeLuminance(rgb) > 0.62 ? 0.65 : 1.25;
  return rgbToHex({
    r: rgb.r * darken,
    g: rgb.g * darken,
    b: rgb.b * darken
  });
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

function validEditableFontSize(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < MIN_FONT_SIZE || numeric > MAX_FONT_SIZE) return null;
  return normalizeFontSize(numeric);
}

function applyFontSizeControlValue(control, options = {}) {
  if (!control) return;
  const rawValue = String(control.value || "").trim();
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return;

  const size = options.force ? normalizeFontSize(numeric) : validEditableFontSize(numeric);
  if (!size) return;
  if (options.force) control.value = String(size);
  applyInlineTextStyle("fontSize", `${size}px`);
}

function formatLineSpacing(value) {
  const spacing = normalizeLineSpacing(value);
  return Number.isInteger(spacing) ? spacing.toFixed(1) : String(spacing);
}

function populateLineSpacingSelect(select, currentSpacing) {
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

function applyMemoTheme() {
  const { color, backgroundImage, top, coverage, positionX, positionY, imageOpacity, outsideColorAlpha, panelColorAlpha } =
    backgroundTransparencyState(memo);
  document.documentElement.style.setProperty("--note-bg", color);
  document.documentElement.style.setProperty("--note-text", readableTextColor(color));
  document.documentElement.style.setProperty("--accent", accentColor(color));
  document.documentElement.style.setProperty("--memo-bg-image", backgroundImage ? `url("${backgroundImage.replace(/"/g, "%22")}")` : "none");
  document.documentElement.style.setProperty("--memo-bg-opacity", String(imageOpacity));
  document.documentElement.style.setProperty("--memo-bg-top", `${Math.round(top * 10000) / 100}%`);
  document.documentElement.style.setProperty("--memo-bg-coverage", `${Math.round(coverage * 10000) / 100}%`);
  document.documentElement.style.setProperty("--memo-bg-position-x", `${Math.round(positionX * 10000) / 100}%`);
  document.documentElement.style.setProperty("--memo-bg-position-y", `${Math.round(positionY * 10000) / 100}%`);
  document.documentElement.style.setProperty("--memo-outside-bg", rgbaString(color, outsideColorAlpha));
  document.documentElement.style.setProperty("--memo-panel-bg", rgbaString(color, panelColorAlpha));
  syncBackgroundControls();
}

function applyMemoTypography() {
  document.documentElement.style.setProperty("--memo-font-size", `${normalizeFontSize(memo?.fontSize)}px`);
  document.documentElement.style.setProperty("--memo-font-family", fontFamilyCss(memo?.fontFamily));
  document.documentElement.style.setProperty("--memo-line-height", String(normalizeLineSpacing(memo?.lineSpacing)));
}

function syncToolbarTypography() {
  if (!memo) return;
  populateFontFamilySelect(fontFamilySelect, memo.fontFamily);
  populateFontSizeSelect(fontSizeSelect, memo.fontSize);
  populateLineSpacingSelect(lineSpacingSelect, memo.lineSpacing);
}

function applyToolbarButtonVisibility(buttons = memo?.toolbarButtons) {
  const visible = normalizeToolbarButtons(buttons);
  document.querySelectorAll(".detached-toolbar [data-toolbar-key]").forEach((element) => {
    const key = element.dataset.toolbarKey;
    const hidden = key && visible[key] === false;
    element.classList.toggle("toolbar-item-hidden", hidden);
  });
}

function applyMemo(nextMemo) {
  const previousMemo = memo || {};
  memo = {
    ...memo,
    ...nextMemo,
    title: String(nextMemo?.title || "메모").slice(0, 80),
    color: normalizeHexColor(nextMemo?.color, "#fff4b8"),
    fontSize: normalizeFontSize(nextMemo?.fontSize),
    fontFamily: normalizeFontFamily(nextMemo?.fontFamily),
    lineSpacing: normalizeLineSpacing(nextMemo?.lineSpacing),
    backgroundImage: normalizeAssetUrl(nextMemo?.backgroundImage),
    backgroundSourceImage: normalizeAssetUrl(nextMemo?.backgroundSourceImage || nextMemo?.backgroundImage),
    backgroundCrop: normalizeBackgroundCrop(nextMemo?.backgroundCrop),
    backgroundOpacity: normalizeOpacity(nextMemo?.backgroundOpacity),
    backgroundTop: normalizeBackgroundTop(nextMemo?.backgroundTop, nextMemo?.backgroundCoverage),
    backgroundCoverage: normalizeBackgroundCoverage(nextMemo?.backgroundCoverage),
    backgroundPositionX: normalizeBackgroundPosition(nextMemo?.backgroundPositionX),
    backgroundPositionY: normalizeBackgroundPosition(nextMemo?.backgroundPositionY),
    attachments: normalizeAttachments(Array.isArray(nextMemo?.attachments) ? nextMemo.attachments : previousMemo.attachments),
    reminders: normalizeReminders(Array.isArray(nextMemo?.reminders) ? nextMemo.reminders : previousMemo.reminders),
    opacityControlsEnabled:
      nextMemo?.opacityControlsEnabled === undefined
        ? previousMemo.opacityControlsEnabled !== false
        : nextMemo.opacityControlsEnabled !== false,
    toolbarButtons: normalizeToolbarButtons(nextMemo?.toolbarButtons || previousMemo.toolbarButtons),
    html: typeof nextMemo?.html === "string" ? nextMemo.html : ""
  };
  titleInput.value = memo.title;
  clearTableSelection();
  editor.innerHTML = memo.html || "";
  memoHtmlDirty = false;
  lastRenderedTableSelection = { table: null, cells: new Set(), activeCell: null };
  applyMemoTheme();
  applyMemoTypography();
  syncToolbarTypography();
  applyToolbarButtonVisibility(memo.toolbarButtons);
  syncAttachmentControls();
  syncReminderControls();
  prepareChecklistItems();
  resetEditorHistory();
  updateToolbarCommandState();
}

function serializedEditorHtml() {
  return measureInteraction("detached.serializedEditorHtml", () => {
    const clone = editor.cloneNode(true);
    stripTransientTableSelection(clone);
    prepareChecklistItems(clone);
    sanitizeLinks(clone);
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

function detachedMemoPatch(includeHtml = memoHtmlDirty) {
  if (!memo) return null;
  const patch = {
    id: memo.id,
    title: titleInput.value.trim().slice(0, 80) || "메모",
    color: memo.color,
    fontSize: memo.fontSize,
    fontFamily: memo.fontFamily,
    lineSpacing: memo.lineSpacing,
    backgroundImage: memo.backgroundImage,
    backgroundSourceImage: memo.backgroundSourceImage,
    backgroundCrop: memo.backgroundCrop,
    backgroundOpacity: memo.backgroundOpacity,
    backgroundTop: memo.backgroundTop,
    backgroundCoverage: memo.backgroundCoverage,
    backgroundPositionX: memo.backgroundPositionX,
    backgroundPositionY: memo.backgroundPositionY,
    attachments: normalizeAttachments(memo.attachments),
    reminders: normalizeReminders(memo.reminders)
  };
  if (includeHtml) {
    patch.html = serializedEditorHtml();
    memo.html = patch.html;
    if (pendingEditorHistoryNeedsSnapshot && pendingEditorHistorySnapshot === null) {
      pendingEditorHistorySnapshot = patch.html;
      pendingEditorHistoryNeedsSnapshot = false;
    }
  }
  memo.title = patch.title;
  return patch;
}

async function saveNow() {
  if (!memo) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const patch = detachedMemoPatch(memoHtmlDirty);
  if (!patch) return;
  saveStatus.textContent = "저장 중";
  const result = await window.memoEdge.updateDetachedMemo(patch);
  if (result?.memo) memo = { ...memo, ...result.memo };
  memoHtmlDirty = false;
  saveStatus.textContent = "저장됨";
}

function scheduleSave(options = {}) {
  if (options.htmlDirty !== false) memoHtmlDirty = true;
  saveStatus.textContent = "저장 중";
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
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
  memoHtmlDirty = true;
  scheduleSave();
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

function execCommand(command, value = null) {
  flushPendingEditorHistory();
  editor.focus();
  document.execCommand(command, false, value);
  updateToolbarCommandState();
  scheduleSave();
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
    measureInteraction("detached.updateToolbarCommandState", updateToolbarCommandState);
  });
}

function scheduleTableToolsRefresh() {
  if (tableToolsRefreshFrame) return;
  tableToolsRefreshFrame = requestAnimationFrame(() => {
    tableToolsRefreshFrame = null;
    updateTableTools();
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

function selectionStartElement(range) {
  const node = range?.startContainer;
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function typingStyleAnchorAtRange(range) {
  const element = selectionStartElement(range);
  const anchor = element?.closest?.(".typing-style-anchor");
  return anchor && editor.contains(anchor) ? anchor : null;
}

function setRangeAtTextEnd(textNode) {
  const nextRange = document.createRange();
  nextRange.setStart(textNode, textNode.nodeValue.length);
  nextRange.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(nextRange);
  savedEditorRange = nextRange.cloneRange();
}

function insertTypingStyleAnchor(range, styles = {}) {
  const existingAnchor = typingStyleAnchorAtRange(range);
  if (existingAnchor) {
    Object.entries(styles).forEach(([property, value]) => {
      if (value) existingAnchor.style[property] = value;
    });
    const textNode = Array.from(existingAnchor.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (!textNode || !textNode.nodeValue) {
      if (textNode) textNode.nodeValue = CHECK_TEXT_PLACEHOLDER;
      setRangeAtTextEnd(textNode || existingAnchor.appendChild(document.createTextNode(CHECK_TEXT_PLACEHOLDER)));
      return;
    }
    const nextRange = range.cloneRange();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(nextRange);
    savedEditorRange = nextRange.cloneRange();
    return;
  }

  const { span, textNode } = createTypingStyleAnchor(styles);
  range.insertNode(span);
  setRangeAtTextEnd(textNode);
}

function rangeIntersectsNode(range, node) {
  try {
    return range.intersectsNode(node);
  } catch {
    return false;
  }
}

function applyInlineObjectStyle(range, property, value) {
  if (property !== "fontSize") return false;
  const objects = Array.from(editor.querySelectorAll(".memo-custom-emoji")).filter((node) =>
    rangeIntersectsNode(range, node)
  );
  objects.forEach((node) => {
    node.style.fontSize = value;
  });
  return objects.length > 0;
}

function replaceElementWithStyledSpan(element, styles = {}) {
  const span = document.createElement("span");
  Object.entries(styles).forEach(([property, value]) => {
    span.style[property] = value;
  });
  while (element.firstChild) span.appendChild(element.firstChild);
  element.replaceWith(span);
  return span;
}

function applyNativeFontSizeToSelection(value) {
  const existingElements = new WeakSet(Array.from(editor.querySelectorAll("*")));
  try {
    document.execCommand("styleWithCSS", false, false);
    document.execCommand("fontSize", false, "7");
  } catch {
    return false;
  }

  let converted = false;
  editor.querySelectorAll("font[size='7']").forEach((font) => {
    replaceElementWithStyledSpan(font, { fontSize: value });
    converted = true;
  });
  editor.querySelectorAll("span[style]").forEach((span) => {
    if (existingElements.has(span) || !span.style.fontSize) return;
    span.style.fontSize = value;
    converted = true;
  });

  return converted;
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

function applyInlineTextStyle(property, value) {
  const returnFocusElement = document.activeElement;
  if (!restoreEditorSelection()) ensureEditorSelectionAtInsertionPoint();
  const range = currentEditorRange();
  if (!range) return;
  let changed = false;
  if (range.collapsed) {
    insertTypingStyleAnchor(range, { ...carriedTypingStylesFromRange(range), [property]: value });
    changed = true;
  } else {
    const fallbackRange = range.cloneRange();
    changed = applyInlineObjectStyle(range, property, value);
    changed = wrapRangeTextNodes(fallbackRange, property, value) || changed;
    if (!changed && property === "fontSize") changed = applyNativeFontSizeToSelection(value);
  }
  if (!changed) return;
  scheduleSave();
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
  scheduleSave();
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

  if (fontFamilySelect && document.activeElement !== fontFamilySelect) {
    const family = normalizeFontFamily(firstFontFamilyName(computed.fontFamily));
    if (!Array.from(fontFamilySelect.options).some((option) => option.value === family)) {
      populateFontFamilySelect(fontFamilySelect, family);
    } else {
      fontFamilySelect.value = family;
      fontFamilySelect.style.fontFamily = fontFamilyCss(family);
    }
  }
  if (fontSizeSelect && document.activeElement !== fontSizeSelect) {
    fontSizeSelect.value = String(normalizeFontSize(Number.parseFloat(computed.fontSize)));
  }
  if (lineSpacingSelect && document.activeElement !== lineSpacingSelect) {
    lineSpacingSelect.value = String(effectiveLineSpacing(element));
  }
}

function rememberTextColor(color) {
  const nextColor = normalizeHexColor(color, "#283044");
  recentTextColors = normalizeTextColorList([nextColor, ...recentTextColors]);
  saveRecentTextColors();
  if (textColorInput) textColorInput.value = nextColor;
  renderTextColorPalette();
}

function applyTextColor(color) {
  const nextColor = normalizeHexColor(color, "#283044");
  rememberTextColor(nextColor);
  applyInlineTextStyle("color", nextColor);
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
  const rect = detachedShell?.getBoundingClientRect();
  if (rect?.width && rect?.height) {
    return { width: rect.width, height: rect.height };
  }
  return {
    width: Math.max(1, window.innerWidth || 1),
    height: Math.max(1, window.innerHeight || 1)
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

function backgroundPlacementFromMemo(nextMemo = memo) {
  const coverage = normalizeBackgroundCoverage(nextMemo?.backgroundCoverage);
  return {
    top: normalizeBackgroundTop(nextMemo?.backgroundTop, coverage),
    coverage,
    positionX: normalizeBackgroundPosition(nextMemo?.backgroundPositionX),
    positionY: normalizeBackgroundPosition(nextMemo?.backgroundPositionY)
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
  const coverageMode = mode === "coverage";
  backgroundCropperState.mode = mode;
  cropperTitle && (cropperTitle.textContent = coverageMode ? "등록 범위 지정" : "배경 자르기");
  cropperStage?.classList.toggle("coverage-mode", coverageMode);
  cropperBox?.classList.toggle("hidden", coverageMode);
  coveragePreview?.classList.toggle("hidden", !coverageMode);
  coverageBox?.classList.toggle("hidden", !coverageMode);
  updateCoverageModeTitle();
}

function beginCoveragePlacement(dataUrl, crop) {
  if (!backgroundCropperState || !coverageImage) return;
  const softBackground = Boolean(softBackgroundInput?.checked);
  backgroundCropperState.pendingDataUrl = dataUrl;
  backgroundCropperState.pendingCrop = crop;
  backgroundCropperState.softBackground = softBackground;
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
  coverageImage.onload = () => requestAnimationFrame(() => resetCoveragePreviewLayout(softBackground));
  coverageImage.removeAttribute("src");
  coverageImage.src = dataUrl;
  requestAnimationFrame(() => resetCoveragePreviewLayout(softBackground));
}

function openBackgroundCropper(sourceUrl, crop = null, isExisting = false) {
  if (!sourceUrl || !backgroundCropper || !cropperImage) return;
  backgroundCropperState = {
    mode: "crop",
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
    softBackground: false,
    drag: null
  };
  setCropperMode("crop");
  if (softBackgroundInput) softBackgroundInput.checked = false;
  cropperClearBackgroundButton?.classList.toggle("hidden", !backgroundCropperState.isExisting);
  cropperApplyButton.disabled = false;
  cropperImage.onload = () => requestAnimationFrame(() => resetCropBox());
  cropperImage.onerror = () => {
    saveStatus.textContent = "Background image could not be opened.";
    cropperApplyButton.disabled = false;
  };
  cropperImage.removeAttribute("src");
  coverageImage?.removeAttribute("src");
  backgroundCropper.classList.remove("hidden");
  cropperImage.src = sourceUrl;
}

function closeBackgroundCropper() {
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
  const handle = target.dataset.cropHandle || "move";
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
  if (!memo || !backgroundCropperState) return;
  if (backgroundCropperState.mode === "coverage") {
    await applyBackgroundPlacement();
    return;
  }
  cropperApplyButton.disabled = true;
  const crop = cropperCurrentCrop();
  const dataUrl = croppedBackgroundDataUrl();
  if (!dataUrl) {
    saveStatus.textContent = "Background crop failed.";
    cropperApplyButton.disabled = false;
    return;
  }
  beginCoveragePlacement(dataUrl, crop);
  cropperApplyButton.disabled = false;
}

async function applyBackgroundPlacement() {
  if (!memo || !backgroundCropperState) return;
  cropperApplyButton.disabled = true;
  const sourceUrl = backgroundCropperState.sourceUrl;
  const crop = backgroundCropperState.pendingCrop || cropperCurrentCrop();
  const dataUrl = backgroundCropperState.pendingDataUrl;
  const placement = coverageCurrentPlacement();
  const softBackground = Boolean(softBackgroundInput?.checked);
  const result = await window.memoEdge.saveBackgroundImage?.(dataUrl);
  if (!result?.ok || !result?.url) {
    saveStatus.textContent = `Background save failed: ${result?.message || "no image"}`;
    cropperApplyButton.disabled = false;
    return;
  }
  memo.backgroundImage = result.url;
  memo.backgroundSourceImage = sourceUrl;
  memo.backgroundCrop = crop;
  memo.backgroundOpacity = softBackground
    ? SOFT_BACKGROUND_OPACITY
    : normalizeOpacity(memo.backgroundOpacity);
  memo.backgroundTop = placement.top;
  memo.backgroundCoverage = placement.coverage;
  memo.backgroundPositionX = placement.positionX;
  memo.backgroundPositionY = placement.positionY;
  applyMemoTheme();
  scheduleSave();
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
  scheduleSave();
  pushEditorHistory();
}

async function handleEditorPaste(event) {
  if (!memo) return;
  if (!shouldHandleEditorPaste(event)) return;

  const table = pastedTableFromClipboard(event.clipboardData);
  if (table) {
    event.preventDefault();
    insertPastedTable(table);
    return;
  }

  const html = event.clipboardData?.getData("text/html") || "";
  const plainText = event.clipboardData?.getData("text/plain") || "";
  if (htmlContainsLink(html)) {
    event.preventDefault();
    restoreEditorSelection();
    insertHtmlWithSafeLinks(html);
    return;
  }
  if (textContainsAutoLink(plainText)) {
    event.preventDefault();
    restoreEditorSelection();
    insertTextWithAutoLinks(plainText);
    return;
  }

  const file = imageFileFromPaste(event);
  if (!file) return;
  event.preventDefault();
  try {
    const sourceUrl = await savePastedImageFile(file);
    insertInlineImage(sourceUrl);
  } catch (error) {
    saveStatus.textContent = `이미지 붙여넣기 실패: ${error.message || error}`;
  }
}

function handleEditorCopy(event) {
  const payload = selectedTableClipboardPayload();
  if (!payload || !event.clipboardData) return;
  event.preventDefault();
  event.clipboardData.setData("text/html", payload.html);
  event.clipboardData.setData("text/plain", payload.text);
}

function setAttachmentStatus(message, timeout = 2500) {
  if (!attachmentStatus) return;
  attachmentStatus.textContent = message || "";
  if (message && timeout) {
    setTimeout(() => {
      if (attachmentStatus.textContent === message) attachmentStatus.textContent = "";
    }, timeout);
  }
}

function setReminderStatus(message, timeout = 2500) {
  if (!reminderStatus) return;
  reminderStatus.textContent = message || "";
  if (message && timeout) {
    setTimeout(() => {
      if (reminderStatus.textContent === message) reminderStatus.textContent = "";
    }, timeout);
  }
}

function formatAttachmentSize(size) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unitIndex]}`;
}

function formatDateTime(value) {
  const date = new Date(Number(value));
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function dateTimeInputValue(value) {
  const date = new Date(Number(value));
  if (!Number.isFinite(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function reminderFireTimeFromInput(value) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) return NaN;
  date.setSeconds(0, 0);
  return date.getTime();
}

function nextFutureReminderMinute(fromTime = Date.now()) {
  const date = new Date(Number(fromTime));
  if (!Number.isFinite(date.getTime())) return Date.now() + 60000;
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);
  return date.getTime();
}

function repeatLabel(value) {
  return {
    none: "반복 없음",
    daily: "매일",
    weekly: "매주",
    monthly: "매월"
  }[normalizeReminderRepeat(value)];
}

function setAttachmentPanelOpen(open) {
  if (!attachmentPanel || !attachmentButton) return;
  attachmentPanel.classList.toggle("hidden", !open);
  attachmentButton.classList.toggle("active", Boolean(open));
  if (open) {
    setReminderPanelOpen(false);
    setTextColorPaletteOpen(false);
    setEmojiPaletteOpen(false);
    setTablePickerOpen(false);
    setTableToolsOpen(false);
    renderAttachmentPanel();
  }
}

function setReminderPanelOpen(open) {
  if (!reminderPanel || !reminderButton) return;
  reminderPanel.classList.toggle("hidden", !open);
  reminderButton.classList.toggle("active", Boolean(open));
  if (open) {
    setReminderStatus("");
    setAttachmentPanelOpen(false);
    setTextColorPaletteOpen(false);
    setEmojiPaletteOpen(false);
    setTablePickerOpen(false);
    setTableToolsOpen(false);
    if (reminderDateTimeInput && !reminderDateTimeInput.value) reminderDateTimeInput.value = dateTimeInputValue(Date.now() + 10 * 60 * 1000);
    renderReminderPanel();
  } else {
    editingReminderId = null;
    if (addReminderButton) addReminderButton.textContent = "등록";
  }
}

function syncAttachmentControls() {
  const count = normalizeAttachments(memo?.attachments).length;
  if (attachmentCountBadge) {
    attachmentCountBadge.textContent = String(count);
    attachmentCountBadge.classList.toggle("hidden", count <= 0);
  }
  if (attachmentPanel && !attachmentPanel.classList.contains("hidden")) renderAttachmentPanel();
}

function syncReminderControls() {
  const count = normalizeReminders(memo?.reminders).filter((item) => item.enabled).length;
  if (reminderCountBadge) {
    reminderCountBadge.textContent = String(count);
    reminderCountBadge.classList.toggle("hidden", count <= 0);
  }
  if (reminderPanel && !reminderPanel.classList.contains("hidden")) renderReminderPanel();
}

function renderAttachmentPanel() {
  if (!attachmentList || !memo) return;
  memo.attachments = normalizeAttachments(memo.attachments);
  attachmentList.innerHTML = "";
  if (!memo.attachments.length) {
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.append("첨부파일이 없습니다.", document.createElement("br"), "첨부파일 등록 시 별도파일로 생성되어 관리됩니다.");
    attachmentList.appendChild(empty);
    return;
  }

  memo.attachments.forEach((attachment) => {
    const item = document.createElement("div");
    item.className = "attachment-item";
    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "attachment-name";
    name.textContent = attachment.name;
    const meta = document.createElement("div");
    meta.className = "attachment-meta";
    meta.textContent = `${formatAttachmentSize(attachment.size)} · ${formatDateTime(attachment.createdAt)}`;
    info.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "attachment-actions";
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "small-button";
    openButton.textContent = "열기";
    openButton.addEventListener("click", () => openAttachment(attachment));
    const revealButton = document.createElement("button");
    revealButton.type = "button";
    revealButton.className = "small-button";
    revealButton.textContent = "위치";
    revealButton.addEventListener("click", () => revealAttachment(attachment));
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "small-button danger";
    removeButton.textContent = "삭제";
    removeButton.addEventListener("click", () => removeAttachment(attachment.id));
    actions.append(openButton, revealButton, removeButton);
    item.append(info, actions);
    attachmentList.appendChild(item);
  });
}

async function addAttachmentToDetachedMemo() {
  if (!memo) return;
  const result = await window.memoEdge.importAttachment?.(memo.id);
  if (result?.canceled) return;
  if (!result?.ok || !result.attachment) {
    setAttachmentStatus(`첨부 추가 실패: ${result?.message || "알 수 없음"}`, 0);
    return;
  }
  memo.attachments = normalizeAttachments([...(memo.attachments || []), result.attachment]);
  syncAttachmentControls();
  scheduleSave({ htmlDirty: false });
}

async function openAttachment(attachment) {
  const result = await window.memoEdge.openAttachment?.(attachment.storedPath);
  if (!result?.ok) setAttachmentStatus(`파일 열기 실패: ${result?.message || "알 수 없음"}`, 0);
}

async function revealAttachment(attachment) {
  const result = await window.memoEdge.revealAttachment?.(attachment.storedPath);
  if (!result?.ok) setAttachmentStatus(`위치 열기 실패: ${result?.message || "알 수 없음"}`, 0);
}

async function removeAttachment(attachmentId) {
  if (!memo) return;
  const attachment = normalizeAttachments(memo.attachments).find((item) => item.id === attachmentId);
  if (!attachment) return;
  const result = await window.memoEdge.removeAttachment?.(attachment.storedPath);
  if (!result?.ok) {
    setAttachmentStatus(`첨부 삭제 실패: ${result?.message || "알 수 없음"}`, 0);
    return;
  }
  memo.attachments = normalizeAttachments(memo.attachments).filter((item) => item.id !== attachmentId);
  syncAttachmentControls();
  scheduleSave({ htmlDirty: false });
}

function renderReminderPanel() {
  if (!reminderList || !memo) return;
  memo.reminders = normalizeReminders(memo.reminders);
  reminderList.innerHTML = "";
  if (!memo.reminders.length) {
    setReminderStatus("");
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.textContent = "등록된 알림이 없습니다.";
    reminderList.appendChild(empty);
    return;
  }

  groupedReminders(memo.reminders).forEach((group) => {
    const section = document.createElement("section");
    section.className = "reminder-section";
    const heading = document.createElement("h4");
    heading.className = "reminder-section-title";
    heading.textContent = `${group.title} ${group.items.length}`;
    section.appendChild(heading);

    group.items.forEach((reminder) => {
      const item = document.createElement("div");
      item.className = "reminder-item";
      item.dataset.reminderState = group.key;
      if (!reminder.enabled) item.classList.add("disabled");
      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "reminder-title";
      title.textContent = reminder.title;
      const meta = document.createElement("div");
      meta.className = "reminder-meta";
      const stateText =
        group.key === "expired"
          ? `만료 · ${formatDateTime(reminder.lastFiredAt || reminder.nextFireAt)}`
          : group.key === "disabled"
            ? "꺼짐"
            : "예정";
      meta.textContent = `${formatDateTime(reminder.nextFireAt)} · ${repeatLabel(reminder.repeat)} · ${stateText}`;
      info.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "reminder-actions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "small-button";
      editButton.textContent = "수정";
      editButton.addEventListener("click", () => editReminder(reminder.id));
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "small-button";
      toggleButton.textContent = reminder.enabled ? "끄기" : "켜기";
      toggleButton.addEventListener("click", () => toggleReminder(reminder.id));
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "small-button danger";
      removeButton.textContent = "삭제";
      removeButton.addEventListener("click", () => removeReminder(reminder.id));
      actions.append(editButton, toggleButton, removeButton);
      item.append(info, actions);
      section.appendChild(item);
    });

    reminderList.appendChild(section);
  });
}

function editReminder(reminderId) {
  const reminder = normalizeReminders(memo?.reminders).find((item) => item.id === reminderId);
  if (!reminder) return;
  setReminderStatus("");
  editingReminderId = reminder.id;
  if (reminderTitleInput) reminderTitleInput.value = reminder.title;
  if (reminderBodyInput) reminderBodyInput.value = reminder.body;
  if (reminderDateTimeInput) reminderDateTimeInput.value = dateTimeInputValue(reminder.nextFireAt);
  if (reminderRepeatSelect) reminderRepeatSelect.value = reminder.repeat;
  if (addReminderButton) addReminderButton.textContent = "수정";
}

function reminderFromForm() {
  const title = reminderTitleInput?.value.trim() || memo?.title || "메모 알림";
  const body = reminderBodyInput?.value.trim() || "";
  const scheduledAt = reminderFireTimeFromInput(reminderDateTimeInput?.value);
  if (!Number.isFinite(scheduledAt)) return null;
  return normalizeReminder({
    id: editingReminderId || `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    body,
    scheduledAt,
    repeat: normalizeReminderRepeat(reminderRepeatSelect?.value),
    nextFireAt: scheduledAt,
    lastFiredAt: null,
    enabled: true
  });
}

function clearReminderForm() {
  editingReminderId = null;
  if (reminderTitleInput) reminderTitleInput.value = "";
  if (reminderBodyInput) reminderBodyInput.value = "";
  if (reminderDateTimeInput) reminderDateTimeInput.value = dateTimeInputValue(Date.now() + 10 * 60 * 1000);
  if (reminderRepeatSelect) reminderRepeatSelect.value = "none";
  if (addReminderButton) addReminderButton.textContent = "등록";
  setReminderStatus("");
}

function addOrUpdateReminder() {
  if (!memo) return;
  const nextReminder = reminderFromForm();
  if (!nextReminder) {
    setReminderStatus("알림 시간을 입력해주세요.", 0);
    return;
  }
  if (nextReminder.nextFireAt <= Date.now()) {
    setReminderStatus("현재 이후의 시간을 입력해 주세요.", 0);
    return;
  }
  const reminders = normalizeReminders(memo.reminders).filter((item) => item.id !== nextReminder.id);
  if (!editingReminderId && reminders.some((item) => item.enabled && item.nextFireAt === nextReminder.nextFireAt)) {
    setReminderStatus("같은 시간의 알림이 이미 있습니다.", 0);
    return;
  }
  memo.reminders = [...reminders, nextReminder].sort((a, b) => a.nextFireAt - b.nextFireAt);
  clearReminderForm();
  syncReminderControls();
  scheduleSave({ htmlDirty: false });
}

function toggleReminder(reminderId) {
  if (!memo) return;
  setReminderStatus("");
  memo.reminders = normalizeReminders(memo.reminders).map((reminder) =>
    reminder.id === reminderId
      ? {
          ...reminder,
          enabled: !reminder.enabled,
          nextFireAt: reminder.enabled
            ? reminder.nextFireAt
            : reminder.nextFireAt <= Date.now()
              ? nextFutureReminderMinute()
              : reminder.nextFireAt || reminder.scheduledAt
        }
      : reminder
  );
  syncReminderControls();
  scheduleSave({ htmlDirty: false });
}

function removeReminder(reminderId) {
  if (!memo) return;
  setReminderStatus("");
  memo.reminders = normalizeReminders(memo.reminders).filter((reminder) => reminder.id !== reminderId);
  syncReminderControls();
  scheduleSave({ htmlDirty: false });
}

async function importBackgroundForDetachedMemo() {
  if (!memo) return;
  const result = await window.memoEdge.importBackgroundImage?.();
  if (result?.canceled || !result?.ok || !result?.url) return;
  openBackgroundCropper(result.url, null, false);
}

async function editBackgroundForDetachedMemo() {
  if (!memo) return;
  const sourceUrl = normalizeAssetUrl(memo.backgroundSourceImage || memo.backgroundImage);
  if (sourceUrl) {
    openBackgroundCropper(sourceUrl, memo.backgroundCrop, true);
    return;
  }
  await importBackgroundForDetachedMemo();
}

function clearDetachedBackground() {
  if (!memo) return;
  memo.backgroundImage = "";
  memo.backgroundSourceImage = "";
  memo.backgroundCrop = null;
  memo.backgroundTop = 0;
  memo.backgroundCoverage = 1;
  memo.backgroundPositionX = 0.5;
  memo.backgroundPositionY = 0.5;
  applyMemoTheme();
  scheduleSave();
  closeBackgroundCropper();
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
  const colors = [
    ...TEXT_COLOR_PRESETS,
    ...recentTextColors.filter((color) => !TEXT_COLOR_PRESETS.includes(color))
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
  customInput.value = textColorInput?.value || recentTextColors[0] || "#283044";
  customInput.addEventListener("mousedown", rememberEditorSelection);
  customInput.addEventListener("input", () => applyTextColor(customInput.value));
  customLabel.append(customText, customInput);
  textColorPalette.appendChild(customLabel);
}

function setEmojiPaletteOpen(open) {
  if (!emojiPalette) return;
  if (open) renderEmojiPalette();
  emojiPalette.classList.toggle("hidden", !open);
  emojiButton?.classList.toggle("active", open);
}

function toggleEmojiPalette() {
  setEmojiPaletteOpen(emojiPalette?.classList.contains("hidden"));
}

function renderEmojiPalette() {
  if (!emojiPalette) return;
  emojiPalette.innerHTML = "";
  loadCustomEmojiImages().forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-swatch custom-emoji-swatch";
    button.title = emoji.name;
    button.setAttribute("aria-label", emoji.name);
    const image = document.createElement("img");
    image.src = emoji.url;
    image.alt = "";
    button.appendChild(image);
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      rememberEditorSelection();
    });
    button.addEventListener("click", () => {
      insertCustomEmojiImage(emoji);
    });
    emojiPalette.appendChild(button);
  });

  EMOJI_PRESETS.forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-swatch";
    button.textContent = emoji;
    button.title = emoji;
    button.setAttribute("aria-label", emoji);
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      rememberEditorSelection();
    });
    button.addEventListener("click", () => {
      insertEmoji(emoji);
    });
    emojiPalette.appendChild(button);
  });
}

function ensureEditorSelectionAtInsertionPoint() {
  if (restoreEditorSelection()) return;
  editor.focus({ preventScroll: true });
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  savedEditorRange = range.cloneRange();
}

function insertEmoji(emoji) {
  const value = String(emoji || "");
  if (!value) return;
  flushPendingEditorHistory();
  ensureEditorSelectionAtInsertionPoint();
  document.execCommand("insertText", false, value);
  scheduleSave();
  pushEditorHistory();
  rememberEditorSelection();
  scheduleToolbarRefresh();
}

function createCustomEmojiElement(emoji, styles = {}) {
  const image = document.createElement("img");
  image.className = "memo-custom-emoji";
  image.src = emoji.url;
  image.alt = emoji.name || "emoji";
  image.title = emoji.name || "";
  if (styles.fontSize) image.style.fontSize = styles.fontSize;
  return image;
}

function placeCaretAfterNode(node) {
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedEditorRange = range.cloneRange();
}

function insertCustomEmojiImage(emoji) {
  if (!emoji?.url) return;
  flushPendingEditorHistory();
  ensureEditorSelectionAtInsertionPoint();
  const image = createCustomEmojiElement(emoji, carriedTypingStylesFromRange(currentEditorRange()));
  insertNodeAtSelection(image);
  placeCaretAfterNode(image);
  scheduleSave();
  pushEditorHistory();
  scheduleToolbarRefresh();
}

function normalizeShortcutKey(key) {
  if (!key) return "";
  const keyMap = {
    " ": "Space",
    Spacebar: "Space",
    Esc: "Escape",
    Del: "Delete",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    "+": "Plus",
    "=": "Plus",
    "-": "-",
    ",": ",",
    ".": ".",
    "/": "/",
    ";": ";",
    "'": "'",
    "`": "`",
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

function shortcutMatchesEvent(event, shortcut) {
  const expected = typeof shortcut === "string" && shortcut.trim() ? shortcut.trim().toLowerCase() : "";
  if (!expected) return false;
  return acceleratorFromEvent(event).toLowerCase() === expected;
}

function handleEmojiShortcut(event) {
  if (!shortcutMatchesEvent(event, emojiShortcut || DEFAULT_EMOJI_SHORTCUT)) return;

  const target = event.target;
  if (target instanceof Element && target.closest("input, textarea, select") && !editor.contains(target)) return;

  event.preventDefault();
  event.stopPropagation();
  rememberEditorSelection();
  toggleEmojiPalette();
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
  scheduleSave();
  pushEditorHistory();
}

function getSelectionElement() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const node = selection.anchorNode;
  const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return element instanceof Element ? element : null;
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
  if (!selectionBelongsToEditor(savedEditorRange)) return false;
  const range = savedEditorRange.cloneRange();
  editor.focus({ preventScroll: true });
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedEditorRange = range.cloneRange();
  return true;
}

function createBlankLine() {
  const line = document.createElement("div");
  line.appendChild(document.createElement("br"));
  return line;
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

function isLikelyEmailAddress(value) {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(String(value || "").trim());
}

function normalizeLinkUrl(value) {
  const raw = String(value || "")
    .trim()
    .replace(/^<+/, "")
    .replace(/>+$/, "")
    .replace(/[.,!?;:)\]\u3002\uff0c\uff01\uff1f\uff1b\uff1a]+$/u, "");
  if (!raw) return "";
  if (/^mailto:/i.test(raw)) return raw;
  if (isLikelyEmailAddress(raw)) return `mailto:${raw}`;
  if (/^https?:/i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:[/?#][^\s<>"']*)?$/i.test(raw)) {
    return `https://${raw}`;
  }
  return "";
}

function cleanManualLinkHref(value) {
  const raw = String(value || "")
    .trim()
    .replace(/^<+/, "")
    .replace(/>+$/, "");
  if (!raw) return "";
  if (/^(javascript|vbscript|data):/i.test(raw)) return "";
  return raw;
}

function normalizeStoredLinkHref(value, fallback = "") {
  const raw = cleanManualLinkHref(value) || cleanManualLinkHref(fallback);
  if (!raw) return "";
  return normalizeLinkUrl(raw) || raw;
}

function linkHrefForEditing(link) {
  return cleanManualLinkHref(link?.getAttribute("href") || link?.textContent || "");
}

function linkHrefForOpening(link) {
  const raw = linkHrefForEditing(link);
  if (!raw) return "";
  return normalizeLinkUrl(raw) || raw;
}

function applyLinkAttributes(link, href) {
  link.setAttribute("href", href);
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noreferrer");
}

function normalizeAutoLinkUrl(value) {
  const raw = String(value || "").trim();
  if (!isLikelyEmailAddress(raw) && !/^(https?:\/\/|www\.|mailto:)/i.test(raw)) return "";
  return normalizeLinkUrl(raw);
}

function textContainsAutoLink(value) {
  return /(https?:\/\/[^\s<>"']+|mailto:[^\s<>"']+|www\.[^\s<>"']+|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i.test(String(value || ""));
}

function htmlContainsLink(value) {
  return /<a\b[^>]*href\s*=/i.test(String(value || ""));
}

function sanitizeLinks(root = editor) {
  root.querySelectorAll("a").forEach((link) => {
    const href = normalizeStoredLinkHref(link.getAttribute("href"), link.textContent);
    if (!href) {
      link.replaceWith(...Array.from(link.childNodes));
      return;
    }
    applyLinkAttributes(link, href);
  });
}

function createLinkElement(text, href) {
  const link = document.createElement("a");
  applyLinkAttributes(link, href);
  link.textContent = text || href;
  return link;
}

function linkTextFromInput(input, href) {
  const raw = String(input || "").trim();
  if (!raw) return href;
  if (/^mailto:/i.test(raw)) return raw.replace(/^mailto:/i, "");
  if (isLikelyEmailAddress(raw)) return raw;
  return raw;
}

function editorRangeFromPoint(event) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(event.clientX, event.clientY);
  const position = document.caretPositionFromPoint?.(event.clientX, event.clientY);
  if (!position) return null;
  const range = document.createRange();
  range.setStart(position.offsetNode, position.offset);
  range.collapse(true);
  return range;
}

function linkElementFromNode(node) {
  const element = node instanceof Element ? node : node?.parentElement;
  const link = element?.closest?.("a[href]");
  return link && editor.contains(link) ? link : null;
}

function linksIntersectingRange(range) {
  return Array.from(editor.querySelectorAll("a[href]")).filter((link) => {
    try {
      return range.intersectsNode(link);
    } catch {
      return false;
    }
  });
}

function linksForEditorSelection(selection, range) {
  return range.collapsed ? [linkElementFromNode(selection.anchorNode)].filter(Boolean) : linksIntersectingRange(range);
}

function unwrapLinkElement(link) {
  if (!link?.parentNode) return false;
  link.replaceWith(...Array.from(link.childNodes));
  return true;
}

function updateExistingLinks(targetLinks, href) {
  const links = Array.from(new Set(targetLinks || [])).filter((link) => link?.isConnected);
  if (!links.length) return false;
  if (!href) {
    links.forEach(unwrapLinkElement);
  } else {
    links.forEach((link) => applyLinkAttributes(link, href));
  }
  scheduleSave();
  pushEditorHistory();
  return true;
}

function insertTextWithAutoLinks(text) {
  const fragment = document.createDocumentFragment();
  const pattern = /(https?:\/\/[^\s<>"']+|mailto:[^\s<>"']+|www\.[^\s<>"']+|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) fragment.appendChild(document.createTextNode(before));
    const token = match[0];
    const trimmedToken = token.replace(/[.,!?;:)\]\u3002\uff0c\uff01\uff1f\uff1b\uff1a]+$/u, "");
    const trailing = token.slice(trimmedToken.length);
    const href = normalizeAutoLinkUrl(trimmedToken);
    fragment.appendChild(href ? createLinkElement(trimmedToken, href) : document.createTextNode(token));
    if (href && trailing) fragment.appendChild(document.createTextNode(trailing));
    lastIndex = match.index + match[0].length;
  }
  const after = text.slice(lastIndex);
  if (after) fragment.appendChild(document.createTextNode(after));
  insertNodeAtSelection(fragment);
  scheduleSave();
  pushEditorHistory();
}

function unlinkEditorSelection() {
  restoreEditorSelection();
  editor.focus();
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  if (!range || !editor.contains(range.commonAncestorContainer)) return;

  const targetLinks = linksForEditorSelection(selection, range);
  if (!targetLinks.length) return;

  if (range.collapsed) {
    const linkRange = document.createRange();
    linkRange.selectNodeContents(targetLinks[0]);
    selection.removeAllRanges();
    selection.addRange(linkRange);
  }

  let commandSucceeded = false;
  try {
    commandSucceeded = document.execCommand("unlink");
  } catch {
    commandSucceeded = false;
  }

  const stillLinked = targetLinks.some((link) => link.isConnected && link.matches("a[href]"));
  if (!commandSucceeded || stillLinked) {
    targetLinks.filter((link) => link.isConnected).forEach(unwrapLinkElement);
  }

  savedEditorRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  scheduleSave();
  pushEditorHistory();
}

function insertHtmlWithSafeLinks(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  template.content.querySelectorAll("script, style, iframe, object, embed, meta, link").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    });
  });
  sanitizeLinks(template.content);
  insertNodeAtSelection(template.content);
  scheduleSave();
  pushEditorHistory();
}

function insertOrUpdateLink() {
  restoreEditorSelection();
  editor.focus();
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const editorRange = range && editor.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
  const selectedText = editorRange ? editorRange.toString().trim() : "";
  const targetLinks = editorRange ? linksForEditorSelection(selection, editorRange) : [];
  const defaultInput = targetLinks.length ? linkHrefForEditing(targetLinks[0]) : "";
  const input = window.prompt("연결할 주소를 입력하세요.", defaultInput || "");
  if (input === null) return;
  const href = cleanManualLinkHref(input);
  if (targetLinks.length) {
    updateExistingLinks(targetLinks, href);
    return;
  }
  if (!href) return;
  const link = createLinkElement(selectedText || linkTextFromInput(input, href), href);
  if (!editorRange) {
    insertNodeAtSelection(link);
  } else {
    editorRange.deleteContents();
    editorRange.insertNode(link);
  }
  const nextRange = document.createRange();
  nextRange.setStartAfter(link);
  nextRange.collapse(true);
  const nextSelection = window.getSelection();
  nextSelection.removeAllRanges();
  nextSelection.addRange(nextRange);
  savedEditorRange = nextRange.cloneRange();
  scheduleSave();
  pushEditorHistory();
}

function toggleLinkEditorSelection() {
  insertOrUpdateLink();
}

function handleEditorLinkClick(event) {
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!link || !editor.contains(link)) return;
  event.preventDefault();
  event.stopPropagation();
  const href = linkHrefForOpening(link);
  if (href) window.memoEdge.openExternal?.(href);
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

function prepareChecklistItems(root = editor) {
  root.querySelectorAll(".check-item").forEach((item) => {
    syncChecklistItemState(item);
  });
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

function insertChecklist() {
  flushPendingEditorHistory();
  editor.focus();
  const { item, text } = createChecklistItem(false);
  insertNodeAtSelection(item);
  placeCaretInCheckText(text);
  scheduleSave();
  pushEditorHistory();
}

function toggleChecklistItem(target) {
  const item = target.closest(".check-item");
  if (!item) return;
  flushPendingEditorHistory();
  const checked = checklistItemIsChecked(item);
  const { text } = syncChecklistItemState(item, !checked);
  placeCaretInCheckText(text);
  scheduleSave();
  pushEditorHistory();
}

function clampTableDimension(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function setTablePickerOpen(open) {
  tablePicker.classList.toggle("hidden", !open);
  tableButton.classList.toggle("active", Boolean(open));
  if (open) {
    tableRowsInput.value = tableRowsInput.value || "3";
    tableColsInput.value = tableColsInput.value || "3";
    tableRowsInput.focus();
    tableRowsInput.select();
  }
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
  scheduleSave();
  pushEditorHistory();
}

function createMemoTable(rows, cols) {
  const table = document.createElement("table");
  table.className = "memo-table";
  const tbody = document.createElement("tbody");
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = document.createElement("tr");
    for (let colIndex = 0; colIndex < cols; colIndex += 1) row.appendChild(createTableCell());
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  return table;
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

function placeCaretInTable(table) {
  placeCaretInCell(table?.querySelector("td"));
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
  scheduleSave();
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
  tableTools.classList.toggle("hidden", !open);
}

function updateTableTools() {
  return measureInteraction("detached.updateTableTools", () => {
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
  if (root.matches?.(".memo-table.table-selected")) {
    root.classList.remove("table-selected");
    if (!root.getAttribute("class")) root.removeAttribute("class");
  }
  if (root.matches?.(".memo-table-cell-selected, .memo-table-cell-active")) {
    root.classList.remove("memo-table-cell-selected", "memo-table-cell-active");
    if (!root.getAttribute("class")) root.removeAttribute("class");
  }
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

function selectedTableClipboardPayload() {
  const table = tableSelectionState?.table;
  const cells = activeTableSelectionCells();
  if (!table || !cells.length || !editor.contains(table)) return null;

  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  if (cells.length <= 1 && selectionBelongsToEditor(range) && !range.collapsed) return null;

  const selectedSet = new Set(cells);
  const originalCells = tableCells(table);
  const allSelected = originalCells.length > 0 && cells.length === originalCells.length;
  const clone = table.cloneNode(true);
  stripTransientTableSelection(clone);

  if (!allSelected) {
    const clonedCells = Array.from(clone.querySelectorAll("td"));
    clonedCells.forEach((cell, index) => {
      if (!selectedSet.has(originalCells[index])) cell.remove();
    });
    clone.querySelectorAll("tr").forEach((row) => {
      if (!row.children.length) row.remove();
    });
  }

  const rows = Array.from(clone.querySelectorAll("tr"));
  if (!rows.length) return null;
  const text = rows
    .map((row) =>
      Array.from(row.children)
        .map((cell) =>
          String(cell.textContent || "")
            .replaceAll(CHECK_TEXT_PLACEHOLDER, "")
            .replace(/\u00a0/g, " ")
            .replace(/[ \t]*\n[ \t]*/g, "\n")
            .trim()
        )
        .join("\t")
    )
    .join("\n");

  return {
    html: clone.outerHTML,
    text
  };
}

function targetTableCells() {
  const selected = selectedTableCells();
  if (selected.length) return selected;
  const cell = currentTableCell();
  return cell ? [cell] : [];
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
        for (let c = colIndex; c < colIndex + colSpan; c += 1) grid[r][c] = cell;
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
  return measureInteraction("detached.renderTableSelection", () => {
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
  scheduleSave();
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
  if (cell) mergeTableCellsInGroup(adjacentCellsForMerge(cell, "right"));
}

function mergeTableCellsDown() {
  const cell = currentTableCell();
  if (cell) mergeTableCellsInGroup(adjacentCellsForMerge(cell, "down"));
}

function splitTableCell() {
  const cell = currentTableCell();
  const table = cell?.closest(".memo-table");
  if (!cell || !table) return;
  const { rows, meta } = buildTableGrid(table);
  const position = meta.get(cell);
  if (!position) return;
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
    const targetRow = rows[position.rowIndex + rowOffset];
    if (!targetRow) continue;
    const beforeCell = targetRow.children[position.colIndex] || null;
    for (let index = 0; index < colSpan; index += 1) targetRow.insertBefore(createTableCell(), beforeCell);
  }

  placeCaretInCell(cell);
  scheduleSave();
  pushEditorHistory();
}

function addTableRow() {
  const cell = currentTableCell();
  const currentRow = cell?.parentElement;
  if (!cell || !currentRow) return;
  const colCount = Math.max(1, currentRow.children.length);
  const row = document.createElement("tr");
  for (let index = 0; index < colCount; index += 1) row.appendChild(createTableCell());
  currentRow.after(row);
  placeCaretInCell(row.querySelector("td"));
  scheduleSave();
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
  scheduleSave();
  pushEditorHistory();
}

function deleteTableRow() {
  const cell = currentTableCell();
  const table = cell?.closest(".memo-table");
  const row = cell?.parentElement;
  if (!table || !row) return;
  if (table.querySelectorAll("tr").length <= 1) {
    deleteTable();
    return;
  }
  const nextRow = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  placeCaretInCell(nextRow?.querySelector("td"));
  scheduleSave();
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
  scheduleSave();
  pushEditorHistory();
}

function deleteTable() {
  const table = currentMemoTable();
  if (!table) return;
  const blankLine = createBlankLine();
  table.replaceWith(blankLine);
  clearTableSelection();
  placeCaretInBlock(blankLine);
  scheduleSave();
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
  scheduleSave();
  pushEditorHistory();
}

function applyTableCellColorValue(value) {
  const color = normalizeHexColor(value, "#ffffff");
  if (tableCellColorInput) tableCellColorInput.value = color;
  targetTableCells().forEach((cell) => {
    cell.style.backgroundColor = color;
  });
  scheduleSave();
  pushEditorHistory();
}

function applyTableCellColor() {
  applyTableCellColorValue(tableCellColorInput?.value);
}

function clearTableCellColor() {
  targetTableCells().forEach((cell) => {
    cell.style.backgroundColor = "";
  });
  scheduleSave();
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

function isBlankEditorText(value) {
  return String(value || "")
    .replaceAll(CHECK_TEXT_PLACEHOLDER, "")
    .replace(/\u00a0/g, " ")
    .trim() === "";
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
    scheduleSave();
    pushEditorHistory();
    return;
  }

  const nextTextValue = splitChecklistTextAtSelection(currentText);
  const { item: nextItem, text } = createChecklistItem(false);
  setChecklistText(text, nextTextValue);
  item.after(nextItem);
  placeCaretInCheckText(text, nextTextValue ? 0 : null);
  scheduleSave();
  pushEditorHistory();
}

function currentListItem() {
  return getSelectionElement()?.closest("li") || null;
}

function ensureListItemEditable(item) {
  if (!item.childNodes.length) item.appendChild(document.createElement("br"));
}

function splitListItemAtSelection(item) {
  const nextItem = document.createElement("li");
  const range = currentEditorRange();

  if (range && item.contains(range.startContainer) && item.contains(range.endContainer)) {
    range.deleteContents();
    const tailRange = document.createRange();
    tailRange.setStart(range.startContainer, range.startOffset);
    tailRange.setEnd(item, item.childNodes.length);
    const tail = tailRange.extractContents();
    if (tail.childNodes.length) nextItem.appendChild(tail);
  }

  ensureListItemEditable(item);
  ensureListItemEditable(nextItem);
  item.after(nextItem);
  placeCaretInBlock(nextItem);
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
    scheduleSave();
    pushEditorHistory();
    return;
  }

  exitListAtItem(list, item);
  scheduleSave();
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

async function attachDetachedMemoToMain() {
  if (!memo?.id || attachingDetachedMemo) return;
  attachingDetachedMemo = true;
  try {
    await saveNow();
    await window.memoEdge.attachDetachedMemo(memo.id);
  } finally {
    attachingDetachedMemo = false;
  }
}

function handleDetachedWindowShortcut(event) {
  const key = String(event.key || "").toLowerCase();
  const isEscape = key === "escape" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
  const isCtrlW = key === "w" && event.ctrlKey && !event.altKey && !event.shiftKey;
  if (!isEscape && !isCtrlW) return;

  event.preventDefault();
  event.stopPropagation();
  attachDetachedMemoToMain();
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
  scheduleSave();
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
  handleEditorLinkClick(event);
  if (event.target.closest(".check-box")) {
    event.preventDefault();
    toggleChecklistItem(event.target);
  }
  scheduleTableToolsRefresh();
});
document.addEventListener("selectionchange", () => {
  rememberEditorSelection();
  scheduleToolbarRefresh();
  if (document.activeElement === editor || editor.contains(document.activeElement)) {
    scheduleTableToolsRefresh();
  }
});
document.addEventListener("pointermove", moveTableCellSelection);
document.addEventListener("pointerup", endTableCellSelection);
document.addEventListener("pointercancel", endTableCellSelection);
document.addEventListener("keydown", handleDetachedWindowShortcut, true);
document.addEventListener("keydown", handleEmojiShortcut, true);
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
    attachmentPanel &&
    !attachmentPanel.classList.contains("hidden") &&
    !attachmentPanel.contains(target) &&
    !attachmentButton?.contains(target)
  ) {
    setAttachmentPanelOpen(false);
  }
  if (
    reminderPanel &&
    !reminderPanel.classList.contains("hidden") &&
    !reminderPanel.contains(target) &&
    !reminderButton?.contains(target)
  ) {
    setReminderPanelOpen(false);
  }
  if (editor.contains(target) || tableTools.contains(target) || tablePicker.contains(target) || tableButton.contains(target)) {
    return;
  }
  clearTableSelection();
});
titleInput.addEventListener("input", () => scheduleSave({ htmlDirty: false }));
attachButton.addEventListener("click", attachDetachedMemoToMain);
undoButton.addEventListener("click", undoEditor);
redoButton.addEventListener("click", redoEditor);
bulletButton.addEventListener("click", () => execCommand("insertUnorderedList"));
orderedListButton?.addEventListener("click", () => execCommand("insertOrderedList"));
checkButton.addEventListener("click", insertChecklist);
clearButton?.addEventListener("click", clearEditorPreservingUndo);
attachmentButton?.addEventListener("click", () => setAttachmentPanelOpen(attachmentPanel?.classList.contains("hidden")));
reminderButton?.addEventListener("click", () => setReminderPanelOpen(reminderPanel?.classList.contains("hidden")));
addAttachmentButton?.addEventListener("click", addAttachmentToDetachedMemo);
addReminderButton?.addEventListener("click", addOrUpdateReminder);
[reminderTitleInput, reminderBodyInput, reminderDateTimeInput, reminderRepeatSelect].forEach((control) => {
  control?.addEventListener("input", () => setReminderStatus(""));
  control?.addEventListener("change", () => setReminderStatus(""));
});
linkButton?.addEventListener("click", toggleLinkEditorSelection);
backgroundButton?.addEventListener("click", editBackgroundForDetachedMemo);
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
cropperClearBackgroundButton?.addEventListener("click", clearDetachedBackground);
cropperApplyButton?.addEventListener("click", applyBackgroundCrop);
softBackgroundInput?.addEventListener("change", () => {
  if (backgroundCropperState?.mode === "coverage" && softBackgroundInput.checked) {
    resetCoveragePreviewLayout(true);
  }
});
document.addEventListener("copy", handleEditorCopy);
document.addEventListener("paste", handleEditorPaste);
window.addEventListener("resize", handleCropperWindowResize);
tableButton.addEventListener("click", () => {
  rememberEditorSelection();
  setTablePickerOpen(tablePicker.classList.contains("hidden"));
});
insertTableButton.addEventListener("click", insertTable);
cancelTableButton.addEventListener("click", () => {
  setTablePickerOpen(false);
  editor.focus();
});
tablePicker.addEventListener("keydown", (event) => {
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
tableTools.addEventListener("mousedown", (event) => {
  if (event.target.closest("input, label")) return;
  event.preventDefault();
});
addTableRowButton.addEventListener("click", addTableRow);
addTableColButton.addEventListener("click", addTableColumn);
deleteTableRowButton.addEventListener("click", deleteTableRow);
deleteTableColButton.addEventListener("click", deleteTableColumn);
mergeTableCellsButton.addEventListener("click", mergeTableCells);
mergeTableDownButton?.addEventListener("click", mergeTableCellsDown);
splitTableCellButton.addEventListener("click", splitTableCell);
tableBorderColorInput.addEventListener("input", applyTableBorder);
tableBorderWidthInput.addEventListener("input", applyTableBorder);
tableCellColorInput.addEventListener("input", applyTableCellColor);
tableCellColorButtons.forEach((button) => {
  button.addEventListener("click", () => applyTableCellColorValue(button.dataset.tableCellColor));
});
clearTableCellColorButton.addEventListener("click", clearTableCellColor);
deleteTableButton.addEventListener("click", deleteTable);
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
emojiButton?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  rememberEditorSelection();
});
emojiButton?.addEventListener("click", (event) => {
  event.preventDefault();
  toggleEmojiPalette();
});
[fontFamilySelect, fontSizeSelect, lineSpacingSelect].forEach((control) => {
  control?.addEventListener("pointerdown", rememberEditorSelection, { capture: true });
  control?.addEventListener("mousedown", rememberEditorSelection);
});
fontFamilySelect.addEventListener("change", () => {
  fontFamilySelect.style.fontFamily = fontFamilyCss(fontFamilySelect.value);
  applyInlineTextStyle("fontFamily", fontFamilyCss(fontFamilySelect.value));
});
fontSizeSelect.addEventListener("input", () => applyFontSizeControlValue(fontSizeSelect));
fontSizeSelect.addEventListener("change", () => applyFontSizeControlValue(fontSizeSelect, { force: true }));
lineSpacingSelect.addEventListener("change", () => {
  applyLineSpacingToSelection(lineSpacingSelect.value);
});
window.addEventListener("beforeunload", () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  clearPendingEditorHistory();
  const patch = detachedMemoPatch(true);
  if (patch) window.memoEdge.updateDetachedMemo(patch);
});

window.memoEdge.onDetachedMemoRefresh?.((nextMemo) => {
  if (!memo || nextMemo.id === memo.id) applyMemo(nextMemo);
});

window.memoEdge.onDetachedToolbarState?.((payload) => {
  memo = {
    ...(memo || {}),
    toolbarButtons: normalizeToolbarButtons(payload?.toolbarButtons),
    opacityControlsEnabled:
      payload?.opacityControlsEnabled === undefined
        ? memo?.opacityControlsEnabled !== false
        : payload.opacityControlsEnabled !== false
  };
  applyToolbarButtonVisibility(memo.toolbarButtons);
  applyMemoTheme();
});

async function initialize() {
  try {
    const shellState = await window.memoEdge.getShellState?.();
    const nextShortcut = shellState?.settings?.emojiShortcut;
    if (typeof nextShortcut === "string" && nextShortcut.trim()) {
      emojiShortcut = nextShortcut.trim();
    }
  } catch {
    emojiShortcut = DEFAULT_EMOJI_SHORTCUT;
  }

  const result = await window.memoEdge.getDetachedMemo();
  applyMemo(result?.memo || {});

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
    syncToolbarTypography();
  } catch {
    systemFonts = [DEFAULT_FONT_FAMILY, "GulimChe", "Malgun Gothic", "Arial", "Calibri", "Consolas"];
    registerCustomFonts([]);
    syncToolbarTypography();
  }
}

initialize();
