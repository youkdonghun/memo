const CHECK_TEXT_PLACEHOLDER = "\u200b";
const DEFAULT_FONT_FAMILY = "Gulim";
const DEFAULT_FONT_SIZE = 15;
const DEFAULT_LINE_SPACING = 1.5;
const FONT_SIZE_OPTIONS = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32];
const LINE_SPACING_OPTIONS = [1, 1.15, 1.5, 2, 2.5, 3];

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

let memo = null;
let saveTimer = null;
let savedEditorRange = null;
let lastTableCell = null;
let systemFonts = [DEFAULT_FONT_FAMILY, "GulimChe", "Malgun Gothic", "Arial", "Calibri", "Consolas"];
let editorHistory = [];
let editorHistoryIndex = -1;
let applyingHistory = false;

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
const checkButton = document.getElementById("checkButton");
const tableButton = document.getElementById("tableButton");
const clearButton = document.getElementById("clearButton");
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : fallback;
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

function formatLineSpacing(value) {
  const spacing = normalizeLineSpacing(value);
  return Number.isInteger(spacing) ? spacing.toFixed(1) : String(spacing);
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

function applyMemoTheme() {
  const color = normalizeHexColor(memo?.color, "#fff4b8");
  document.documentElement.style.setProperty("--note-bg", color);
  document.documentElement.style.setProperty("--note-text", readableTextColor(color));
  document.documentElement.style.setProperty("--accent", accentColor(color));
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

function applyMemo(nextMemo) {
  memo = {
    ...memo,
    ...nextMemo,
    title: String(nextMemo?.title || "메모").slice(0, 80),
    color: normalizeHexColor(nextMemo?.color, "#fff4b8"),
    fontSize: normalizeFontSize(nextMemo?.fontSize),
    fontFamily: normalizeFontFamily(nextMemo?.fontFamily),
    lineSpacing: normalizeLineSpacing(nextMemo?.lineSpacing),
    html: typeof nextMemo?.html === "string" ? nextMemo.html : ""
  };
  titleInput.value = memo.title;
  editor.innerHTML = memo.html || "";
  applyMemoTheme();
  applyMemoTypography();
  syncToolbarTypography();
  prepareChecklistItems();
  resetEditorHistory();
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
  if (result?.memo) memo = { ...memo, ...result.memo };
  saveStatus.textContent = "저장됨";
}

function scheduleSave() {
  saveStatus.textContent = "저장 중";
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 180);
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
  scheduleSave();
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

function execCommand(command, value = null) {
  editor.focus();
  document.execCommand(command, false, value);
  scheduleSave();
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
  editor.focus();
  if (!selectionBelongsToEditor(savedEditorRange)) return false;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedEditorRange);
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
  const checked = item.dataset.checked === "true";
  item.dataset.checked = checked ? "false" : "true";
  const box = item.querySelector(".check-box");
  if (box) {
    box.textContent = checked ? "\u2610" : "\u2611";
    box.setAttribute("aria-checked", checked ? "false" : "true");
  }
  placeCaretInCheckText(item.querySelector(".check-text"));
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
  cell.appendChild(document.createElement("br"));
  return cell;
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
  tableTools.classList.toggle("hidden", !open);
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
  lastTableCell = null;
  setTableToolsOpen(false);
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

function applyTableCellColor() {
  const color = normalizeHexColor(tableCellColorInput?.value, "#ffffff");
  targetTableCells().forEach((cell) => {
    cell.style.backgroundColor = color;
  });
  scheduleSave();
  pushEditorHistory();
}

function applyTableFillColor() {
  const table = currentMemoTable();
  const color = normalizeHexColor(tableFillColorInput?.value, "#ffffff");
  if (!table) return;
  tableCells(table).forEach((cell) => {
    cell.style.backgroundColor = color;
  });
  scheduleSave();
  pushEditorHistory();
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
  if (!item) return;

  event.preventDefault();
  const currentText = item.querySelector(".check-text");
  if (isBlankEditorText(currentText?.textContent)) {
    const blankLine = createBlankLine();
    item.replaceWith(blankLine);
    placeCaretInBlock(blankLine);
    scheduleSave();
    pushEditorHistory();
    return;
  }

  const { item: nextItem, text } = createChecklistItem(false);
  item.after(nextItem);
  placeCaretInCheckText(text);
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
document.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (editor.contains(target) || tableTools.contains(target) || tablePicker.contains(target) || tableButton.contains(target)) {
    return;
  }
  lastTableCell = null;
  setTableToolsOpen(false);
});
titleInput.addEventListener("input", scheduleSave);
attachButton.addEventListener("click", async () => {
  await saveNow();
  await window.memoEdge.attachDetachedMemo(memo.id);
});
undoButton.addEventListener("click", undoEditor);
redoButton.addEventListener("click", redoEditor);
bulletButton.addEventListener("click", () => execCommand("insertUnorderedList"));
checkButton.addEventListener("click", insertChecklist);
clearButton.addEventListener("click", clearEditorPreservingUndo);
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
mergeTableDownButton.addEventListener("click", mergeTableCellsDown);
splitTableCellButton.addEventListener("click", splitTableCell);
tableBorderColorInput.addEventListener("input", applyTableBorder);
tableBorderWidthInput.addEventListener("input", applyTableBorder);
tableCellColorInput.addEventListener("input", applyTableCellColor);
tableFillColorInput.addEventListener("input", applyTableFillColor);
clearTableCellColorButton.addEventListener("click", clearTableCellColor);
deleteTableButton.addEventListener("click", deleteTable);
fontFamilySelect.addEventListener("change", () => {
  if (!memo) return;
  memo.fontFamily = normalizeFontFamily(fontFamilySelect.value);
  applyMemoTypography();
  scheduleSave();
});
fontSizeSelect.addEventListener("change", () => {
  if (!memo) return;
  memo.fontSize = normalizeFontSize(fontSizeSelect.value);
  applyMemoTypography();
  scheduleSave();
});
lineSpacingSelect.addEventListener("change", () => {
  if (!memo) return;
  memo.lineSpacing = normalizeLineSpacing(lineSpacingSelect.value);
  applyMemoTypography();
  scheduleSave();
});
window.addEventListener("beforeunload", () => {
  if (memo) window.memoEdge.updateDetachedMemo({ ...memo, title: titleInput.value, html: serializedEditorHtml() });
});

window.memoEdge.onDetachedMemoRefresh?.((nextMemo) => {
  if (!memo || nextMemo.id === memo.id) applyMemo(nextMemo);
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
  } catch {
    systemFonts = [DEFAULT_FONT_FAMILY, "GulimChe", "Malgun Gothic", "Arial", "Calibri", "Consolas"];
  }
  const result = await window.memoEdge.getDetachedMemo();
  applyMemo(result?.memo || {});
}

initialize();
