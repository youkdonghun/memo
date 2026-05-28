const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, shell, Tray } = require("electron");
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const COLLAPSED_WIDTH = 36;
const PANEL_WIDTH = 480;
const SIDE_TITLE_EDIT_WIDTH = 260;
const WINDOW_VERTICAL_MARGIN = 18;
const BASE_HEIGHT = 520;
const SETTINGS_HEIGHT = 720;
const MIN_HEIGHT = 180;
const MAX_CUSTOM_HEIGHT = 1400;
const MIN_PANEL_WIDTH = 280;
const MAX_CUSTOM_WIDTH = 1200;

const DEFAULT_SETTINGS = {
  dockEdge: "right",
  visibilityMode: "peek",
  edgeAnchor: "middle",
  edgeOffset: 0,
  lengthMode: "long",
  panelWidth: PANEL_WIDTH,
  panelHeight: BASE_HEIGHT,
  cycleShortcut: "CommandOrControl+Shift+D",
  hideShortcut: "CommandOrControl+Shift+F",
  findShortcut: "CommandOrControl+F",
  emojiShortcut: "CommandOrControl+Shift+E",
  alwaysOnTop: true,
  anchor: "middle",
  manualYOffset: 0,
  followCursorDisplay: false,
  targetDisplayId: null
};

const FALLBACK_FONTS = [
  "Gulim",
  "GulimChe",
  "Dotum",
  "DotumChe",
  "Batang",
  "BatangChe",
  "Gungsuh",
  "GungsuhChe",
  "Malgun Gothic",
  "Segoe UI",
  "Arial",
  "Calibri",
  "Cambria",
  "Consolas",
  "Georgia",
  "Noto Sans KR",
  "Times New Roman"
];

let mainWindow = null;
let tray = null;
let settings = { ...DEFAULT_SETTINGS };
let expanded = false;
let registeredCycleShortcut = null;
let registeredHideShortcut = null;
let registeredEmojiShortcut = null;
let followDisplayTimer = null;
let isQuitting = false;
let settingsOpen = false;
let temporaryPanelWidth = null;
let sideTitleEditOpen = false;
let settingsSaveTimer = null;
let startupNotificationShown = false;
let shortcutTopmostActive = false;
const detachedWindows = new Map();
const detachedMemos = new Map();

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    settings = normalizeSettings(parsed);
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  if (settingsSaveTimer) {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = null;
  }
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
}

function scheduleSettingsSave() {
  if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(saveSettings, 220);
}

function normalizeSettings(partial = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings, ...partial };
  const legacyAnchorMap = {
    top: "start",
    middle: "middle",
    bottom: "end",
    custom: "custom"
  };
  const edgeAnchorSource = merged.edgeAnchor || legacyAnchorMap[merged.anchor] || DEFAULT_SETTINGS.edgeAnchor;
  const edgeOffsetSource =
    typeof merged.edgeOffset === "number" && Number.isFinite(merged.edgeOffset)
      ? merged.edgeOffset
      : merged.manualYOffset;
  const edgeAnchor = ["start", "middle", "end", "custom"].includes(edgeAnchorSource)
    ? edgeAnchorSource
    : DEFAULT_SETTINGS.edgeAnchor;
  const edgeOffset =
    typeof edgeOffsetSource === "number" && Number.isFinite(edgeOffsetSource)
      ? Math.round(edgeOffsetSource)
      : 0;
  const anchorAlias = { start: "top", middle: "middle", end: "bottom", custom: "custom" }[edgeAnchor];

  return {
    dockEdge: ["right", "left", "top", "bottom"].includes(merged.dockEdge)
      ? merged.dockEdge
      : DEFAULT_SETTINGS.dockEdge,
    visibilityMode: ["peek", "shortcutOnly"].includes(merged.visibilityMode)
      ? merged.visibilityMode
      : DEFAULT_SETTINGS.visibilityMode,
    edgeAnchor,
    edgeOffset,
    lengthMode: ["normal", "long", "custom"].includes(merged.lengthMode)
      ? merged.lengthMode
      : merged.lengthMode === "short"
        ? "normal"
      : DEFAULT_SETTINGS.lengthMode,
    panelWidth:
      typeof merged.panelWidth === "number" && Number.isFinite(merged.panelWidth)
        ? clamp(Math.round(merged.panelWidth), MIN_PANEL_WIDTH, MAX_CUSTOM_WIDTH)
        : DEFAULT_SETTINGS.panelWidth,
    panelHeight:
      typeof merged.panelHeight === "number" && Number.isFinite(merged.panelHeight)
        ? clamp(Math.round(merged.panelHeight), MIN_HEIGHT, MAX_CUSTOM_HEIGHT)
        : DEFAULT_SETTINGS.panelHeight,
    cycleShortcut:
      typeof merged.cycleShortcut === "string" && merged.cycleShortcut.trim()
        ? merged.cycleShortcut.trim()
        : DEFAULT_SETTINGS.cycleShortcut,
    hideShortcut:
      typeof merged.hideShortcut === "string" && merged.hideShortcut.trim()
        ? merged.hideShortcut.trim()
        : DEFAULT_SETTINGS.hideShortcut,
    findShortcut:
      typeof merged.findShortcut === "string" && merged.findShortcut.trim()
        ? merged.findShortcut.trim()
        : DEFAULT_SETTINGS.findShortcut,
    emojiShortcut:
      typeof merged.emojiShortcut === "string" && merged.emojiShortcut.trim()
        ? merged.emojiShortcut.trim()
        : DEFAULT_SETTINGS.emojiShortcut,
    alwaysOnTop: merged.alwaysOnTop !== false,
    anchor: anchorAlias,
    manualYOffset:
      edgeOffset,
    followCursorDisplay: merged.followCursorDisplay === true,
    targetDisplayId:
      typeof merged.targetDisplayId === "number" ? merged.targetDisplayId : null
  };
}

