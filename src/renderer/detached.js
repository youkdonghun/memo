const CHECK_TEXT_PLACEHOLDER = "\u200b";

let memo = null;
let saveTimer = null;

const titleInput = document.getElementById("detachedTitleInput");
const editor = document.getElementById("detachedEditor");
const attachButton = document.getElementById("attachMemoButton");
const saveStatus = document.getElementById("detachedSaveStatus");

function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : fallback;
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
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
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

function fontFamilyCss(value) {
  const family = String(value || "Gulim").replace(/["\\]/g, "");
  return [...new Set([family, "Gulim", "Malgun Gothic", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"])]
    .map((font) => (font === "sans-serif" ? font : `"${font}"`))
    .join(", ");
}

function applyMemo(nextMemo) {
  memo = {
    ...memo,
    ...nextMemo,
    title: String(nextMemo?.title || "메모").slice(0, 80),
    html: typeof nextMemo?.html === "string" ? nextMemo.html : ""
  };
  const color = normalizeHexColor(memo.color, "#fff4b8");
  document.documentElement.style.setProperty("--note-bg", color);
  document.documentElement.style.setProperty("--note-text", readableTextColor(color));
  document.documentElement.style.setProperty("--accent", accentColor(color));
  document.documentElement.style.setProperty("--memo-font-size", `${Number(memo.fontSize) || 15}px`);
  document.documentElement.style.setProperty("--memo-font-family", fontFamilyCss(memo.fontFamily));
  document.documentElement.style.setProperty("--memo-line-height", String(Number(memo.lineSpacing) || 1.5));
  titleInput.value = memo.title;
  editor.innerHTML = memo.html || "";
  prepareChecklistItems();
}

function serializedEditorHtml() {
  const clone = editor.cloneNode(true);
  clone.querySelectorAll(".check-text").forEach((text) => {
    text.textContent = text.textContent.replaceAll(CHECK_TEXT_PLACEHOLDER, "");
  });
  return clone.innerHTML;
}

async function saveNow() {
  if (!memo) return;
  memo.title = titleInput.value.trim().slice(0, 80) || "메모";
  memo.html = serializedEditorHtml();
  saveStatus.textContent = "저장 중";
  const result = await window.memoEdge.updateDetachedMemo(memo);
  if (result?.memo) memo = result.memo;
  saveStatus.textContent = "저장됨";
}

function scheduleSave() {
  saveStatus.textContent = "저장 중";
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 180);
}

function ensureChecklistTextNode(text) {
  if (!text) return null;
  text.removeAttribute("contenteditable");
  text.spellcheck = false;
  const existingTextNode = Array.from(text.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (existingTextNode) return existingTextNode;
  const textNode = document.createTextNode(text.textContent || CHECK_TEXT_PLACEHOLDER);
  text.textContent = "";
  text.appendChild(textNode);
  return textNode;
}

function prepareChecklistItems() {
  editor.querySelectorAll(".check-item").forEach((item) => {
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
  placeCaretInCheckText(item.querySelector(".check-text"));
  scheduleSave();
}

editor.addEventListener("input", scheduleSave);
editor.addEventListener("click", (event) => {
  if (event.target.closest(".check-box")) {
    event.preventDefault();
    toggleChecklistItem(event.target);
  }
});
titleInput.addEventListener("input", scheduleSave);
attachButton.addEventListener("click", async () => {
  await saveNow();
  await window.memoEdge.attachDetachedMemo(memo.id);
});
window.addEventListener("beforeunload", () => {
  if (memo) window.memoEdge.updateDetachedMemo({ ...memo, title: titleInput.value, html: serializedEditorHtml() });
});

window.memoEdge.onDetachedMemoRefresh?.((nextMemo) => {
  if (!memo || nextMemo.id === memo.id) applyMemo(nextMemo);
});

async function initialize() {
  const result = await window.memoEdge.getDetachedMemo();
  applyMemo(result?.memo || {});
}

initialize();
