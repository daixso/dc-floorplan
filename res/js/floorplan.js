// ═══════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════

const RACK_TYPES = [
  // System X: bright yellow bg → very dark text for contrast
  {
    id: "network",
    label: "Network",
    abbr: "NET",
    color: "#1c1c1c",
    borderColor: "#555",
    textColor: "#cccccc",
    idColor: "#888888",
  },
  {
    id: "systemx",
    label: "System X",
    abbr: "SX",
    color: "#FFE401",
    borderColor: "#c8a800",
    textColor: "#1a1000",
    idColor: "#4a3800",
  },
  {
    id: "risc",
    label: "RISC",
    abbr: "RSC",
    color: "#0003CE",
    borderColor: "#3344ff",
    textColor: "#dde4ff",
    idColor: "#8899ff",
  },
  {
    id: "mainframe",
    label: "Mainframe",
    abbr: "MF",
    color: "#CB0061",
    borderColor: "#ff0078",
    textColor: "#ffffff",
    idColor: "#ff88bb",
  },
  {
    id: "gpu",
    label: "GPU",
    abbr: "GPU",
    color: "#007a04",
    borderColor: "#00aa06",
    textColor: "#ccffcc",
    idColor: "#44cc44",
  },
];
const RACK_TYPE_MAP = Object.fromEntries(RACK_TYPES.map((t) => [t.id, t]));

const CUSTOMERS = [
  "Bermuda Triangle Backup",
  "Dad Joke Database",
  "UFO Download Station",
  "TaxHaven Holdings",
  "FakeNews Daily",
  "Pollution Plus",
  "ClimateChange Industries",
  "Probability Manufacturing",
  "Counterfeit Good Distribution",
  "Madeep",
  "Flat Earth Servers",
  "Wealth Track",
  "Union Busters",
  "Existential Crisis Cloud",
  "Ludus",
  "Healthcare Denial",
  "Student Hub",
  "Houseplant Emotional Support",
  "SockFetish Digital",
  "Midlife Crisis Consulting",
  "SimpeHub Premium",
  "Motivational Sloth Network",
  "RoboticsHub",
  "Make Mie",
  "Aero Dynasty",
  "Standard",
  "Richards and Richards",
  "Dewey Chaeatm",
  "AeroSpace",
  "Bull and Bearly",
  "Waseku",
  "Sweatshop Efficiency",
  "Pyramid Power",
  "EvilCorp",
];

function genCustomerColors(n) {
  const g = 0.618033988749895,
    cols = [];
  for (let i = 0; i < n; i++) {
    const h = (i * g * 360) % 360;
    cols.push(hslToHex(h, 62 + (i % 4) * 7, 38 + (i % 3) * 10));
  }
  return cols;
}
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12,
      c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return "#" + f(0) + f(8) + f(4);
}
function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 140 ? "#111111" : "#eeeeee";
}

const CUSTOMER_COLORS = genCustomerColors(CUSTOMERS.length);
const CUSTOMER_MAP = Object.fromEntries(
  CUSTOMERS.map((c, i) => [c, CUSTOMER_COLORS[i]]),
);

// ── COLUMN GROUPS ──
// Each group has a 1-based number and an array of rack-columns.
// Each rack-column has a letter (A, B, C…), and the group has a shared row count.
// Address format:  "1-D3"  = Group 1, rack-column D, row 3
const GROUPS = [
  { num: 1, rows: 16, cols: ["A", "B", "C", "D", "E"] }, // 5-wide
  { num: 2, rows: 16, cols: ["A", "B", "C", "D", "E"] }, // 5-wide
  { num: 3, rows: 16, cols: ["A", "B", "C", "D"] }, // 4-wide
  { num: 4, rows: 16, cols: ["A", "B", "C", "D", "E"] }, // 5-wide
  { num: 5, rows: 16, cols: ["A", "B", "C", "D"] }, // 4-wide
  { num: 6, rows: 16, cols: ["A", "B", "C", "D", "E"] }, // 5-wide
  { num: 7, rows: 16, cols: ["A", "B", "C", "D"] }, // 4-wide
];

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════

let cellState = {}; // key -> { type, customer }
let currentView = "type";
let activeRackType = null;
let activeCustomer = null;
let isPainting = false;
let paintMode = null; // null | 'clear'
let ctxTarget = null;

// Key encodes group number, column letter, row index
// e.g. group=1, col='D', row=2  →  "1_D_2"
function cellKey(gNum, col, row) {
  return `${gNum}_${col}_${row}`;
}

