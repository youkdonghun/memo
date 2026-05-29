const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("memoEdge", {
  getShellState: () => ipcRenderer.invoke("shell:get-state"),
  setExpanded: (expanded) => ipcRenderer.invoke("shell:set-expanded", expanded),
  setSettingsOpen: (open) => ipcRenderer.invoke("shell:set-settings-open", open),
  setTemporaryPanelWidth: (width) => ipcRenderer.invoke("shell:set-temporary-panel-width", width),
  setSideTitleEditOpen: (open) => ipcRenderer.invoke("shell:set-side-title-edit-open", open),
  updateSettings: (settings) => ipcRenderer.invoke("shell:update-settings", settings),
  setPanelHeight: (height) => ipcRenderer.invoke("shell:set-panel-height", height),
  setPanelSize: (size) => ipcRenderer.invoke("shell:set-panel-size", size),
  nudgeEdge: (delta) => ipcRenderer.invoke("shell:nudge-edge", delta),
  nudgeY: (deltaY) => ipcRenderer.invoke("shell:nudge-y", deltaY),
  listDisplays: () => ipcRenderer.invoke("display:list"),
  listSystemFonts: () => ipcRenderer.invoke("fonts:list"),
  importFontFile: () => ipcRenderer.invoke("fonts:import"),
  importBackgroundImage: () => ipcRenderer.invoke("background:import"),
  importEmojiImage: () => ipcRenderer.invoke("emoji:import-image"),
  saveBackgroundImage: (dataUrl) => ipcRenderer.invoke("background:save-cropped", dataUrl),
  importAttachment: (memoId) => ipcRenderer.invoke("attachment:import", memoId),
  openAttachment: (filePath) => ipcRenderer.invoke("attachment:open", filePath),
  revealAttachment: (filePath) => ipcRenderer.invoke("attachment:reveal", filePath),
  removeAttachment: (filePath) => ipcRenderer.invoke("attachment:remove", filePath),
  removeMemoAttachmentFolder: (memoId) => ipcRenderer.invoke("attachment:remove-memo-folder", memoId),
  syncReminders: (reminders) => ipcRenderer.invoke("reminder:sync", reminders),
  getUserName: () => ipcRenderer.invoke("user:get-name"),
  detachMemo: (memo) => ipcRenderer.invoke("memo:detach", memo),
  refreshDetachedMemo: (memo) => ipcRenderer.invoke("memo:detached-refresh-state", memo),
  refreshDetachedToolbar: (payload) => ipcRenderer.invoke("memo:detached-toolbar-state", payload),
  getDetachedMemo: () => ipcRenderer.invoke("memo:detached-get"),
  updateDetachedMemo: (memo) => ipcRenderer.invoke("memo:detached-update", memo),
  attachDetachedMemo: (id) => ipcRenderer.invoke("memo:attach", id),
  getStartup: () => ipcRenderer.invoke("startup:get"),
  setStartup: (enabled) => ipcRenderer.invoke("startup:set", enabled),
  exportData: (payload) => ipcRenderer.invoke("data:export", payload),
  importData: () => ipcRenderer.invoke("data:import"),
  openExternal: (url) => ipcRenderer.invoke("shell:open-external", url),
  onExpandedChanged: (callback) => {
    ipcRenderer.on("shell:expanded-changed", (_, expanded) => callback(Boolean(expanded)));
  },
  onCycleFloating: (callback) => {
    ipcRenderer.on("shortcut:cycle-floating", () => callback());
  },
  onOpenSettings: (callback) => {
    ipcRenderer.on("shell:open-settings", () => callback());
  },
  onOpenEmoji: (callback) => {
    ipcRenderer.on("shortcut:open-emoji", () => callback());
  },
  onReminderOpenMemo: (callback) => {
    ipcRenderer.on("reminder:open-memo", (_, payload) => callback(payload));
  },
  onReminderFired: (callback) => {
    ipcRenderer.on("reminder:fired", (_, payload) => callback(payload));
  },
  onDetachedMemoUpdated: (callback) => {
    ipcRenderer.on("memo:detached-updated", (_, memo) => callback(memo));
  },
  onDetachedMemoAttached: (callback) => {
    ipcRenderer.on("memo:detached-attached", (_, id) => callback(id));
  },
  onDetachedMemoRefresh: (callback) => {
    ipcRenderer.on("memo:detached-refresh", (_, memo) => callback(memo));
  },
  onDetachedToolbarState: (callback) => {
    ipcRenderer.on("memo:detached-toolbar-state", (_, payload) => callback(payload));
  }
});