function ensureDefaultDisplayTarget() {
  if (settings.followCursorDisplay || settings.targetDisplayId !== null) return;
  const firstDisplay = screen.getAllDisplays()[0] || screen.getPrimaryDisplay();
  if (!firstDisplay) return;
  settings = normalizeSettings({ targetDisplayId: firstDisplay.id, followCursorDisplay: false });
  saveSettings();
}

function resolveIconPath() {
  const candidates = [
    path.join(process.resourcesPath || "", "build", "icon.ico"),
    path.join(__dirname, "..", "build", "icon.ico"),
    path.join(__dirname, "..", "..", "build", "icon.ico")
  ];

  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

function createIconImage() {
  const iconPath = resolveIconPath();
  if (!iconPath) return nativeImage.createEmpty();
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? nativeImage.createEmpty() : image;
}

function sanitizeFontName(name) {
  if (typeof name !== "string") return "";
  let clean = name
    .replace(/\s+\((TrueType|OpenType)\)$/i, "")
    .replace(/\s+&\s+.*$/i, "")
    .trim();

  const styleSuffix = /\s+(Bold Italic|Bold Oblique|ExtraLight|ExtraBold|SemiBold|Semibold|Condensed|Regular|Medium|Italic|Oblique|Light|Black|Thin|Bold)$/i;
  let previous = "";
  while (clean && previous !== clean) {
    previous = clean;
    clean = clean.replace(styleSuffix, "").trim();
  }

  if (!clean || /[\uFFFD?]/.test(clean)) return "";
  return clean;
}

function userDataAssetDir(kind) {
  const dir = path.join(app.getPath("userData"), kind);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fontManifestPath() {
  return path.join(userDataAssetDir("fonts"), "fonts.json");
}

function safeFileName(value, fallback) {
  const clean = String(value || fallback || "asset")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return clean || fallback || "asset";
}

function loadCustomFonts() {
  try {
    const parsed = JSON.parse(fs.readFileSync(fontManifestPath(), "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((font) => font && typeof font.family === "string" && typeof font.path === "string")
      .filter((font) => font.family.trim() && fs.existsSync(font.path))
      .map((font) => ({
        family: sanitizeFontName(font.family) || path.basename(font.path, path.extname(font.path)),
        path: font.path,
        url: pathToFileURL(font.path).href
      }));
  } catch {
    return [];
  }
}

function saveCustomFonts(fonts) {
  const serializable = fonts.map((font) => ({ family: font.family, path: font.path }));
  fs.writeFileSync(fontManifestPath(), JSON.stringify(serializable, null, 2), "utf8");
}

async function importFontFile() {
  const result = await dialog.showOpenDialog(mainWindow || undefined, {
    title: "글씨체 파일 추가",
    properties: ["openFile"],
    filters: [{ name: "Font Files", extensions: ["ttf", "otf", "woff", "woff2"] }]
  });

  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };

  const source = result.filePaths[0];
  const ext = path.extname(source).toLowerCase();
  const family = sanitizeFontName(path.basename(source, ext)) || "Custom Font";
  const fileName = `${Date.now()}-${safeFileName(path.basename(source), "font")}`;
  const target = path.join(userDataAssetDir("fonts"), fileName);
  fs.copyFileSync(source, target);

  const fonts = loadCustomFonts().filter((font) => font.family !== family || font.path !== target);
  const font = { family, path: target, url: pathToFileURL(target).href };
  fonts.push(font);
  saveCustomFonts(fonts);
  return { ok: true, font, fonts };
}

async function importBackgroundImage() {
  const result = await dialog.showOpenDialog(mainWindow || undefined, {
    title: "배경 이미지 선택",
    properties: ["openFile"],
    filters: [{ name: "Image Files", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] }]
  });

  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };

  const source = result.filePaths[0];
  const fileName = `${Date.now()}-${safeFileName(path.basename(source), "background")}`;
  const target = path.join(userDataAssetDir("backgrounds"), fileName);
  fs.copyFileSync(source, target);
  return { ok: true, path: target, url: pathToFileURL(target).href };
}

async function importEmojiImage() {
  const result = await dialog.showOpenDialog(mainWindow || undefined, {
    title: "이모티콘 이미지 추가",
    properties: ["openFile"],
    filters: [{ name: "Image Files", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] }]
  });

  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };

  const source = result.filePaths[0];
  const fileName = `${Date.now()}-${safeFileName(path.basename(source), "emoji")}`;
  const target = path.join(userDataAssetDir("emojis"), fileName);
  fs.copyFileSync(source, target);
  return {
    ok: true,
    emoji: {
      id: `emoji-${Date.now()}`,
      name: path.basename(source, path.extname(source)),
      path: target,
      url: pathToFileURL(target).href
    }
  };
}