// Human-readable address from a key  →  "1-D3"
function addrFromKey(key) {
  const [gNum, col, row] = key.split("_");
  return `${gNum}-${col}${parseInt(row) + 1}`;
}

function initState() {
  GROUPS.forEach((g) => {
    g.cols.forEach((col) => {
      for (let r = 0; r < g.rows; r++) {
        const key = cellKey(g.num, col, r);
        if (!cellState[key]) cellState[key] = { type: null, customer: null };
      }
    });
  });
}

// ═══════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════

function buildSidebar() {
  const list = document.getElementById("rackTypeList");
  list.innerHTML = "";
  RACK_TYPES.forEach((t) => {
    const btn = document.createElement("button");
    btn.className =
      "rack-type-btn" + (activeRackType === t.id ? " selected" : "");
    btn.innerHTML = `<div class="swatch" style="background:${t.color};border-color:${t.borderColor};"></div>${t.label}`;
    btn.onclick = () => toggleRackType(t.id);
    list.appendChild(btn);
  });
  updatePaintIndicator();
}

function buildCustomerList(filter = "") {
  const list = document.getElementById("customerList");
  list.innerHTML = "";
  const lc = filter.toLowerCase();
  CUSTOMERS.filter((c) => c.toLowerCase().includes(lc)).forEach((name) => {
    const color = CUSTOMER_MAP[name];
    const count = Object.values(cellState).filter(
      (s) => s.customer === name,
    ).length;
    const div = document.createElement("div");
    div.className =
      "customer-item" + (activeCustomer === name ? " selected" : "");
    div.innerHTML = `
      <div class="customer-swatch" style="background:${color};"></div>
      <div class="customer-name">${name}</div>
      ${count > 0 ? `<div class="customer-count">${count}</div>` : ""}
    `;
    div.onclick = () => toggleCustomer(name);
    list.appendChild(div);
  });
}

// ═══════════════════════════════════════════════════════
//  FLOOR GRID
// ═══════════════════════════════════════════════════════

function buildFloorGrid() {
  const grid = document.getElementById("floorGrid");
  grid.innerHTML = "";

  GROUPS.forEach((g) => {
    const block = document.createElement("div");
    block.className = "group-block";

    // ── Group number banner ──
    const banner = document.createElement("div");
    banner.className = "group-banner";
    banner.innerHTML = `GROUP <span>${g.num}</span> &nbsp;·&nbsp; ${g.cols.length} COLUMNS × ${g.rows} ROWS`;
    block.appendChild(banner);

    // ── Letter strip (one cell per column) ──
    const letterRow = document.createElement("div");
    letterRow.className = "letter-strip-row";

    const spacer = document.createElement("div");
    spacer.className = "letter-strip-spacer";
    letterRow.appendChild(spacer);

    const strip = document.createElement("div");
    strip.className = "letter-strip";
    g.cols.forEach((col) => {
      const lc = document.createElement("div");
      lc.className = "col-letter-cell";
      lc.textContent = col;
      strip.appendChild(lc);
    });
    letterRow.appendChild(strip);
    block.appendChild(letterRow);

    // ── Body: row gutter + cells ──
    const body = document.createElement("div");
    body.className = "group-body";

    // Row number gutter
    const gutter = document.createElement("div");
    gutter.className = "row-gutter";
    for (let r = 0; r < g.rows; r++) {
      const rn = document.createElement("div");
      rn.className = "row-num";
      rn.textContent = String(r + 1).padStart(2, "0");
      gutter.appendChild(rn);
    }
    body.appendChild(gutter);

    // Cell grid
    const inner = document.createElement("div");
    inner.className = "col-inner";
    for (let r = 0; r < g.rows; r++) {
      const row = document.createElement("div");
      row.className = "rack-row";
      g.cols.forEach((col) => {
        row.appendChild(buildCell(g.num, col, r));
      });
      inner.appendChild(row);
    }
    body.appendChild(inner);
    block.appendChild(body);
    grid.appendChild(block);
  });
}

