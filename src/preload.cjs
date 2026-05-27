const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("memoEdge", {
  getShellState: () => ipcRenderer.invoke("shell:get-state"),
  setExpanded: (expanded) => ipcRenderer.invoke("shell:set-expanded", expanded),
  setSettingsOpen: (open) => ipcRenderer.invoke("shell:set-settings-open", open),
  setTemporaryPanelWidth: (width) => ipcRenderer.invoke("shell:set-temporary-panel-width", width),
  updateSettings: (settings) => ipcRenderer.invoke("shell:update-settings", settings),
  setPanelHeight: (height) => ipcRenderer.invoke("shell:set-panel-height", height),
  setPanelSize: (size) => ipcRenderer.invoke("shell:set-panel-size", size),
  nudgeEdge: (delta) => ipcRenderer.invoke("shell:nudge-edge", delta),
  nudgeY: (deltaY) => ipcRenderer.invoke("shell:nudge-y", deltaY),
  listDisplays: () => ipcRenderer.invoke("display:list"),
  listSystemFonts: () => ipcRenderer.invoke("fonts:list"),
  importFontFile: () => ipcRenderer.invoke("fonts:import"),
  importBackgroundImage: () => ipcRenderer.invoke("background:import"),
  saveBackgroundImage: (dataUrl) => ipcRenderer.invoke("background:save-cropped", dataUrl),
  getUserName: () => ipcRenderer.invoke("user:get-name"),
  detachMemo: (memo) => ipcRenderer.invoke("memo:detach", memo),
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
  onDetachedMemoUpdated: (callback) => {
    ipcRenderer.on("memo:detached-updated", (_, memo) => callback(memo));
  },
  onDetachedMemoAttached: (callback) => {
    ipcRenderer.on("memo:detached-attached", (_, id) => callback(id));
  },
  onDetachedMemoRefresh: (callback) => {
    ipcRenderer.on("memo:detached-refresh", (_, memo) => callback(memo));
  }
});