function saveCroppedBackgroundImage(dataUrl) {
  if (typeof dataUrl !== "string") return { ok: false, message: "INVALID_IMAGE" };
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp|gif|bmp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return { ok: false, message: "INVALID_IMAGE" };

  const ext = match[1].toLowerCase().replace("jpeg", "jpg");
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length) return { ok: false, message: "EMPTY_IMAGE" };

  const fileName = `${Date.now()}-cropped-background.${ext}`;
  const target = path.join(userDataAssetDir("backgrounds"), fileName);
  fs.writeFileSync(target, buffer);
  return { ok: true, path: target, url: pathToFileURL(target).href };
}

function listSystemFonts() {
  if (process.platform !== "win32") return Promise.resolve(FALLBACK_FONTS);

  const script = [
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;",
    "$OutputEncoding = [System.Text.Encoding]::UTF8;",
    "$paths = @(",
    "'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',",
    "'HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts'",
    ");",
    "$names = @();",
    "foreach ($p in $paths) {",
    "  if (Test-Path $p) {",
    "    $props = Get-ItemProperty -Path $p;",
    "    $props.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object {",
    "      $n = $_.Name -replace ' \\(TrueType\\)$','' -replace ' \\(OpenType\\)$','' -replace ' & .*$', '';",
    "      if ($n.Trim().Length -gt 0) { $names += $n.Trim() }",
    "    }",
    "  }",
    "}",
    "$names | Sort-Object -Unique | ConvertTo-Json -Compress"
  ].join(" ");

  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true, timeout: 5000 },
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(FALLBACK_FONTS);
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          const fonts = (Array.isArray(parsed) ? parsed : [parsed])
            .filter((font) => typeof font === "string" && font.trim())
            .map(sanitizeFontName)
            .filter(Boolean);
          resolve(
            [...new Set([...FALLBACK_FONTS, ...fonts])].sort((a, b) =>
              a.localeCompare(b, "ko-KR", { sensitivity: "base" })
            )
          );
        } catch {
          resolve(FALLBACK_FONTS);
        }
      }
    );
  });
}