function buildCell(gNum, col, r) {
  const key = cellKey(gNum, col, r);
  const addr = addrFromKey(key);

  const wrap = document.createElement("div");
  wrap.className = "rack-cell";
  wrap.dataset.key = key;

  const inner = document.createElement("div");
  inner.className = "rack-cell-inner";
  inner.id = "ci_" + key;

  const idBadge = document.createElement("div");
  idBadge.className = "rack-id";
  idBadge.id = "rid_" + key;
  idBadge.textContent = addr;

  const rl = document.createElement("div");
  rl.className = "rack-label";
  rl.id = "rl_" + key;

  const cl = document.createElement("div");
  cl.className = "customer-label";
  cl.id = "cl_" + key;

  const tt = document.createElement("div");
  tt.className = "tooltip";
  tt.id = "tt_" + key;
  tt.textContent = addr + " — EMPTY";

  inner.appendChild(idBadge);
  inner.appendChild(rl);
  inner.appendChild(cl);
  wrap.appendChild(inner);
  wrap.appendChild(tt);

  wrap.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      isPainting = true;
      applyPaint(key);
    }
  });
  wrap.addEventListener("mouseenter", () => {
    if (isPainting) applyPaint(key);
  });
  wrap.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showCtxMenu(key, e.clientX, e.clientY);
  });

  updateCellDisplay(key);
  return wrap;
}

// ═══════════════════════════════════════════════════════
//  CELL DISPLAY
// ═══════════════════════════════════════════════════════

function updateCellDisplay(key) {
  const s = cellState[key];
  const inner = document.getElementById("ci_" + key);
  const badge = document.getElementById("rid_" + key);
  const rl = document.getElementById("rl_" + key);
  const cl = document.getElementById("cl_" + key);
  const tt = document.getElementById("tt_" + key);
  if (!inner) return;

  const T = s.type ? RACK_TYPE_MAP[s.type] : null;
  const CC = s.customer ? CUSTOMER_MAP[s.customer] : null;
  const addr = addrFromKey(key);

  const applyBadge = (color, opacity) => {
    if (badge) {
      badge.style.color = color;
      badge.style.opacity = opacity;
    }
  };

  if (currentView === "type") {
    if (T) {
      inner.style.cssText = `background:${T.color};border-color:${T.borderColor};box-shadow:0 0 6px ${T.color}55;`;
      rl.style.color = T.textColor;
      rl.textContent = T.label;
      cl.style.color = T.textColor + "aa";
      cl.textContent = s.customer || "";
      applyBadge(T.idColor || T.textColor, "0.65");
    } else {
      inner.style.cssText =
        "background:#0d1117;border-color:var(--border);box-shadow:none;";
      rl.style.color = "var(--text-dim)";
      rl.textContent = "";
      cl.textContent = "";
      applyBadge("var(--text-dim)", "0.4");
    }
  } else if (currentView === "customer") {
    if (CC) {
      const tc = getTextColor(CC);
      inner.style.cssText = `background:${CC};border-color:${CC};box-shadow:0 0 6px ${CC}55;`;
      rl.style.color = tc;
      rl.textContent = s.customer;
      cl.style.color = tc + "99";
      cl.textContent = T ? T.abbr : "";
      applyBadge(tc, "0.55");
    } else if (T) {
      inner.style.cssText = `background:${T.color}22;border-color:${T.color}55;box-shadow:none;`;
      rl.style.color = T.color;
      rl.textContent = T.label;
      cl.textContent = "";
      applyBadge(T.color, "0.5");
    } else {
      inner.style.cssText =
        "background:#0d1117;border-color:var(--border);box-shadow:none;";
      rl.textContent = "";
      cl.textContent = "";
      applyBadge("var(--text-dim)", "0.4");
    }
  } else {
    // combined
    if (T && CC) {
      const tc = getTextColor(CC);
      inner.style.cssText = `background:linear-gradient(135deg,${T.color} 50%,${CC} 50%);border-color:${T.borderColor};box-shadow:0 0 8px ${T.color}33,0 0 8px ${CC}33;`;
      rl.style.color = T.textColor;
      rl.textContent = T.abbr;
      cl.style.color = tc;
      cl.textContent = s.customer;
      applyBadge(T.idColor || T.textColor, "0.7");
    } else if (T) {
      inner.style.cssText = `background:${T.color};border-color:${T.borderColor};box-shadow:0 0 6px ${T.color}44;`;
      rl.style.color = T.textColor;
      rl.textContent = T.label;
      cl.textContent = "";
      applyBadge(T.idColor || T.textColor, "0.7");
    } else if (CC) {
      const tc = getTextColor(CC);
      inner.style.cssText = `background:${CC};border-color:${CC};box-shadow:0 0 6px ${CC}44;`;
      rl.style.color = tc;
      rl.textContent = s.customer;
      cl.textContent = "";
      applyBadge(tc, "0.55");
    } else {
      inner.style.cssText =
        "background:#0d1117;border-color:var(--border);box-shadow:none;";
      rl.textContent = "";
      cl.textContent = "";
      applyBadge("var(--text-dim)", "0.4");
    }
  }

  // Outline highlight when customer is active
  inner.style.outline =
    activeCustomer && s.customer === activeCustomer
      ? "2px solid rgba(255,255,255,0.9)"
      : "none";
  inner.style.outlineOffset = "1px";

  // Tooltip
  const tParts = [`ID: ${addr}`];
  if (T) tParts.push(`TYPE: ${T.label}`);
  if (s.customer) tParts.push(`CLIENT: ${s.customer}`);
  if (!T && !s.customer) tParts.push("EMPTY");
  if (tt) tt.textContent = tParts.join("  |  ");
}