function getCursorDisplay() {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

function getTargetDisplay() {
  if (!settings.followCursorDisplay && settings.targetDisplayId !== null) {
    const fixed = screen.getAllDisplays().find((display) => display.id === settings.targetDisplayId);
    if (fixed) return fixed;
  }
  return getCursorDisplay() || screen.getPrimaryDisplay();
}

function isHorizontalEdge(edge = settings.dockEdge) {
  return edge === "top" || edge === "bottom";
}

function preferredPanelHeight(display) {
  const ratioByMode = { normal: 1 / 2, long: 1 };
  const preferredHeight = settingsOpen
    ? SETTINGS_HEIGHT
    : settings.lengthMode === "custom"
      ? settings.panelHeight
      : Math.round(BASE_HEIGHT * (ratioByMode[settings.lengthMode] || 1));
  const maxHeight = Math.max(MIN_HEIGHT, display.bounds.height - WINDOW_VERTICAL_MARGIN * 2);
  return clamp(preferredHeight, MIN_HEIGHT, maxHeight);
}

function preferredPanelWidth(display) {
  const maxWidth = Math.max(MIN_PANEL_WIDTH, display.bounds.width - WINDOW_VERTICAL_MARGIN * 2);
  const preferredWidth =
    settingsOpen && Number.isFinite(temporaryPanelWidth)
      ? Math.max(settings.panelWidth, temporaryPanelWidth)
      : settings.panelWidth;
  return clamp(preferredWidth, MIN_PANEL_WIDTH, Math.min(MAX_CUSTOM_WIDTH, maxWidth));
}

function getWindowSize(display) {
  const horizontal = isHorizontalEdge();
  const panelHeight = preferredPanelHeight(display);
  const panelWidth = preferredPanelWidth(display);

  if (horizontal) {
    return {
      width: panelWidth,
      height:
        expanded || settingsOpen
          ? COLLAPSED_WIDTH + panelHeight
          : sideTitleEditOpen
            ? COLLAPSED_WIDTH + SIDE_TITLE_EDIT_WIDTH
            : COLLAPSED_WIDTH
    };
  }

  return {
    width:
      expanded || settingsOpen
        ? COLLAPSED_WIDTH + panelWidth
        : sideTitleEditOpen
          ? COLLAPSED_WIDTH + SIDE_TITLE_EDIT_WIDTH
          : COLLAPSED_WIDTH,
    height: panelHeight
  };
}

function getAnchoredCoordinate(start, span, size) {
  const min = start + WINDOW_VERTICAL_MARGIN;
  const max = start + span - size - WINDOW_VERTICAL_MARGIN;
  let coordinate = start + Math.round((span - size) / 2);

  if (settings.edgeAnchor === "start") coordinate = min;
  if (settings.edgeAnchor === "end") coordinate = max;
  if (settings.edgeAnchor === "middle" || settings.edgeAnchor === "custom") {
    coordinate += settings.edgeOffset;
  }

  return clamp(coordinate, min, max);
}

function getWindowBounds(display) {
  const size = getWindowSize(display);
  const bounds = display.bounds;
  const x = isHorizontalEdge()
    ? getAnchoredCoordinate(bounds.x, bounds.width, size.width)
    : settings.dockEdge === "left"
      ? bounds.x
      : bounds.x + bounds.width - size.width;
  const y = isHorizontalEdge()
    ? settings.dockEdge === "top"
      ? bounds.y
      : bounds.y + bounds.height - size.height
    : getAnchoredCoordinate(bounds.y, bounds.height, size.height);

  return { x, y, width: size.width, height: size.height };
}

function refreshWindowBounds(animate = true) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const display = getTargetDisplay();
  mainWindow.setBounds(getWindowBounds(display), animate);
}

function shouldHideCollapsedWindow() {
  return settings.visibilityMode === "shortcutOnly" && !expanded && !settingsOpen;
}

function applyWindowVisibility() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (shouldHideCollapsedWindow()) {
    mainWindow.hide();
    return;
  }
  if (!mainWindow.isVisible()) mainWindow.showInactive();
}

function displayInfos() {
  return screen.getAllDisplays().map((display) => ({
    id: display.id,
    label: display.label || `Display ${display.id}`,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor
  }));
}

function applyWindowZOrder() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setAlwaysOnTop(settings.alwaysOnTop !== false || shortcutTopmostActive);
}

function bringMainWindowToFront() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.isVisible()) mainWindow.showInactive();
  if (typeof mainWindow.moveTop === "function") mainWindow.moveTop();
  if (shortcutTopmostActive) mainWindow.focus();
}

function loginItemOptions() {
  return app.isPackaged
    ? { path: process.execPath, args: [] }
    : { path: process.execPath, args: [app.getAppPath()] };
}

function setExpanded(nextExpanded, notifyRenderer = true) {
  expanded = Boolean(nextExpanded);
  if (expanded) sideTitleEditOpen = false;
  if (!expanded) {
    shortcutTopmostActive = false;
    settingsOpen = false;
    temporaryPanelWidth = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    applyWindowZOrder();
    refreshWindowBounds(true);
    if (notifyRenderer) {
      mainWindow.webContents.send("shell:expanded-changed", expanded);
    }
    applyWindowVisibility();
    if (expanded && shortcutTopmostActive) bringMainWindowToFront();
  }
  refreshTrayMenu();
}

function setSettingsOpen(nextOpen) {
  settingsOpen = Boolean(nextOpen) && expanded;
  if (settingsOpen) sideTitleEditOpen = false;
  if (!settingsOpen) temporaryPanelWidth = null;
  refreshWindowBounds(true);
  applyWindowVisibility();
  return { ok: true, settingsOpen };
}

function setSideTitleEditOpen(nextOpen) {
  sideTitleEditOpen = Boolean(nextOpen) && !expanded && !settingsOpen;
  refreshWindowBounds(false);
  applyWindowVisibility();
  return { ok: true, sideTitleEditOpen };
}

function setTemporaryPanelWidth(nextWidth) {
  const numeric = Number(nextWidth);
  temporaryPanelWidth = Number.isFinite(numeric) ? clamp(Math.round(numeric), MIN_PANEL_WIDTH, MAX_CUSTOM_WIDTH) : null;
  refreshWindowBounds(true);
  applyWindowVisibility();
  return {
    ok: true,
    panelWidth: preferredPanelWidth(getTargetDisplay()),
    temporaryPanelWidth
  };
}

function showWindow(options = {}) {
  if (options.forceTopmost) shortcutTopmostActive = true;
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  applyWindowZOrder();
  mainWindow.showInactive();
  refreshWindowBounds(true);
  applyWindowVisibility();
  if (options.forceTopmost) bringMainWindowToFront();
}

function hideWindowToTray() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  setExpanded(false);
  mainWindow.hide();
}

function sendRendererCommand(channel, options = {}) {
  showWindow(options);
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow.webContents.send(channel);
    });
    return;
  }
  mainWindow.webContents.send(channel);
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
  return {
    x: normalizedX,
    y: normalizedY,
    width: clamp(width, 0.01, 1 - normalizedX),
    height: clamp(height, 0.01, 1 - normalizedY)
  };
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

function normalizeDetachedMemo(memo = {}) {
  return {
    id: typeof memo.id === "string" && memo.id ? memo.id : `memo-${Date.now()}`,
    title: typeof memo.title === "string" && memo.title.trim() ? memo.title.slice(0, 80) : "메모",
    color: typeof memo.color === "string" ? memo.color : "#fff4b8",
    fontSize: typeof memo.fontSize === "number" ? memo.fontSize : Number(memo.fontSize) || 15,
    fontFamily: typeof memo.fontFamily === "string" && memo.fontFamily.trim() ? memo.fontFamily : "Gulim",
    lineSpacing: typeof memo.lineSpacing === "number" ? memo.lineSpacing : Number(memo.lineSpacing) || 1.5,
    backgroundImage: typeof memo.backgroundImage === "string" ? memo.backgroundImage : "",
    backgroundSourceImage:
      typeof memo.backgroundSourceImage === "string" && memo.backgroundSourceImage
        ? memo.backgroundSourceImage
        : typeof memo.backgroundImage === "string"
          ? memo.backgroundImage
          : "",
    backgroundCrop: normalizeBackgroundCrop(memo.backgroundCrop),
    backgroundOpacity:
      typeof memo.backgroundOpacity === "number" && Number.isFinite(memo.backgroundOpacity)
        ? clamp(memo.backgroundOpacity, 0, 1)
        : Number.isFinite(Number(memo.backgroundOpacity))
          ? clamp(Number(memo.backgroundOpacity), 0, 1)
          : 0,
    backgroundTop: normalizeBackgroundTop(memo.backgroundTop, memo.backgroundCoverage),
    backgroundCoverage: normalizeBackgroundCoverage(memo.backgroundCoverage),
    backgroundPositionX: normalizeBackgroundPosition(memo.backgroundPositionX),
    backgroundPositionY: normalizeBackgroundPosition(memo.backgroundPositionY),
    html: typeof memo.html === "string" ? memo.html : ""
  };
}

function detachedMemoForSender(webContents) {
  const senderWindow = BrowserWindow.fromWebContents(webContents);
  if (!senderWindow) return null;
  return detachedMemos.get(senderWindow.__memoId) || null;
}

function attachDetachedMemo(id) {
  if (!id) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("memo:detached-attached", id);
  }
}

function buildDetachedWindowMenu() {
  return Menu.buildFromTemplate([
    {
      label: "편집",
      submenu: [
        { label: "실행 취소", role: "undo", accelerator: "Ctrl+Z" },
        { label: "다시 실행", role: "redo", accelerator: "Ctrl+Y" },
        { type: "separator" },
        { label: "잘라내기", role: "cut", accelerator: "Ctrl+X" },
        { label: "복사", role: "copy", accelerator: "Ctrl+C" },
        { label: "붙여넣기", role: "paste", accelerator: "Ctrl+V" },
        { type: "separator" },
        { label: "전체 선택", role: "selectAll", accelerator: "Ctrl+A" }
      ]
    }
  ]);
}