function refreshAll() {
  Object.keys(cellState).forEach((k) => updateCellDisplay(k));
  updateStats();
  buildCustomerList(document.getElementById("customerSearch").value);
  buildLegend();
}

// ═══════════════════════════════════════════════════════
//  INTERACTIONS
// ═══════════════════════════════════════════════════════

function applyPaint(key) {
  let changed = false;
  if (paintMode === "clear") {
    cellState[key] = { type: null, customer: null };
    changed = true;
  }
  if (activeRackType !== null) {
    cellState[key].type = activeRackType;
    changed = true;
  } else if (activeCustomer !== null) {
    cellState[key].customer = activeCustomer;
    changed = true;
  }
  if (changed) {
    updateCellDisplay(key);
    updateStats();
    buildCustomerList(document.getElementById("customerSearch").value);
    buildLegend();
  }
}

function toggleRackType(id) {
  paintMode = null;
  activeRackType = activeRackType === id ? null : id;
  if (activeRackType) activeCustomer = null;
  buildSidebar();
  buildCustomerList(document.getElementById("customerSearch").value);
  refreshAll();
}
function setActiveRackType(id) {
  activeRackType = id;
  buildSidebar();
  updatePaintIndicator();
}

function toggleCustomer(name) {
  paintMode = null;
  activeCustomer = activeCustomer === name ? null : name;
  if (activeCustomer) activeRackType = null;
  buildSidebar();
  buildCustomerList(document.getElementById("customerSearch").value);
  refreshAll();
}

function setView(v) {
  currentView = v;
  document.querySelectorAll(".view-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === v);
  });
  refreshAll();
}

function updatePaintIndicator() {
  const el = document.getElementById("paintIndicator");
  const lbl = document.getElementById("paintLabel");
  if (paintMode === "clear") {
    el.className = "paint-indicator painting";
    lbl.textContent = "ERASING";
  } else if (activeRackType) {
    el.className = "paint-indicator painting";
    lbl.textContent = `PAINTING: ${RACK_TYPE_MAP[activeRackType].label.toUpperCase()}`;
  } else if (activeCustomer) {
    el.className = "paint-indicator painting";
    lbl.textContent = `ASSIGNING: ${activeCustomer.toUpperCase()}`;
  } else {
    el.className = "paint-indicator";
    lbl.textContent = "SELECT MODE";
  }
}

function updateStats() {
  const vals = Object.values(cellState);
  const assigned = vals.filter(s => s.customer).length;
  const typed     = vals.filter(s => s.type).length;
  document.getElementById('totalRacks').textContent    = vals.length;
  document.getElementById('assignedRacks').textContent = assigned;
  document.getElementById('typedRacks').textContent    = typed;
  document.getElementById('emptyRacks').textContent    = vals.length - assigned;
}

function buildLegend() {
  const bar = document.getElementById("legendBar");
  bar.innerHTML = "";
  if (currentView !== "customer") {
    RACK_TYPES.forEach((t) => {
      const d = document.createElement("div");
      d.className = "legend-item";
      d.innerHTML = `<div class="legend-swatch" style="background:${t.color};border-color:${t.borderColor};"></div>${t.label}`;
      bar.appendChild(d);
    });
  }
  if (currentView !== "type") {
    if (currentView === "combined") {
      const s = document.createElement("div");
      s.style.cssText =
        "width:1px;background:var(--border);margin:0 4px;align-self:stretch;";
      bar.appendChild(s);
    }
    const used = [
      ...new Set(
        Object.values(cellState)
          .map((s) => s.customer)
          .filter(Boolean),
      ),
    ];
    if (used.length) {
      used.forEach((name) => {
        const d = document.createElement("div");
        d.className = "legend-item";
        d.innerHTML = `<div class="legend-swatch" style="background:${CUSTOMER_MAP[name]};border-radius:50%;"></div>${name}`;
        bar.appendChild(d);
      });
    } else {
      const d = document.createElement("div");
      d.className = "legend-item";
      d.style.color = "var(--text-dim)";
      d.textContent = "No customers assigned yet";
      bar.appendChild(d);
    }
  }
}