function createDetachedMemoWindow(memoPayload) {
  const memo = normalizeDetachedMemo(memoPayload);
  detachedMemos.set(memo.id, memo);

  const existing = detachedWindows.get(memo.id);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    existing.webContents.send("memo:detached-refresh", memo);
    return { ok: true, id: memo.id };
  }

  const detachedWindow = new BrowserWindow({
    width: 460,
    height: 560,
    minWidth: 300,
    minHeight: 240,
    title: memo.title,
    icon: resolveIconPath() || undefined,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  detachedWindow.__memoId = memo.id;
  detachedWindow.setMenu(buildDetachedWindowMenu());
  detachedWindows.set(memo.id, detachedWindow);
  detachedWindow.loadFile(path.join(__dirname, "renderer", "detached.html"));

  detachedWindow.on("closed", () => {
    detachedWindows.delete(memo.id);
    attachDetachedMemo(memo.id);
  });

  return { ok: true, id: memo.id };
}

function unregisterShortcuts() {
  if (registeredCycleShortcut) {
    globalShortcut.unregister(registeredCycleShortcut);
    registeredCycleShortcut = null;
  }
  if (registeredHideShortcut) {
    globalShortcut.unregister(registeredHideShortcut);
    registeredHideShortcut = null;
  }
  if (registeredEmojiShortcut) {
    globalShortcut.unregister(registeredEmojiShortcut);
    registeredEmojiShortcut = null;
  }
}

function registerShortcuts() {
  unregisterShortcuts();

  const cycleRegistered = globalShortcut.register(settings.cycleShortcut, () => {
    sendRendererCommand("shortcut:cycle-floating", { forceTopmost: true });
  });

  const hideRegistered = globalShortcut.register(settings.hideShortcut, () => {
    setExpanded(false);
  });

  const emojiRegistered = globalShortcut.register(settings.emojiShortcut, () => {
    shortcutTopmostActive = true;
    setExpanded(true);
    sendRendererCommand("shortcut:open-emoji", { forceTopmost: true });
  });

  if (cycleRegistered) registeredCycleShortcut = settings.cycleShortcut;
  if (hideRegistered) registeredHideShortcut = settings.hideShortcut;
  if (emojiRegistered) registeredEmojiShortcut = settings.emojiShortcut;

  return {
    cycle: {
      ok: cycleRegistered,
      shortcut: settings.cycleShortcut,
      message: cycleRegistered ? "" : `단축키 등록 실패: ${settings.cycleShortcut}`
    },
    hide: {
      ok: hideRegistered,
      shortcut: settings.hideShortcut,
      message: hideRegistered ? "" : `단축키 등록 실패: ${settings.hideShortcut}`
    },
    emoji: {
      ok: emojiRegistered,
      shortcut: settings.emojiShortcut,
      message: emojiRegistered ? "" : `단축키 등록 실패: ${settings.emojiShortcut}`
    }
  };
}

function refreshTrayMenu() {
  if (!tray) return;

  const template = [
    {
      label: "다음 메모 열기",
      click: () => sendRendererCommand("shortcut:cycle-floating", { forceTopmost: true })
    },
    {
      label: "숨기기",
      click: () => hideWindowToTray()
    },
    {
      label: "설정",
      click: () => sendRendererCommand("shell:open-settings")
    },
    { type: "separator" },
    {
      label: "종료",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ];

  tray.setToolTip("MEMO BOM");
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  if (tray) return;

  tray = new Tray(createIconImage());
  tray.on("click", () => sendRendererCommand("shortcut:cycle-floating", { forceTopmost: true }));
  refreshTrayMenu();
}

function showBackgroundStartupNotification() {
  if (startupNotificationShown) return;
  startupNotificationShown = true;

  const title = "MEMO BOM";
  const body = "백그라운드에서 실행 중입니다.\n트레이의 아이콘으로 메모를 사용하세요.";
  const iconPath = resolveIconPath();

  try {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        icon: iconPath || undefined,
        silent: true
      });
      notification.on("click", () => sendRendererCommand("shortcut:cycle-floating", { forceTopmost: true }));
      notification.show();
      return;
    }
  } catch {
    // Fall back to the tray balloon below when native notifications are unavailable.
  }

  if (process.platform === "win32" && tray?.displayBalloon) {
    try {
      tray.displayBalloon({
        title,
        content: body,
        icon: iconPath ? nativeImage.createFromPath(iconPath) : createIconImage(),
        noSound: true
      });
    } catch {
      // Notification support depends on the Windows notification settings.
    }
  }
}

function createMainWindow() {
  const display = getTargetDisplay();
  const bounds = getWindowBounds(display);

  mainWindow = new BrowserWindow({
    ...bounds,
    icon: resolveIconPath() || undefined,
    frame: false,
    show: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: settings.alwaysOnTop !== false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setSkipTaskbar(true);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  applyWindowZOrder();
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.webContents.once("did-finish-load", () => {
    refreshWindowBounds(false);
    applyWindowVisibility();
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    hideWindowToTray();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (followDisplayTimer) clearInterval(followDisplayTimer);
  followDisplayTimer = setInterval(() => {
    if (settings.followCursorDisplay && mainWindow && mainWindow.isVisible()) {
      refreshWindowBounds(false);
    }
  }, 350);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    sendRendererCommand("shortcut:cycle-floating", { forceTopmost: true });
  });

  app.whenReady().then(() => {
    if (process.platform === "win32") app.setAppUserModelId("com.youk.memobom");

    loadSettings();
    ensureDefaultDisplayTarget();
    registerShortcuts();
    createMainWindow();
    createTray();
    setTimeout(showBackgroundStartupNotification, 500);

    screen.on("display-added", () => refreshWindowBounds(true));
    screen.on("display-removed", () => refreshWindowBounds(true));
    screen.on("display-metrics-changed", () => refreshWindowBounds(true));

    app.on("activate", () => {
      showWindow();
    });
  });
}

ipcMain.handle("shell:get-state", () => ({
  settings,
  expanded,
  settingsOpen,
  hoverDelayMs: 200,
  displays: displayInfos(),
  activeDisplayId: getTargetDisplay()?.id ?? null
}));

ipcMain.handle("shell:set-expanded", (_, nextExpanded) => {
  setExpanded(nextExpanded, false);
  return { ok: true, expanded };
});

ipcMain.handle("shell:set-settings-open", (_, nextOpen) => setSettingsOpen(nextOpen));
ipcMain.handle("shell:set-temporary-panel-width", (_, nextWidth) => setTemporaryPanelWidth(nextWidth));
ipcMain.handle("shell:set-side-title-edit-open", (_, nextOpen) => setSideTitleEditOpen(nextOpen));

ipcMain.handle("shell:update-settings", (_, partialSettings = {}) => {
  settings = normalizeSettings(partialSettings);
  if (settings.edgeAnchor !== "custom") {
    settings.edgeOffset = 0;
    settings.manualYOffset = 0;
  }
  saveSettings();
  const shortcutStatus = registerShortcuts();
  applyWindowZOrder();
  refreshWindowBounds(true);
  applyWindowVisibility();
  refreshTrayMenu();
  return { ok: true, settings, shortcutStatus };
});

ipcMain.handle("shell:set-panel-height", (_, nextHeight) => {
  settings = normalizeSettings({
    lengthMode: "custom",
    panelHeight: typeof nextHeight === "number" ? nextHeight : Number(nextHeight)
  });
  scheduleSettingsSave();
  refreshWindowBounds(false);
  refreshTrayMenu();
  return { ok: true, settings };
});

ipcMain.handle("shell:set-panel-size", (_, nextSize = {}) => {
  settings = normalizeSettings({
    lengthMode: "custom",
    panelWidth: typeof nextSize.width === "number" ? nextSize.width : Number(nextSize.width),
    panelHeight: typeof nextSize.height === "number" ? nextSize.height : Number(nextSize.height)
  });
  scheduleSettingsSave();
  refreshWindowBounds(false);
  refreshTrayMenu();
  return { ok: true, settings };
});

ipcMain.handle("shell:nudge-edge", (_, delta) => {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return { ok: false, message: "INVALID_DELTA" };
  }
  settings = normalizeSettings({
    edgeAnchor: "custom",
    edgeOffset: clamp(settings.edgeOffset + Math.round(delta), -2500, 2500)
  });
  scheduleSettingsSave();
  refreshWindowBounds(false);
  return { ok: true, settings };
});

ipcMain.handle("shell:nudge-y", (_, deltaY) => {
  if (typeof deltaY !== "number" || Number.isNaN(deltaY)) {
    return { ok: false, message: "INVALID_DELTA" };
  }
  settings = normalizeSettings({
    edgeAnchor: "custom",
    edgeOffset: clamp(settings.edgeOffset + Math.round(deltaY), -2500, 2500)
  });
  scheduleSettingsSave();
  refreshWindowBounds(false);
  return { ok: true, settings };
});

ipcMain.handle("memo:detach", (_, memo) => createDetachedMemoWindow(memo));

ipcMain.handle("memo:detached-get", (event) => ({
  ok: true,
  memo: detachedMemoForSender(event.sender)
}));

ipcMain.handle("memo:detached-update", (event, memoPatch = {}) => {
  const current = detachedMemoForSender(event.sender);
  if (!current) return { ok: false, message: "DETACHED_MEMO_NOT_FOUND" };
  const next = normalizeDetachedMemo({ ...current, ...memoPatch, id: current.id });
  detachedMemos.set(next.id, next);
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (senderWindow && !senderWindow.isDestroyed()) senderWindow.setTitle(next.title);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("memo:detached-updated", next);
  }
  return { ok: true, memo: next };
});