// ═══════════════════════════════════════════════════════
//  CONTEXT MENU
// ═══════════════════════════════════════════════════════

function showCtxMenu(key, x, y) {
  ctxTarget = key;
  const s = cellState[key];
  const addr = addrFromKey(key);
  const menu = document.getElementById("ctxMenu");

  document.getElementById("ctxTitle").textContent =
    addr +
    " — " +
    ([s.type ? RACK_TYPE_MAP[s.type].label : null, s.customer]
      .filter(Boolean)
      .join(" · ") || "EMPTY");

  const ts = document.getElementById("ctxTypeSection");
  ts.innerHTML = '<div class="ctx-section-label">SET TYPE</div>';
  RACK_TYPES.forEach((t) => {
    const div = document.createElement("div");
    div.className = "ctx-item";
    div.innerHTML = `<div class="ctx-swatch" style="background:${t.color};border-color:${t.borderColor};"></div>${t.label}`;
    div.onclick = () => {
      cellState[ctxTarget].type = t.id;
      updateCellDisplay(ctxTarget);
      buildLegend();
      hideCtxMenu();
      notify("Set to " + t.label);
    };
    ts.appendChild(div);
  });

  const cs = document.getElementById("ctxCustomerSection");
  cs.innerHTML = '<div class="ctx-section-label">ASSIGN CUSTOMER</div>';
  CUSTOMERS.forEach((name) => {
    const div = document.createElement("div");
    div.className = "ctx-item";
    div.innerHTML = `<div class="ctx-swatch" style="background:${CUSTOMER_MAP[name]};border-radius:50%;"></div>${name}`;
    div.onclick = () => {
      cellState[ctxTarget].customer = name;
      refreshAll();
      hideCtxMenu();
      notify("Assigned to " + name);
    };
    cs.appendChild(div);
  });

  menu.style.left = Math.min(x, window.innerWidth - 210) + "px";
  menu.style.top = Math.min(y, window.innerHeight - 80) + "px";
  menu.classList.add("visible");
}
function hideCtxMenu() {
  document.getElementById("ctxMenu").classList.remove("visible");
  ctxTarget = null;
}
function ctxClearCustomer() {
  if (ctxTarget) {
    cellState[ctxTarget].customer = null;
    refreshAll();
    hideCtxMenu();
  }
}
function ctxClearRack() {
  if (ctxTarget) {
    cellState[ctxTarget] = { type: null, customer: null };
    refreshAll();
    hideCtxMenu();
  }
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".ctx-menu")) hideCtxMenu();
});
document.addEventListener("mouseup", () => {
  isPainting = false;
});

// ═══════════════════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════════════════
function saveData() {
  try {
    localStorage.setItem("dcplan_state", JSON.stringify(cellState));
    notify("Layout saved");
  } catch (e) {
    notify("Save failed: " + e.message);
  }
}

// ═══════════════════════════════════════════════════════
//  LOAD
// ═══════════════════════════════════════════════════════
function loadData() {
  try {
    const raw = localStorage.getItem("dcplan_state");
    if (!raw) {
      notify("No saved data found");
      return;
    }
    const loaded = JSON.parse(raw);
    // Only restore keys that exist in the current layout
    Object.keys(cellState).forEach((k) => {
      if (loaded[k]) cellState[k] = loaded[k];
    });
    refreshAll();
    notify("Layout loaded");
  } catch (e) {
    notify("Load failed: " + e.message);
  }
}

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════

function clearAll() {
  if (!confirm("Reset ALL rack assignments?")) return;
  Object.keys(cellState).forEach(
    (k) => (cellState[k] = { type: null, customer: null }),
  );
  localStorage.removeItem("dcplan_state");
  refreshAll();
  notify("All racks cleared");
}

// ── CLEAR CELL (erase type + customer from clicked rack) ──
function activateClearMode() {
  activeRackType = null;
  activeCustomer = null;
  paintMode = "clear";
  buildSidebar();
  updatePaintIndicator();
}

function notify(msg) {
  const el = document.getElementById("notif");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}

// ═══════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════
initState();
buildSidebar();
buildCustomerList();
buildFloorGrid();
buildLegend();
updateStats();
loadData();