ipcMain.handle("memo:attach", (_, id) => {
  const detachedWindow = detachedWindows.get(id);
  if (detachedWindow && !detachedWindow.isDestroyed()) detachedWindow.close();
  else attachDetachedMemo(id);
  return { ok: true };
});

ipcMain.handle("display:list", () => ({
  displays: displayInfos(),
  activeDisplayId: getTargetDisplay()?.id ?? null
}));

ipcMain.handle("fonts:list", async () => ({
  ok: true,
  fonts: await listSystemFonts(),
  customFonts: loadCustomFonts()
}));

ipcMain.handle("fonts:import", async () => {
  try {
    return await importFontFile();
  } catch (error) {
    return { ok: false, message: String(error?.message || error) };
  }
});

ipcMain.handle("background:import", async () => {
  try {
    return await importBackgroundImage();
  } catch (error) {
    return { ok: false, message: String(error?.message || error) };
  }
});

ipcMain.handle("emoji:import-image", async () => {
  try {
    return await importEmojiImage();
  } catch (error) {
    return { ok: false, message: String(error?.message || error) };
  }
});

ipcMain.handle("background:save-cropped", (_, dataUrl) => {
  try {
    return saveCroppedBackgroundImage(dataUrl);
  } catch (error) {
    return { ok: false, message: String(error?.message || error) };
  }
});

ipcMain.handle("user:get-name", () => {
  const candidates = [
    os.userInfo().username,
    process.env.USERNAME,
    process.env.USER,
    path.basename(app.getPath("home") || "")
  ];
  const name = candidates.find((value) => typeof value === "string" && value.trim());
  return {
    ok: true,
    name: name ? name.trim() : "사용자"
  };
});

ipcMain.handle("startup:get", () => {
  try {
    const login = app.getLoginItemSettings(loginItemOptions());
    return { ok: true, openAtLogin: Boolean(login.openAtLogin) };
  } catch (error) {
    return { ok: false, openAtLogin: false, message: String(error?.message || error) };
  }
});

ipcMain.handle("startup:set", (_, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      ...loginItemOptions()
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: String(error?.message || error) };
  }
});

ipcMain.handle("data:export", async (_, payload) => {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const result = await dialog.showSaveDialog(mainWindow || undefined, {
      title: "MEMO BOM 백업 저장",
      defaultPath: path.join(app.getPath("documents"), `MEMO BOM Backup ${date}.json`),
      filters: [{ name: "MEMO BOM Backup", extensions: ["json"] }]
    });

    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), "utf8");
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, message: String(error?.message || error) };
  }
});

ipcMain.handle("data:import", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow || undefined, {
      title: "MEMO BOM 백업 불러오기",
      properties: ["openFile"],
      filters: [{ name: "MEMO BOM Backup", extensions: ["json"] }]
    });

    if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };
    const filePath = result.filePaths[0];
    const raw = fs.readFileSync(filePath, "utf8");
    return { ok: true, filePath, data: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, message: String(error?.message || error) };
  }
});

ipcMain.handle("shell:open-external", async (_, url) => {
  if (typeof url !== "string" || !url.trim()) return { ok: false, message: "INVALID_URL" };
  const safeUrl = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
  await shell.openExternal(safeUrl);
  return { ok: true };
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") return;
});

app.on("before-quit", () => {
  saveSettings();
  isQuitting = true;
});

app.on("will-quit", () => {
  unregisterShortcuts();
  if (followDisplayTimer) {
    clearInterval(followDisplayTimer);
    followDisplayTimer = null;
  }
});
